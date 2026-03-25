# FUD Buddy - Remaining Work

## Done
- [x] SQLite backend replacing Airtable mocks
- [x] FastAPI server with SSE streaming
- [x] OpenRouter + Ollama LLM support
- [x] Rate limiting per client (configurable)
- [x] Feedback storage in SQLite
- [x] Analytics/events stored in SQLite
- [x] Reverse geocode proxy
- [x] Auto-generated Google/Apple Maps links
- [x] Model listing (Ollama + OpenRouter combined)

## Before Sharing with Doc
- [ ] Test full flow end-to-end with OpenRouter key (Ollama needs more RAM than laptop has)
- [ ] Set OpenRouter API key in server/.env (or paste it in /config in the browser)
- [ ] Run `npm run dev` + backend together and verify the UI works
- [ ] Decide if /config page should be hidden from non-dev users
- [ ] Optional: password-protect with HTTP Basic Auth if hosting publicly

## Nice to Have (Later)
- [ ] Image enrichment (Google Places photos for restaurants)
- [ ] Real review snippets (peopleSay field)
- [ ] Streaming token-by-token from LLM (currently waits for full response)
- [ ] Backend proxy mode so API keys never touch the browser
- [ ] Sentry/error monitoring
- [ ] Telegram bot integration
