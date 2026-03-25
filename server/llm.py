"""LLM abstraction — supports OpenRouter and Ollama."""

import json
import os
import re
from collections.abc import AsyncIterator

import httpx

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")


def build_system_prompt(preferences: dict) -> str:
    location = preferences.get("location", "near them")
    vibe = ", ".join(preferences.get("vibe") or []) or "any"
    cuisines = ", ".join(preferences.get("cuisine") or []) or "any"
    dietary = ", ".join(preferences.get("dietary") or []) or "none"
    max_travel = preferences.get("maxTravelMin", 20)

    return f"""You are FUD Buddy, a witty and opinionated food recommendation assistant.
You help people decide where to eat and exactly what to order.

Given the user's preferences below, recommend 2 restaurant options:
- Option 1: The casual/affordable pick
- Option 2: The splurge/upscale pick

Both should be REAL restaurants that actually exist near the given location.

User preferences:
- Location: {location}
- Vibe: {vibe}
- Cuisines: {cuisines}
- Dietary restrictions: {dietary}
- Max travel time: {max_travel} minutes

For EACH restaurant, provide:
1. Restaurant name and full address
2. Price range ($, $$, $$$, or $$$$)
3. What to order: a specific main dish, side, and drink
4. A backup order in case the main pick isn't available
5. What to wear (casual, smart casual, dressy, etc.)
6. A charming 2-3 sentence story about the food or place

Return ONLY valid JSON in this exact format (no markdown, no extra text):
[
  {{
    "restaurant": {{
      "name": "Restaurant Name",
      "address": "123 Street, City, Province/State",
      "priceRange": "$$"
    }},
    "order": {{
      "main": "Specific Dish Name",
      "side": "Specific Side",
      "drink": "Specific Drink"
    }},
    "backupOrder": {{
      "main": "Alternative Dish",
      "side": "Alternative Side",
      "drink": "Alternative Drink"
    }},
    "whatToWear": "Smart casual",
    "story": "A charming story about this place..."
  }}
]

Be specific with dish names. Don't say "pasta" — say "Cacio e Pepe".
Be opinionated. You're not listing a menu, you're telling them THE thing to get."""


def _extract_json(text: str) -> list[dict]:
    """Parse JSON from LLM output, stripping markdown fences if present."""
    cleaned = text.strip()
    # Strip markdown code fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    parsed = json.loads(cleaned)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        return [parsed]
    return []


def _enrich_recommendation(rec: dict) -> dict:
    """Add maps links and other derived fields."""
    restaurant = rec.get("restaurant", {})
    name = restaurant.get("name", "")
    address = restaurant.get("address", "")
    query = f"{name} {address}".strip()

    if query and "maps" not in rec:
        from urllib.parse import quote
        rec["maps"] = {
            "google": f"https://www.google.com/maps/search/?api=1&query={quote(query)}",
            "apple": f"https://maps.apple.com/?q={quote(query)}",
        }
    return rec


# ---------------------------------------------------------------------------
# OpenRouter
# ---------------------------------------------------------------------------

