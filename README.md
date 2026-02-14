<p align="center">
  <img src="assets/fud-buddy-logo.png" alt="FUD Buddy Logo" width="250"/>
</p>

# FUD Buddy 🍔

**We know what you want to eat before you do.**

FUD Buddy is your spicy little companion for finding exactly what to eat — powered by online reviews, social data, and a touch of sass. Drop in a restaurant name and we’ll tell you what to order (or where to go instead).

## 🚀 Features

- 🍽️ Personalized meal recommendations
- 🔍 Pulls from social media, Reddit, Google, and more
- 🤖 GPT-powered conversational UI
- 🧠 Opinionated: highlights the best dishes, and warns about duds
- 📸 Auto-generates caricature of you enjoying your food (because why not?)

## 🧱 Tech Stack

- TypeScript + React
- GPT API (OpenAI)
- Airtable (temporary backend)
- Vite + Tailwind CSS
- Deployed via GitHub + Lovable

## 🔧 Setup

```bash
git clone https://github.com/M0nkeyFl0wer/fud-buddy.git
cd fud-buddy
bun install    # or npm install
bun dev        # or npm run dev

🗺️ Roadmap
 Telegram bot integration

 Food ordering via affiliate APIs

 Local review caching

 User personalization via ad profile data (with consent)

📜 License
MIT — use it, remix it, just don’t be evil.

## Remote Model (Beta)

FUD Buddy can run against the remote RTX 4090 host (seshat) over a secure tunnel:

1. Copy `.env.example` to `.env` and set `VITE_AI_API_BASE_URL` to the tunnel endpoint (e.g. `http://10.0.0.51:9001`).
2. Set `VITE_AI_API_TOKEN` to the bearer token configured on the remote inference server (`/home/m0nkey-fl0wer/Projects/fudbuddy-inference/.env`).
3. Ensure `fudbuddy-inference.service` is active on seshat (user-level systemd) and `fudbuddy-tunnel.service` is active on the Pi to publish the tunnel.
4. Run `npm run dev` locally — the client will call the secure endpoint automatically; if the endpoint is unavailable it falls back to mock responses.

Rotate the token whenever you onboard new beta users and keep the tunnel restricted to your tailnet/VPN for privacy.
