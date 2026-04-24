# RAG Chatbot Demo

FastAPI RAG chatbot demo with LangChain, OpenAI API, and local ChromaDB storage.

## Features

- Upload `.txt` or `.pdf` files with `POST /ingest`
- Store document chunks in local ChromaDB
- Ask questions with `POST /chat`
- Stream model responses with Server-Sent Events
- List imported documents with `GET /documents`

## Local Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Set your OpenAI key in `.env`:

```bash
OPENAI_API_KEY=sk-xxx
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

## Docker

Build and run with Docker:

```bash
docker build -t demo-rag-chatbot .
docker run --rm -p 8000:8000 --env-file .env -v "%cd%/chroma_db:/app/chroma_db" demo-rag-chatbot
```

Docker Compose one-command example:

```yaml
services:
  rag-chatbot:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./chroma_db:/app/chroma_db
```

```bash
docker compose up --build
```

## API Examples

Ingest a text or PDF file:

```bash
curl -X POST http://localhost:8000/ingest ^
  -F "file=@sample.txt"
```

Ask a question and receive SSE output:

```bash
curl -N -X POST http://localhost:8000/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"What is this document about?\"}"
```

List ingested documents:

```bash
curl http://localhost:8000/documents
```
