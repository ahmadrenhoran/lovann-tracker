function buildDatabaseUrl() {
  if (process.env.LOVANN_DATABASE_URL || process.env.DATABASE_URL) {
    return process.env.LOVANN_DATABASE_URL || process.env.DATABASE_URL;
  }
  const host = process.env.DB_POSTGRESDB_HOST;
  const port = process.env.DB_POSTGRESDB_PORT || "5432";
  const database = process.env.DB_POSTGRESDB_DATABASE;
  const user = process.env.DB_POSTGRESDB_USER;
  const password = process.env.DB_POSTGRESDB_PASSWORD;
  if (!host || !database || !user || !password) return "";
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export const config = {
  port: Number(process.env.LOVANN_PORT || process.env.PORT || 7860),
  n8nTarget: `http://127.0.0.1:${process.env.N8N_INTERNAL_PORT || process.env.N8N_PORT || 5678}`,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "http://localhost:7860").replace(/\/$/, ""),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    `${(process.env.PUBLIC_BASE_URL || "http://localhost:7860").replace(/\/$/, "")}/oauth/callback`,
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY || "",
  googleAiModel: process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash",
  databaseUrl: buildDatabaseUrl(),
};

export function requireConfig(keys) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length) {
    const err = new Error(`Missing required config: ${missing.join(", ")}`);
    err.statusCode = 500;
    throw err;
  }
}
