from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.llm_client import list_models
from app.routes import completions, extract, summarize

settings = get_settings()

app = FastAPI(title="FastAPI + LLM Backend Demo")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(completions.router)
app.include_router(extract.router)
app.include_router(summarize.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Return service health.

    Example response:
    `{"status": "ok"}`
    """
    return {"status": "ok"}


@app.get("/models")
async def models() -> dict[str, list[str]]:
    """List models available to the configured OpenAI account.

    Example response:
    `{"models": ["gpt-4o-mini"]}`
    """
    return {"models": await list_models()}
