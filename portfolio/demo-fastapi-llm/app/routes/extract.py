from fastapi import APIRouter

from app.llm_client import structured_extract
from app.schemas import ExtractRequest, ExtractResponse

router = APIRouter(tags=["extract"])


@router.post("/extract", response_model=ExtractResponse)
async def extract(request: ExtractRequest) -> ExtractResponse:
    """Extract structured data matching a JSON schema.

    Example request:
    `{"text": "Jane Doe, jane@example.com", "schema": {"type": "object", "properties": {"name": {"type": "string"}, "email": {"type": "string"}}}}`
    """
    result = await structured_extract(request.text, request.json_schema)
    return ExtractResponse(**result)
