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

## 3. Supabase Postgres

Provision a Supabase PostgreSQL service. Use the Supavisor session pooler for Hugging Face Space, because the Space is typically IPv4-only and Supabase direct connections are IPv6 by default.

```text
LOVANN_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true

DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=aws-REGION.pooler.supabase.com
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=postgres
DB_POSTGRESDB_USER=postgres.PROJECT_REF
DB_POSTGRESDB_PASSWORD=PASSWORD
DB_POSTGRESDB_SSL_ENABLED=true
DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=true
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

LOVANN_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true

N8N_ENCRYPTION_KEY=<long stable random string>
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<strong password>
N8N_HOST=<hf-username>-<space-name>.hf.space
N8N_PROTOCOL=https
N8N_PORT=5678

DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=aws-REGION.pooler.supabase.com
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=postgres
DB_POSTGRESDB_USER=postgres.PROJECT_REF
DB_POSTGRESDB_PASSWORD=PASSWORD
DB_POSTGRESDB_SSL_ENABLED=true
DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=true

GENERIC_TIMEZONE=Asia/Jakarta
TZ=Asia/Jakarta
```

The GitHub Action syncs these GitHub Secrets into Hugging Face Space Secrets before pushing the code.

For Supabase, get the values from `Project Settings -> Database -> Connection string -> Session pooler`.
Use the session pooler host and username exactly as Supabase gives them. Do not use the direct `db.<project-ref>.supabase.co:5432` endpoint on Hugging Face if your Space cannot reach IPv6.

If you already have a direct `db.<project-ref>.supabase.co` URL, replace it with the session pooler host shown by Supabase. The helper app and n8n must both point to the same pooler endpoint.

Recommended public Space env values:

```text
PUBLIC_BASE_URL=https://acaca28-lovann-tracker.hf.space
WEBHOOK_URL=https://acaca28-lovann-tracker.hf.space/
N8N_HOST=acaca28-lovann-tracker.hf.space
N8N_PROTOCOL=http
N8N_PORT=5678
```

Recommended local n8n auth values:

```text
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<strong password>
N8N_ENCRYPTION_KEY=<long stable random string>
```

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
