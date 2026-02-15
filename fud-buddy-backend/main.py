from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List, Any
import os
import json
import httpx
from sse_starlette.sse import EventSourceResponse
import uuid
import re
import asyncio
from urllib.parse import quote_plus
import html
import ipaddress
from urllib.parse import urlparse
import time


try:
    from psycopg_pool import AsyncConnectionPool
except Exception:  # pragma: no cover
    AsyncConnectionPool = None

app = FastAPI(title="FUD Buddy API")

cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080",
)
cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
allow_origins = ["*"] if cors_origins == ["*"] else cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
SEARXNG_URL = os.getenv("SEARXNG_URL", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Optional: OpenRouter (OpenAI-compatible) for faster testing
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", "700"))
OPENROUTER_TIMEOUT_S = float(os.getenv("OPENROUTER_TIMEOUT_S", "45"))

# If enabled, allow client headers to provide OpenRouter key/model.
ALLOW_CLIENT_OPENROUTER = os.getenv("ALLOW_CLIENT_OPENROUTER", "0") == "1"


def _parse_bearer(auth_header: str) -> str:
    if not auth_header:
        return ""
    parts = auth_header.split(" ", 1)
    if len(parts) != 2:
        return ""
    if parts[0].lower() != "bearer":
        return ""
    return parts[1].strip()


def _sanitize_model_id(raw: str) -> str:
    s = (raw or "").strip()
    if not s or len(s) > 80:
        return ""
    # OpenRouter ids: vendor/model or vendor/model:variant
    if not re.match(r"^[a-z0-9_.-]+/[a-z0-9_.:-]+$", s, re.IGNORECASE):
        return ""

    # Common aliases / friendly ids -> OpenRouter concrete ids.
    alias_map = {
        "google/gemini-2.0-flash": "google/gemini-2.0-flash-001",
        "google/gemini-2.0-flash-lite": "google/gemini-2.0-flash-lite-001",
    }
    lowered = s.lower()
    if lowered in alias_map:
        return alias_map[lowered]
    return s


def _resolve_openrouter_overrides(request: Request) -> tuple[str, str]:
    api_key = OPENROUTER_API_KEY
    model = OPENROUTER_MODEL

    if not ALLOW_CLIENT_OPENROUTER:
        return api_key, model

    client_key = _parse_bearer(request.headers.get("authorization") or "")
    if client_key:
        api_key = client_key

    client_model = _sanitize_model_id(request.headers.get("x-fud-llm-model") or "")
    if client_model:
        model = client_model

    return api_key, model


async def _openrouter_list_models(api_key: str) -> list[str]:
    if not api_key:
        return []

    url = f"{OPENROUTER_BASE_URL.rstrip('/')}/models"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "fud-buddy",
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            return []
        data = resp.json()

    items = data.get("data")
    if not isinstance(items, list):
        return []

    out: list[str] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        mid = it.get("id")
        if isinstance(mid, str) and mid:
            out.append(mid)
    return out


@app.get("/api/openrouter/models")
async def list_openrouter_models(request: Request):
    if not ALLOW_CLIENT_OPENROUTER:
        raise HTTPException(status_code=403, detail="Client OpenRouter disabled")

    api_key = _parse_bearer(request.headers.get("authorization") or "")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing bearer key")

    models = await _openrouter_list_models(api_key)
    return {"ok": True, "models": models}


# Basic in-memory rate limiting (single-process demo)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "0") == "1"
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "3"))
RATE_LIMIT_WINDOW_S = int(os.getenv("RATE_LIMIT_WINDOW_S", "3600"))

RATE_LIMIT_WHITELIST_IPS = {
    s.strip() for s in os.getenv("RATE_LIMIT_WHITELIST_IPS", "").split(",") if s.strip()
}

RATE_LIMIT_WHITELIST_CLIENT_IDS = {
    s.strip()
    for s in os.getenv("RATE_LIMIT_WHITELIST_CLIENT_IDS", "").split(",")
    if s.strip()
}

_rate_limit_hits: dict[str, list[float]] = {}


def _get_client_id(request: Request) -> str:
    cid = request.headers.get("x-fud-client-id") or ""
    return cid.strip()[:120]


def _check_rate_limit(request: Request) -> Optional[dict]:
    if not RATE_LIMIT_ENABLED:
        return None

    ip = ""
    try:
        ip = request.client.host if request.client else ""
    except Exception:
        ip = ""

    client_id = _get_client_id(request)

    if ip and ip in RATE_LIMIT_WHITELIST_IPS:
        return None
    if client_id and client_id in RATE_LIMIT_WHITELIST_CLIENT_IDS:
        return None

    key = client_id or ip or "unknown"
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_S

    hits = _rate_limit_hits.get(key, [])
    hits = [t for t in hits if t >= window_start]
    if len(hits) >= RATE_LIMIT_MAX:
        retry_after = int(max(1, hits[0] + RATE_LIMIT_WINDOW_S - now))
        _rate_limit_hits[key] = hits
        return {
            "type": "error",
            "message": "Rate limit: too many requests. Try again later.",
            "retryAfterSeconds": retry_after,
        }

    hits.append(now)
    _rate_limit_hits[key] = hits
    return None


