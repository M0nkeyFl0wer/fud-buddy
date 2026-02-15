# FUD Buddy Backend

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set environment variables
cp .env.example .env
# Edit .env with your values

# 3. Run the server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OLLAMA_BASE_URL` | No | Ollama base URL (default: http://localhost:11434) |
| `OLLAMA_MODEL` | No | Ollama model name (default: qwen2.5:latest) |
| `SEARXNG_URL` | No | SearxNG base URL (example: http://127.0.0.1:8888). If unset, web search returns no results. |
| `DATABASE_URL` | No | Optional Postgres connection string for saving sessions/feedback |
| `CORS_ORIGINS` | No | Comma-separated list of allowed origins |

## API Endpoints

### Chat
- `POST /api/chat/stream` - Streaming chat endpoint (SSE)

### Health
- `GET /health` - Health check
