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
import math
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

NOMINATIM_URL = os.getenv(
    "NOMINATIM_URL", "https://nominatim.openstreetmap.org"
).rstrip("/")


def _env_float(name: str, default: float) -> float:
    try:
        v = os.getenv(name)
        if v is None or v == "":
            return default
        return float(v)
    except Exception:
        return default


MAX_TRAVEL_KM_DEFAULT = _env_float("MAX_TRAVEL_KM_DEFAULT", 35.0)

TRAVEL_KM_PER_MIN = _env_float("TRAVEL_KM_PER_MIN", 1.0)
MAX_TRAVEL_KM_CAP_DEFAULT = _env_float("MAX_TRAVEL_KM_CAP_DEFAULT", 70.0)

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


# Beta rate limiting (3 per day, 3-hour gap after first 3)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "0") == "1"
RATE_LIMIT_DAILY_MAX = int(os.getenv("RATE_LIMIT_DAILY_MAX", "3"))
RATE_LIMIT_GAP_HOURS = int(os.getenv("RATE_LIMIT_GAP_HOURS", "3"))
RATE_LIMIT_SOFT_MAX = int(os.getenv("RATE_LIMIT_SOFT_MAX", "5"))
RATE_LIMIT_DAILY_WINDOW_S = int(
    os.getenv("RATE_LIMIT_DAILY_WINDOW_S", "86400")
)  # 24 hours

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
    """Beta rate limiting: 3/day, then 3-hour gap, then up to 5 total.

    Returns error dict if limit exceeded, None if allowed.
    """
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

    hits = _rate_limit_hits.get(key, [])

    # Clean old hits outside 24h window
    window_start = now - RATE_LIMIT_DAILY_WINDOW_S
    hits = [t for t in hits if t >= window_start]

    total_hits = len(hits)

    # Check hard limit (5 total)
    if total_hits >= RATE_LIMIT_SOFT_MAX:
        oldest_hit = min(hits)
        retry_after = int(max(1, oldest_hit + RATE_LIMIT_DAILY_WINDOW_S - now))
        _rate_limit_hits[key] = hits
        return {
            "type": "rate_limit",
            "error": "daily_limit",
            "message": "You've reached the daily limit. This is a beta product and API calls are expensive. Please try again tomorrow!",
            "retryAfterSeconds": retry_after,
            "hits": total_hits,
        }

    # Check soft limit (3 hits require 3-hour gap)
    if total_hits >= RATE_LIMIT_DAILY_MAX:
        # Check if enough time has passed since the 3rd hit
        hits_sorted = sorted(hits)
        third_hit_time = hits_sorted[RATE_LIMIT_DAILY_MAX - 1]
        gap_seconds = RATE_LIMIT_GAP_HOURS * 3600
        time_since_third = now - third_hit_time

        if time_since_third < gap_seconds:
            retry_after = int(gap_seconds - time_since_third)
            _rate_limit_hits[key] = hits
            return {
                "type": "rate_limit",
                "error": "cooldown",
                "message": f"Thanks for testing! This is a beta product and API calls are expensive. Please wait {RATE_LIMIT_GAP_HOURS} hours before making more requests.",
                "retryAfterSeconds": retry_after,
                "hits": total_hits,
            }

    hits.append(now)
    _rate_limit_hits[key] = hits

    # Return hit count for UI awareness
    return {
        "type": "rate_limit_status",
        "hits": len(hits),
        "max": RATE_LIMIT_SOFT_MAX,
    }


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


@app.get("/api/loader/images")
async def loader_images(location: str = "", vibe: str = ""):
    """Return a few food photo URLs for the loading screen.

    This is best-effort and intentionally lightweight.
    """

    loc = (location or "").strip()
    vb = (vibe or "").strip().replace("-", " ")
    if _looks_like_coords(loc):
        loc = "nearby"

    parts = ["food", "dish", "photo"]
    if vb:
        parts.insert(1, vb)
    if loc and loc.lower() not in ("near me", "near you"):
        parts.insert(1, loc)
    q = " ".join([p for p in parts if p])

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            items = await search_images(q, client=client)
    except Exception:
        items = []

    urls: list[str] = []
    for it in items[:18]:
        if not isinstance(it, dict):
            continue
        img = _pick_image_url(it)
        if not img or _is_bad_image_url(img):
            continue
        urls.append(img)
        if len(urls) >= 10:
            break

    return {"ok": True, "images": urls}


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


