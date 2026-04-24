from functools import lru_cache
import json
from time import perf_counter
from typing import Any, AsyncIterator

from fastapi import HTTPException
from openai import APIError, AsyncOpenAI, OpenAIError

from app.config import get_settings
from app.schemas import CompletionRequest, CompletionResponse, TokenUsage


@lru_cache
def get_client() -> AsyncOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    return AsyncOpenAI(api_key=settings.openai_api_key)


def openai_error(error: OpenAIError) -> HTTPException:
    status_code = getattr(error, "status_code", 502)
    if isinstance(error, APIError) and error.status_code:
        status_code = error.status_code
    return HTTPException(status_code=status_code, detail={"error": error.__class__.__name__, "message": str(error)})


async def create_completion(request: CompletionRequest) -> CompletionResponse:
    client = get_client()
    settings = get_settings()
    started = perf_counter()

    messages = []
    if request.system_message:
        messages.append({"role": "system", "content": request.system_message})
    messages.append({"role": "user", "content": request.prompt})

    try:
        response = await client.chat.completions.create(
            model=request.model or settings.openai_model,
            messages=messages,
            temperature=request.temperature,
        )
    except OpenAIError as error:
        raise openai_error(error) from error

    usage = response.usage
    return CompletionResponse(
        content=response.choices[0].message.content or "",
        model=response.model,
        latency_ms=round((perf_counter() - started) * 1000, 2),
        usage=TokenUsage(
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
        ),
    )


async def stream_completion(request: CompletionRequest) -> AsyncIterator[str]:
    client = get_client()
    settings = get_settings()

    messages = []
    if request.system_message:
        messages.append({"role": "system", "content": request.system_message})
    messages.append({"role": "user", "content": request.prompt})

    try:
        stream = await client.chat.completions.create(
            model=request.model or settings.openai_model,
            messages=messages,
            temperature=request.temperature,
            stream=True,
        )
    except OpenAIError as error:
        raise openai_error(error) from error

    async for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield f"data: {token}\n\n"

    yield "data: [DONE]\n\n"


async def structured_extract(text: str, schema: dict[str, Any]) -> dict[str, Any]:
    client = get_client()
    settings = get_settings()

    try:
        response = await client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": "Extract structured data from the user text. Return JSON matching the schema.",
                },
                {"role": "user", "content": text},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "extracted_data",
                    "schema": schema,
                    "strict": True,
                }
            },
        )
    except OpenAIError as error:
        raise openai_error(error) from error

    return {"data": json.loads(response.output_text)}


async def list_models() -> list[str]:
    client = get_client()
    try:
        models = await client.models.list()
    except OpenAIError as error:
        raise openai_error(error) from error
    return sorted(model.id for model in models.data)
