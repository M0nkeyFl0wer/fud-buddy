# Deploying FUD Buddy to Dreamhost

## Prerequisites

1. Dreamhost shared hosting account with SSH access
2. Domain/subdomain configured (e.g., fud.yourdomain.com)
3. OpenRouter API key (for LLM calls)
4. SearxNG instance or alternative search setup

## Initial Server Setup

SSH into your Dreamhost server:

```bash
ssh youruser@yourdomain.com
```

### 1. Create Directory Structure

```bash
mkdir -p ~/fud-buddy/frontend
mkdir -p ~/fud-buddy/backend
cd ~/fud-buddy/backend
```

### 2. Setup Python Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn httpx sse-starlette pydantic python-dotenv
```

### 3. Configure Backend

Create `~/fud-buddy/backend/.env`:

```bash
cat > ~/fud-buddy/backend/.env << 'EOF'
# Required
OPENROUTER_API_KEY=your_openrouter_key_here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Search (use your own SearxNG or configure alternative)
SEARXNG_URL=http://localhost:8888

# Beta Rate Limiting (3 per day, 3-hour gap, max 5)
RATE_LIMIT_ENABLED=1
RATE_LIMIT_DAILY_MAX=3
RATE_LIMIT_GAP_HOURS=3
RATE_LIMIT_SOFT_MAX=5

# Security (generate a strong random string)
# Not used yet but good to have
EOF
```

**Security Note:** Keep your `.env` file permissions tight:
```bash
chmod 600 ~/fud-buddy/backend/.env
```

### 4. Start Backend

```bash
cd ~/fud-buddy/backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 > app.log 2>&1 &
```

Check it's running:
```bash
curl http://localhost:8000/health  # If you add a health endpoint
ps aux | grep uvicorn
```

### 5. Configure Dreamhost Passenger

Create `~/fud-buddy/frontend/passenger_wsgi.py`:

```python
import sys
import os

INTERP = "/usr/bin/python3"
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

sys.path.insert(0, os.path.dirname(__file__))

# For static files only - serve index.html for all routes (SPA)
from flask import Flask, send_from_directory
app = Flask(__name__)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return send_from_directory('.', 'index.html')

@app.route('/assets/<path:filename>')
def assets(filename):
    return send_from_directory('assets', filename)
```

**Note:** This is a simplified setup. For production, you may want to use a proper reverse proxy.

### 6. Build and Deploy Frontend Locally

On your local machine:

```bash
# Set production API URL
export VITE_API_BASE_URL=https://api.yourdomain.com:8000

# Build
npm run build

# Deploy (replace with your actual user/host)
rsync -avz --delete dist/ youruser@yourdomain.com:~/fud-buddy/frontend/
```

## GitHub Actions Deployment

### Setup Secrets

In your GitHub repository, go to Settings → Secrets and add:

- `DREAMHOST_HOST`: yourdomain.com
- `DREAMHOST_USER`: your_ssh_username
- `DREAMHOST_SSH_KEY`: Contents of your private SSH key
- `VITE_API_BASE_URL`: https://api.yourdomain.com:8000
- `OPENROUTER_API_KEY`: Your OpenRouter API key

### First Deploy

Push to main branch or trigger manually from GitHub Actions tab.

## Security Hardening

### 1. Rate Limiting (Enabled)

The app has built-in rate limiting:
- 3 requests per day per IP/device
- 3-hour cooldown after 3rd request
- Maximum 5 requests per day
- Friendly beta message explaining limits

### 2. CORS Configuration

Update `CORS_ORIGINS` in your `.env` to only allow your domain:
```bash
CORS_ORIGINS=https://fud.yourdomain.com
```

### 3. API Key Security

- Never commit API keys to git
- Use environment variables
- Rotate keys regularly
- Monitor usage on OpenRouter dashboard

### 4. HTTPS Only

Ensure your domain has SSL enabled (Dreamhost provides free Let's Encrypt certificates).

## Monitoring

### Check Backend Logs

```bash
ssh youruser@yourdomain.com
tail -f ~/fud-buddy/backend/app.log
```

### Restart Backend

```bash
ssh youruser@yourdomain.com
pkill -f 'uvicorn main:app'
cd ~/fud-buddy/backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 > app.log 2>&1 &
```

## Cost Management

OpenRouter charges per token. To minimize costs:

1. Rate limiting is enabled (3-5 calls/day per user)
2. Use cheaper models like `google/gemini-2.0-flash-lite-001`
3. Monitor usage on OpenRouter dashboard
4. Set up billing alerts

## Troubleshooting

### Backend Won't Start

Check Python version (need 3.9+):
```bash
python3 --version
```

Check dependencies:
```bash
pip list | grep -E "fastapi|uvicorn|httpx"
```

### CORS Errors

Verify CORS_ORIGINS matches your exact domain (including https:// and www/non-www).

### Rate Limit Too Aggressive

Adjust in `.env`:
```bash
RATE_LIMIT_DAILY_MAX=5
RATE_LIMIT_GAP_HOURS=1
RATE_LIMIT_SOFT_MAX=10
```

## Updates

To update after code changes:

```bash
# Pull latest
git pull origin main

# Deploy via GitHub Actions, or manually:
npm run build
rsync -avz --delete dist/ youruser@yourdomain.com:~/fud-buddy/frontend/
ssh youruser@yourdomain.com "cd ~/fud-buddy/backend && git pull && source venv/bin/activate && pip install -r requirements.txt && pkill -f 'uvicorn main:app'; nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 > app.log 2>&1 &"
```
