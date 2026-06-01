# Deployment Guide

## 1. Google Cloud OAuth

Create OAuth credentials in Google Cloud.

Required redirect URI:

```text
https://<hf-username>-<space-name>.hf.space/oauth/callback
```

Required scope:

```text
https://www.googleapis.com/auth/spreadsheets
```

Set these Hugging Face Space secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

## 2. Google AI

Create a Google AI API key and set:

```text
GOOGLE_AI_API_KEY
GOOGLE_AI_MODEL=gemini-1.5-flash
```

## 3. Postgres

Provision external Postgres. Set both n8n DB variables and helper DB URL.

```text
LOVANN_DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE

DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=HOST
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=DATABASE
DB_POSTGRESDB_USER=USER
DB_POSTGRESDB_PASSWORD=PASSWORD
```

## 4. GitHub Secrets

Do not commit `.env`. Use `.env` only for local development.

For production, add these values in GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

Required deployment secrets:

```text
HF_TOKEN
HF_USERNAME
HF_SPACE_NAME
```

Without these three, the GitHub Action cannot sync Hugging Face Space secrets or push the Space.

Required app secrets:

```text
PUBLIC_BASE_URL=https://<hf-username>-<space-name>.hf.space
WEBHOOK_URL=https://<hf-username>-<space-name>.hf.space/
TELEGRAM_BOT_TOKEN=<telegram bot token>

GOOGLE_CLIENT_ID=<google oauth client id>
GOOGLE_CLIENT_SECRET=<google oauth client secret>
GOOGLE_REDIRECT_URI=https://<hf-username>-<space-name>.hf.space/oauth/callback
GOOGLE_AI_API_KEY=<google ai key>
GOOGLE_AI_MODEL=gemini-1.5-flash
UPLOAD_DIR=/data/uploads

LOVANN_DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE

N8N_ENCRYPTION_KEY=<long stable random string>
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<strong password>
N8N_HOST=<hf-username>-<space-name>.hf.space
N8N_PROTOCOL=https
N8N_PORT=5678

DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=HOST
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=DATABASE
DB_POSTGRESDB_USER=USER
DB_POSTGRESDB_PASSWORD=PASSWORD

GENERIC_TIMEZONE=Asia/Jakarta
TZ=Asia/Jakarta
```

The GitHub Action syncs these GitHub Secrets into Hugging Face Space Secrets before pushing the code.

Do not generate and commit `.env` into Hugging Face. If the Space is public, that exposes secrets. Even on a private Space, secrets in git history are harder to rotate safely.

The storage bucket should be mounted at `/data`, so uploaded food images land in `/data/uploads` and survive restarts.

## 5. n8n Workflow

After the Space is running:

1. Open the Space URL.
2. Login to n8n.
3. Import `workflows/lovann-telegram-router.json`.
4. Activate the workflow.

## 6. Telegram Webhook

Run locally:

```bash
PUBLIC_BASE_URL=https://<hf-username>-<space-name>.hf.space \
TELEGRAM_BOT_TOKEN=<telegram bot token> \
./scripts/set-telegram-webhook.sh
```

## 7. User Onboarding

User sends:

```text
/connect
```

Then user opens the OAuth link, grants Google Sheets access, and sends:

```text
/register https://docs.google.com/spreadsheets/d/<spreadsheet_id>/edit
```
