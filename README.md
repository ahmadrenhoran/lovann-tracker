---
title: Lovann Telegram Tracker
sdk: docker
app_port: 7860
---

# Lovann Telegram Tracker

Telegram-based finance, habit, and food tracker that writes to each user's Google Spreadsheet.

## Architecture

```text
Telegram webhook
  -> n8n workflow
  -> Lovann helper API
     -> Google OAuth tokens in Postgres
     -> Google Sheets append
     -> Google AI food image analysis
  -> Telegram reply
```

The Docker image runs:

- n8n on internal port `5678`
- Lovann helper/proxy on public port `7860`
- External Postgres for n8n data and Lovann user registry

## Local Setup

1. Copy env:

```bash
cp .env.example .env
```

2. Fill required values in `.env`.

3. Start local services:

```bash
docker compose up --build
```

4. Open n8n:

```text
http://localhost:7860
```

5. Import workflow:

```text
workflows/lovann-telegram-router.json
```

6. Set Telegram webhook:

```bash
PUBLIC_BASE_URL=https://your-domain.example TELEGRAM_BOT_TOKEN=xxx ./scripts/set-telegram-webhook.sh
```

Webhook target:

```text
https://your-domain.example/webhook/lovann-telegram
```

## Required Environment

```text
PUBLIC_BASE_URL
TELEGRAM_BOT_TOKEN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_AI_API_KEY
LOVANN_DATABASE_URL

N8N_ENCRYPTION_KEY
N8N_BASIC_AUTH_USER
N8N_BASIC_AUTH_PASSWORD
DB_POSTGRESDB_HOST
DB_POSTGRESDB_PORT
DB_POSTGRESDB_DATABASE
DB_POSTGRESDB_USER
DB_POSTGRESDB_PASSWORD
```

For Hugging Face Spaces, set `PUBLIC_BASE_URL` and `WEBHOOK_URL` to:

```text
https://<hf-username>-<space-name>.hf.space
```

Set `GOOGLE_REDIRECT_URI` to:

```text
https://<hf-username>-<space-name>.hf.space/oauth/callback
```

## Telegram Commands

```text
/start
/help
/connect
/status
/register https://docs.google.com/spreadsheets/d/<spreadsheet_id>/edit
expense 45000 food nasi padang
income 500000 freelance desain logo
habit reading done 20 pages
food lunch nasi padang 1 porsi
```

Food photos are supported. Send a photo with an optional caption, for example:

```text
lunch, 1 porsi
```

## Google Sheet Tabs

The user's spreadsheet must contain:

- `Finance_Log`
- `Habit_Log`
- `Food_Log`

See [docs/google-sheet-template.md](docs/google-sheet-template.md).