def _parse_coords(s: str) -> Optional[tuple[float, float]]:
    if not _looks_like_coords(s):
        return None
    try:
        a, b = (s or "").split(",", 1)
        lat = float(a.strip())
        lon = float(b.strip())
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return None
        return (lat, lon)
    except Exception:
        return None


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b

    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    x = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(x)))


async def _forward_geocode(place: str) -> Optional[tuple[float, float]]:
    """Best-effort forward geocode to lat/lon.

    Uses Nominatim (no keys). Returns None on failure.
    """

    q = (place or "").strip()
    if not q:
        return None

    url = f"{NOMINATIM_URL}/search"
    params = {
        "format": "jsonv2",
        "q": q,
        "limit": "1",
    }
    headers = {
        "Accept": "application/json",
        "User-Agent": "fud-buddy-dev/1.0",
        "Accept-Language": "en",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if not isinstance(data, list) or not data:
                return None
            top = data[0]
            if not isinstance(top, dict):
                return None
            lat_raw = top.get("lat")
            lon_raw = top.get("lon")
            if lat_raw is None or lon_raw is None:
                return None
            lat = float(str(lat_raw))
            lon = float(str(lon_raw))
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                return None
            return (lat, lon)
    except Exception:
        return None


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
            "tiktok.com",
            "x.com",
            "twitter.com",
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
    if u.startswith("data:"):
        return True
    if any(
        x in u
        for x in (
            "logo",
            "banner",
            "header",
            "icon",
            "favicon",
            "sprite",
            "placeholder",
            "default",
            "blank",
            "spacer",
            "transparent",
            "pixel",
            "tracking",
            "ads",
            ".svg",
            ".gif",
        )
    ):
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
    n = name.lower().strip()

    # Token match helps when pages abbreviate punctuation (&, etc.).
    tokens = [t for t in re.split(r"[^a-z0-9]+", n) if len(t) >= 4]

    def _matches(hay: str) -> bool:
        if not hay:
            return False
        if n and n in hay:
            return True
        if tokens:
            hits = sum(1 for t in tokens if t in hay)
            need = 2 if len(tokens) >= 2 else 1
            return hits >= need
        return False

    def _score(url: str, title: str, content: str) -> int:
        u = (url or "").lower()
        t = (title or "").lower()
        c = (content or "").lower()
        s = 0

        # Prefer stronger review/curation sources when available.
        if "tripadvisor." in u:
            s += 6
        if any(
            k in u for k in ("blogto.", "torontolife.", "eater.", "theinfatuation.")
        ):
            s += 4
        if "google.com" in u and "maps" in u:
            s += 2

        # Prefer more descriptive snippets.
        ln = len(content.strip())
        s += min(4, ln // 60)

        # Boost if the snippet reads like an actual quote.
        if any(ch in content for ch in ('"', "“", "”")):
            s += 2

        # Penalize generic directory/listing boilerplate.
        if any(
            k in (t + " " + c) for k in ("hours", "directions", "phone", "reservations")
        ):
            s -= 1
        return s

    def _is_search_listing(text: str) -> bool:
        """Detect if text is a search result listing rather than a quote."""
        if not text:
            return True
        t = text.lower()
        # Skip if it looks like a numbered list of restaurants
        if re.search(r"\d+\s*\.\s*[a-z]", t) and ("reviews" in t or "review" in t):
            return True
        # Skip if it contains multiple restaurant names with ratings
        if t.count(".") > 3 and ("reviews" in t or "stars" in t or "rating" in t):
            return True
        # Skip aggregations like "Restaurants in X · 1. Name..."
        if "·" in text and re.search(r"\d+\s*\.", text):
            return True
        # Skip if it's just a description without any actual opinion
        if len(text) < 40:
            return True
        return False

    candidates: list[dict] = []
    seen_urls: set[str] = set()
    for r in results[:24]:
        title = _clean_snippet(str(r.get("title") or ""))
        content = _clean_snippet(str(r.get("content") or ""))
        url = str(r.get("url") or "").strip()
        if not url or url in seen_urls:
            continue
        hay = (title + " " + content).lower()
        if not _matches(hay):
            continue
        snippet = content or title
        if not snippet:
            continue
        # Skip search result listings
        if _is_search_listing(snippet):
            continue
        seen_urls.add(url)
        candidates.append(
            {
                "text": snippet[:220],
                "url": url,
                "title": title[:120],
                "_score": _score(url, title, content),
            }
        )

    candidates.sort(key=lambda x: int(x.get("_score") or 0), reverse=True)
    out: list[dict] = []
    for c in candidates[:3]:
        out.append({"text": c["text"], "url": c["url"], "title": c.get("title") or ""})
        if len(out) >= 2:
            break
    return out


async def _search_restaurant_menu(
    restaurant_name: str, location: str, client: httpx.AsyncClient
) -> list[str]:
    """Search for actual menu items for a specific restaurant.

    Returns a list of dish names mentioned in search results.
    """
    if not restaurant_name or not location:
        return []

    # Clean up restaurant name for search
    clean_name = restaurant_name.replace("&", "and").replace("'", "")

    # Try multiple menu search queries
    queries = [
        f"{clean_name} {location} menu",
        f"{clean_name} restaurant dishes",
        f"{clean_name} what to order",
        f"{clean_name} popular dishes",
    ]

    all_dishes: list[str] = []
    seen: set[str] = set()

    for query in queries[:2]:  # Limit to 2 queries to save time
        try:
            results = await search_web(query, client=client)
            if not isinstance(results, list):
                continue

            for r in results[:5]:  # Look at top 5 results
                if not isinstance(r, dict):
                    continue

                content = _clean_snippet(str(r.get("content") or ""))
                title = _clean_snippet(str(r.get("title") or ""))
                combined = (title + " " + content).lower()

                # Look for dish patterns - quoted items, items before "$", numbered lists
                # Pattern 1: "Dish Name" - $XX
                import re

                price_dishes = re.findall(r'"([^"]{3,30})"[^$]*\$\d+', combined)
                for dish in price_dishes:
                    d = dish.strip().title()
                    if d and d not in seen and len(d) > 3:
                        seen.add(d)
                        all_dishes.append(d)

                # Pattern 2: Look for common dish keywords
                dish_keywords = [
                    "pasta",
                    "pizza",
                    "burger",
                    "steak",
                    "salmon",
                    "chicken",
                    "risotto",
                    "tacos",
                    "burrito",
                    "ramen",
                    "sushi",
                    "curry",
                    "sandwich",
                    "salad",
                    "lobster",
                    "shrimp",
                    "brisket",
                    "ribs",
                    "wings",
                    "nachos",
                    "appetizer",
                    "entrée",
                    "dessert",
                    "specialty",
                ]

                for keyword in dish_keywords:
                    # Find sentences containing dish keywords
                    sentences = re.findall(
                        r"[^.!?]*\b" + keyword + r"\b[^.!?]*[.!?]",
                        combined,
                        re.IGNORECASE,
                    )
                    for sentence in sentences:
                        # Extract dish name - usually capitalized words before the keyword
                        match = re.search(
                            r"([A-Z][a-zA-Z\s]{2,25})\s+" + keyword, sentence
                        )
                        if match:
                            dish = (match.group(1) + " " + keyword).strip().title()
                            if dish not in seen and len(dish) > 5:
                                seen.add(dish)
                                all_dishes.append(dish)

        except Exception:
            continue

    # Return top 6 unique dishes
    return all_dishes[:6]


def _extract_signals(results: list[dict], restaurant_name: str = "") -> list[str]:
    """Extract signals only from snippets that mention the specific restaurant."""
    if not restaurant_name:
        return []

    name_lower = restaurant_name.lower()
    # Only look at results that mention this specific restaurant
    relevant_texts = []
    for r in results[:10]:
        title = _clean_snippet(str(r.get("title") or "")).lower()
        content = _clean_snippet(str(r.get("content") or "")).lower()
        if name_lower in title or name_lower in content:
            relevant_texts.append(title + " " + content)

    if not relevant_texts:
        return []

    joined = " ".join(relevant_texts).lower()

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

        # Best-effort travel constraints: keep results local.
        # (This prevents the model from suggesting far-away big-city options.)
        def _pref_float(p: dict, *keys: str, default: float) -> float:
            for k in keys:
                v = p.get(k)
                if v is None or v == "":
                    continue
                try:
                    return float(v)
                except Exception:
                    continue
            return default

        def _is_dense_urban(loc: str) -> bool:
            """Detect if location is a dense urban area (postal code or big city)."""
            l = (loc or "").lower()
            # Canadian postal codes (M5V, V6B, etc.)
            if re.search(r"\b[a-z]\d[a-z]", l):
                return True
            # Major cities
            urban_keywords = [
                "toronto",
                "vancouver",
                "montreal",
                "calgary",
                "ottawa",
                "edmonton",
                "quebec",
                "winnipeg",
                "hamilton",
                "kitchener",
                "london",
                "victoria",
                "halifax",
                "oshawa",
                "windsor",
                "saskatoon",
                "regina",
                "kelowna",
                "barrie",
                "guelph",
                "downtown",
                "midtown",
                "chinatown",
                "yaletown",
                "kensington",
                "annex",
                "beaches",
                "distillery",
                "liberty village",
            ]
            return any(kw in l for kw in urban_keywords)

        def _travel_attempts_km(p: dict, loc: str) -> list[float]:
            # Walking speed: ~5km/h = 0.08 km/min
            # Driving speed: ~60km/h = 1.0 km/min
            is_urban = _is_dense_urban(loc)
            speed_km_per_min = 0.08 if is_urban else TRAVEL_KM_PER_MIN

            max_min = _pref_float(
                p,
                "maxTravelMin",
                "max_travel_min",
                "maxDistanceMin",
                "max_distance_min",
                default=0.0,
            )
            if max_min > 0:
                base_km = max_min * speed_km_per_min
            else:
                # Default: 10 min walking (0.8km) for urban, 20 min driving (20km) for rural
                default_min = 10.0 if is_urban else 20.0
                base_km = _pref_float(
                    p,
                    "maxTravelKm",
                    "max_travel_km",
                    "maxDistanceKm",
                    "max_distance_km",
                    default=default_min * speed_km_per_min,
                )

            # Urban: expand 0.8km -> 1.2km -> 1.6km (walking distances)
            # Rural: expand 20km -> 30km -> 40km (driving distances)
            step_km = 0.4 if is_urban else 10.0
            cap_km = min(MAX_TRAVEL_KM_CAP_DEFAULT, max(0.5, base_km) + (step_km * 2))

            attempts: list[float] = []
            for k in (base_km, base_km + step_km, base_km + 2 * step_km):
                km = float(max(0.3, min(cap_km, k)))  # Minimum 300m for urban
                if km not in attempts:
                    attempts.append(km)
            return attempts

        travel_attempts_km = _travel_attempts_km(prefs, location)
        base_travel_km = (
            travel_attempts_km[0] if travel_attempts_km else MAX_TRAVEL_KM_DEFAULT
        )

        origin = None
        try:
            po = prefs.get("origin")
            if isinstance(po, dict):
                lat = po.get("lat")
                lon = po.get("lon")
                if lat is not None and lon is not None:
                    origin = (float(str(lat)), float(str(lon)))
        except Exception:
            origin = None

        if origin is None:
            origin = _parse_coords(str(location))
        if origin is None and str(location).strip() and str(location) != "near you":
            origin = await _forward_geocode(str(location))

        location_hint = ""
        if str(location).strip() and str(location) != "near you":
            location_hint = f"Only recommend places in/near {str(location).strip()}."

        def _travel_hint_for(km: float) -> str:
            if not str(location).strip() or str(location) == "near you":
                return ""
            if origin is not None:
                return f"Only recommend places within about {km:.0f} km of {str(location).strip()}."
            return location_hint

        async def _is_too_far(restaurant: Any, *, max_km: float) -> bool:
            if not isinstance(restaurant, dict):
                return False
            name = str(restaurant.get("name") or "").strip()
            addr = str(restaurant.get("address") or "").strip()

            # Fast string guard for common "big city" drift.
            try:
                loc_l = str(location).lower()
                addr_l = addr.lower()
                for city in (
                    "toronto",
                    "ottawa",
                    "montreal",
                    "vancouver",
                    "calgary",
                    "edmonton",
                ):
                    if city in addr_l and city not in loc_l:
                        return True
            except Exception:
                pass

            if origin is None:
                return False
            q = (name + " " + addr).strip()
            if not q:
                return False
            coords = await _forward_geocode(q)
            if coords is None:
                return False
            try:
                return _haversine_km(origin, coords) > max_km
            except Exception:
                return False

        yield _sse(
            {
                "type": "status",
                "content": f"Searching for great spots in {display_location}...",
            }
        )

        # Build search queries (keep these tight; we just need candidates and context)
        # Minimize queries for responsiveness.
        base_query = (
            f"restaurants in {location}"
            if cuisine == "any"
            else f"{cuisine} restaurants in {location}"
        )
        searches = [
            f"best {vibe.replace('-', ' ')} {base_query}",
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

        def _make_sources(items: list[dict]) -> list[dict]:
            return [
                {
                    "title": (r.get("title") or "").strip(),
                    "url": (r.get("url") or "").strip(),
                    "engine": (r.get("engine") or "").strip(),
                }
                for r in items
                if (r.get("url") or "").strip()
            ]

        def _make_search_context(items: list[dict]) -> str:
            lines: list[str] = []
            for r in items:
                title = (r.get("title") or "").strip()
                url = (r.get("url") or "").strip()
                snippet = (r.get("content") or "").strip().replace("\n", " ")
                engine = (r.get("engine") or "").strip()
                if snippet:
                    snippet = snippet[:180]
                lines.append(f"- {title} ({engine})\n  {url}\n  {snippet}")
            return "\n".join(lines)

        # Split sources so Option B is grounded in a different set.
        dedup_a = dedup[:6]
        dedup_b = dedup[6:12]
        if len(dedup_b) < 4:
            try:
                async with httpx.AsyncClient(
                    timeout=12.0, follow_redirects=True
                ) as search_client:
                    more = await search_web(
                        f"best {vibe} restaurants {location} hidden gem",
                        client=search_client,
                    )
                for r in more:
                    url = (r.get("url") or "").strip()
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    dedup_b.append(r)
                    if len(dedup_b) >= 6:
                        break
            except Exception:
                pass

        sources_a = _make_sources(dedup_a)
        sources_b = _make_sources(dedup_b)
        urls_a = {s.get("url") for s in sources_a}
        sources = sources_a + [s for s in sources_b if s.get("url") not in urls_a]

        search_context_a = _make_search_context(dedup_a)
        search_context_b = _make_search_context(dedup_b if dedup_b else dedup_a)

        yield _sse(
            {"type": "status", "content": "Found some chatter. Cooking up two picks..."}
        )

        # Use LLM to generate recommendations.
        # IMPORTANT: We do not fabricate private identity info; story focuses on the venue.
        def _build_context(search_context: str) -> str:
            return f"""You are FUD Buddy: witty, slightly sassy, extremely helpful.

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
- whatToWear should reference the vibe/venue and the food.
- order and backupOrder: Use ONLY dishes mentioned in the search snippets. If no specific dishes are mentioned, set these to empty strings or describe the general cuisine type (e.g., "Italian pasta dishes"). NEVER fabricate specific menu items like "Classic pub burger" - that's misleading.
- story MUST be a short string (2-3 sentences) grounded in the snippets.

Rules:
- Extract REAL information from the snippets only.
- If you don't see a specific dish mentioned, don't make one up.
- Keep story grounded in the snippets (no invented chefs/owners).
- No markdown, no commentary, no extra keys."""

        context_a = _build_context(search_context_a)
        context_b = _build_context(search_context_b)

        ground_a = dedup_a
        ground_b = dedup_b if dedup_b else dedup_a

        img_sources_a = sources_a if sources_a else sources
        img_sources_b = sources_b if sources_b else sources

        try:

            def _option_prompt(
                ctx: str, label: str, guidance: str, *, exclude_name: str = ""
            ) -> str:
                return (
                    ctx
                    + "\n\n"
                    + f"Now produce {label}. {guidance}\n"
                    + (
                        f"MUST be a different restaurant than: {exclude_name}.\n"
                        if exclude_name
                        else ""
                    )
                    + "Return ONLY a single JSON object. No surrounding array. No markdown."
                )

            effective_travel_km = base_travel_km

            def _guidance(
                base: str, *, km: float, allow_fallback_vibe: bool = False
            ) -> str:
                th = _travel_hint_for(km)
                fb = ""
                if allow_fallback_vibe:
                    fb = "If nothing nearby matches the vibe, pick a solid local casual spot (pub/diner/pizza) instead, still nearby."
                return " ".join(
                    [p for p in (base.strip(), th.strip(), fb.strip()) if p]
                )

            prompt_b = ""
            name_a = ""

            recs: list[dict] = []

            attempts_a = travel_attempts_km or [effective_travel_km]
            yield _sse({"type": "status", "content": "Writing option A..."})

            rec_a: dict = {}
            rest_a: Any = {}
            for i, km in enumerate(attempts_a):
                if i > 0:
                    yield _sse(
                        {
                            "type": "status",
                            "content": "Still scanning nearby...",
                        }
                    )

                prompt_a = _option_prompt(
                    context_a,
                    "Option A",
                    _guidance(
                        "Pick the cheaper/casual choice.",
                        km=km,
                        allow_fallback_vibe=(i == len(attempts_a) - 1),
                    ),
                )
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
                        str(rest_a.get("name") or ""),
                        str(rest_a.get("address") or ""),
                    )

                try:
                    if not await _is_too_far(rest_a, max_km=km):
                        effective_travel_km = km
                        break
                except Exception:
                    effective_travel_km = km
                    break

            if isinstance(rest_a, dict):
                name_a = str(rest_a.get("name") or "").strip()
            prompt_b = _option_prompt(
                context_b,
                "Option B",
                _guidance(
                    "Pick a pricier/special choice.",
                    km=effective_travel_km,
                    allow_fallback_vibe=True,
                ),
                exclude_name=name_a,
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
                chatter = _extract_place_chatter(place, ground_a)
                signals = _extract_signals(chatter + ground_a, place)
                if chatter:
                    rec_a["peopleSay"] = chatter
                if signals:
                    rec_a["signals"] = signals
            except Exception:
                pass

            attempts_b = [effective_travel_km] + [
                km for km in (travel_attempts_km or []) if km > effective_travel_km
            ]
            if not attempts_b:
                attempts_b = [effective_travel_km]

            yield _sse({"type": "status", "content": "Writing option B..."})
            rec_b: dict = {}
            rest_b: Any = {}
            for i, km in enumerate(attempts_b):
                if i > 0:
                    yield _sse(
                        {
                            "type": "status",
                            "content": "Scanning a little wider in your area...",
                        }
                    )

                prompt_b = _option_prompt(
                    context_b,
                    "Option B",
                    _guidance(
                        "Pick a pricier/special choice.",
                        km=km,
                        allow_fallback_vibe=(i == len(attempts_b) - 1),
                    ),
                    exclude_name=name_a,
                )
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
                        str(rest_b.get("name") or ""),
                        str(rest_b.get("address") or ""),
                    )

                # Ensure distinct restaurants; retry once if duplicated (at this radius).
                try:
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
                                context_b,
                                "Option B",
                                _guidance(
                                    "Pick a pricier/special choice that is NOT the same restaurant as Option A.",
                                    km=km,
                                    allow_fallback_vibe=True,
                                ),
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
                except Exception:
                    pass

                try:
                    if not await _is_too_far(rest_b, max_km=km):
                        effective_travel_km = km
                        break
                except Exception:
                    effective_travel_km = km
                    break

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

            recs.append(rec_b)
            yield _sse({"type": "option", "index": 1, "recommendation": rec_b})

            # Search for actual menu items for both restaurants
            try:
                yield _sse(
                    {"type": "status", "content": "Looking up real menu items..."}
                )
                async with httpx.AsyncClient(
                    timeout=10.0, follow_redirects=True
                ) as menu_client:
                    # Get menu for Option A
                    if isinstance(rest_a, dict):
                        name_a_menu = str(rest_a.get("name") or "")
                        if name_a_menu:
                            dishes_a = await _search_restaurant_menu(
                                name_a_menu, location, menu_client
                            )
                            if dishes_a and len(dishes_a) >= 2:
                                rec_a["order"] = {
                                    "main": dishes_a[0],
                                    "side": dishes_a[1] if len(dishes_a) > 1 else "",
                                    "drink": "",
                                }
                                if len(dishes_a) >= 3:
                                    rec_a["backupOrder"] = {
                                        "main": dishes_a[2],
                                        "side": dishes_a[3]
                                        if len(dishes_a) > 3
                                        else "",
                                        "drink": "",
                                    }

                    # Get menu for Option B
                    if isinstance(rest_b, dict):
                        name_b_menu = str(rest_b.get("name") or "")
                        if name_b_menu:
                            dishes_b = await _search_restaurant_menu(
                                name_b_menu, location, menu_client
                            )
                            if dishes_b and len(dishes_b) >= 2:
                                rec_b["order"] = {
                                    "main": dishes_b[0],
                                    "side": dishes_b[1] if len(dishes_b) > 1 else "",
                                    "drink": "",
                                }
                                if len(dishes_b) >= 3:
                                    rec_b["backupOrder"] = {
                                        "main": dishes_b[2],
                                        "side": dishes_b[3]
                                        if len(dishes_b) > 3
                                        else "",
                                        "drink": "",
                                    }
            except Exception:
                pass  # Fall back to LLM suggestions if menu search fails

            try:
                place = (
                    str(rest_b.get("name") or "") if isinstance(rest_b, dict) else ""
                )
                chatter = _extract_place_chatter(place, ground_b)
                signals = _extract_signals(chatter + ground_b, place)
                if chatter:
                    rec_b["peopleSay"] = chatter
                if signals:
                    rec_b["signals"] = signals
            except Exception:
                pass

            # Best-effort image URLs (parallel)
            async def _img_for(rec: dict, srcs: list[dict]) -> str:
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

                    def _img_score(src_url: str, img_url: str) -> int:
                        u = (img_url or "").lower()
                        s = 0
                        if not u:
                            return -999
                        if _is_bad_image_url(u):
                            return -999
                        if "media-cdn.tripadvisor.com" in u:
                            s += 6
                        if any(k in u for k in ("restaurant", "food", "dish")):
                            s += 2
                        if u.endswith((".jpg", ".jpeg", ".png", ".webp")):
                            s += 1

                        su = (src_url or "").lower()
                        if "tripadvisor." in su:
                            s += 2
                        return s

                    best_img = ""
                    best_score = -999
                    for it in imgs[:16]:
                        src_url = str(it.get("url") or "")
                        if src_url and _is_bad_source_url(src_url):
                            continue
                        img_url = _pick_image_url(it)
                        score = _img_score(src_url, img_url)
                        if score > best_score:
                            best_score = score
                            best_img = img_url
                    if best_img and best_score > -50:
                        return best_img
                except Exception:
                    pass
                for s in srcs:
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

                if not chosen and srcs:
                    chosen = str(srcs[0].get("url") or "")
                return await _og_image_from_url(str(chosen))

            imgs = await asyncio.gather(
                _img_for(recs[0], img_sources_a),
                _img_for(recs[1], img_sources_b),
                return_exceptions=True,
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
