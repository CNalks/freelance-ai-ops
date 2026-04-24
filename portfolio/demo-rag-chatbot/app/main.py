from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse

from app.chat import ChatRequest, stream_chat_response
from app.ingest import ingest_file, list_documents

app = FastAPI(title="RAG Chatbot Demo")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(file: UploadFile = File(...)) -> dict[str, int | str]:
    return await ingest_file(file)


@app.post("/chat")
def chat(request: ChatRequest) -> StreamingResponse:
    return stream_chat_response(request)


@app.get("/documents")
def documents() -> dict[str, list[dict[str, int | str]]]:
    return list_documents()
