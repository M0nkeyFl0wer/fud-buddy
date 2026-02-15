#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
LOCAL_FILE="${2:-}"

if [[ -z "$REMOTE" || -z "$LOCAL_FILE" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  echo "Usage: $0 REMOTE_USER@REMOTE_HOST /path/to/video.mp4"
  echo
  echo "Uploads a local video to a timestamped directory on the remote host."
  echo
  echo "Env overrides:"
  echo "  REMOTE_BASE_DIR  (default: /tmp/fud-video)"
  exit 1
fi

if [[ ! -f "$LOCAL_FILE" ]]; then
  echo "File not found: $LOCAL_FILE" >&2
  exit 2
fi

REMOTE_BASE_DIR="${REMOTE_BASE_DIR:-/tmp/fud-video}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BASENAME="$(basename "$LOCAL_FILE")"
REMOTE_DIR="${REMOTE_BASE_DIR}/${STAMP}"

ssh -o BatchMode=yes "$REMOTE" "mkdir -p '$REMOTE_DIR'"
scp "$LOCAL_FILE" "$REMOTE:$REMOTE_DIR/$BASENAME" >/dev/null

echo "$REMOTE_DIR/$BASENAME"
