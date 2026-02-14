# FUD Buddy Backend

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set environment variables
cp .env.example .env
# Edit .env with your values

# 3. Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `YELP_API_KEY` | Yes | Yelp Fusion API key (get from https://www.yelp.com/developers) |
| `LLM_BASE_URL` | Yes | Local LLM endpoint (e.g., http://localhost:8080) |
| `LLM_API_KEY` | No | API key for LLM (if required) |
| `LLM_MODEL` | No | Model name (default: llama-3.1-70b) |
| `COMFYUI_URL` | No | ComfyUI server URL for image generation |
| `CORS_ORIGINS` | No | Comma-separated list of allowed origins |

## API Endpoints

### Chat
- `POST /api/chat/stream` - Streaming chat endpoint (SSE)

### Images
- `POST /api/images/generate` - Generate image via ComfyUI
- `GET /api/images/{id}/status` - Check image generation status

### Health
- `GET /health` - Health check

## Deployment

See DEPLOY.md for full deployment instructions.
