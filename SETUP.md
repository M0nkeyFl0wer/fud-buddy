# FUD Buddy Setup Guide

## Privacy Education Campaign Tool

FUD Buddy is a food recommendation app that doubles as a **privacy rights education tool**. It tracks users to help them understand how they're being tracked, then reveals what data was collected and links to privacy protection resources.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Seshat Ollama Tunnel

You need an SSH tunnel to seshat for local AI inference:

```bash
# Open tunnel (keep this running in a separate terminal)
ssh -p8888 -L 11434:localhost:11434 m0nkey-fl0wer@seshat.noosworx.com
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```bash
# Seshat Ollama (via SSH tunnel)
VITE_SESHAT_ENDPOINT=http://localhost:11434/api/generate
VITE_SESHAT_MODEL=llama3.1:8b  # or llama3.1:70b for better quality

# Optional: Analytics
VITE_GA4_ID=your_google_analytics_id
VITE_FB_PIXEL_ID=your_facebook_pixel_id
```

### 4. Verify Ollama is Running

```bash
# In another terminal (after tunnel is open)
curl http://localhost:11434/api/tags
```

Should return list of available models on seshat.

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:8080`

---

## Architecture Overview

### Core Flow

```
User opens app
    ↓
Request location permission → Track location
    ↓
Select preferences (no-meat, spicy, fancy, casual) → Track preferences
    ↓
Search restaurants via:
  - Web scraping (Google Maps, reviews, articles)
  - Location-based search
    ↓
Feed data to Ollama on seshat
    ↓
AI generates:
  - Top 3 restaurant recommendations
  - 3 dish suggestions per restaurant
  - Cheeky descriptions
    ↓
Display as swipeable cards → Track interactions
    ↓
After 3+ searches: Show Privacy Reveal Modal
  - "Here's everything we know about you"
  - Device fingerprint
  - Location history
  - Usage patterns
  - Creepy personalized insights
    ↓
Link to EFF privacy resources
```

### Key Services

**AI Service** (`src/services/aiService.ts`)
- Connects to Ollama on seshat via SSH tunnel
- Supports llama3.1:8b, llama3.1:70b, mistral:7b, qwen2.5:14b
- Generates cheeky food recommendations

**Search Service** (`src/services/searchService.ts`)
- Will integrate MCP Chrome/Playwright for web scraping
- Currently uses mock restaurant data
- TODO: Implement Google Maps, Yelp, Reddit scraping

**Location Service** (`src/services/locationService.ts`)
- Browser geolocation API
- Reverse geocoding (OSM Nominatim)
- Tracks user location for privacy reveal

**Privacy Tracking Service** (`src/services/privacyTrackingService.ts`)
- Device fingerprinting (user agent, screen, timezone, etc.)
- Usage pattern tracking (time of day, preferences, locations)
- Generates "creepy" insights for education
- localStorage persistence

---

## Adding Web Search/Scraping

### Option 1: MCP Chrome Automation (Recommended)

Install MCP server for browser automation:

```bash
# Install playwright or chrome MCP server
# Use it to scrape Google Maps, Yelp, Reddit
```

Update `searchService.ts` to use MCP tools:

```typescript
// Example: Scrape Google Maps for restaurant
const results = await mcpChrome.search({
  query: `restaurants near ${location.city}`,
  scrape: true
});
```

### Option 2: Google Places API (Costs Money)

```bash
VITE_GOOGLE_PLACES_API_KEY=your_api_key
```

Update `searchService.ts` to call Google Places API.

---

## Deployment

### Web (Netlify/Vercel)

```bash
npm run build
```

Deploy `dist/` folder to:
- **Netlify**: Drop folder or connect GitHub
- **Vercel**: `vercel deploy`

**Important**: You'll need to set up the seshat tunnel on your deployment server, or expose seshat's Ollama API publicly (with authentication!).

### PWA (Progressive Web App)

Already configured! Users can "Add to Home Screen" on mobile browsers.

- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → Menu → Add to Home Screen

### Native Mobile Apps (Future)

To create actual app store apps, add Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

Then build with:

```bash
npm run build
npx cap sync
npx cap open ios  # or android
```

---

## Testing Ollama Models

Try different models on seshat to balance speed vs quality:

```bash
# Fast but lower quality
llama3.1:8b  (~2-3 sec response)

# Better quality, slower
llama3.1:70b  (~10-15 sec response)

# Good for reasoning
qwen2.5:14b  (~5-7 sec response)

# Fast and lightweight
mistral:7b  (~2 sec response)
```

Set in `.env`:

```bash
VITE_SESHAT_MODEL=llama3.1:8b
```

---

## Privacy Reveal Customization

Edit `src/services/privacyTrackingService.ts`:

### Change when privacy reveal appears:

```typescript
// Line ~285
shouldShowPrivacyReveal(): boolean {
  const searchCount = this.trackedData.usageHistory.filter(
    u => u.action === 'search'
  ).length;

  return searchCount >= 3;  // Change this number
}
```

### Customize "creepy" insights:

```typescript
// Line ~235
generateInsights(): string[] {
  // Add your own creepy messages here
  insights.push(`Your custom message based on tracked data`);
}
```

### Add more tracking data:

```typescript
// Add to DeviceFingerprint interface
export interface DeviceFingerprint {
  // Add new fields
  batteryLevel?: number;
  connectionType?: string;
}
```

---

## Troubleshooting

### "Ollama API failed"

- Check tunnel is running: `ssh -p8888 -L 11434:localhost:11434 m0nkey-fl0wer@seshat.noosworx.com`
- Verify Ollama: `curl http://localhost:11434/api/tags`
- Check model name matches: `llama3.1:8b` (case-sensitive, with version)

### "Location permission denied"

- Browser blocks geolocation on non-HTTPS
- Use `localhost` for development (allowed)
- For production, MUST use HTTPS

### Mock data still showing

- Check `.env` file exists and is loaded
- Verify `VITE_SESHAT_ENDPOINT` is set
- Restart dev server after changing `.env`

---

## Next Steps

1. ✅ **You have**: Core UI, privacy tracking, Ollama integration
2. **TODO**: Add web scraping for real restaurant data
3. **TODO**: Test with real users, tune "creepy" timing
4. **TODO**: Create social media sharing cards
5. **TODO**: Submit to app stores (if going native)

---

## Contributing

This is a privacy education tool! Contributions welcome:

- Better web scraping integrations
- More privacy insights
- UI/UX improvements
- Privacy resource links

---

## License

MIT - See LICENSE file
