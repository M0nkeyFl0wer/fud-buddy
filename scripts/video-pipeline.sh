#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
LOCAL_FILE="${2:-}"

if [[ -z "$REMOTE" || -z "$LOCAL_FILE" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  cat <<'EOF'
Usage: scripts/video-pipeline.sh REMOTE_USER@REMOTE_HOST /path/to/video.mp4

End-to-end helper: upload -> remote process -> (optional) transcribe -> download artifacts.

Env overrides:
  REMOTE_BASE_DIR       (default: /tmp/fud-video)
  REMOTE_OUT_DIR        (default: /tmp/fud-video/out)
  REMOTE_PROCESS_CMD    (default: ffprobe + audio + thumbs)
  LOCAL_ARTIFACTS_DIR   (default: ./artifacts)

  ENABLE_TRANSCRIBE=1         Run transcription step
  AUTO_INSTALL_TRANSCRIBE=1   Install faster-whisper into the remote output venv if missing
  WHISPER_MODEL=small
  WHISPER_DEVICE=cuda
  WHISPER_COMPUTE_TYPE=float16

Example:
  LOCAL_ARTIFACTS_DIR=./artifacts/demo \
  ENABLE_TRANSCRIBE=1 AUTO_INSTALL_TRANSCRIBE=1 \
  WHISPER_MODEL=small WHISPER_DEVICE=cuda WHISPER_COMPUTE_TYPE=float16 \
  scripts/video-pipeline.sh REMOTE_USER@REMOTE_HOST ./demo.mp4
EOF
  exit 1
fi

LOCAL_ARTIFACTS_DIR="${LOCAL_ARTIFACTS_DIR:-./artifacts}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

REMOTE_PATH="${SCRIPT_DIR}/push-video.sh"
REMOTE_INPUT="$(${REMOTE_PATH} "$REMOTE" "$LOCAL_FILE")"
echo "Uploaded: $REMOTE_INPUT"

REMOTE_OUT_DIR="$(${SCRIPT_DIR}/process-video-remote.sh "$REMOTE" "$REMOTE_INPUT")"
echo "Remote out: $REMOTE_OUT_DIR"

if [[ "${ENABLE_TRANSCRIBE:-0}" == "1" ]]; then
  echo "Transcribing on remote..."
  "${SCRIPT_DIR}/transcribe-video-remote.sh" "$REMOTE" "$REMOTE_OUT_DIR"
fi

"${SCRIPT_DIR}/pull-artifacts.sh" "$REMOTE" "$REMOTE_OUT_DIR" "$LOCAL_ARTIFACTS_DIR"
