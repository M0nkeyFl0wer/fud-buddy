# FUD Buddy Tunnel – Tailscale Exposure Guide

These steps lock the SSH tunnel so the remote inference API is only reachable via your Tailscale network. The Pi keeps the tunnel alive, and beta users connect to the Pi’s tailnet address instead of the LAN IP.

---

## 1. Gather Tailnet Info

```bash
# On the Pi
hostname
tailscale ip -4   # note the 100.x.y.z address
```

Use the 100.x.y.z value as `TAIL_IP` in the commands below.

---

## 2. Update the tunnel helper script

The script currently binds 0.0.0.0:9001. Replace that with the Tailscale IP so only tailnet peers can reach it.

```bash
cat <<'EOF_SCRIPT' > ~/.local/bin/fudbuddy-tunnel.sh
#!/usr/bin/env bash
set -euo pipefail
TAIL_IP="100.xx.yy.zz"        # <-- replace with tailscale ip
REMOTE_PORT=8085               # port on seshat running inference API
LOCAL_PORT=9001
TMP_KEY="/tmp/fudbuddy_id_ed25519"
install -m 600 -D /home/mini-monkey/.ssh/id_ed25519 "$TMP_KEY"
exec /usr/bin/ssh \
  -NT \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/home/mini-monkey/.ssh/known_hosts \
  -o IdentitiesOnly=yes \
  -i "$TMP_KEY" \
  -L "${TAIL_IP}:${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
  -p 8888 \
  m0nkey-fl0wer@seshat.noosworx.com
EOF_SCRIPT
chmod +x ~/.local/bin/fudbuddy-tunnel.sh
```

_Note_: If the Pi has multiple tailnet IPv4 addresses, pick the one you want to expose.

---

## 3. Restart the tunnel service

```bash
systemctl --user daemon-reload
systemctl --user restart fudbuddy-tunnel.service
systemctl --user status fudbuddy-tunnel.service --no-pager
```

Active status should show `-L 100.xx.yy.zz:9001:127.0.0.1:8085`.

---

## 4. Verify from another Tailscale device

On any tailnet machine (laptop, phone, etc.):

```bash
curl -s http://100.xx.yy.zz:9001/healthz
curl -s -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"chatType":"whereToGo","messages":[{"role":"user","content":"Italian in Austin"}]}' \
     http://100.xx.yy.zz:9001/v1/chat
```

Expect JSON responses similar to the local tests. If you see timeouts, double-check the script and service logs:

```bash
journalctl --user-unit=fudbuddy-tunnel.service -n 50 --no-pager
```

---

## 5. Update the web client

Set the `.env` in `~/Projects/fud-buddy` (or your deployment) to point at the tailnet URL so testers don’t need LAN access:

```
VITE_AI_API_BASE_URL=http://100.xx.yy.zz:9001
VITE_AI_API_TOKEN=beta-remote-token   # match seshat/.env token
```

Restart `npm run dev` (or rebuild) so Vite reloads the new env vars.

---

## 6. Optional hardening

- Use `iptables`/`nftables` on the Pi to allow 9001 only from tailnet interface (`tailscale0`).
- Rotate the SSH key or inference bearer token whenever you add/remove devices.
- If you want HTTPS inside the tailnet, run Caddy or `tailscale serve https 443 9001`.

With these steps the inference API stays private to devices logged into your Tailnet, while the rest of the world can’t see the open port.