async def _openrouter_stream(prompt: str):
    """Yield streamed delta text from OpenRouter."""

    url = f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "fud-buddy",
    }
    body = {
        "model": OPENROUTER_MODEL,
        "temperature": 0.6,
        "max_tokens": OPENROUTER_MAX_TOKENS,
        "stream": True,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    full = ""
    async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT_S) as client:
        async with client.stream("POST", url, headers=headers, json=body) as resp:
            if resp.status_code != 200:
                detail = ""
                try:
                    body_bytes = await resp.aread()
                    detail = body_bytes.decode("utf-8", errors="replace")[:800]
                except Exception:
                    detail = ""
                raise RuntimeError(
                    f"openrouter_error status={resp.status_code} model={OPENROUTER_MODEL} detail={detail}"
                )

            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data.strip() == "[DONE]":
                    break
                try:
                    payload = json.loads(data)
                except Exception:
                    continue

                try:
                    delta = (
                        (payload.get("choices") or [{}])[0]
                        .get("delta", {})
                        .get("content")
                    )
                except Exception:
                    delta = None

                if isinstance(delta, str) and delta:
                    full += delta
                    yield delta

    # No return: async generator


async def _ollama_stream(prompt: str):
    url = f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate"
    async with httpx.AsyncClient(timeout=180.0) as client:
        async with client.stream(
            "POST",
            url,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.5,
                    "num_predict": 900,
                },
            },
        ) as resp:
            if resp.status_code != 200:
                detail = ""
                try:
                    body = await resp.aread()
                    detail = body.decode("utf-8", errors="replace")[:800]
                except Exception:
                    detail = ""
                raise RuntimeError(
                    f"ollama_error status={resp.status_code} model={OLLAMA_MODEL} detail={detail}"
                )

            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except Exception:
                    continue
                token = payload.get("response")
                if isinstance(token, str) and token:
                    yield token
                if payload.get("done"):
                    break


async def _llm_stream(prompt: str):
    if OPENROUTER_API_KEY:
        async for t in _openrouter_stream(prompt):
            yield t
        return

    async for t in _ollama_stream(prompt):
        yield t


async def _llm_generate(
    prompt: str, *, openrouter_key: str = "", openrouter_model: str = ""
) -> str:
    """Generate text with either OpenRouter (if configured) or Ollama."""

    if openrouter_key:
        url = f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            # OpenRouter recommends these for attribution/rate-limiting hygiene.
            "HTTP-Referer": "http://localhost",
            "X-Title": "fud-buddy",
        }
        body = {
            "model": openrouter_model or OPENROUTER_MODEL,
            "temperature": 0.5,
            "max_tokens": OPENROUTER_MAX_TOKENS,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        }

        async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT_S) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code != 200:
                detail = resp.text[:1200]
                suggestions: list[str] = []
                try:
                    if resp.status_code == 400 and "valid model" in detail.lower():
                        all_models = await _openrouter_list_models(openrouter_key)
                        q = str(body.get("model") or "")
                        ql = q.lower()
                        # Return a small set of close matches.
                        suggestions = [
                            m for m in all_models if ql.split("/")[-1] in m.lower()
                        ][:12]
                        if not suggestions:
                            suggestions = [
                                m
                                for m in all_models
                                if "gemini" in m.lower() and "flash" in m.lower()
                            ][:12]
                except Exception:
                    suggestions = []

                raise RuntimeError(
                    "openrouter_error "
                    + json.dumps(
                        {
                            "status": resp.status_code,
                            "model": body.get("model"),
                            "detail": detail,
                            "suggestions": suggestions,
                        },
                        ensure_ascii=True,
                    )
                )

            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                raise RuntimeError("openrouter_error: no choices")

            msg = (choices[0] or {}).get("message") or {}
            content = msg.get("content")
            if not isinstance(content, str) or not content.strip():
                raise RuntimeError("openrouter_error: empty content")
            return content.strip()

    # Default: Ollama
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.5,
                    "num_predict": 900,
                },
            },
        )

    if resp.status_code != 200:
        detail = ""
        try:
            detail = resp.text[:800]
        except Exception:
            detail = ""
        raise RuntimeError(
            f"ollama_error status={resp.status_code} model={OLLAMA_MODEL} detail={detail}"
        )

    payload = resp.json()
    return str(payload.get("response") or "").strip()


db_pool = None


def _is_public_http_url(raw: str) -> bool:
    """Basic SSRF guard for the image proxy."""

    try:
        u = urlparse(raw)
    except Exception:
        return False
    if u.scheme not in ("http", "https"):
        return False
    if not u.hostname:
        return False

    host = u.hostname
    if host in ("localhost",):
        return False

    try:
        ip = ipaddress.ip_address(host)
    except Exception:
        # Not an IP; allow (DNS-level SSRF is still possible but this is a simple dev proxy).
        return True

    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
    ):
        return False
    return True


