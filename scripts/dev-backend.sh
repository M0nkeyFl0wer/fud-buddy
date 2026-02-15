#!/usr/bin/env bash
set -euo pipefail

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8010}"

export SEARXNG_URL="${SEARXNG_URL:-http://127.0.0.1:8888}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:latest}"

echo "Backend:  http://${BACKEND_HOST}:${BACKEND_PORT}"
echo "SearxNG:  ${SEARXNG_URL}"
echo "Ollama:   ${OLLAMA_BASE_URL} (model=${OLLAMA_MODEL})"
echo
echo "Tip: if port ${BACKEND_PORT} is in use, set BACKEND_PORT=8011 (or similar)."

exec python3 -m uvicorn \
  --app-dir fud-buddy-backend \
  main:app \
  --host "$BACKEND_HOST" \
  --port "$BACKEND_PORT" \
  --reload
