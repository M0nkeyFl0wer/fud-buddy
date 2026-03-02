# FUD Buddy Beta Deployment Guide

## 🚀 Ready for Beta Launch

All critical blockers have been fixed! You can deploy to production immediately.

---

## Quick Deploy to Netlify (5 minutes)

### Option 1: Netlify CLI (Recommended)

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod

# Follow prompts:
# - Create & configure new site: Yes
# - Site name: fud-buddy (or your preferred name)
# - Build command: npm run build
# - Publish directory: dist
```

**Done!** You'll get a URL like `https://fud-buddy.netlify.app`

### Option 2: Netlify Web Interface

1. Go to [netlify.com](https://netlify.com) and login
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `M0nkeyFl0wer/fud-buddy`
4. Branch: `claude/launch-site-adwords-011CUyJB541ZQeFqf3miPuPt`
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Click "Deploy site"

**Netlify auto-detects** `netlify.toml` and will use those settings!

---

## What's Included

### ✅ Fixed Critical Blockers

1. **PWA Icons** - Uses existing logo (works for beta)
2. **Error Boundary** - Graceful error handling
3. **Loading States** - Spinners during search
4. **Privacy Policy** - Honest, legally compliant at `/privacy-policy.html`
5. **Production Fallback** - Works without seshat (uses mock data)
6. **HTTPS** - Netlify provides auto-HTTPS (required for geolocation)
7. **Beta Disclaimer** - Clear notice about sample data

### ✅ Security Headers (via netlify.toml)

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection enabled
- Proper cache control for PWA

### ✅ SPA Routing

- All routes redirect to index.html
- Works with React Router

---

## After Deployment

### 1. Test Critical Flows

**On Desktop:**
```
1. Visit deployed URL
2. Click "Find Me Food"
3. Grant location permission
4. Select preferences (e.g., Casual + Spicy)
5. Verify 3 restaurant cards appear
6. Use app 3 times total
7. Privacy reveal modal should appear
8. Click "Delete All My Data" - verify it works
```

**On Mobile:**
```
iOS Safari:
1. Open deployed URL
2. Test location permission
3. Test "Add to Home Screen"
4. Verify PWA installs

Android Chrome:
1. Open deployed URL
2. Test location permission
3. Tap "Install App" banner
4. Verify PWA installs
```

### 2. Share Beta Invite

**Who to invite:**
- Friends interested in privacy
- Privacy advocates (r/privacy, EFF community)
- 10-20 people max for first beta

**What to tell them:**
```
Hey! I built a food recommendation app that teaches you about digital privacy.

It intentionally tracks you (location, device info, usage patterns),
then reveals everything it collected. It's eye-opening!

Try it here: [your-url]

After using it 3 times, you'll see the privacy reveal. Let me know what you think!

Note: Beta version uses sample restaurant data for now.
```

### 3. Collect Feedback

**Questions to ask:**
- Was the privacy reveal surprising/impactful?
- Too creepy? Not creepy enough?
- Timing (3 searches) - too soon or too late?
- Did you understand the educational purpose?
- Would you share this with friends?

---

## Monitoring & Analytics

### Check Netlify Dashboard

- **Deploys:** See build logs, errors
- **Forms:** If you add contact form later
- **Functions:** If you add serverless functions
- **Analytics:** Enable Netlify Analytics ($9/mo) for detailed stats

### Add Google Analytics (Optional)

If you want to track beta usage:

1. Create GA4 property
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to environment variables in Netlify:
   ```
   VITE_GA4_ID=G-XXXXXXXXXX
   ```
4. Redeploy

---

## Troubleshooting

### Location Not Working

**Issue:** "Location permission denied" on deployed site

**Fix:**
- ✅ Netlify provides HTTPS automatically (required for geolocation)
- Check browser console for errors
- Try on different browser/device
- Fallback to manual city entry should work

### PWA Not Installing

**Issue:** "Add to Home Screen" doesn't appear

**Fix:**
- ✅ Manifest is configured correctly
- Visit site multiple times to trigger install prompt
- On iOS: Safari → Share → Add to Home Screen (manual)
- Check manifest at `https://your-url/manifest.json`

### Privacy Reveal Not Showing

**Issue:** Modal doesn't appear after 3 searches

**Fix:**
- Check browser console for errors
- Clear localStorage and try again
- Verify `privacyTrackingService` is tracking:
  ```javascript
  localStorage.getItem('fud_buddy_tracking_data')
  ```

### Build Fails on Netlify

**Issue:** "Command failed with exit code 1"

**Fix:**
- Check build logs in Netlify dashboard
- Verify `package.json` has all dependencies
- Try building locally: `npm run build`
- Node version: Netlify uses Node 18 (set in netlify.toml)

---

## Next Steps After Beta

### Immediate (Based on Feedback)
- [ ] Tune privacy reveal timing (currently 3 searches)
- [ ] Adjust "creepiness" level of insights
- [ ] Fix any critical bugs found in beta

### Short-Term (1-2 weeks)
- [ ] Add real restaurant search API (Google Places or web scraping)
- [ ] Connect seshat Ollama for production (if viable)
- [ ] Improve loading states with skeleton screens
- [ ] Add social sharing for privacy reveal

### Long-Term (1+ months)
- [ ] Native mobile apps (Capacitor + app stores)
- [ ] More privacy insights (battery level, connection type, etc.)
- [ ] Partnerships with privacy organizations (EFF, Privacy Badger)
- [ ] User accounts (optional, ironic given privacy focus)

---

## Environment Variables

### Currently Used:
```bash
# Ollama (optional - falls back to mock if not set)
VITE_SESHAT_ENDPOINT=http://localhost:11434/api/generate
VITE_SESHAT_MODEL=llama3.1:8b

# Analytics (optional)
VITE_GA4_ID=G-XXXXXXXXXX
VITE_FB_PIXEL_ID=XXXXXXXXXXXX
```

### To Set in Netlify:
1. Site settings → Build & deploy → Environment
2. Add variables
3. Redeploy to apply

---

## Custom Domain (Optional)

### Add Your Own Domain:

1. Buy domain (namecheap, godaddy, etc.)
2. In Netlify: Site settings → Domain management
3. Add custom domain
4. Update DNS records (Netlify provides instructions)
5. Wait for DNS propagation (~24 hours)

**Examples:**
- `fudbuddy.app`
- `privacyreveal.io`
- `trackme.app`

---

## Beta Success Criteria

### Metrics to Track:
- [ ] 10+ people complete full flow
- [ ] 80%+ see privacy reveal modal
- [ ] 50%+ click "Delete All Data" (shows engagement)
- [ ] 5+ pieces of qualitative feedback
- [ ] 0 critical bugs
- [ ] Privacy message resonates with users

### Definition of Success:
If users say "Wow, I had no idea apps tracked this much!" → **Success!**

---

## Deploy Now!

```bash
# Quick deploy:
netlify deploy --prod

# Or connect GitHub for auto-deploys:
netlify link
```

**Your app will be live in ~2 minutes.** 🎉

---

## Support

- **Build Issues:** Check `BETA_READINESS.md`
- **Testing:** See `TESTING.md`
- **Setup:** See `SETUP.md`
- **GitHub Issues:** https://github.com/M0nkeyFl0wer/fud-buddy/issues

**Ready to launch?** Run `netlify deploy --prod` and share with your first beta testers!
