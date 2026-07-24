#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "$0")"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

: "${HOST:=127.0.0.1}"
: "${BACKEND_PORT:=3000}"
: "${FRONTEND_PORT:=3001}"
export HOST BACKEND_PORT FRONTEND_PORT

for name in DATABASE_URL JWT_SECRET PROVISION_ADMIN_EMAIL PROVISION_ADMIN_PASSWORD OPENROUTER_API_KEY OPENROUTER_MODEL OPENROUTER_BASE_URL; do
  [[ -n "${!name:-}" ]] || { echo "$name is required." >&2; exit 1; }
done
[[ "$OPENROUTER_BASE_URL" == "https://openrouter.ai/api/v1" ]] || { echo "OPENROUTER_BASE_URL must use the canonical OpenRouter API base." >&2; exit 1; }
[[ ${#JWT_SECRET} -ge 32 ]] || { echo "JWT_SECRET must contain at least 32 characters." >&2; exit 1; }
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo "Backend and frontend ports must differ." >&2; exit 1; }
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  [[ "$port" =~ ^[0-9]+$ ]] || { echo "Invalid port: $port" >&2; exit 1; }
  ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $port is already occupied." >&2; exit 1; }
done

node runtime/migrate.mjs
node runtime/server.mjs &
api_pid=$!
node runtime/ui.mjs &
ui_pid=$!

cleanup() {
  kill "$api_pid" "$ui_pid" 2>/dev/null || true
  wait "$api_pid" "$ui_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in {1..50}; do
  curl -fsS "http://${HOST}:${BACKEND_PORT}/api/health" >/dev/null 2>&1 && break
  sleep 0.2
done
curl -fsS "http://${HOST}:${BACKEND_PORT}/api/health" >/dev/null
curl -fsS "http://${HOST}:${FRONTEND_PORT}/" >/dev/null
echo "Shipping runtime running: UI http://${HOST}:${FRONTEND_PORT}, API http://${HOST}:${BACKEND_PORT}"

wait "$api_pid" "$ui_pid"
