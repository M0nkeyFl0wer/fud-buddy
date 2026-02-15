#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
REMOTE_INPUT="${2:-}"

if [[ -z "$REMOTE" || -z "$REMOTE_INPUT" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  echo "Usage: $0 REMOTE_USER@REMOTE_HOST /remote/path/to/video.mp4"
  echo
  echo "Runs a video processing command on the remote host."
  echo
  echo "Env overrides:"
  echo "  REMOTE_OUT_DIR      (default: /tmp/fud-video/out)"
  echo "  REMOTE_PROCESS_CMD  (default: ffprobe metadata only)"
  echo
  echo "The command runs with these variables available:"
  echo "  REMOTE_INPUT  - remote input video path"
  echo "  REMOTE_OUT    - remote output directory"
  exit 1
fi

REMOTE_OUT_DIR="${REMOTE_OUT_DIR:-/tmp/fud-video/out}"

DEFAULT_CMD='mkdir -p "$REMOTE_OUT" && ffprobe -v error -print_format json -show_format -show_streams "$REMOTE_INPUT" > "$REMOTE_OUT/ffprobe.json"'
REMOTE_PROCESS_CMD="${REMOTE_PROCESS_CMD:-$DEFAULT_CMD}"

ssh -t "$REMOTE" "export REMOTE_INPUT='$REMOTE_INPUT' REMOTE_OUT='$REMOTE_OUT_DIR'; bash -lc '$REMOTE_PROCESS_CMD'"

echo "$REMOTE_OUT_DIR"
