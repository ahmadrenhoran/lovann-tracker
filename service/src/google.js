import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config, requireConfig } from "./config.js";
import { getOAuthToken, upsertOAuthToken } from "./db.js";

const REQUIRED_SHEETS = {
  Finance_Log: [
    "timestamp",
    "telegram_user_id",
    "telegram_username",
    "date",
    "type",
    "category",
    "subcategory",
    "description",
    "amount",
    "payment_method",
    "tags",
    "notes",
    "raw_message",
    "source",
  ],
  Habit_Log: [
    "timestamp",
    "telegram_user_id",
    "telegram_username",
    "date",
    "habit",
    "status",
    "value",
    "unit",
    "notes",
    "raw_message",
    "source",
  ],
  Food_Log: [
    "timestamp",
    "telegram_user_id",
    "telegram_username",
    "date",
    "meal",
    "food_item",
    "serving",
    "unit",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "fiber_g",
    "sugar_g",
    "sodium_mg",
    "cholesterol_mg",
    "notes",
    "image_file_id",
    "image_url_or_path",
    "confidence",
    "raw_message",
    "source",
  ],
};

export function getOAuthClient() {
  requireConfig(["googleClientId", "googleClientSecret", "googleRedirectUri"]);
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
}

export function buildOAuthUrl({ telegramUserId, username }) {
  const oauth2Client = getOAuthClient();
  const state = Buffer.from(JSON.stringify({ telegramUserId: String(telegramUserId), username: username || "" })).toString(
    "base64url",
  );
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/spreadsheets"],
    state,
  });
}

export async function exchangeOAuthCode(code, state) {
  const oauth2Client = getOAuthClient();
  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  const { tokens } = await oauth2Client.getToken(code);
  await upsertOAuthToken(decoded.telegramUserId, decoded.username, tokens);
  return decoded;
}

export async function getAuthorizedSheetsClient(telegramUserId) {
  const token = await getOAuthToken(telegramUserId);
  if (!token) {
    const err = new Error("Google account is not connected. Send /connect first.");
    err.code = "GOOGLE_NOT_CONNECTED";
    err.statusCode = 401;
    throw err;
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    scope: token.scope,
    token_type: token.token_type,
    expiry_date: token.expiry_date ? Number(token.expiry_date) : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await upsertOAuthToken(telegramUserId, token.telegram_username, tokens);
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

export function extractSpreadsheetId(url) {
  const match = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(String(url || ""))) return String(url);
  return "";
}

export async function validateSpreadsheet(telegramUserId, spreadsheetId) {
  const sheets = await getAuthorizedSheetsClient(telegramUserId);
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const titles = new Set((response.data.sheets || []).map((sheet) => sheet.properties.title));
  const missingSheets = Object.keys(REQUIRED_SHEETS).filter((name) => !titles.has(name));
  if (missingSheets.length) {
    return { ok: false, missingSheets, missingHeaders: {} };
  }

  const ranges = Object.keys(REQUIRED_SHEETS).map((sheetName) => `${sheetName}!1:1`);
  const values = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
  const missingHeaders = {};

  for (const rangeResult of values.data.valueRanges || []) {
    const sheetName = String(rangeResult.range || "").split("!")[0].replace(/^'/, "").replace(/'$/, "");
    const headers = new Set((rangeResult.values?.[0] || []).map((value) => String(value).trim()));
    const missing = (REQUIRED_SHEETS[sheetName] || []).filter((header) => !headers.has(header));
    if (missing.length) missingHeaders[sheetName] = missing;
  }

  return {
    ok: missingSheets.length === 0 && Object.keys(missingHeaders).length === 0,
    missingSheets,
    missingHeaders,
  };
}

export async function appendValues({ telegramUserId, spreadsheetId, sheetName, values }) {
  const sheets = await getAuthorizedSheetsClient(telegramUserId);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values],
    },
  });
}

export async function analyzeFoodImage({ imageBase64, mimeType, caption }) {
  requireConfig(["googleAiApiKey"]);

  const genAI = new GoogleGenerativeAI(config.googleAiApiKey);
  const model = genAI.getGenerativeModel({ model: config.googleAiModel });
  const prompt = `
You are a food tracking assistant. Analyze this food image and optional caption.
Return strict JSON only with this shape:
{
  "meal": "breakfast|lunch|dinner|snack|",
  "food_item": "string",
  "serving": "number or string",
  "unit": "string",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number,
  "cholesterol_mg": number,
  "notes": "short Indonesian note",
  "confidence": number
}
Caption: ${caption || ""}
`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || "image/jpeg",
      },
    },
  ]);

  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

