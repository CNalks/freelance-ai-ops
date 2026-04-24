from fastapi import APIRouter

from app.llm_client import create_completion
from app.schemas import CompletionRequest, SummarizeRequest, SummarizeResponse

router = APIRouter(tags=["summarize"])

LENGTH_GUIDANCE = {
    "short": "Summarize the text in 2 concise bullet points.",
    "medium": "Summarize the text in one short paragraph plus 3 bullets.",
    "long": "Summarize the text with key points, risks, and next actions.",
}


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest) -> SummarizeResponse:
    """Summarize long text with a configurable length.

    Example request:
    `{"text": "Long text...", "length": "short"}`
    """
    completion = await create_completion(
        CompletionRequest(
            prompt=request.text,
            system_message=LENGTH_GUIDANCE[request.length],
            temperature=0.1,
        )
    )
    return SummarizeResponse(summary=completion.content, length=request.length)