async def call_openrouter(
    preferences: dict,
    api_key: str,
    model: str = "google/gemini-2.0-flash-001",
) -> AsyncIterator[dict]:
    """Call OpenRouter and yield SSE-compatible event dicts."""

    system_prompt = build_system_prompt(preferences)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Find me somewhere to eat!"},
    ]

    yield {"type": "meta", "llm": {"provider": "openrouter", "model": model}}
    yield {"type": "status", "content": "Asking the AI for recommendations..."}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fudbuddy.local",
                "X-Title": "FUD Buddy",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "top_p": 0.9,
            },
        )

        if resp.status_code == 401:
            yield {"type": "error", "message": "Invalid API key. Check /config."}
            return
        if resp.status_code == 402:
            yield {"type": "error", "message": "OpenRouter credits exhausted."}
            return
        if resp.status_code == 429:
            yield {"type": "rate_limit", "message": "OpenRouter rate limit hit. Try again shortly.", "error": "cooldown"}
            return

        data = resp.json()

        # Handle OpenRouter error responses
        if "error" in data:
            err = data["error"]
            msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)

            # Model not found — suggest alternatives
            if resp.status_code == 400 or "not a valid model" in msg.lower():
                payload = {"model": model, "suggestions": []}
                if isinstance(err, dict) and "metadata" in err:
                    meta = err["metadata"]
                    if isinstance(meta, dict) and "suggestions" in meta:
                        payload["suggestions"] = meta["suggestions"]
                yield {"type": "error", "message": f"openrouter_error {json.dumps(payload)}"}
                return

            yield {"type": "error", "message": msg}
            return

        choices = data.get("choices", [])
        if not choices:
            yield {"type": "error", "message": "No response from model."}
            return

        content = choices[0].get("message", {}).get("content", "")

    yield {"type": "status", "content": "Parsing recommendations..."}

    try:
        recs = _extract_json(content)
    except (json.JSONDecodeError, ValueError):
        yield {"type": "error", "message": "Could not parse AI response. Try again."}
        return

    if not recs:
        yield {"type": "error", "message": "AI returned empty recommendations. Try again."}
        return

    # Stream each recommendation
    for i, rec in enumerate(recs):
        rec = _enrich_recommendation(rec)
        yield {"type": "option", "index": i, "recommendation": rec}

    yield {"type": "status", "content": "Done!"}


# ---------------------------------------------------------------------------
# Ollama (fully offline)
# ---------------------------------------------------------------------------

async def call_ollama(
    preferences: dict,
    model: str | None = None,
) -> AsyncIterator[dict]:
    """Call local Ollama instance and yield SSE-compatible event dicts."""

    use_model = model or OLLAMA_MODEL

    # If the requested model isn't available, pick the best installed one
    available = await ollama_models()
    if available and use_model not in available:
        # Prefer larger general-purpose models
        preferred = ["llama3.2:3b", "qwen2.5:latest", "phi3.5:3.8b", "tinyllama:latest"]
        use_model = next((m for m in preferred if m in available), available[0])
    system_prompt = build_system_prompt(preferences)

    yield {"type": "meta", "llm": {"provider": "ollama", "model": use_model}}
    yield {"type": "status", "content": "Thinking locally (Ollama)..."}

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/chat",
                json={
                    "model": use_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": "Find me somewhere to eat!"},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.7},
                },
            )

            if resp.status_code != 200:
                data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = data.get("error", f"Ollama returned {resp.status_code}")
                if "system memory" in err_msg:
                    err_msg = f"Not enough RAM for model. {err_msg}. Try a smaller model or free up memory."
                yield {"type": "error", "message": err_msg}
                return

            data = resp.json()
            content = data.get("message", {}).get("content", "")

    except httpx.ConnectError:
        yield {"type": "error", "message": "Cannot connect to Ollama. Is it running? (ollama serve)"}
        return

    yield {"type": "status", "content": "Parsing recommendations..."}

    try:
        recs = _extract_json(content)
    except (json.JSONDecodeError, ValueError):
        yield {"type": "error", "message": "Could not parse Ollama response. Try a different model or try again."}
        return

    if not recs:
        yield {"type": "error", "message": "Ollama returned empty recommendations."}
        return

    for i, rec in enumerate(recs):
        rec = _enrich_recommendation(rec)
        yield {"type": "option", "index": i, "recommendation": rec}

    yield {"type": "status", "content": "Done!"}


# ---------------------------------------------------------------------------
# Ollama health check
# ---------------------------------------------------------------------------

async def ollama_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def ollama_models() -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            if resp.status_code != 200:
                return []
            data = resp.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# OpenRouter model list
# ---------------------------------------------------------------------------

async def openrouter_models(api_key: str) -> list[str]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{OPENROUTER_BASE}/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        return [m["id"] for m in data.get("data", []) if "id" in m]
