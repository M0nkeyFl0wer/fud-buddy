#!/bin/bash

# SSH Tunnel Script for FUD Buddy AI Server
# This creates a tunnel to the remote Ollama server

REMOTE_HOST="seshat.noosworx.com"
REMOTE_PORT="8888"
REMOTE_USER="m0nkey-fl0wer"
LOCAL_PORT="11434"
REMOTE_OLLAMA_PORT="11434"

echo "🚇 Starting SSH tunnel to $REMOTE_HOST..."
echo "📡 Local port $LOCAL_PORT -> Remote $REMOTE_HOST:$REMOTE_OLLAMA_PORT"

# Kill any existing tunnel on this port
pkill -f "ssh.*$LOCAL_PORT:localhost:$REMOTE_OLLAMA_PORT"

# Create the SSH tunnel
# -L: Local port forwarding
# -N: Don't execute remote commands
# -f: Run in background
ssh -L $LOCAL_PORT:localhost:$REMOTE_OLLAMA_PORT -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST -N -f

if [ $? -eq 0 ]; then
    echo "✅ SSH tunnel established!"
    echo "🔗 Ollama API accessible at: http://localhost:$LOCAL_PORT"
    echo "🛠️  To test: curl http://localhost:$LOCAL_PORT/api/tags"
    echo ""
    echo "💡 To stop the tunnel, run:"
    echo "   pkill -f 'ssh.*$LOCAL_PORT:localhost:$REMOTE_OLLAMA_PORT'"
else
    echo "❌ Failed to establish SSH tunnel"
    exit 1
fi