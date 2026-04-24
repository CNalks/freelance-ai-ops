from typing import Any, Literal

from pydantic import BaseModel, Field


class CompletionRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    system_message: str | None = None
    model: str | None = None
    temperature: float = Field(default=0.2, ge=0, le=2)


class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class CompletionResponse(BaseModel):
    content: str
    model: str
    usage: TokenUsage
    latency_ms: float


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1)
    json_schema: dict[str, Any] = Field(..., alias="schema")


class ExtractResponse(BaseModel):
    data: dict[str, Any]


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    length: Literal["short", "medium", "long"] = "medium"


class SummarizeResponse(BaseModel):
    summary: str
    length: str
