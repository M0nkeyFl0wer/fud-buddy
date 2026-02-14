# FUD Buddy – Remote Local-Model Deployment Plan

This document outlines how to run the AI assistant on a powerful remote server that hosts a local model (e.g., Llama, Mistral) and exposes it securely to the FUD Buddy web client. The goal is to keep inference off the user’s laptop/phone while avoiding public exposure of the home network or raw API keys.

---

## 1. System Overview

```
Browser (FUD Buddy UI)
        │ HTTPS
        ▼
Edge proxy / worker (optional fallback + auth)
        │ Tailscale/ZeroTier tunnel
        ▼
Remote inference server (GPU box running local LLM)
        │
        └── Model runtime (llama.cpp, vLLM, LM Studio, etc.)
```

- **Client**: Statically hosted Vite app. It should never hold long-lived secrets.
- **Edge proxy**: Optional Cloudflare Worker/Supabase Edge function to issue short-lived tokens, enforce quotas, and provide a public HTTPS endpoint if needed.
- **Secure tunnel**: Tailscale/WireGuard connection from the edge (or Pi) to the remote GPU host. Only authenticated nodes can reach the inference API.
- **Inference server**: Runs the selected local model plus an HTTPS API that mirrors OpenAI’s Chat Completions contract (or a simplified JSON schema).

---

## 2. Remote Inference Server

1. **Environment**
   - Base OS: Ubuntu 22.04 or similar on the remote machine.
   - Install required runtimes (Python 3.11+, Node, CUDA, ROCm depending on GPU).
   - Pull the preferred LLM runtime (vLLM, llama.cpp server, LM Studio headless).

2. **API service**
   - Implement a lightweight REST service (FastAPI, Express, Bun) that exposes:
     - `POST /v1/chat`: accepts `{messages, chat_type, metadata}` and returns `{id, choices: [{message: {role, content}}], usage}`.
     - `GET /healthz`: returns status for monitoring.
   - Support streaming via Server-Sent Events or chunked responses for snappier UX.
   - Enforce per-IP or per-session rate limits and log telemetry (Prometheus, Loki).

3. **Model routing**
   - Start with one high-quality general model (e.g., Llama-3.1-70B or Mistral Large) configured with:
     - System prompts aligned with `AIChatType` (`whereToGo`, `whatToOrder`, `somethingFun`, `home`).
     - Temperature ≈0.6–0.7, top_p 0.9.
   - Keep prompts in version control on the server so they can be tuned independently.

4. **Security**
   - Require a bearer token on every request; rotate via environment variables and only distribute short-lived tokens to the web tier.
   - Bind the service to the Tailscale interface (e.g., `100.x.y.z`) and firewall everything else.

---

## 3. Secure Tunnel

1. **Tailscale / WireGuard**
   - Add both the remote server and the Pi (or another always-on edge box) to the Tailscale tailnet.
   - Advertise an exit node or subnet if needed, but preferably keep traffic node-to-node.
   - Use ACLs so only the edge proxy can reach the inference port (e.g., 8001).

2. **Edge exposure options**
   - **Private beta**: Browser talks to the Pi via HTTPS on a Tailscale-protected `*.ts.net` URL; the Pi proxies to the remote server. No public ingress.
   - **Public beta**: Deploy a Cloudflare Worker / Supabase Edge function exposed at `https://api.fudbuddy.com/chat`, which in turn dials the remote server over Tailscale SSH sockets. The Worker handles auth + rate limiting; only the Worker’s Tailscale machine key can hit the inference API.

3. **Certificates**
   - If exposing the Pi/edge publicly, terminate TLS with Caddy/NGINX + Let’s Encrypt.
   - Otherwise, rely on the encrypted tunnel (Tailscale) and issue internal certificates for service-to-service auth (mTLS) if desired.

---

## 4. Client Changes (FUD Buddy Repo)

1. **Configuration**
   - Add `VITE_AI_API_BASE_URL`, `VITE_AI_CLIENT_ID`, and `VITE_AI_ENV` variables.
   - Update `src/pages/Config.tsx` to store only non-secret metadata locally (e.g., preferred model) while secrets come from the backend.

2. **`aiService` updates**
   - Replace the mock response path with:
     ```ts
     const response = await fetch(`${import.meta.env.VITE_AI_API_BASE_URL}/v1/chat`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({
         chatType,
         messages: buildMessageHistory(previousMessages, message),
         clientId: import.meta.env.VITE_AI_CLIENT_ID,
       })
     });
     ```
   - Add streaming support (ReadableStream/SSE) for incremental responses.
   - Implement exponential backoff and fallback to the public OpenAI API (if configured) when the tunnel is down.

3. **State & telemetry**
   - Log request IDs returned from the remote server so user feedback can be correlated.
   - Surface connectivity errors clearly in the UI and offer “retry” actions.

---

## 5. Deployment & Ops Checklist

| Area | Tasks |
| --- | --- |
| **Server provisioning** | Create a systemd unit for the inference API, configure logging to journald + Loki. |
| **Model lifecycle** | Automate model downloads/updates via scripts; monitor disk/GPU usage. |
| **Monitoring** | Use Prometheus node exporter + Grafana, plus Sentry (client) for error reporting. |
| **CI/CD** | Add GitHub Actions workflow that builds the web app and runs a smoke test hitting the remote `/healthz` via the tunnel (using a self-hosted runner on the Pi). |
| **Security** | Rotate bearer tokens monthly, enforce least-privilege ACLs in Tailscale, enable automatic OS patching on the remote host. |
| **Documentation** | Record the tunnel setup steps, credentials, and recovery procedures in `SECURITY.md` or an internal runbook. |

---

## 6. Next Steps

1. Provision / confirm access to the remote GPU server and install the desired local model runtime.
2. Stand up the inference API with authentication and health checks.
3. Configure the Tailscale tunnel between the edge and the remote host; verify connectivity.
4. Update the FUD Buddy client to call the new API (with fallbacks) and add environment-variable driven configuration.
5. Add monitoring + alerting to ensure the remote service is reachable before inviting beta users.

Once these items are complete, the app can rely on the powerful remote server for inference while keeping traffic private and controllable for the beta cohort.
