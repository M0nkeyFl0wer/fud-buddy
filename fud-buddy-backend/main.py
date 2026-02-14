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

# Config
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:8080")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.1-70b-instruct-q4_K_M")

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
            # DuckDuckGo HTML search
            response = await client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query}
            )
            if response.status_code == 200:
                # Return first 8000 chars of HTML (we'll extract text)
                return response.text[:8000]
    except Exception as e:
        return f"Search error: {str(e)}"
    
    return "No results found"


async def generate_recommendations(preferences: dict, callback) -> str:
    """Use LLM with web search to generate recommendations."""
    
    location = preferences.get("location", "near them")
    vibe = ", ".join(preferences.get("vibe", [])) or "popular"
    cuisine = ", ".join(preferences.get("cuisine", [])) or "any"
    dietary = ", ".join(preferences.get("dietary", [])) or "none"
    
    # Build targeted searches based on preferences
    searches = []
    
    # Main search - best rated + cuisine + location
    searches.append(f"best {cuisine} restaurants {location} highly rated reviews")
    
    # Reddit - real local recommendations
    searches.append(f"site:reddit.com best {cuisine} {location}")
    
    # Hidden gems / local favorites
    searches.append(f"best hidden gem restaurants {location} {cuisine}")
    
    # What's trending now
    searches.append(f"trending restaurants {location} 2024")
    
    # If they want specific vibe, add that
    if vibe:
        searches.append(f"best {vibe} restaurants {location} {cuisine}")
    
    search_results = ""
    for s in searches:
        search_results += f"\n--- Search: {s} ---\n"
        search_results += await search_web(s) + "\n"
    
    context = f"""You are FUD Buddy, a witty, opinionated food recommendation assistant.

IMPORTANT USER CONTEXT:
- They are in/near: **{location}**
- They want: **{vibe}** vibes
- They like: **{cuisine}** food
- Dietary needs: **{dietary}**

Recent web searches about restaurants in this area:
{search_results}

Your task: Based on REAL recommendations from the search results above, recommend 2 restaurants for THIS SPECIFIC USER.

1. First option: casual/cheaper spot that locals love ($$ or $) - matches their vibe/food prefs
2. Second option: nicer/special occasion place ($$$ or $$$$) - for when they want to splurge

For each, include:
- Real restaurant name from the search results
- Address in/near {location}
- 2-3 specific dishes to order (that match their dietary needs if possible)
- A SHORT story (2-3 sentences) that includes:
  - Who owns or runs the place (chef background, family-run, etc)
  - One interesting/quirky fact (terrible website, famous for one dish, 40 years in business, etc)
  - Why people keep coming back

Make it feel like you actually found something real for THIS PERSON.

Output ONLY valid JSON:
[
  {{
    "restaurant": {{"name": "", "address": "", "priceRange": "$/$$/$$$/$$$$", "rating": 0}},
    "dishes": [{{"name": "", "description": ""}}],
    "story": ""
  }},
  {{"restaurant": {{"name": "", "address": "", "priceRange": "$/$$/$$$/$$$$", "rating": 0}}, "dishes": [{{"name": "", "description": ""}}], "story": ""}}
]

Be helpful. Be specific. Be charming. Output JSON only."""
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            response = await client.post(
                f"{LLM_BASE_URL}/v1/chat/completions",
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are FUD Buddy, a witty food recommendation assistant. Always output valid JSON only."},
                        {"role": "user", "content": context}
                    ],
                    "temperature": 0.8,
                    "stream": True,
                },
            )
            
            if response.status_code != 200:
                callback(f"data: {json.dumps({'content': f'LLM error: {response.status_code}'})}\n\n")
                return
            
            # Stream the response
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        parsed = json.loads(data)
                        content = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if content:
                            callback(f"data: {json.dumps({'content': content})}\n\n")
                    except:
                        pass
                        
        except Exception as e:
            callback(f"data: {json.dumps({'content': f'Error: {str(e)}'})}\n\n")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint."""
    
    if not LLM_BASE_URL:
        raise HTTPException(status_code=500, detail="LLM not configured")
    
    preferences = request.preferences or {}
    
    async def event_generator():
        yield "data: " + json.dumps({"content": "🔍 Finding what people's talking about..."}) + "\n\n"
        await generate_recommendations(preferences, lambda chunk: yield chunk)
        yield "data: [DONE]\n\n"
    
    return EventSourceResponse(event_generator())


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
