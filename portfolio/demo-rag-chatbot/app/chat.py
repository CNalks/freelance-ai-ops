from collections.abc import AsyncIterator

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.config import get_settings
from app.ingest import get_vector_store


class ChatRequest(BaseModel):
    question: str


def stream_chat_response(request: ChatRequest) -> StreamingResponse:
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")

    vector_store = get_vector_store()
    if not vector_store.get(limit=1).get("ids", []):
        raise HTTPException(status_code=400, detail="Please ingest a document before starting a chat.")

    return StreamingResponse(
        generate_answer(request.question, vector_store),
        media_type="text/event-stream",
    )


async def generate_answer(question: str, vector_store: Chroma) -> AsyncIterator[str]:
    settings = get_settings()
    docs = vector_store.similarity_search(question, k=4)
    context = "\n\n".join(doc.page_content for doc in docs)

    llm = ChatOpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        streaming=True,
        temperature=0,
    )

    messages = [
        SystemMessage(
            content=(
                "Answer the user question using only the provided context. "
                "If the context does not contain the answer, say you do not know."
            )
        ),
        HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"),
    ]

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield f"data: {chunk.content}\n\n"

    yield "data: [DONE]\n\n"
