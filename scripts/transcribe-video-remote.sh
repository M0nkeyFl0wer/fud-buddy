#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-}"
REMOTE_OUT="${2:-}"

if [[ -z "$REMOTE" || -z "$REMOTE_OUT" || "$REMOTE" == "-h" || "$REMOTE" == "--help" ]]; then
  echo "Usage: $0 REMOTE_USER@REMOTE_HOST /remote/out/dir"
  echo
  echo "Transcribes /remote/out/dir/audio_16k.wav on the remote host using faster-whisper."
  echo
  echo "Env overrides:"
  echo "  AUTO_INSTALL_TRANSCRIBE=1      Install faster-whisper into /remote/out/dir/.venv-fw if missing"
  echo "  WHISPER_MODEL=small            Model size (tiny/base/small/medium/large-v3, etc.)"
  echo "  WHISPER_DEVICE=cuda            Device (cuda/cpu)"
  echo "  WHISPER_COMPUTE_TYPE=float16   Compute type (float16/int8, etc.)"
  exit 1
fi

AUTO_INSTALL_TRANSCRIBE="${AUTO_INSTALL_TRANSCRIBE:-0}"
WHISPER_MODEL="${WHISPER_MODEL:-small}"
WHISPER_DEVICE="${WHISPER_DEVICE:-cuda}"
WHISPER_COMPUTE_TYPE="${WHISPER_COMPUTE_TYPE:-float16}"

remote_out_q="$(printf %q "$REMOTE_OUT")"
model_q="$(printf %q "$WHISPER_MODEL")"
device_q="$(printf %q "$WHISPER_DEVICE")"
compute_q="$(printf %q "$WHISPER_COMPUTE_TYPE")"

ssh -t "$REMOTE" \
  "REMOTE_OUT=${remote_out_q} AUTO_INSTALL_TRANSCRIBE=${AUTO_INSTALL_TRANSCRIBE} WHISPER_MODEL=${model_q} WHISPER_DEVICE=${device_q} WHISPER_COMPUTE_TYPE=${compute_q} bash -s" \
  <<'EOF_REMOTE'
set -euo pipefail

AUDIO="$REMOTE_OUT/audio_16k.wav"
if [[ ! -f "$AUDIO" ]]; then
  echo "Missing audio file: $AUDIO" >&2
  echo "Run scripts/process-video-remote.sh first (it extracts audio_16k.wav)." >&2
  exit 2
fi

VENV="$REMOTE_OUT/.venv-fw"
PY="$VENV/bin/python"

if [[ ! -x "$PY" ]]; then
  if [[ "${AUTO_INSTALL_TRANSCRIBE}" != "1" ]]; then
    echo "faster-whisper venv not found at: $VENV" >&2
    echo "Re-run with AUTO_INSTALL_TRANSCRIBE=1 to install into that venv." >&2
    exit 3
  fi

  python3 -m venv "$VENV"
  "$PY" -m pip install -U pip wheel >/dev/null
  "$PY" -m pip install -U faster-whisper >/dev/null
fi

"$PY" - <<"PY"
import json
import os
from faster_whisper import WhisperModel

out_dir = os.environ["REMOTE_OUT"]
audio = os.path.join(out_dir, "audio_16k.wav")

model_name = os.environ.get("WHISPER_MODEL", "small")
device = os.environ.get("WHISPER_DEVICE", "cuda")
compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "float16")

model = WhisperModel(model_name, device=device, compute_type=compute_type)
segments, info = model.transcribe(audio, vad_filter=True)

seg_list = []
text_parts = []
for s in segments:
    seg_list.append({
        "start": float(getattr(s, "start", 0.0)),
        "end": float(getattr(s, "end", 0.0)),
        "text": getattr(s, "text", "").strip(),
    })
    if seg_list[-1]["text"]:
        text_parts.append(seg_list[-1]["text"])

payload = {
    "language": getattr(info, "language", None),
    "language_probability": getattr(info, "language_probability", None),
    "model": model_name,
    "segments": seg_list,
}

with open(os.path.join(out_dir, "transcript.json"), "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=True, indent=2)

with open(os.path.join(out_dir, "transcript.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(text_parts) + "\n")

print(f"Wrote: {out_dir}/transcript.json")
print(f"Wrote: {out_dir}/transcript.txt")
PY
EOF_REMOTE
