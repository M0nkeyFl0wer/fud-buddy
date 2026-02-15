#!/usr/bin/env python3

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from typing import Any, Optional


PERSONAS: dict[str, str] = {
    "sassy": "Witty, opinionated, playful. Short punchy lines. No cringe.",
    "warm": "Friendly, cozy, supportive. Still concise.",
    "deadpan": "Dry humor, minimal flourish, sharp observations.",
}

OUTFIT_PRESETS: dict[str, str] = {
    "cozy": "Soft layers, comfy shoes, casual but intentional.",
    "date": "A little nicer: clean fit, one standout piece, comfortable shoes.",
    "street": "Streetwear vibe: sneakers, statement jacket, minimal accessories.",
    "rain": "Rain-ready: waterproof shell, grippy shoes, hair/umbrella plan.",
    "any": "Dress for the weather; aim for comfortable + confident.",
}


def _usage() -> int:
    print(
        "Usage: scripts/analyze-transcript.py /path/to/transcript.txt", file=sys.stderr
    )
    print("", file=sys.stderr)
    print("Env:", file=sys.stderr)
    print("  OLLAMA_BASE_URL   (default: http://127.0.0.1:11434)", file=sys.stderr)
    print("  OLLAMA_MODEL      (default: qwen2.5:latest)", file=sys.stderr)
    print("  SEARXNG_URL        (optional: http://127.0.0.1:8888)", file=sys.stderr)
    print("  VIBE              (optional: e.g. cozy, date, loud)", file=sys.stderr)
    print("  PERSONA_PRESET    (optional: sassy|warm|deadpan)", file=sys.stderr)
    print("  OUTFIT_PRESET     (optional: cozy|date|street|rain|any)", file=sys.stderr)
    return 2


def _ollama_generate(base_url: str, model: str, prompt: str, temperature: float) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }

    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = resp.read().decode("utf-8")
        data = json.loads(raw)
    return str(data.get("response", "") or "").strip()


def _extract_first_json_array(text: str) -> Optional[list[Any]]:
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except Exception:
        return None
    return parsed if isinstance(parsed, list) else None


