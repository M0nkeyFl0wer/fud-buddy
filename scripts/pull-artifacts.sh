#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
REMOTE_DIR="${2:-}"
LOCAL_DIR="${3:-}"

if [[ -z "$REMOTE" || -z "$REMOTE_DIR" || -z "$LOCAL_DIR" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  echo "Usage: $0 REMOTE_USER@REMOTE_HOST /remote/out/dir ./local-dir"
  echo
  echo "Downloads artifacts from the remote host into a local directory."
  exit 1
fi

mkdir -p "$LOCAL_DIR"
scp -r "$REMOTE:$REMOTE_DIR" "$LOCAL_DIR" >/dev/null
echo "Downloaded to: $LOCAL_DIR"
