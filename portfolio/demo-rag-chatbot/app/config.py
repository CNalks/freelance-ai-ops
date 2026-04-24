from functools import lru_cache
from pathlib import Path
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    chroma_path: Path = Path(os.getenv("CHROMA_PATH", "./chroma_db"))
    collection_name: str = os.getenv("CHROMA_COLLECTION", "rag_documents")


@lru_cache
def get_settings() -> Settings:
    return Settings()
