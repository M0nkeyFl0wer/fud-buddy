# FUD Buddy – Project Brief

## Overview
FUD Buddy is a Vite + React single-page app that recommends what to eat, drawing on remote AI inference, mock Airtable analytics, and Tailwind/shadcn UI components. The client currently stores configuration in `localStorage`, provides mock fallbacks when the remote AI is unavailable, and is intended to be hosted as static assets behind Apache (or any CDN/static host).

## Tech Stack & Key Dependencies
- **Frontend**: React 18, React Router 6, TanStack Query, Tailwind CSS, shadcn/ui (Radix primitives), Lucide icons.
- **Tooling**: TypeScript, Vite 5 (dev/build/preview), ESLint 9, PostCSS/autoprefixer.
- **UX Enhancements**: `sonner` + custom toaster, Embla carousel, `react-day-picker`, Recharts, shadcn form components.
- **Utilities**: `zod` + React Hook Form for validation, mocked Airtable logging utilities.

## Environment & Secrets
- Copy `.env.example` to `.env` and set:
  - `VITE_AI_API_BASE_URL`: URL for the remote inference API (e.g., tunnel endpoint).
  - `VITE_AI_API_TOKEN`: Short-lived bearer token validated by the inference server.
- The Config page (`/config`) lets users override the AI key/model per browser session, but secrets embedded in the client remain discoverable. Long-term, use a backend proxy to keep tokens off the client.

## Runtime Behavior
- `aiService` prefers the remote endpoint when both a base URL and token are available; otherwise, it prints a warning and returns canned responses for each chat type.
- `analyticsService` seeds Google Analytics / Facebook Pixel dynamically when IDs are provided, while also logging activity through mocked Airtable helpers (`src/utils/airtable.ts`).
- Theme defaults to dark mode using `localStorage` persistence in `src/App.tsx`.
- Routes: `/` (main experience), `/config` (settings), fallback to `NotFound`.

## Deployment Considerations
- Build with `npm run build`; deploy the `dist/` folder behind Apache or another static host. Configure rewrites so all paths resolve to `index.html`.
- Protect staging with HTTP Basic Auth until public-ready. Generate `.htpasswd` locally and reference it in the Apache vhost.
- Remote AI per `docs/REMOTE_MODEL_PLAN.md`: keep the tunnel + GPU host healthy, enforce bearer auth, and monitor `/healthz` before inviting users.
- Analytics/Airtable calls are mocked; either wire them to real services or strip them from production to avoid noisy logs.

## Outstanding Work Before Launch
1. Verify the remote AI endpoint and tokens in the actual production environment (tunnel, firewall, SSL).
2. Decide on a backend proxy if you want to avoid distributing API tokens in the client bundle.
3. Replace mocked Airtable logging with a real store or disable it.
4. Add monitoring/alerting (Sentry, uptime checks) for both the static host and inference API.
5. Finish Apache configuration (docroot, rewrites, Basic Auth) and push the `dist/` contents once the staging password is in place.
