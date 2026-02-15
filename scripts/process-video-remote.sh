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

DEFAULT_CMD='set -euo pipefail
mkdir -p "$REMOTE_OUT"

# Always capture container/stream metadata
if command -v ffprobe >/dev/null 2>&1; then
  ffprobe -v error -print_format json -show_format -show_streams "$REMOTE_INPUT" > "$REMOTE_OUT/ffprobe.json"
else
  echo "ffprobe not found on remote host" > "$REMOTE_OUT/ffprobe.error.txt"
fi

# Optional: extract a 16kHz mono WAV for speech models
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -y -hide_banner -loglevel error -i "$REMOTE_INPUT" -vn -ac 1 -ar 16000 "$REMOTE_OUT/audio_16k.wav" || true

  # Optional: thumbnails (one every N seconds)
  THUMB_EVERY_SECONDS="${THUMB_EVERY_SECONDS:-10}"
  mkdir -p "$REMOTE_OUT/thumbs"
  ffmpeg -y -hide_banner -loglevel error -i "$REMOTE_INPUT" \
    -vf "fps=1/${THUMB_EVERY_SECONDS},scale=640:-1" \
    "$REMOTE_OUT/thumbs/%04d.jpg" || true
else
  echo "ffmpeg not found on remote host" > "$REMOTE_OUT/ffmpeg.error.txt"
fi'
REMOTE_PROCESS_CMD="${REMOTE_PROCESS_CMD:-$DEFAULT_CMD}"

ssh -t "$REMOTE" "export REMOTE_INPUT='$REMOTE_INPUT' REMOTE_OUT='$REMOTE_OUT_DIR'; bash -lc '$REMOTE_PROCESS_CMD'"

echo "$REMOTE_OUT_DIR"
