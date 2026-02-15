#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
LOCAL_FILE="${2:-}"

if [[ -z "$REMOTE" || -z "$LOCAL_FILE" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  echo "Usage: $0 REMOTE_USER@REMOTE_HOST /path/to/video.mp4"
  echo
  echo "End-to-end helper: upload -> remote process -> download artifacts."
  echo
  echo "Env overrides:"
  echo "  REMOTE_BASE_DIR     (default: /tmp/fud-video)"
  echo "  REMOTE_OUT_DIR      (default: /tmp/fud-video/out)"
  echo "  REMOTE_PROCESS_CMD  (default: ffprobe metadata only)"
  echo "  LOCAL_ARTIFACTS_DIR (default: ./artifacts)"
  echo
  echo "Example:"
  echo "  LOCAL_ARTIFACTS_DIR=./artifacts/demo \\\n+    REMOTE_PROCESS_CMD='python3 -m your_pkg.process --in \"$REMOTE_INPUT\" --out \"$REMOTE_OUT\"' \\\n+    $0 REMOTE_USER@REMOTE_HOST ./demo.mp4"
  exit 1
fi

LOCAL_ARTIFACTS_DIR="${LOCAL_ARTIFACTS_DIR:-./artifacts}"

REMOTE_PATH="$("$(dirname "$0")/push-video.sh" "$REMOTE" "$LOCAL_FILE")"
echo "Uploaded: $REMOTE_PATH"

REMOTE_OUT_DIR="$("$(dirname "$0")/process-video-remote.sh" "$REMOTE" "$REMOTE_PATH")"
echo "Remote out: $REMOTE_OUT_DIR"

"$(dirname "$0")/pull-artifacts.sh" "$REMOTE" "$REMOTE_OUT_DIR" "$LOCAL_ARTIFACTS_DIR"
