# SearxNG (Local Metasearch)

This repo uses SearxNG as a self-hosted web search layer so we don't depend on paid APIs.

We run it in Docker with Redis.

## Run Locally (Desktop)

```bash
docker compose -f infra/searxng/docker-compose.yml up -d
curl -s http://localhost:8888/search?q=pizza&format=json | head
```

By default it binds to `127.0.0.1:8888`.

If you want to access it from your phone on the LAN, change the port binding in
`infra/searxng/docker-compose.yml` from `127.0.0.1:8888:8080` to `0.0.0.0:8888:8080`.

## Run On Seshat

Copy `infra/searxng/` to seshat (any directory) and run:

```bash
docker compose up -d
curl -s http://127.0.0.1:8888/search?q=thai%20collingwood&format=json | head
```

Notes:
- This requires Docker permissions on seshat (membership in the `docker` group or equivalent).
- If you see `permission denied` talking to `/var/run/docker.sock`, run SearxNG on your desktop instead.

Keep it bound to `127.0.0.1` on seshat and access it via:
- the backend running on seshat itself, or
- an SSH tunnel.

## Backend Integration

Set:

```bash
SEARXNG_URL=http://127.0.0.1:8888
```

The backend will prefer SearxNG when configured.
