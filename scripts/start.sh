#!/usr/bin/env sh
set -eu

export N8N_PORT="${N8N_INTERNAL_PORT:-5678}"
export N8N_LISTEN_ADDRESS="${N8N_LISTEN_ADDRESS:-0.0.0.0}"
export WEBHOOK_URL="${WEBHOOK_URL:-${PUBLIC_BASE_URL:-http://localhost:7860}/}"
export LOVANN_PORT="${LOVANN_PORT:-${PORT:-7860}}"

if [ -n "${N8N_INSTANCE_OWNER_EMAIL:-}" ] && [ -n "${N8N_INSTANCE_OWNER_FIRST_NAME:-}" ] && [ -n "${N8N_INSTANCE_OWNER_LAST_NAME:-}" ]; then
  eval "$(node /app/service/service-src/src/owner-env.mjs)"
fi

mkdir -p "${N8N_USER_FOLDER:-/data/.n8n}"
chown -R node:node "${N8N_USER_FOLDER:-/data/.n8n}" /app

unset PORT
n8n start &
N8N_PID=$!

export PORT="$LOVANN_PORT"
node /app/service/service-src/src/server.js &
APP_PID=$!

trap 'kill "$N8N_PID" "$APP_PID" 2>/dev/null || true' INT TERM

while true; do
  if ! kill -0 "$N8N_PID" 2>/dev/null; then
    echo "n8n process stopped"
    kill "$APP_PID" 2>/dev/null || true
    exit 1
  fi

  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "Lovann helper process stopped"
    kill "$N8N_PID" 2>/dev/null || true
    exit 1
  fi

  sleep 2
done
