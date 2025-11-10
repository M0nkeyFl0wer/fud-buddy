# Testing Guide: FUD Buddy Privacy Education Campaign

## Quick Test (5 minutes)

### 1. Set Up Seshat Tunnel

```bash
# Terminal 1: Open SSH tunnel
ssh -p8888 -L 11434:localhost:11434 m0nkey-fl0wer@seshat.noosworx.com
# Leave this running
```

### 2. Verify Ollama

```bash
# Terminal 2: Test Ollama is accessible
curl http://localhost:11434/api/tags

# Should return list of models like:
# {"models":[{"name":"llama3.1:8b",...}]}
```

### 3. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env (optional - defaults work)
# VITE_SESHAT_ENDPOINT=http://localhost:11434/api/generate
# VITE_SESHAT_MODEL=llama3.1:8b
```

### 4. Run App

```bash
npm run dev
# Opens at http://localhost:8080
```

---

## Test the Complete Flow

### Flow 1: Happy Path (Privacy Reveal)

1. **Welcome Screen**
   - Click "Find Me Food" →

2. **Location Permission**
   - Click "Share My Location"
   - Grant browser permission
   - ✅ Should see "📍 Location detected: [Your City]"

3. **Preference Selection**
   - Select 1-2 preferences (e.g., "Casual" + "Spicy")
   - Click "Find My Food →"
   - ✅ Should see loading, then 3 restaurant cards

4. **Restaurant Results**
   - Swipe through cards with Previous/Next buttons
   - Click "Get Directions" → Opens Google Maps
   - ✅ Restaurants should match your preferences

5. **Repeat 2 More Times**
   - Click "Try Different Preferences"
   - Select different options
   - Do this **3 times total**

6. **Privacy Reveal** 🎯
   - On 3rd search, should automatically show modal:
     - "We Know A Bit Too Much About You"
     - Shows device fingerprint
     - Shows location history
     - Shows usage patterns
     - Shows "creepy" insights
   - ✅ Check all data is accurate
   - Click EFF resource links (should open)
   - Click "Delete All My Data" → Confirms and clears

---

## Test Individual Components

### Location Service

**Test 1: Grant Permission**
```javascript
// In browser console:
import { locationService } from './src/services/locationService';
const loc = await locationService.getCurrentLocation();
console.log(loc);
// Should show: { latitude, longitude, city, state }
```

**Test 2: Deny Permission**
- Deny location in browser
- Should prompt for manual city entry
- Enter "New York"
- Should continue to preferences

### Privacy Tracking

**Test: View Tracked Data**
```javascript
// In browser console:
localStorage.getItem('fud_buddy_tracking_data')
// Shows JSON of all tracked data
```

**Test: Generate Insights**
```javascript
import { privacyTrackingService } from './src/services/privacyTrackingService';
const insights = privacyTrackingService.generateInsights();
console.log(insights);
// Should show "creepy" messages about usage patterns
```

### Restaurant Search (with Preferences)

**Test 1: No Meat**
- Select only "No Meat"
- Should show: Green Leaf Bistro, Spice Route

**Test 2: Fancy**
- Select only "Fancy"
- Should show: Byte Bistro, Green Leaf Bistro, The Velvet Room

**Test 3: Spicy + Casual**
- Select both
- Should show: Seoul Food, Spice Route

**Test 4: All Preferences**
- Select all 4
- Should show restaurants matching any preference (top 3)

---

## Test Ollama Integration

### Verify Connection

```bash
# Check Ollama is running
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "prompt": "Say hello in 5 words",
    "stream": false
  }'

# Should return:
# {"response":"Hello to you as well!"}
```

### Test AI Service

The AI service is currently set up but **not used in the main flow yet**. To test it:

1. Update `FoodFinderFlow.tsx` to call AI after search
2. Pass restaurant data to `aiService.sendMessage()` with context
3. AI should generate cheeky descriptions

**Example**:
```typescript
import { aiService } from '@/services/aiService';

// After getting restaurants:
const context = restaurants.map(r =>
  `${r.name}: ${r.description}\nPopular: ${r.popularDishes.join(', ')}`
).join('\n\n');

const aiResponse = await aiService.sendMessage(
  `Recommend the best option`,
  'whereToGo',
  [],
  context
);
```

---

## Common Issues

### "Ollama API failed"

**Cause**: Tunnel not running or wrong endpoint

**Fix**:
```bash
# Check tunnel is open:
lsof -i :11434
# Should show ssh process

# Check .env:
VITE_SESHAT_ENDPOINT=http://localhost:11434/api/generate
# NOT https, NOT different port
```

### "Location permission denied"

**Cause**: Browser blocked geolocation

**Fix**:
- Chrome: Click 🔒 in address bar → Site settings → Location → Allow
- Safari: Preferences → Websites → Location → Allow
- Or use manual city entry as fallback

### "No restaurants found"

**Cause**: Preference filtering too strict

**Fix**: Try different combinations or select fewer preferences

### "Privacy reveal not showing"

**Cause**: Haven't done 3 searches yet

**Fix**:
```javascript
// Force show reveal (dev only):
privacyTrackingService.trackAction('search');
privacyTrackingService.trackAction('search');
privacyTrackingService.trackAction('search');
// Reload page
```

Or clear localStorage and start over:
```javascript
localStorage.clear();
```

---

## Production Checklist

Before deploying to production:

- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test "Add to Home Screen" (PWA)
- [ ] Verify location works on HTTPS (required for production)
- [ ] Test seshat tunnel is stable under load
- [ ] Add real web search API
- [ ] Test with real users (get feedback on "creepy" timing)
- [ ] Verify all EFF links work
- [ ] Test data deletion actually works
- [ ] Add error tracking (Sentry, etc.)

---

## Next Steps

Once basic testing passes:

1. **Add Real Web Search**
   - Google Places API
   - Or DuckDuckGo/SearX
   - Or web scraping with Playwright

2. **Enhance AI Integration**
   - Use Ollama to enhance descriptions
   - Generate personalized recommendations
   - Test different models (70b vs 8b)

3. **Deploy to Production**
   - Netlify/Vercel for web
   - Expose seshat API (with auth!)
   - Or run Ollama locally for each user (advanced)

4. **Mobile App Stores**
   - Add Capacitor
   - Create app icons
   - Submit to Google Play + Apple App Store

5. **Marketing**
   - Share privacy education angle
   - Demo the reveal on social media
   - Reach out to privacy communities

---

## Questions?

See `SETUP.md` for full setup guide