@app.get("/api/image-proxy")
async def image_proxy(url: str):
    """Fetch a remote image and return it with permissive CORS.

    Used for share card rendering (canvas) where direct cross-origin images taint the canvas.
    """

    if not _is_public_http_url(url):
        raise HTTPException(status_code=400, detail="Invalid url")

    headers = {
        "Accept": "image/*",
        "User-Agent": "fud-buddy-dev/1.0",
    }

    max_bytes = 5_000_000
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Upstream fetch failed")
        content_type = resp.headers.get("content-type", "image/jpeg")
        data = resp.content

    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="Image too large")

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        },
    )


@app.get("/api/geocode/reverse")
async def reverse_geocode(lat: float, lon: float):
    """Reverse geocode lat/lon into a human-friendly place.

    This is intentionally best-effort (no keys required) and returns a short display string.
    """

    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "jsonv2",
        "lat": str(lat),
        "lon": str(lon),
    }
    headers = {
        "Accept": "application/json",
        # Nominatim policy prefers identifiable UA; keep it generic and non-personal.
        "User-Agent": "fud-buddy-dev/1.0",
        "Accept-Language": "en",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                return {"ok": False, "display": "", "status": resp.status_code}

            data = resp.json()
            addr = data.get("address") or {}
            if not isinstance(addr, dict):
                addr = {}

            city = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("hamlet")
                or addr.get("county")
                or ""
            )
            state = (
                addr.get("state")
                or addr.get("region")
                or addr.get("state_district")
                or ""
            )

            if isinstance(city, str) and isinstance(state, str) and city and state:
                return {"ok": True, "display": f"{city}, {state}"}
            if isinstance(city, str) and city:
                return {"ok": True, "display": city}

            display_name = data.get("display_name")
            if isinstance(display_name, str) and display_name:
                short = ", ".join(
                    [p.strip() for p in display_name.split(",")[:3] if p.strip()]
                )
                return {"ok": True, "display": short}

            return {"ok": False, "display": ""}
    except Exception as e:
        return {"ok": False, "display": "", "error": str(e)}


@app.on_event("startup")
async def _startup() -> None:
    global db_pool

    if not DATABASE_URL:
        return

    if AsyncConnectionPool is None:
        return

    db_pool = AsyncConnectionPool(DATABASE_URL, open=False)
    await db_pool.open()

    async with db_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                create table if not exists fud_sessions (
                  id uuid primary key,
                  created_at timestamptz not null default now(),
                  preferences jsonb not null,
                  recommendations jsonb not null,
                  sources jsonb null
                );

                create table if not exists fud_feedback (
                  id uuid primary key,
                  session_id uuid references fud_sessions(id) on delete cascade,
                  created_at timestamptz not null default now(),
                  rating int null,
                  went boolean null,
                  comment text null,
                  contact text null,
                  consent_contact boolean not null default false,
                  consent_public boolean not null default false
                );
                """
            )
        await conn.commit()


@app.on_event("shutdown")
async def _shutdown() -> None:
    global db_pool
    if db_pool is not None:
        await db_pool.close()
        db_pool = None


class ChatRequest(BaseModel):
    messages: Optional[List] = []
    preferences: Optional[dict] = None


class FeedbackRequest(BaseModel):
    session_id: str
    rating: Optional[int] = None
    went: Optional[bool] = None
    comment: Optional[str] = None
    contact: Optional[str] = None
    consent_contact: bool = False
    consent_public: bool = False


async def _persist_session(
    session_id: uuid.UUID,
    preferences: dict,
    recommendations: list[dict],
    sources: Optional[list[dict]] = None,
) -> None:
    if db_pool is None:
        return

    async with db_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                insert into fud_sessions (id, preferences, recommendations, sources)
                values (%s, %s, %s, %s)
                """,
                (
                    str(session_id),
                    json.dumps(preferences),
                    json.dumps(recommendations),
                    json.dumps(sources or []),
                ),
            )
        await conn.commit()


async def _persist_feedback(feedback_id: uuid.UUID, payload: FeedbackRequest) -> None:
    if db_pool is None:
        return

    async with db_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                insert into fud_feedback (
                  id, session_id, rating, went, comment, contact, consent_contact, consent_public
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(feedback_id),
                    str(uuid.UUID(payload.session_id)),
                    payload.rating,
                    payload.went,
                    payload.comment,
                    payload.contact,
                    payload.consent_contact,
                    payload.consent_public,
                ),
            )
        await conn.commit()


async def search_web(
    query: str, client: Optional[httpx.AsyncClient] = None
) -> list[dict]:
    """Return a small list of search results.

    Prefers SearxNG (self-hosted) when SEARXNG_URL is set.
    Falls back to DuckDuckGo HTML only as a last resort.
    """

    if SEARXNG_URL:
        try:
            if client is None:
                async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as c:
                    return await search_web(query, client=c)

            resp = await client.get(
                f"{SEARXNG_URL.rstrip('/')}/search",
                params={
                    "q": query,
                    "format": "json",
                    "language": "en",
                    "safesearch": "1",
                },
            )
            if resp.status_code == 200:
                payload = resp.json()
                results = payload.get("results", [])
                out: list[dict] = []
                for r in results[:6]:
                    out.append(
                        {
                            "title": r.get("title") or "",
                            "url": r.get("url") or "",
                            "content": r.get("content") or "",
                            "engine": r.get("engine") or "",
                        }
                    )
                return out
        except Exception:
            # If SearxNG is down, fall back.
            pass

    # Fallback: return an empty list (we don't want brittle scraping in production).
    return []


