#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==============================="
echo " 24h Agent Orchestrator"
echo " Port: 3000"
echo "==============================="
echo ""

echo "[orchestrator] Cleaning stale processes..."
for port in 3000 4096; do
  PID=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "[orchestrator] Port $port in use by PID $PID, killing..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1
  else
    echo "[orchestrator] Port $port is free"
  fi
done
# 额外清理残留 tsx 进程
TSX_PIDS=$(ps aux | grep 'tsx' | grep -v grep | awk '{print $2}' 2>/dev/null || true)
if [ -n "$TSX_PIDS" ]; then
  echo "[orchestrator] Killing stale tsx processes: $TSX_PIDS"
  kill -9 $TSX_PIDS 2>/dev/null || true
  sleep 1
fi
echo "[orchestrator] Cleanup complete"
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
