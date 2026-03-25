"""FUD Buddy local backend — FastAPI + SQLite."""

import json
import os
import uuid
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import database as db
from . import llm

load_dotenv()

RATE_LIMIT_DAILY = int(os.getenv("RATE_LIMIT_DAILY", "50"))
SERVER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    print(f"[fud-buddy] SQLite ready at {db.DB_PATH}")
    if await llm.ollama_available():
        models = await llm.ollama_models()
        print(f"[fud-buddy] Ollama detected — models: {', '.join(models) or '(none)'}")
    else:
        print("[fud-buddy] Ollama not detected (OpenRouter API key required)")
    yield


app = FastAPI(title="FUD Buddy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_api_key(request: Request) -> str:
    """Prefer server-side key; fall back to client-provided bearer token."""
    if SERVER_API_KEY:
        return SERVER_API_KEY
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


def _get_client_id(request: Request) -> str:
    return request.headers.get("x-fud-client-id", "anonymous")


def _get_model(request: Request) -> str:
    return request.headers.get("x-fud-llm-model", "") or "google/gemini-2.0-flash-001"


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/healthz")
async def healthz():
    ollama_ok = await llm.ollama_available()
    return {
        "ok": True,
        "sqlite": str(db.DB_PATH),
        "ollama": ollama_ok,
        "has_openrouter_key": bool(SERVER_API_KEY),
    }


# ---------------------------------------------------------------------------
# Chat — SSE streaming
# ---------------------------------------------------------------------------

@app.post("/api/chat/stream")
async def chat_stream(request: Request):
    body = await request.json()
    preferences = body.get("preferences", {})
    client_id = _get_client_id(request)
    model = _get_model(request)
    api_key = _get_api_key(request)

    session_id = str(uuid.uuid4())

    # Rate limit check
    hits_today = db.count_sessions_today(client_id)
    if hits_today >= RATE_LIMIT_DAILY:
        async def rate_limited():
            yield f"data: {json.dumps({'type': 'rate_limit_status', 'hits': hits_today, 'max': RATE_LIMIT_DAILY})}\n\n"
            yield f"data: {json.dumps({'type': 'rate_limit', 'message': f'Daily limit reached ({RATE_LIMIT_DAILY} requests). Try again tomorrow.', 'error': 'daily_limit'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(rate_limited(), media_type="text/event-stream")

    # Save session
    db.create_session(session_id, client_id, preferences)

    async def event_stream():
        # Rate limit info
        yield f"data: {json.dumps({'type': 'rate_limit_status', 'hits': hits_today + 1, 'max': RATE_LIMIT_DAILY})}\n\n"

        collected_recs: list[dict] = []

        # Decide: Ollama (offline) or OpenRouter
        use_ollama = False
        if not api_key:
            if await llm.ollama_available():
                use_ollama = True
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No API key and Ollama is not running. Set an OpenRouter key in /config or start Ollama.'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        if use_ollama:
            # Only pass model if it looks like an Ollama model (no slash, or ollama/ prefix)
            ollama_model = None
            if "/" not in model:
                ollama_model = model
            elif model.startswith("ollama/"):
                ollama_model = model.removeprefix("ollama/")
            source = llm.call_ollama(preferences, model=ollama_model)
        else:
            source = llm.call_openrouter(preferences, api_key=api_key, model=model)

        async for event in source:
            yield f"data: {json.dumps(event)}\n\n"

            # Collect recommendations for final result event
            if event.get("type") == "option":
                rec = event.get("recommendation")
                if rec:
                    collected_recs.append(rec)

            # Stop on error
            if event.get("type") in ("error", "rate_limit"):
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        # Final result event
        if collected_recs:
            db.save_recommendations(session_id, collected_recs)
            yield f"data: {json.dumps({'type': 'result', 'recommendations': collected_recs, 'sessionId': session_id, 'sources': []})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

@app.post("/api/feedback")
async def post_feedback(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        return {"ok": False, "error": "session_id required"}

    db.upsert_feedback(
        session_id=session_id,
        rating=body.get("rating"),
        went=body.get("went"),
        comment=body.get("comment"),
        contact=body.get("contact"),
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Events / analytics (replaces Airtable)
# ---------------------------------------------------------------------------

@app.post("/api/events")
async def post_event(request: Request):
    body = await request.json()
    client_id = _get_client_id(request)
    db.log_event(
        event_type=body.get("event_type", "unknown"),
        table_name=body.get("table_name"),
        data=body.get("data"),
        client_id=client_id,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Model listing
# ---------------------------------------------------------------------------

@app.get("/api/openrouter/models")
async def get_models(request: Request):
    api_key = _get_api_key(request)

    models: list[str] = []

    # Always include Ollama models if available
    ollama_models = await llm.ollama_models()
    models.extend(f"ollama/{m}" for m in ollama_models)

    # Add OpenRouter models if key available
    if api_key:
        try:
            or_models = await llm.openrouter_models(api_key)
            models.extend(or_models)
        except Exception:
            pass

    return {"ok": True, "models": models}


# ---------------------------------------------------------------------------
# Reverse geocode proxy
# ---------------------------------------------------------------------------

@app.get("/api/geocode/reverse")
async def reverse_geocode(lat: float, lon: float):
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"format": "jsonv2", "lat": str(lat), "lon": str(lon)},
                headers={
                    "Accept": "application/json",
                    "Accept-Language": "en",
                    "User-Agent": "FUDBuddy/1.0",
                },
            )
            if resp.status_code != 200:
                return {"ok": False, "display": ""}
            data = resp.json()
            addr = data.get("address", {})
            city = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("hamlet")
                or addr.get("county")
                or ""
            )
            state = addr.get("state") or addr.get("region") or ""
            if city and state:
                return {"ok": True, "display": f"{city}, {state}"}
            if city:
                return {"ok": True, "display": city}
            display = data.get("display_name", "")
            if display:
                return {"ok": True, "display": ", ".join(display.split(",")[:3]).strip()}
            return {"ok": False, "display": ""}
    except Exception:
        return {"ok": False, "display": ""}


# ---------------------------------------------------------------------------
# Loader images (placeholder — returns empty for offline)
# ---------------------------------------------------------------------------

@app.get("/api/loader/images")
async def loader_images(location: str = "", vibe: str = ""):
    return {"ok": True, "images": []}


# ---------------------------------------------------------------------------
# Run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("server.app:app", host="0.0.0.0", port=port, reload=True)
