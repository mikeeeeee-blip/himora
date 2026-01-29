#!/usr/bin/env bash
# Client demo: start server + client for Ledger & Reconciliation.
# Run from project root: ./scripts/run-demo.sh
# For server logs (optional): tail -f demo-server.log

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVER_LOG="${ROOT}/demo-server.log"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "=============================================="
echo "  Client Demo – Ledger & Reconciliation"
echo "=============================================="
echo ""

# 1. Start server
echo "[1/2] Starting server (logs -> $SERVER_LOG)..."
cd "$ROOT/server"
node index.js > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
cd "$ROOT"

echo "      Server PID: $SERVER_PID"
echo "      To watch server logs: tail -f $SERVER_LOG"
echo ""

# 2. Wait for server to be ready
echo "[2/2] Waiting for server to be ready..."
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" 2>/dev/null | grep -q "200"; then
    echo "      Server ready."
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "      (Server may still be starting. Proceeding.)"
    break
  fi
  sleep 1
done
echo ""

# 3. Start client
echo "=============================================="
echo "  Client: http://localhost:3000"
echo "  Login as Superadmin -> Dashboard -> Ledger -> Reconciliation"
echo "  Server logs: tail -f $SERVER_LOG  (look for [LEDGER] and [RECON])"
echo "=============================================="
echo ""

cd "$ROOT/client"
npm run dev
