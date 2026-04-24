from collections import Counter
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.config import get_settings


def get_vector_store() -> Chroma:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    return Chroma(
        collection_name=settings.collection_name,
        embedding_function=OpenAIEmbeddings(api_key=settings.openai_api_key),
        persist_directory=str(settings.chroma_path),
    )


async def ingest_file(file: UploadFile) -> dict[str, int | str]:
    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()

    if suffix not in {".txt", ".pdf"}:
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")

    content = await file.read()
    text = extract_text(content, suffix)
    if not text.strip():
        raise HTTPException(status_code=400, detail="The uploaded file does not contain readable text.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_text(text)
    documents = [
        Document(page_content=chunk, metadata={"source": filename, "chunk_index": index})
        for index, chunk in enumerate(chunks)
    ]

    vector_store = get_vector_store()
    vector_store.add_documents(documents)

    return {"document": filename, "chunks": len(documents)}


def extract_text(content: bytes, suffix: str) -> str:
    if suffix == ".txt":
        return content.decode("utf-8")

    reader = PdfReader(BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def list_documents() -> dict[str, list[dict[str, int | str]]]:
    vector_store = get_vector_store()
    stored = vector_store.get(include=["metadatas"])
    sources = [
        metadata.get("source")
        for metadata in stored.get("metadatas", [])
        if metadata and metadata.get("source")
    ]

    counts = Counter(sources)
    return {
        "documents": [
            {"name": name, "chunks": count}
            for name, count in sorted(counts.items())
        ]
    }
