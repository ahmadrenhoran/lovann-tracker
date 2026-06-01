import os
import sys

from huggingface_hub import HfApi


SECRET_NAMES = [
    "PUBLIC_BASE_URL",
    "LOVANN_PORT",
    "LOVANN_INTERNAL_BASE_URL",
    "N8N_INTERNAL_PORT",
    "TELEGRAM_BOT_TOKEN",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_AI_API_KEY",
    "GOOGLE_AI_MODEL",
    "LOVANN_DATABASE_URL",
    "N8N_ENCRYPTION_KEY",
    "N8N_BASIC_AUTH_ACTIVE",
    "N8N_BASIC_AUTH_USER",
    "N8N_BASIC_AUTH_PASSWORD",
    "N8N_HOST",
    "N8N_PROTOCOL",
    "N8N_PORT",
    "WEBHOOK_URL",
    "N8N_EDITOR_BASE_URL",
    "N8N_SECURE_COOKIE",
    "N8N_PROXY_HOPS",
    "N8N_INSTANCE_OWNER_EMAIL",
    "N8N_INSTANCE_OWNER_FIRST_NAME",
    "N8N_INSTANCE_OWNER_LAST_NAME",
    "N8N_OWNER_PASSWORD",
    "GENERIC_TIMEZONE",
    "TZ",
    "DB_TYPE",
    "DB_POSTGRESDB_HOST",
    "DB_POSTGRESDB_PORT",
    "DB_POSTGRESDB_DATABASE",
    "DB_POSTGRESDB_USER",
    "DB_POSTGRESDB_PASSWORD",
    "DB_POSTGRESDB_SSL_ENABLED",
    "DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED",
]


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return value


def main() -> None:
    token = require_env("HF_TOKEN")
    username = require_env("HF_USERNAME")
    space_name = require_env("HF_SPACE_NAME")
    repo_id = f"{username}/{space_name}"

    api = HfApi(token=token)

    for name in SECRET_NAMES:
        value = os.environ.get(name)
        if value is None or value == "":
            print(f"Skipping empty secret: {name}")
            continue
        api.add_space_secret(repo_id=repo_id, key=name, value=value)
        print(f"Synced secret: {name}")


if __name__ == "__main__":
    main()
