# Task: Build Demo 2 — FastAPI + LLM Backend

## Context

This is the `freelance-ai-ops` repo at `https://github.com/CNalks/freelance-ai-ops`.
Work in `portfolio/demo-fastapi-llm/`. Remove the `.gitkeep` file.

## Requirements

Build a production-style FastAPI backend that showcases LLM integration patterns. This is a portfolio piece — it should demonstrate clean architecture, not just "hello world with OpenAI."

### Endpoints

1. **POST /completions** — Accept a prompt + optional `system_message`, call OpenAI chat completions, return structured JSON response with token usage and latency.
2. **POST /completions/stream** — Same as above but stream the response via SSE (Server-Sent Events).
3. **POST /extract** — Accept raw text + a JSON schema definition, use OpenAI function calling / structured outputs to extract data matching the schema. Example: extract name, email, phone from a block of text.
4. **POST /summarize** — Accept long text, return a summary with configurable length (short/medium/long).
5. **GET /models** — List available models from OpenAI API.
6. **GET /health** — Health check.

### Architecture

```
demo-fastapi-llm/
├── README.md
├── app/
│   ├── main.py          # FastAPI app, CORS, routes
│   ├── config.py        # Settings via pydantic-settings, env vars
│   ├── llm_client.py    # Async OpenAI client wrapper (singleton)
│   ├── routes/
│   │   ├── completions.py
│   │   ├── extract.py
│   │   └── summarize.py
│   └── schemas.py       # Pydantic request/response models
├── tests/
│   └── test_health.py   # At minimum, test /health returns 200
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example          # OPENAI_API_KEY=sk-xxx
└── .gitignore
```

### Technical Details

- Use `openai` Python SDK (async client).
- Use `pydantic-settings` for config.
- All endpoints must have type annotations and docstrings.
- Include request/response examples in docstrings (they show up in Swagger UI).
- Error handling: catch OpenAI API errors, return clean JSON error responses.
- Dockerfile: multi-stage build, slim Python image.
- docker-compose.yml: single service with env_file.
- README.md: project description, quick start (local + Docker), API docs link, example curl commands for each endpoint.

### Validation

Before committing, run:

```bash
python -m compileall app
python -c "from fastapi.testclient import TestClient; from app.main import app; r = TestClient(app).get('/health'); assert r.status_code == 200; print('OK')"
```

### Git

Commit message: `add fastapi-llm demo with structured extraction and streaming`
Push to GitHub.
Update `docs/progress.md` — mark "Demo project 2: FastAPI + LLM" as complete.
