# FUD Buddy – Launch To‑Do

## Local Prep
- Ensure Node.js 18+ and npm are installed (Vite 5 requirement).
- Run `npm install` to pull the exact dependency set defined in `package.json` (React, Vite, Tailwind/shadcn UI stack, analytics helpers, etc.).
- Copy `.env.example` to `.env`, then supply the real `VITE_AI_API_BASE_URL` and `VITE_AI_API_TOKEN` values for the remote inference tunnel you plan to use.

## Developer Verification
- Start the app locally with `npm run dev` (append `-- --host 0.0.0.0` to share across your LAN).
- Visit `/config` in the running app to enter any temporary AI key/model overrides or analytics IDs; values persist in `localStorage`.
- Exercise each chat mode to confirm remote AI access works; if env variables are missing the UI falls back to mock responses (`aiService`).

## Build & Staging
- Produce the production bundle with `npm run build` (outputs `dist/`).
- Test the built assets locally via `npm run preview` or a static server to ensure routes resolve correctly.
- Set up Apache hosting (e.g., `/var/www/fud-buddy`) and configure rewrite rules so all paths serve `index.html` (React Router fallback).
- Copy the `dist/` folder to the Apache docroot once the password wall and env variables are confirmed.

## Security & Access Control
- Generate a Basic Auth file locally: `htpasswd -c ./fudbuddy.htpasswd <user>` and use the staging password you’ll share.
- Upload the `.htpasswd` to the server (outside the docroot) and add the `AuthType Basic` block to the Apache vhost or `.htaccess`.
- Rotate the remote AI bearer token regularly; never bake long-lived tokens into the client bundle.

## Remote AI & Services
- Provision and verify the remote inference endpoint described in `docs/REMOTE_MODEL_PLAN.md`, including token auth and health checks.
- Confirm the Apache host (or whichever network hops you use) can reach the tunnel endpoint over Tailscale/WireGuard or HTTPS.
- Decide whether the public site should proxy AI calls instead of exposing tokens in the browser; if so, add a lightweight backend service.
- Replace `logToAirtable` mocks with a real analytics store or remove the calls before launch if you’re not ready to ingest telemetry.

## Monitoring & QA
- Add Sentry or another client error tracker plus uptime monitoring for the Apache host and remote inference API.
- Document how to rotate tokens, restart the remote AI service, and recover the tunnel; store in a secure internal runbook.
- Plan smoke tests after deployment (hit `/` and `/config`, execute one query per chat type, validate analytics firing in the console).
- Once satisfied locally, deploy to staging, verify password protection, then supply SSH details for the final push to production.
