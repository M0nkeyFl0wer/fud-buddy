## Dev Setup (Recommended)

This repo is split into:
- Frontend: Vite/React (this repo)
- Backend: FastAPI in `fud-buddy-backend/`
- Search: optional local SearxNG in `infra/searxng/`
- Model: Ollama (local or tunneled from a remote host)

### 1) Start SearxNG (Local)

```bash
docker compose -f infra/searxng/docker-compose.yml up -d
curl -s "http://127.0.0.1:8888/search?q=pizza&format=json" | head
```

### 2) (Optional) Tunnel Ollama From A Remote Host

If Ollama runs on a remote machine, tunnel it so your local backend can reach it as
`http://127.0.0.1:11434`.

```bash
ssh -L 11434:127.0.0.1:11434 REMOTE_USER@REMOTE_HOST -N
```

Or use the helper script:

```bash
./scripts/tunnel-ollama.sh REMOTE_USER@REMOTE_HOST
```

If Ollama is local, skip this.

### 3) Run The Backend

Pick a free port. If you already have something bound to `127.0.0.1:8000` (common when
using SSH forwards), use `8010`.

```bash
export SEARXNG_URL="http://127.0.0.1:8888"
export OLLAMA_BASE_URL="http://127.0.0.1:11434"
export OLLAMA_MODEL="qwen2.5:latest"

python3 -m uvicorn --app-dir fud-buddy-backend main:app --host 127.0.0.1 --port 8010
```

Or use the helper script:

```bash
./scripts/dev-backend.sh
```

Verify:

```bash
curl -s http://127.0.0.1:8010/health
```

### 4) Run The Frontend

Point the frontend at the backend you started (example: 8010):

```bash
export VITE_API_BASE_URL="http://127.0.0.1:8010"
npm run dev
```

Or use the helper script:

```bash
BACKEND_PORT=8010 ./scripts/dev-frontend.sh
```

Then open the Vite URL shown in the terminal.

### Troubleshooting

- If you get "Search returned no results": confirm SearxNG is up and `SEARXNG_URL` is set.
- If you get "LLM error": confirm `OLLAMA_BASE_URL` is reachable and the model exists.
- If port 8000 is busy: `ss -ltnp | rg ':8000'` to see what's listening.

### Remote Video Processing

If you need to process video without crushing your laptop, see `docs/REMOTE_VIDEO_PIPELINE.md`.
