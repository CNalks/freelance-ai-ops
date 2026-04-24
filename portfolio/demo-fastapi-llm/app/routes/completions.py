from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.llm_client import create_completion, stream_completion
from app.schemas import CompletionRequest, CompletionResponse

router = APIRouter(tags=["completions"])


@router.post("/completions", response_model=CompletionResponse)
async def completions(request: CompletionRequest) -> CompletionResponse:
    """Create a non-streaming chat completion.

    Example request:
    `{"prompt": "Write a one-line product update.", "system_message": "Be concise."}`
    """
    return await create_completion(request)


@router.post("/completions/stream")
async def completions_stream(request: CompletionRequest) -> StreamingResponse:
    """Create a streaming chat completion using Server-Sent Events.

    Example request:
    `{"prompt": "Explain SSE in one paragraph."}`
    """
    return StreamingResponse(stream_completion(request), media_type="text/event-stream")
