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

const OPTIONAL_SHEETS = ["Finance_Dashboard", "Habit_Dashboard", "Food_Dashboard", "Settings"];

const TAB_COLORS = {
  Finance_Log: { red: 0.13, green: 0.45, blue: 0.89 },
  Habit_Log: { red: 0.17, green: 0.63, blue: 0.39 },
  Food_Log: { red: 0.94, green: 0.47, blue: 0.22 },
  Finance_Dashboard: { red: 0.55, green: 0.72, blue: 0.98 },
  Habit_Dashboard: { red: 0.57, green: 0.84, blue: 0.68 },
  Food_Dashboard: { red: 0.98, green: 0.76, blue: 0.49 },
  Settings: { red: 0.65, green: 0.56, blue: 0.89 },
};

const HEADER_COLORS = {
  Finance_Log: { red: 0.88, green: 0.94, blue: 1 },
  Habit_Log: { red: 0.9, green: 0.98, blue: 0.93 },
  Food_Log: { red: 1, green: 0.94, blue: 0.89 },
};

const DASHBOARD_VALUES = {
  Finance_Dashboard: [
    ["Finance Dashboard"],
    [""],
    ["Metric", "Value"],
    ["Total Expense", '=IFERROR(SUMIF(Finance_Log!E2:E,"expense",Finance_Log!I2:I),0)'],
    ["Total Income", '=IFERROR(SUMIF(Finance_Log!E2:E,"income",Finance_Log!I2:I),0)'],
    ["Net Cashflow", "=B5-B4"],
    [""],
    ["Top Expense Category", `=IFERROR(INDEX(QUERY(Finance_Log!F2:I,"select F,sum(I) where E = 'expense' and F is not null group by F order by sum(I) desc limit 1",0),1,1),"")`],
    ["Top Expense Total", `=IFERROR(INDEX(QUERY(Finance_Log!F2:I,"select F,sum(I) where E = 'expense' and F is not null group by F order by sum(I) desc limit 1",0),1,2),0)`],
  ],
  Habit_Dashboard: [
    ["Habit Dashboard"],
    [""],
    ["Metric", "Value"],
    ["Completed", '=COUNTIF(Habit_Log!F2:F,"done")'],
    ["Skipped", '=COUNTIF(Habit_Log!F2:F,"skip")'],
    ["Completion Rate", '=IFERROR(COUNTIF(Habit_Log!F2:F,"done")/COUNTA(Habit_Log!F2:F),0)'],
    [""],
    ["Most Active Habit", '=IFERROR(INDEX(QUERY(Habit_Log!E2:F,"select E,count(E) where E is not null group by E order by count(E) desc limit 1",0),1,1),"")'],
  ],
  Food_Dashboard: [
    ["Food Dashboard"],
    [""],
    ["Metric", "Value"],
    ["Total Calories", "=IFERROR(SUM(Food_Log!I2:I),0)"],
    ["Protein (g)", "=IFERROR(SUM(Food_Log!J2:J),0)"],
    ["Carbs (g)", "=IFERROR(SUM(Food_Log!K2:K),0)"],
    ["Fat (g)", "=IFERROR(SUM(Food_Log!L2:L),0)"],
    [""],
    ["Most Logged Food", '=IFERROR(INDEX(QUERY(Food_Log!F2:F,"select F,count(F) where F is not null group by F order by count(F) desc limit 1",0),1,1),"")'],
  ],
  Settings: [
    ["Lovann Settings"],
    [""],
    ["Section", "Value"],
    ["Timezone", "Asia/Jakarta"],
    ["Currency", "IDR"],
    ["Finance categories", "food, transport, shopping, bills, health, entertainment"],
    ["Habit ideas", "reading, workout, meditation, journaling, sleep"],
    ["Food notes", "Use Food_Log for manual entries or Telegram food photos"],
  ],
};

