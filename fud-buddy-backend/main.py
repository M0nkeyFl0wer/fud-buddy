from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import httpx
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="FUD Buddy API")

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config - use Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.3")


# Models
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    preferences: Optional[dict] = None


async def search_web(query: str) -> str:
    """Free web search using DuckDuckGo."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(
                "https://html.duckduckgo.com/html/", params={"q": query}
            )
            if response.status_code == 200:
                return response.text[:8000]
    except Exception as e:
        return f"Search error: {str(e)}"
    return "No results found"


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint."""

    preferences = request.preferences or {}
    location = preferences.get("location", "near them")
    vibe = ", ".join(preferences.get("vibe", [])) or "popular"
    cuisine = ", ".join(preferences.get("cuisine", [])) or "any"
    dietary = ", ".join(preferences.get("dietary", [])) or "none"

    # Build searches
    searches = [
        f"best {cuisine} restaurants {location} highly rated reviews 2024",
        f"site:reddit.com best {cuisine} {location}",
        f"hidden gem restaurants {location} {cuisine}",
    ]
    if vibe:
        searches.append(f"best {vibe} restaurants {location}")

    async def event_generator():
        yield "data: " + json.dumps({"content": "🔍 Searching..."}) + "\n\n"

        # Do searches
        search_results = ""
        for s in searches:
            search_results += f"\n--- {s} ---\n"
            search_results += await search_web(s) + "\n"

        yield "data: " + json.dumps({"content": "🤔 Thinking..."}) + "\n\n"

        context = f"""You are FUD Buddy, a witty food recommendation assistant.

IMPORTANT USER:
- Location: **{location}**
- Vibe: **{vibe}**
- Food: **{cuisine}**
- Dietary: **{dietary}**

Search results:
{search_results}

Recommend 2 restaurants:
1. Cheap/casual ($$ or $)
2. Nice/special ($$$ or $$$$)

For each:
- Name and address
- 2-3 dishes to order  
- SHORT story (2-3 sentences) with: owner/chef info, quirky fact (terrible website, famous dish, etc), why people come back

Output ONLY valid JSON:
[
  {{"restaurant": {{"name": "", "address": "", "priceRange": "$/$$/$$$/$$$$", "rating": 0}}, "dishes": [{{"name": "", "description": ""}}], "story": ""}},
  {{"restaurant": {{"name": "", "address": "", "priceRange": "$/$$/$$$/$$$$", "rating": 0}}, "dishes": [{{"name": "", "description": ""}}], "story": ""}}
]

JSON only."""

        # Stream from Ollama
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are FUD Buddy. Output valid JSON only.",
                            },
                            {"role": "user", "content": context},
                        ],
                        "stream": True,
                    },
                ) as response:
                    if response.status_code != 200:
                        yield (
                            "data: "
                            + json.dumps({"content": f"Error: {response.status_code}"})
                            + "\n\n"
                        )
                    else:
                        async for line in response.aiter_lines():
                            if line:
                                try:
                                    parsed = json.loads(line)
                                    content = parsed.get("message", {}).get(
                                        "content", ""
                                    )
                                    if content:
                                        yield f"data: {json.dumps({'content': content})}\n\n"
                                    if parsed.get("done"):
                                        break
                                except:
                                    pass
        except Exception as e:
            yield "data: " + json.dumps({"content": f"Error: {str(e)}"}) + "\n\n"

        yield "data: [DONE]\n\n"

    return EventSourceResponse(event_generator())


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