def _searxng_search(searxng_url: str, query: str) -> list[dict[str, str]]:
    base = searxng_url.rstrip("/")
    url = f"{base}/search?{urllib.parse.urlencode({'q': query, 'format': 'json', 'language': 'en', 'safesearch': '1'})}"
    req = urllib.request.Request(
        url, headers={"Accept": "application/json"}, method="GET"
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
        data = json.loads(raw)
    results = data.get("results", [])
    out: list[dict[str, str]] = []
    if isinstance(results, list):
        for r in results[:6]:
            if not isinstance(r, dict):
                continue
            out.append(
                {
                    "title": str(r.get("title") or ""),
                    "url": str(r.get("url") or ""),
                    "content": str(r.get("content") or ""),
                    "engine": str(r.get("engine") or ""),
                }
            )
    return [r for r in out if r.get("url")]


def _pick_presets(vibe: str) -> tuple[str, str]:
    persona = os.environ.get("PERSONA_PRESET", "sassy").strip().lower() or "sassy"
    outfit = os.environ.get("OUTFIT_PRESET", "").strip().lower() or ""

    if persona not in PERSONAS:
        persona = "sassy"

    if outfit and outfit in OUTFIT_PRESETS:
        return persona, outfit

    vibe_low = (vibe or "").strip().lower()
    if any(k in vibe_low for k in ("date", "fancy", "special")):
        return persona, "date"
    if any(k in vibe_low for k in ("cozy", "chill", "comfort")):
        return persona, "cozy"
    if any(k in vibe_low for k in ("rain", "wet", "storm")):
        return persona, "rain"
    if any(k in vibe_low for k in ("street", "hype", "club", "loud")):
        return persona, "street"
    return persona, "any"


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        return _usage()

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"File not found: {path}", file=sys.stderr)
        return 2

    base_url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:latest")
    searxng_url = os.environ.get("SEARXNG_URL", "").strip()
    vibe = os.environ.get("VIBE", "").strip()
    persona, outfit = _pick_presets(vibe)

    with open(path, "r", encoding="utf-8") as f:
        transcript = f.read().strip()

    max_chars = int(os.environ.get("TRANSCRIPT_MAX_CHARS", "18000"))
    if len(transcript) > max_chars:
        transcript = transcript[-max_chars:]

    extract_prompt = (
        "Extract up to 5 restaurant candidates mentioned in this transcript. "
        "Return ONLY a JSON array of objects with keys: name, locationHint. "
        "If none are mentioned, return an empty array.\n\n"
        f"Transcript:\n{transcript}\n"
    )

    extracted = _ollama_generate(base_url, model, extract_prompt, temperature=0.1)
    candidates = _extract_first_json_array(extracted) or []

    picked: list[dict[str, str]] = []
    for c in candidates:
        if not isinstance(c, dict):
            continue
        name = str(c.get("name") or "").strip()
        loc = str(c.get("locationHint") or "").strip()
        if not name:
            continue
        picked.append({"name": name, "locationHint": loc})
        if len(picked) >= 2:
            break

    if len(picked) < 2:
        # If transcript doesn't name two places, let search + model propose candidates.
        picked = picked or [{"name": "", "locationHint": ""}]

    sources: list[dict[str, str]] = []
    if searxng_url:
        queries: list[str] = []
        for p in picked[:2]:
            q_name = p.get("name") or ""
            q_loc = p.get("locationHint") or ""
            if q_name:
                queries.append(f"{q_name} {q_loc} signature dish")
                queries.append(f"{q_name} {q_loc} owner chef")
                queries.append(f"{q_name} {q_loc} reviews")
        if not queries:
            queries = ["best restaurants mentioned in this transcript"]

        seen_urls: set[str] = set()
        for q in queries[:6]:
            try:
                results = _searxng_search(searxng_url, q)
            except Exception:
                results = []
            for r in results:
                url = r.get("url") or ""
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                sources.append(r)
            if len(sources) >= 10:
                break

    sources_text = "\n".join(
        [
            f"- {s.get('title', '').strip()} ({s.get('engine', '').strip()})\n  {s.get('url', '').strip()}\n  {(s.get('content', '') or '').strip()[:260]}"
            for s in sources[:10]
        ]
    )

    persona_text = PERSONAS.get(persona, PERSONAS["sassy"])
    outfit_text = OUTFIT_PRESETS.get(outfit, OUTFIT_PRESETS["any"])

    final_prompt = (
        "You are FUD Buddy, a fun but helpful food guide.\n\n"
        f"Vibe: {vibe or 'any'}\n"
        f"Persona preset: {persona} -> {persona_text}\n"
        f"Outfit preset: {outfit} -> {outfit_text}\n\n"
        "Use the transcript and the web snippets (if provided) to recommend exactly TWO different restaurants.\n"
        "Keep it SUPER simple for the user.\n\n"
        "For each restaurant, output JSON with these keys ONLY:\n"
        "- restaurant: {name: string, locationHint: string|null}\n"
        "- placeStory: string (2-3 sentences; mention specialty and what people say; name owner/chef only if present in snippets)\n"
        "- whatToWear: string (one short line)\n"
        "- order: {main: string, side: string, drink: string}\n"
        "- backupOrder: {main: string, side: string, drink: string}\n"
        "- sources: array of {title: string, url: string} (0-6 items)\n\n"
        "Hard rules:\n"
        "- Return ONLY a JSON array with exactly 2 objects.\n"
        "- Be grounded: if you can't confirm a detail from transcript/snippets, keep it generic.\n"
        "- Make the story fun, but short.\n\n"
        "Transcript:\n"
        f"{transcript}\n\n"
        "Web snippets:\n"
        f"{sources_text or '(none)'}\n"
    )

    out_text = _ollama_generate(base_url, model, final_prompt, temperature=0.6)
    out_json = _extract_first_json_array(out_text)
    if out_json is None or len(out_json) != 2:
        print("Model returned invalid JSON array", file=sys.stderr)
        preview = out_text[:600].replace("\n", " ")
        print(f"Preview: {preview}", file=sys.stderr)
        return 1

    sys.stdout.write(json.dumps(out_json, ensure_ascii=True, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
