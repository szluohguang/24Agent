#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==============================="
echo " 24h Agent Orchestrator"
echo " Port: 3000"
echo "==============================="
echo ""

echo "[orchestrator] Checking port 4096..."
PID=$(lsof -ti tcp:4096 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "[orchestrator] Port 4096 in use by PID $PID, killing..."
  kill -9 "$PID" 2>/dev/null || true
  echo "[orchestrator] Killed process $PID"
else
  echo "[orchestrator] Port 4096 is free"
fi
echo ""

echo "[orchestrator] Starting..."
echo "[orchestrator] Work dir: $(pwd)"
echo ""

if [ ! -d node_modules ]; then
  echo "[orchestrator] Installing dependencies..."
  npm install
fi

echo "[orchestrator] Building WebUI..."
npx tsc --noEmit
npx vite build src/webui
echo "[orchestrator] Build complete"
echo ""

npm run dev
