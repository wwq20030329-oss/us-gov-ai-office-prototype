#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

VITE_PORT="${VITE_PORT:-5173}"
BOLUO_PORT="${BOLUO_PORT:-18790}"

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

node server/index.js &
SERVER_PID=$!

npm run dev -- --host 0.0.0.0 --port "$VITE_PORT" &
VITE_PID=$!

wait "$SERVER_PID" "$VITE_PID"
