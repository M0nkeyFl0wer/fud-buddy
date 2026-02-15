#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
if [[ -z "$REMOTE" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  echo "Usage: $0 REMOTE_USER@REMOTE_HOST"
  echo
  echo "Tunnels a remote Ollama instance to your local machine."
  echo
  echo "Environment overrides:"
  echo "  LOCAL_BIND   (default: 127.0.0.1)"
  echo "  LOCAL_PORT   (default: 11434)"
  echo "  REMOTE_HOST  (default: 127.0.0.1)"
  echo "  REMOTE_PORT  (default: 11434)"
  exit 1
fi

LOCAL_BIND="${LOCAL_BIND:-127.0.0.1}"
LOCAL_PORT="${LOCAL_PORT:-11434}"
REMOTE_HOST="${REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${REMOTE_PORT:-11434}"

echo "Tunneling Ollama: http://${LOCAL_BIND}:${LOCAL_PORT} -> ${REMOTE}:${REMOTE_HOST}:${REMOTE_PORT}"
echo "Press Ctrl-C to stop."

exec ssh \
  -N \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -L "${LOCAL_BIND}:${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
  "$REMOTE"
