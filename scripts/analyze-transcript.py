#!/usr/bin/env python3

import json
import os
import sys
import urllib.request


def _usage() -> int:
    print(
        "Usage: scripts/analyze-transcript.py /path/to/transcript.txt", file=sys.stderr
    )
    print("", file=sys.stderr)
    print("Env:", file=sys.stderr)
    print("  OLLAMA_BASE_URL   (default: http://127.0.0.1:11434)", file=sys.stderr)
    print("  OLLAMA_MODEL      (default: qwen2.5:latest)", file=sys.stderr)
    return 2


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        return _usage()

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"File not found: {path}", file=sys.stderr)
        return 2

    base_url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:latest")

    with open(path, "r", encoding="utf-8") as f:
        transcript = f.read().strip()

    # Keep payload bounded; long transcripts can blow context.
    max_chars = int(os.environ.get("TRANSCRIPT_MAX_CHARS", "18000"))
    if len(transcript) > max_chars:
        transcript = transcript[-max_chars:]

    prompt = (
        "You are an analyst. Extract structured information from this transcript.\n\n"
        "Return ONLY valid JSON with keys:\n"
        "- summary: string (2-4 sentences)\n"
        "- restaurants: array of {name: string, location_hint: string|null, notes: string}\n"
        "- dishes: array of {name: string, restaurant: string|null, notes: string}\n"
        "- signals: array of short strings (e.g. 'pricey', 'spicy', 'lineups', 'vegan')\n\n"
        "Transcript:\n"
        f"{transcript}\n"
    )

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2},
    }

    req = urllib.request.Request(
        f"{base_url}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = resp.read().decode("utf-8")
        data = json.loads(raw)

    text = data.get("response", "").strip()
    if not text:
        print("No response from model", file=sys.stderr)
        return 1

    # Print the model output as-is (expected JSON).
    sys.stdout.write(text)
    if not text.endswith("\n"):
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