async def search_images(
    query: str, client: Optional[httpx.AsyncClient] = None
) -> list[dict]:
    """SearxNG image search.

    Returns items with url + img_src/thumbnail_src when available.
    """

    if not SEARXNG_URL:
        return []

    try:
        if client is None:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as c:
                return await search_images(query, client=c)

        resp = await client.get(
            f"{SEARXNG_URL.rstrip('/')}/search",
            params={
                "q": query,
                "format": "json",
                "language": "en",
                "safesearch": "1",
                "categories": "images",
            },
        )
        if resp.status_code != 200:
            return []

        payload = resp.json()
        results = payload.get("results", [])
        out: list[dict] = []
        if isinstance(results, list):
            for r in results[:16]:
                if not isinstance(r, dict):
                    continue
                out.append(
                    {
                        "title": r.get("title") or "",
                        "url": r.get("url") or "",
                        "img_src": r.get("img_src") or "",
                        "thumbnail_src": r.get("thumbnail_src") or "",
                        "engine": r.get("engine") or "",
                    }
                )
        return out
    except Exception:
        return []


def _sse(data: Any) -> dict:
    # EventSourceResponse will serialize dict -> SSE lines. We always send JSON in `data`.
    return {"data": json.dumps(data)}


def _looks_like_coords(s: str) -> bool:
    return bool(re.match(r"^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$", s or ""))


def _extract_json_array(text: str) -> Optional[list]:
    # Find the first JSON array in the text.
    import re

    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except Exception:
        return None
    return parsed if isinstance(parsed, list) else None


def _extract_json_value(text: str) -> Optional[Any]:
    """Extract a JSON value from text.

    Tries full json.loads first, then falls back to locating the first array/object.
    """

    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass

    # Find first array
    m = re.search(r"\[[\s\S]*\]", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None

    # Find first object
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None


def _try_parse_json_object_line(line: str) -> Optional[dict]:
    s = (line or "").strip()
    if not s:
        return None
    # Tolerate trailing commas.
    if s.endswith(","):
        s = s[:-1]
    if not (s.startswith("{") and s.endswith("}")):
        return None
    try:
        v = json.loads(s)
    except Exception:
        return None
    return v if isinstance(v, dict) else None


def _pop_first_json_object(text: str) -> tuple[Optional[str], str]:
    """Pop the first complete JSON object substring from text.

    This is a small incremental parser used to extract objects from streamed output.
    It handles strings and escapes well enough for typical JSON.
    """

    if not text:
        return None, text

    start = text.find("{")
    if start < 0:
        return None, text

    depth = 0
    in_string = False
    escape = False

    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            depth += 1
            continue
        if ch == "}":
            depth -= 1
            if depth == 0:
                obj_text = text[start : i + 1]
                remaining = text[i + 1 :]
                return obj_text, remaining
            continue

    return None, text


def _maps_links(name: str, address: str) -> dict:
    q = " ".join([p for p in [name.strip(), address.strip()] if p]).strip()
    if not q:
        return {"google": "", "apple": ""}
    enc = quote_plus(q)
    return {
        "google": f"https://www.google.com/maps/search/?api=1&query={enc}",
        "apple": f"http://maps.apple.com/?q={enc}",
    }


def _generate_outfit(vibe: str, place: str, main: str) -> str:
    """Generate a fun, fake outfit line.

    Keep it short, playful, and relevant to food/venue.
    """

    v = (vibe or "").strip().lower()
    p = (place or "").strip()
    dish = (main or "").strip()

    if not dish:
        dish = "whatever you end up devouring"

    if any(k in v for k in ("date", "romance", "fancy", "dress")):
        return f"Date-night armor: a clean fit, one little statement piece, and shoes you can actually walk in after {dish}."
    if any(k in v for k in ("cozy", "chill", "comfort")):
        return f"Cozy-core: soft layers and sneakers you trust. You’re here for {dish}, not foot pain."
    if any(k in v for k in ("street", "loud", "party", "club")):
        return f"Street-ready: jacket with pockets, sneakers with grip, and a fit that can survive a joyful encounter with {dish}."
    if any(k in v for k in ("rain", "wet", "storm")):
        return f"Weather-proof drip: waterproof layer + grippy shoes. You’re not letting rain stop you from {dish}."
    return f"Wear something comfy-cute. {p} is the vibe; {dish} is the mission."


async def _og_image_from_url(url: str) -> str:
    if not url:
        return ""

    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"Accept": "text/html"})
            if resp.status_code != 200:
                return ""
            page_html = resp.text
    except Exception:
        return ""

    # Very small best-effort parse (no deps).
    def _extract_from_meta(tag_regex: str) -> str:
        mt = re.search(tag_regex, page_html, re.IGNORECASE)
        if not mt:
            return ""
        tag = mt.group(0)
        mc = re.search(r'content=["\']([^"\']+)["\']', tag, re.IGNORECASE)
        if not mc:
            return ""
        return html.unescape(mc.group(1).strip())

    # Look for a meta tag that identifies the image type, then pull its content.
    og = _extract_from_meta(r'<meta[^>]+property=["\']og:image["\'][^>]*>')
    if og:
        return og

    tw = _extract_from_meta(r'<meta[^>]+name=["\']twitter:image["\'][^>]*>')
    if tw:
        return tw
    return ""


