#!/usr/bin/env bash
# FUD Buddy — standalone local launch (Ollama + backend + frontend)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Preflight: check Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "[fud-buddy] Ollama not detected. Start it with: ollama serve"
  exit 1
fi

MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; print(', '.join(m['name'] for m in json.load(sys.stdin).get('models',[])))" 2>/dev/null)
echo "[fud-buddy] Ollama OK — models: ${MODELS:-none}"

if [ -z "$MODELS" ]; then
  echo "[fud-buddy] No models installed. Run: ollama pull llama3.2:3b"
  exit 1
fi

# Kill stale backend if needed
if lsof -ti:8000 > /dev/null 2>&1; then
  echo "[fud-buddy] Killing old backend on :8000..."
  lsof -ti:8000 | xargs kill -9 2>/dev/null
  sleep 1
fi

# Backend
echo "[fud-buddy] Starting backend..."
"$SCRIPT_DIR/server/.venv/bin/python" -m server.app &
BACKEND_PID=$!
sleep 2

# Frontend
echo "[fud-buddy] Starting frontend..."
npx vite --host 0.0.0.0 &
FRONTEND_PID=$!
sleep 2

echo ""
echo "========================================="
echo "  FUD Buddy running — fully local"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  LLM:      Ollama (${MODELS})"
echo "  Data:     SQLite (server/fudbuddy.db)"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop."

cleanup() {
  echo ""
  echo "[fud-buddy] Shutting down..."
  kill $FRONTEND_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  echo "[fud-buddy] Done."
}
trap cleanup EXIT INT TERM

wait
