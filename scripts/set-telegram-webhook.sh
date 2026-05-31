#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "TELEGRAM_BOT_TOKEN is required" >&2
  exit 1
fi

if [[ -z "${PUBLIC_BASE_URL:-}" ]]; then
  echo "PUBLIC_BASE_URL is required" >&2
  exit 1
fi

WEBHOOK_URL="${PUBLIC_BASE_URL%/}/webhook/lovann-telegram"

curl -fsS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "content-type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"allowed_updates\":[\"message\"]}"

echo
echo "Telegram webhook set to ${WEBHOOK_URL}"

