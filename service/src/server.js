import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "./config.js";
import { ensureSchema } from "./db.js";
import { exchangeOAuthCode, buildOAuthUrl } from "./google.js";
import { handleTelegramUpdate } from "./handlers.js";
import { sendTelegramMessage } from "./telegram.js";

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", async (_req, res) => {
  res.json({ ok: true, service: "lovann-helper" });
});

app.get("/oauth/start", (req, res, next) => {
  try {
    const telegramUserId = req.query.telegram_user_id;
    if (!telegramUserId) return res.status(400).send("telegram_user_id is required");
    const url = buildOAuthUrl({
      telegramUserId,
      username: req.query.username || "",
    });
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

app.get("/oauth/callback", async (req, res, next) => {
  try {
    if (!req.query.code || !req.query.state) {
      return res.status(400).send("Missing OAuth code/state");
    }
    await exchangeOAuthCode(req.query.code, req.query.state);
    res
      .status(200)
      .send("Google connected. You can close this page and return to Telegram to send /register <google_sheet_url>.");
  } catch (error) {
    next(error);
  }
});

app.post("/api/telegram/handle", async (req, res, next) => {
  try {
    const result = await handleTelegramUpdate(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/telegram/reply", async (req, res, next) => {
  try {
    await sendTelegramMessage(req.body.chatId, req.body.text);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.message || "Internal server error",
  });
});

async function main() {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await ensureSchema();
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      console.error(`Database not ready, retrying (${attempt}/30): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (lastError) throw lastError;

  const proxy = createProxyMiddleware({
    target: config.n8nTarget,
    changeOrigin: true,
    xfwd: true,
    ws: true,
  });

  app.use("/", proxy);

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Lovann helper/proxy listening on ${config.port}`);
    console.log(`Proxying n8n to ${config.n8nTarget}`);
  });

  server.on("upgrade", proxy.upgrade);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