function columnLetter(index) {
  let value = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

function makeHeaderFormat(sheetName) {
  return {
    backgroundColor: HEADER_COLORS[sheetName] || { red: 0.94, green: 0.95, blue: 0.97 },
    textFormat: {
      bold: true,
      foregroundColor: { red: 0.18, green: 0.21, blue: 0.24 },
      fontSize: 10,
    },
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    wrapStrategy: "WRAP",
  };
}

function makeDashboardHeaderFormat() {
  return {
    backgroundColor: { red: 0.96, green: 0.97, blue: 0.99 },
    textFormat: {
      bold: true,
      foregroundColor: { red: 0.22, green: 0.25, blue: 0.29 },
      fontSize: 10,
    },
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
  };
}

function makeTitleFormat() {
  return {
    backgroundColor: { red: 0.16, green: 0.19, blue: 0.23 },
    textFormat: {
      bold: true,
      foregroundColor: { red: 1, green: 1, blue: 1 },
      fontSize: 14,
    },
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
  };
}

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

export async function ensureSpreadsheetTemplate(telegramUserId, spreadsheetId) {
  const sheets = await getAuthorizedSheetsClient(telegramUserId);
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,index))",
  });

  const sheetMap = new Map(
    (spreadsheet.data.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties.sheetId]),
  );

  const requests = [];
  const targetSheets = [...Object.keys(REQUIRED_SHEETS), ...OPTIONAL_SHEETS];

  for (const name of targetSheets) {
    if (!sheetMap.has(name)) {
      requests.push({
        addSheet: {
          properties: {
            title: name,
            tabColorStyle: {
              rgbColor: TAB_COLORS[name],
            },
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
              frozenRowCount: name in REQUIRED_SHEETS ? 1 : 0,
            },
          },
        },
      });
    }
  }

  if (requests.length) {
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    for (const reply of response.data.replies || []) {
      if (reply.addSheet?.properties?.title) {
        sheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
      }
    }
  }

  const valueRanges = [];
  for (const [sheetName, headers] of Object.entries(REQUIRED_SHEETS)) {
    valueRanges.push({
      range: `${sheetName}!A1:${columnLetter(headers.length - 1)}1`,
      values: [headers],
    });
  }

  for (const [sheetName, rows] of Object.entries(DASHBOARD_VALUES)) {
    const maxWidth = Math.max(...rows.map((row) => row.length));
    valueRanges.push({
      range: `${sheetName}!A1:${columnLetter(maxWidth - 1)}${rows.length}`,
      values: rows,
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: valueRanges,
    },
  });

  const formatRequests = [];

  for (const [sheetName, headers] of Object.entries(REQUIRED_SHEETS)) {
    const sheetId = sheetMap.get(sheetName);
    if (sheetId == null) continue;

    formatRequests.push(
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headers.length,
          },
          cell: {
            userEnteredFormat: makeHeaderFormat(sheetName),
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
        },
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: headers.length,
          },
        },
      },
      {
        setBasicFilter: {
          filter: {
            range: {
              sheetId,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: headers.length,
            },
          },
        },
      }
    );
  }

  for (const [sheetName, rows] of Object.entries(DASHBOARD_VALUES)) {
    const sheetId = sheetMap.get(sheetName);
    if (sheetId == null) continue;
    const maxWidth = Math.max(...rows.map((row) => row.length));

    formatRequests.push(
      {
        unmergeCells: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: Math.max(2, maxWidth),
          },
        },
      },
      {
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: Math.max(2, maxWidth),
          },
          mergeType: "MERGE_ALL",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: Math.max(2, maxWidth),
          },
          cell: {
            userEnteredFormat: makeTitleFormat(),
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 2,
            endRowIndex: 3,
            startColumnIndex: 0,
            endColumnIndex: Math.max(2, maxWidth),
          },
          cell: {
            userEnteredFormat: makeDashboardHeaderFormat(),
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 3,
            endRowIndex: rows.length,
            startColumnIndex: 0,
            endColumnIndex: Math.max(2, maxWidth),
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1, green: 1, blue: 1 },
              textFormat: {
                fontSize: 10,
                foregroundColor: { red: 0.22, green: 0.25, blue: 0.29 },
              },
              horizontalAlignment: "LEFT",
              verticalAlignment: "MIDDLE",
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        },
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: Math.max(2, maxWidth),
          },
        },
      }
    );
  }

  if (formatRequests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: formatRequests },
    });
  }
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
