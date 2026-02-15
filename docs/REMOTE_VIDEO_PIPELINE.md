# Remote Video Pipeline (SSH -> Upload -> Process)

Goal: run heavy video processing on a remote host (e.g. a GPU box) instead of your laptop.

This repo intentionally does NOT store any SSH hostnames, usernames, keys, or tokens.
Use placeholders like `REMOTE_USER@REMOTE_HOST` and keep real values in your shell history
or a private ops doc.

## Pattern

1) Tunnel / connect to the remote host over SSH.
2) Copy the video from your local machine to the remote host (SCP).
3) Run processing on the remote host (ffmpeg / python / GPU model).
4) Copy the resulting artifacts back (optional): transcripts, thumbnails, JSON, etc.

## Scripts

- `scripts/tunnel-ollama.sh` - forwards remote Ollama to localhost (11434)
- `scripts/push-video.sh` - uploads a video to the remote host (timestamped path)
- `scripts/process-video-remote.sh` - runs a configurable remote processing command
- `scripts/pull-artifacts.sh` - downloads results from the remote host
- `scripts/video-pipeline.sh` - end-to-end wrapper: upload -> process -> download
- `scripts/transcribe-video-remote.sh` - optional faster-whisper transcription step

## Example Workflow

Upload a local video to the remote host:

```bash
./scripts/push-video.sh REMOTE_USER@REMOTE_HOST ./recordings/fud-demo.mp4
```

Run processing. By default this produces:
- `ffprobe.json`
- `audio_16k.wav` (if ffmpeg is available)
- `thumbs/*.jpg` (if ffmpeg is available; one every 10s by default)

You can override the remote command to run anything you want (Whisper, frame extraction,
a VLM, etc.):

```bash
REMOTE_PROCESS_CMD='python3 -m your_module.process_video --input "$REMOTE_INPUT" --out "$REMOTE_OUT"'
./scripts/process-video-remote.sh REMOTE_USER@REMOTE_HOST /tmp/fud-video/fud-demo.mp4
```

Pull artifacts back to your machine:

```bash
./scripts/pull-artifacts.sh REMOTE_USER@REMOTE_HOST /tmp/fud-video/out ./artifacts/
```

Or run the full pipeline in one step:

```bash
LOCAL_ARTIFACTS_DIR=./artifacts/demo ./scripts/video-pipeline.sh REMOTE_USER@REMOTE_HOST ./recordings/fud-demo.mp4
```

To also transcribe audio on the remote host (installs faster-whisper into a venv inside the
remote output directory):

```bash
ENABLE_TRANSCRIBE=1 AUTO_INSTALL_TRANSCRIBE=1 \
  WHISPER_MODEL=small WHISPER_DEVICE=cuda WHISPER_COMPUTE_TYPE=float16 \
  LOCAL_ARTIFACTS_DIR=./artifacts/demo \
  ./scripts/video-pipeline.sh REMOTE_USER@REMOTE_HOST ./recordings/fud-demo.mp4
```

Once you have `transcript.txt` locally, you can run a local analysis step against the
Ollama instance you tunneled (inference happens on the remote host):

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 OLLAMA_MODEL=qwen2.5:latest \
  ./scripts/analyze-transcript.py ./artifacts/demo/out/transcript.txt
```

## What We Still Need To Decide

To wire this into the app (instead of manual scripts), we need to know what "process video"
means in your workflow:

- Transcription (Whisper) only?
- Frame extraction + OCR?
- A vision-language model summary?
- Extract restaurant names/menus from TikTok/Instagram clips?

Once you pick the target outputs, we can implement a concrete remote command and a stable
artifact schema (e.g. `out/result.json`, `out/transcript.txt`, `out/thumbs/*.jpg`).
