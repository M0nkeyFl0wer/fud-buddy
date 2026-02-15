from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
import os
import json
import httpx
from sse_starlette.sse import EventSourceResponse
import uuid

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

db_pool = None


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


async def search_web(query: str) -> list[dict]:
    """Return a small list of search results.

    Prefers SearxNG (self-hosted) when SEARXNG_URL is set.
    Falls back to DuckDuckGo HTML only as a last resort.
    """

    if SEARXNG_URL:
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
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
                    for r in results[:8]:
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


def _sse(data: Any) -> dict:
    # EventSourceResponse will serialize dict -> SSE lines. We always send JSON in `data`.
    return {"data": json.dumps(data)}


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


def _normalize_recommendations(items: list) -> list[dict]:
    """Best-effort normalization to the app's expected schema.

    Expected per item:
      {
        "restaurant": {"name": str, "address": str, "priceRange": str, "rating": number?},
        "dishes": [{"name": str, "description": str}],
        "story": str
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

        if not isinstance(story, str):
            story = ""

        out.append({"restaurant": restaurant, "dishes": norm_dishes, "story": story})

    return out


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    prefs = request.preferences or {}
    location = prefs.get("location", "near you")
    vibe = ", ".join(prefs.get("vibe", [])) or "good food"
    cuisine = ", ".join(prefs.get("cuisine", [])) or "any"
    dietary = ", ".join(prefs.get("dietary", [])) or "none"

    async def event_generator():
        # Status updates
        yield _sse(
            {"type": "status", "content": f"Searching for great spots in {location}..."}
        )

        # Build search queries (keep these tight; we just need candidates and context)
        searches = [
            f"best {cuisine} restaurants {location}",
            f"site:reddit.com {cuisine} {location} best restaurant",
            f"top rated restaurants {location} {cuisine}",
        ]

        session_id = uuid.uuid4()

        # Search
        found: list[dict] = []
        for query in searches:
            results = await search_web(query)
            for r in results:
                if r.get("url"):
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
            for r in dedup[:10]
        ]

        search_context_lines: list[str] = []
        for r in dedup[:10]:
            title = (r.get("title") or "").strip()
            url = (r.get("url") or "").strip()
            snippet = (r.get("content") or "").strip().replace("\n", " ")
            engine = (r.get("engine") or "").strip()
            if snippet:
                snippet = snippet[:280]
            search_context_lines.append(f"- {title} ({engine})\n  {url}\n  {snippet}")

        search_context = "\n".join(search_context_lines)

        yield _sse({"type": "status", "content": "Found some chatter. Summarizing..."})

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
Return exactly 2 restaurant recommendations based on what people are talking about.
1) A cheaper/casual option.
2) A pricier/special option.

CRITICAL output requirements:
- Output MUST be a JSON array with exactly 2 objects.
- Each object MUST have ONLY these top-level keys: restaurant, dishes, story.
- restaurant MUST have keys: name, address, priceRange, rating.
- dishes MUST be an array of 2-3 objects with keys: name, description.
- story MUST be a short string (2-3 sentences).
- Do NOT nest dishes or story inside restaurant.

Rules:
- Use real places from the search snippets when possible.
- Keep story to 2-3 sentences and grounded in the provided links/snippets.
- Output ONLY valid JSON. No markdown. No commentary."""

        try:
            full_response = ""
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": context,
                        "stream": True,
                        "options": {
                            "temperature": 0.6,
                        },
                    },
                ) as response:
                    if response.status_code != 200:
                        yield _sse(
                            {
                                "type": "error",
                                "message": f"LLM error: {response.status_code}",
                            }
                        )
                        yield _sse({"type": "done"})
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            payload = json.loads(line)
                        except Exception:
                            continue

                        token = payload.get("response")
                        if token:
                            full_response += token
                            # Stream the generated JSON text as a delta.
                            yield _sse({"type": "delta", "content": token})

                        if payload.get("done"):
                            break

            recommendations = _extract_json_array(full_response)
            if recommendations is None:
                yield _sse(
                    {
                        "type": "error",
                        "message": "Model returned invalid JSON. Try again.",
                        "rawPreview": full_response[:500],
                    }
                )
                yield _sse({"type": "done"})
                return

            normalized = _normalize_recommendations(recommendations)
            if len(normalized) < 2:
                yield _sse(
                    {
                        "type": "error",
                        "message": "Model returned unusable structure. Try again.",
                        "rawPreview": full_response[:500],
                    }
                )
                yield _sse({"type": "done"})
                return

            await _persist_session(session_id, prefs, normalized[:2], sources=sources)

            # Send structured result so the frontend doesn't have to guess.
            yield _sse(
                {
                    "type": "result",
                    "sessionId": str(session_id),
                    "sources": sources,
                    "recommendations": normalized[:2],
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
