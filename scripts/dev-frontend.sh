#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8010}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}}"

echo "Frontend will use API: ${VITE_API_BASE_URL}"

export VITE_API_BASE_URL
exec npm run dev