def _is_bad_source_url(url: str) -> bool:
    u = (url or "").lower()
    return any(
        bad in u
        for bad in (
            "facebook.com",
            "m.facebook.com",
            "instagram.com",
            "reddit.com",
            "yelp.",
            "opentable.",
            "wanderlog.",
            "pinterest.",
        )
    )


def _pick_image_url(item: dict) -> str:
    # Prefer direct image url if present.
    img = str(item.get("img_src") or "").strip()
    if img.startswith("http"):
        return img
    thumb = str(item.get("thumbnail_src") or "").strip()
    if thumb.startswith("http"):
        return thumb
    return ""


def _is_bad_image_url(url: str) -> bool:
    u = (url or "").lower()
    if not u.startswith("http"):
        return True
    if any(x in u for x in ("logo", "banner", "header", "icon", ".svg")):
        return True
    if _is_bad_source_url(u):
        return True
    return False


def _clean_snippet(text: str) -> str:
    s = text or ""
    # Some engines include highlight markers.
    s = s.replace("\ue000", "").replace("\ue001", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _extract_place_chatter(name: str, results: list[dict]) -> list[dict]:
    """Return a few verbatim snippet highlights for this place."""

    if not name:
        return []
    n = name.lower()
    out: list[dict] = []
    for r in results:
        title = _clean_snippet(str(r.get("title") or ""))
        content = _clean_snippet(str(r.get("content") or ""))
        url = str(r.get("url") or "").strip()
        if not url:
            continue
        hay = (title + " " + content).lower()
        if n not in hay:
            continue
        snippet = content or title
        if not snippet:
            continue
        out.append({"text": snippet[:180], "url": url, "title": title[:120]})
        if len(out) >= 2:
            break
    return out


def _extract_signals(results: list[dict]) -> list[str]:
    joined = " ".join(
        [
            _clean_snippet(str(r.get("title") or ""))
            + " "
            + _clean_snippet(str(r.get("content") or ""))
            for r in results[:10]
        ]
    ).lower()

    signals: list[str] = []
    if any(k in joined for k in ("beach", "waterfront", "lake", "shore")):
        signals.append("beach / waterfront")
    if any(k in joined for k in ("patio", "view", "views", "sunset")):
        signals.append("patio / view")
    if "live music" in joined:
        signals.append("live music")
    if any(k in joined for k in ("tourist", "busy", "lineup", "crowded")):
        signals.append("popular spot")
    return signals


def _normalize_recommendations(items: list) -> list[dict]:
    """Best-effort normalization to the app's expected schema.

    Expected per item (v2):
      {
        "restaurant": {"name": str, "address": str, "priceRange": str, "rating": number?},
        "whatToWear": str,
        "order": {"main": str, "side": str, "drink": str},
        "backupOrder": {"main": str, "side": str, "drink": str},
        "story": str,
        "imageUrl": str?
      }

    Some models incorrectly nest dishes/story under restaurant. We lift them.
    """

    out: list[dict] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue

        restaurant = raw.get("restaurant")
        dishes = raw.get("dishes")
        story = raw.get("story")

        what_to_wear = raw.get("whatToWear") or raw.get("wear") or ""
        order = raw.get("order")
        backup_order = raw.get("backupOrder") or raw.get("backup")
        image_url = raw.get("imageUrl") or raw.get("image") or ""

        if isinstance(restaurant, dict):
            # Lift nested fields if present.
            if dishes is None and isinstance(restaurant.get("dishes"), list):
                dishes = restaurant.get("dishes")
            if story is None and isinstance(restaurant.get("story"), str):
                story = restaurant.get("story")

            # Strip any unexpected nesting keys to avoid confusing clients.
            restaurant = {
                "name": restaurant.get("name") or "",
                "address": restaurant.get("address") or "",
                "priceRange": restaurant.get("priceRange")
                or restaurant.get("price")
                or "",
                "rating": restaurant.get("rating"),
            }
        else:
            restaurant = {"name": "", "address": "", "priceRange": "", "rating": None}

        # Legacy dish list fallback -> build a basic order object.
        norm_dishes: list[dict] = []
        if isinstance(dishes, list):
            for d in dishes[:4]:
                if not isinstance(d, dict):
                    continue
                name = d.get("name") or ""
                desc = d.get("description") or d.get("why") or ""
                if not name:
                    continue
                norm_dishes.append({"name": str(name), "description": str(desc)})

        def _norm_order(obj: Any) -> dict:
            if not isinstance(obj, dict):
                return {"main": "", "side": "", "drink": ""}
            return {
                "main": str(obj.get("main") or ""),
                "side": str(obj.get("side") or ""),
                "drink": str(obj.get("drink") or ""),
            }

        norm_order = _norm_order(order)
        norm_backup = _norm_order(backup_order)

        if not norm_order["main"] and norm_dishes:
            # Best-effort mapping when only dishes exist.
            norm_order["main"] = str(norm_dishes[0].get("name") or "")
            if len(norm_dishes) > 1:
                norm_order["side"] = str(norm_dishes[1].get("name") or "")
            if len(norm_dishes) > 2:
                norm_order["drink"] = str(norm_dishes[2].get("name") or "")

        if not isinstance(story, str):
            story = ""

        if not isinstance(what_to_wear, str):
            what_to_wear = ""
        if not isinstance(image_url, str):
            image_url = ""

        out.append(
            {
                "restaurant": restaurant,
                "whatToWear": what_to_wear,
                "order": norm_order,
                "backupOrder": norm_backup,
                "dishes": norm_dishes,
                "story": story,
                "imageUrl": image_url,
            }
        )

    return out


@app.post("/api/chat/stream")
async def chat_stream(request: Request, payload: ChatRequest):
    prefs = payload.preferences or {}
    location = prefs.get("location", "near you")
    vibe = ", ".join(prefs.get("vibe", [])) or "good food"
    cuisine = ", ".join(prefs.get("cuisine", [])) or "any"
    dietary = ", ".join(prefs.get("dietary", [])) or "none"

    async def event_generator():
        limited = _check_rate_limit(request)
        if limited:
            yield _sse(limited)
            yield _sse({"type": "done"})
            return

        # Emit model info so the client can display it.
        openrouter_key, openrouter_model = _resolve_openrouter_overrides(request)
        if openrouter_key:
            yield _sse(
                {
                    "type": "meta",
                    "llm": {
                        "provider": "openrouter",
                        "model": openrouter_model or OPENROUTER_MODEL,
                    },
                }
            )
        else:
            yield _sse(
                {"type": "meta", "llm": {"provider": "ollama", "model": OLLAMA_MODEL}}
            )

        # Status updates
        display_location = (
            "your area" if _looks_like_coords(str(location)) else location
        )
        yield _sse(
            {
                "type": "status",
                "content": f"Searching for great spots in {display_location}...",
            }
        )

        # Build search queries (keep these tight; we just need candidates and context)
        # Minimize queries for responsiveness.
        base_query = (
            f"restaurants {location}"
            if cuisine == "any"
            else f"{cuisine} restaurants {location}"
        )
        searches = [
            f"best {vibe} {base_query}",
            f"top rated {base_query}",
        ]

        session_id = uuid.uuid4()

        # Search (parallel + shared client)
        found: list[dict] = []
        async with httpx.AsyncClient(
            timeout=12.0, follow_redirects=True
        ) as search_client:
            tasks = [search_web(q, client=search_client) for q in searches]
            results_lists = await asyncio.gather(*tasks, return_exceptions=True)

        for results in results_lists:
            if isinstance(results, BaseException):
                continue
            if not isinstance(results, list):
                continue
            for r in results:
                if isinstance(r, dict) and r.get("url"):
                    found.append(r)

        # De-dupe by URL
        dedup: list[dict] = []
        seen: set[str] = set()
        for r in found:
            url = r.get("url") or ""
            if not url or url in seen:
                continue
            seen.add(url)
            dedup.append(r)

        if len(dedup) == 0:
            yield _sse(
                {
                    "type": "error",
                    "message": "Search returned no results (or search is unavailable).",
                    "hint": "If you're self-hosting, check SEARXNG_URL and that SearxNG is running.",
                }
            )
            yield _sse({"type": "done"})
            return

        sources = [
            {
                "title": (r.get("title") or "").strip(),
                "url": (r.get("url") or "").strip(),
                "engine": (r.get("engine") or "").strip(),
            }
            for r in dedup[:6]
        ]

        search_context_lines: list[str] = []
        for r in dedup[:6]:
            title = (r.get("title") or "").strip()
            url = (r.get("url") or "").strip()
            snippet = (r.get("content") or "").strip().replace("\n", " ")
            engine = (r.get("engine") or "").strip()
            if snippet:
                snippet = snippet[:180]
            search_context_lines.append(f"- {title} ({engine})\n  {url}\n  {snippet}")

        search_context = "\n".join(search_context_lines)

        yield _sse(
            {"type": "status", "content": "Found some chatter. Cooking up two picks..."}
        )

        # Use LLM to generate recommendations.
        # IMPORTANT: We do not fabricate private identity info; story focuses on the venue.
        context = f"""You are FUD Buddy: witty, slightly sassy, extremely helpful.

User context:
- Location: {location}
- Vibe: {vibe}
- Cuisine: {cuisine}
- Dietary: {dietary}

Web search results (snippets + URLs):
{search_context}

Task:
Return exactly TWO restaurant recommendations based on the web snippets.

CRITICAL output requirements:
- Each recommendation MUST be a JSON object.
- Each object MUST have ONLY these top-level keys: restaurant, whatToWear, order, backupOrder, story.
- restaurant MUST have keys: name, address, priceRange, rating.
- whatToWear MUST be a short, vivid outfit description (1-2 sentences). Be specific and fun.
- whatToWear should reference the vibe/venue and the food (e.g. "sneakers you can trust" for spicy ramen, etc.).
- order MUST have keys: main, side, drink.
- backupOrder MUST have keys: main, side, drink.
- story MUST be a short string (2-3 sentences).

Rules:
- Prefer places that clearly appear in the snippets.
- Keep story grounded in the snippets (no invented chefs/owners).
- No markdown, no commentary, no extra keys."""

        try:

            def _option_prompt(
                label: str, guidance: str, *, exclude_name: str = ""
            ) -> str:
                return (
                    context
                    + "\n\n"
                    + f"Now produce {label}. {guidance}\n"
                    + (
                        f"MUST be a different restaurant than: {exclude_name}.\n"
                        if exclude_name
                        else ""
                    )
                    + "Return ONLY a single JSON object. No surrounding array. No markdown."
                )

            prompt_a = _option_prompt(
                "Option A",
                "Pick the cheaper/casual choice.",
            )
            prompt_b = ""
            name_a = ""

            recs: list[dict] = []

            yield _sse({"type": "status", "content": "Writing option A..."})
            text_a = await _llm_generate(
                prompt_a,
                openrouter_key=openrouter_key,
                openrouter_model=openrouter_model,
            )
            obj_a = _extract_json_value(text_a)
            if not isinstance(obj_a, dict):
                yield _sse(
                    {
                        "type": "error",
                        "message": "Model returned invalid JSON for option A.",
                        "rawPreview": str(text_a)[:500],
                    }
                )
                yield _sse({"type": "done"})
                return

            norm_a = _normalize_recommendations([obj_a])
            if not norm_a:
                yield _sse(
                    {
                        "type": "error",
                        "message": "Model returned unusable structure for option A.",
                        "rawPreview": str(text_a)[:500],
                    }
                )
                yield _sse({"type": "done"})
                return

            rec_a = norm_a[0]
            rest_a = rec_a.get("restaurant") or {}
            if isinstance(rest_a, dict):
                rec_a["maps"] = _maps_links(
                    str(rest_a.get("name") or ""), str(rest_a.get("address") or "")
                )

            # Ensure whatToWear isn't bland; replace with a fun generated line.
            try:
                o = rec_a.get("order")
                main = str(o.get("main") or "") if isinstance(o, dict) else ""
                place = (
                    str(rest_a.get("name") or "") if isinstance(rest_a, dict) else ""
                )
                wt = str(rec_a.get("whatToWear") or "")
                if len(wt.strip()) < 18 or "casual" in wt.lower():
                    rec_a["whatToWear"] = _generate_outfit(vibe, place, main)
            except Exception:
                pass
            recs.append(rec_a)
            yield _sse({"type": "option", "index": 0, "recommendation": rec_a})

            # Attach verbatim snippet highlights + signals for UI grounding.
            try:
                place = (
                    str(rest_a.get("name") or "") if isinstance(rest_a, dict) else ""
                )
                chatter = _extract_place_chatter(place, dedup)
                signals = _extract_signals(chatter + dedup)
                if chatter:
                    rec_a["peopleSay"] = chatter
                if signals:
                    rec_a["signals"] = signals
            except Exception:
                pass

            yield _sse({"type": "status", "content": "Writing option B..."})
            text_b = await _llm_generate(
                prompt_b,
                openrouter_key=openrouter_key,
                openrouter_model=openrouter_model,
            )
            obj_b = _extract_json_value(text_b)
            if not isinstance(obj_b, dict):
                yield _sse(
                    {
                        "type": "error",
                        "message": "Model returned invalid JSON for option B.",
                        "rawPreview": str(text_b)[:500],
                    }
                )
                yield _sse({"type": "done"})
                return

            norm_b = _normalize_recommendations([obj_b])
            if not norm_b:
                yield _sse(
                    {
                        "type": "error",
                        "message": "Model returned unusable structure for option B.",
                        "rawPreview": str(text_b)[:500],
                    }
                )
                yield _sse({"type": "done"})
                return

            rec_b = norm_b[0]
            rest_b = rec_b.get("restaurant") or {}
            if isinstance(rest_b, dict):
                rec_b["maps"] = _maps_links(
                    str(rest_b.get("name") or ""), str(rest_b.get("address") or "")
                )

            try:
                o = rec_b.get("order")
                main = str(o.get("main") or "") if isinstance(o, dict) else ""
                place = (
                    str(rest_b.get("name") or "") if isinstance(rest_b, dict) else ""
                )
                wt = str(rec_b.get("whatToWear") or "")
                if len(wt.strip()) < 18 or "casual" in wt.lower():
                    rec_b["whatToWear"] = _generate_outfit(vibe, place, main)
            except Exception:
                pass

            # Ensure distinct restaurants; retry once if duplicated.
            if isinstance(rest_b, dict) and name_a:
                name_b = str(rest_b.get("name") or "").strip()
                if name_b and name_b.lower() == name_a.lower():
                    yield _sse(
                        {
                            "type": "status",
                            "content": "Option B looked too similar. Retrying...",
                        }
                    )
                    prompt_b2 = _option_prompt(
                        "Option B",
                        "Pick a pricier/special choice that is NOT the same restaurant as Option A.",
                        exclude_name=name_a,
                    )
                    text_b2 = await _llm_generate(
                        prompt_b2,
                        openrouter_key=openrouter_key,
                        openrouter_model=openrouter_model,
                    )
                    obj_b2 = _extract_json_value(text_b2)
                    norm_b2 = _normalize_recommendations(
                        [obj_b2] if isinstance(obj_b2, dict) else []
                    )
                    if norm_b2:
                        rec_b = norm_b2[0]
                        rest_b = rec_b.get("restaurant") or {}
                        if isinstance(rest_b, dict):
                            rec_b["maps"] = _maps_links(
                                str(rest_b.get("name") or ""),
                                str(rest_b.get("address") or ""),
                            )
            recs.append(rec_b)
            yield _sse({"type": "option", "index": 1, "recommendation": rec_b})

            try:
                place = (
                    str(rest_b.get("name") or "") if isinstance(rest_b, dict) else ""
                )
                chatter = _extract_place_chatter(place, dedup)
                signals = _extract_signals(chatter + dedup)
                if chatter:
                    rec_b["peopleSay"] = chatter
                if signals:
                    rec_b["signals"] = signals
            except Exception:
                pass

            # Best-effort image URLs (parallel)
            async def _img_for(rec: dict) -> str:
                rest = rec.get("restaurant") or {}
                name = ""
                address = ""
                main = ""
                if isinstance(rest, dict):
                    name = str(rest.get("name") or "")
                    address = str(rest.get("address") or "")

                o = rec.get("order")
                if isinstance(o, dict):
                    main = str(o.get("main") or "")
                chosen = ""

                # First pass: image search biased toward the dish.
                try:
                    async with httpx.AsyncClient(
                        timeout=10.0, follow_redirects=True
                    ) as c:
                        q = f"{name} {address}"
                        if main:
                            q = f"{q} {main}"
                        q = f"{q} photo"
                        imgs = await search_images(q, client=c)
                    for it in imgs[:10]:
                        url = str(it.get("url") or "")
                        if url and _is_bad_source_url(url):
                            continue
                        img_url = _pick_image_url(it)
                        if img_url and not _is_bad_image_url(img_url):
                            return img_url
                except Exception:
                    pass
                for s in sources:
                    title = (s.get("title") or "").lower()
                    if name and name.lower() in title:
                        url = s.get("url") or ""
                        if url and not _is_bad_source_url(str(url)):
                            chosen = str(url)
                            break

                if not chosen and name:
                    # Quick dedicated search for a better page to pull og:image from.
                    try:
                        async with httpx.AsyncClient(
                            timeout=8.0, follow_redirects=True
                        ) as c:
                            hits = await search_web(f"{name} {address}", client=c)
                        for h in hits:
                            url = h.get("url") or ""
                            if url and not _is_bad_source_url(str(url)):
                                chosen = str(url)
                                break
                    except Exception:
                        chosen = ""

                if not chosen and sources:
                    chosen = str(sources[0].get("url") or "")
                return await _og_image_from_url(str(chosen))

            imgs = await asyncio.gather(
                *[_img_for(r) for r in recs], return_exceptions=True
            )
            for i, img in enumerate(imgs):
                if isinstance(img, str) and img:
                    recs[i]["imageUrl"] = img
                    yield _sse(
                        {"type": "enrich", "index": i, "patch": {"imageUrl": img}}
                    )

            await _persist_session(session_id, prefs, recs, sources=sources)

            # Send structured result so the frontend doesn't have to guess.
            yield _sse(
                {
                    "type": "result",
                    "sessionId": str(session_id),
                    "sources": sources,
                    "recommendations": recs,
                }
            )
            yield _sse({"type": "done"})

        except Exception as e:
            yield _sse({"type": "error", "message": str(e)})
            yield _sse({"type": "done"})

    return EventSourceResponse(event_generator())


@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    # Accept feedback even if DB is not configured (return a clear status).
    try:
        _ = uuid.UUID(request.session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    if db_pool is None:
        return {"status": "unavailable", "message": "DATABASE_URL not configured"}

    feedback_id = uuid.uuid4()
    await _persist_feedback(feedback_id, request)
    return {"status": "ok", "id": str(feedback_id)}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
