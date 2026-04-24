# FastAPI + LLM Backend Demo

Production-style FastAPI backend showing common LLM integration patterns: chat completions, SSE streaming, structured extraction, summarization, model listing, and clean error handling.

## Quick Start

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Set your API key:

```bash
OPENAI_API_KEY=sk-xxx
```

Run locally:

```bash
uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

## Docker

```bash
docker compose up --build
```

## Endpoints

- `GET /health`
- `GET /models`
- `POST /completions`
- `POST /completions/stream`
- `POST /extract`
- `POST /summarize`

## Examples

Completion:

```bash
curl -X POST http://localhost:8000/completions ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Write a one-line product update.\"}"
```

Streaming completion:

```bash
curl -N -X POST http://localhost:8000/completions/stream ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Explain SSE in one paragraph.\"}"
```

Structured extraction:

```bash
curl -X POST http://localhost:8000/extract ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Jane Doe, jane@example.com, +1 555 123 4567\",\"schema\":{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"},\"email\":{\"type\":\"string\"},\"phone\":{\"type\":\"string\"}},\"required\":[\"name\",\"email\"]}}"
```

Summarization:

```bash
curl -X POST http://localhost:8000/summarize ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Long text goes here...\",\"length\":\"short\"}"
```

Models:

```bash
curl http://localhost:8000/models
```

## Validation

```bash
python -m compileall app
python -c "from fastapi.testclient import TestClient; from app.main import app; r = TestClient(app).get('/health'); assert r.status_code == 200; print('OK')"
```
