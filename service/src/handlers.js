import {
  analyzeFoodImage,
  appendValues,
  buildOAuthUrl,
  extractSpreadsheetId,
  validateSpreadsheet,
} from "./google.js";
import { getUserConfig, upsertUserConfig } from "./db.js";
import {
  classifyText,
  nowIso,
  parseFinance,
  parseFoodText,
  parseHabit,
  todayJakarta,
} from "./parser.js";
import { downloadTelegramPhoto, getChatId, getLargestPhoto, getMessage, getTelegramUser, getText } from "./telegram.js";

function helpText(userId, username) {
  const connectUrl = buildOAuthUrl({ telegramUserId: userId, username });
  return [
    "Lovann siap dipakai.",
    "",
    "1. Connect Google:",
    connectUrl,
    "",
    "2. Register sheet:",
    "/register https://docs.google.com/spreadsheets/d/<spreadsheet_id>/edit",
    "",
    "Contoh input:",
    "expense 45000 food nasi padang",
    "income 500000 freelance desain logo",
    "habit reading done 20 pages",
    "food lunch nasi padang 1 porsi",
  ].join("\n");
}

function currency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

async function requireRegistered(userId) {
  const cfg = await getUserConfig(userId);
  if (!cfg || cfg.status !== "active") {
    const err = new Error("Sheet belum terhubung. Kirim /register <link_google_sheet> setelah /connect.");
    err.code = "NOT_REGISTERED";
    throw err;
  }
  return cfg;
}

export async function handleTelegramUpdate(update) {
  const message = getMessage(update);
  if (!message) return { ok: true, reply: "" };

  const chatId = getChatId(message);
  const user = getTelegramUser(message);
  const text = getText(message);
  const photo = getLargestPhoto(message);
  const type = photo ? "food_image" : classifyText(text);

  try {
    if (type === "help") {
      return { ok: true, chatId, reply: helpText(user.id, user.username) };
    }

    if (type === "connect") {
      return {
        ok: true,
        chatId,
        reply: ["Connect Google lewat link ini:", buildOAuthUrl({ telegramUserId: user.id, username: user.username })].join(
          "\n",
        ),
      };
    }

    if (type === "status") {
      const cfg = await getUserConfig(user.id);
      return {
        ok: true,
        chatId,
        reply: cfg?.status === "active" ? `Sheet aktif: ${cfg.spreadsheet_id}` : "Sheet belum aktif. Kirim /connect lalu /register.",
      };
    }

    if (type === "register") {
      const spreadsheetUrl = text.replace(/^\/register\s*/i, "").trim();
      const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
      if (!spreadsheetId) {
        return { ok: false, chatId, reply: "Link Google Sheet tidak valid. Kirim /register <link_google_sheet>." };
      }

      const validation = await validateSpreadsheet(user.id, spreadsheetId);
      if (!validation.ok) {
        const missing = [];
        if (validation.missingSheets.length) missing.push(`Missing sheets: ${validation.missingSheets.join(", ")}`);
        for (const [sheet, headers] of Object.entries(validation.missingHeaders)) {
          missing.push(`${sheet} missing headers: ${headers.join(", ")}`);
        }
        return { ok: false, chatId, reply: `Format sheet belum sesuai.\n${missing.join("\n")}` };
      }

      await upsertUserConfig({
        telegramUserId: user.id,
        username: user.username,
        spreadsheetUrl,
        spreadsheetId,
      });
      return { ok: true, chatId, reply: "Sheet berhasil terhubung. Kamu sudah bisa input finance, habit, dan food." };
    }

    if (type === "finance") {
      const cfg = await requireRegistered(user.id);
      const data = parseFinance(text);
      if (!data?.amount || !data.category) {
        return { ok: false, chatId, reply: "Format finance belum valid. Contoh: expense 45000 food nasi padang" };
      }
      await appendValues({
        telegramUserId: user.id,
        spreadsheetId: cfg.spreadsheet_id,
        sheetName: cfg.finance_sheet_name,
        values: [
          nowIso(),
          user.id,
          user.username,
          data.date,
          data.type,
          data.category,
          data.subcategory,
          data.description,
          data.amount,
          data.payment_method,
          data.tags,
          data.notes,
          text,
          "telegram_text",
        ],
      });
      return {
        ok: true,
        chatId,
        reply: `${data.type === "income" ? "Income" : "Expense"} tersimpan: ${data.category} - ${currency(data.amount)}`,
      };
    }

    if (type === "habit") {
      const cfg = await requireRegistered(user.id);
      const data = parseHabit(text);
      if (!data) return { ok: false, chatId, reply: "Format habit belum valid. Contoh: habit reading done 20 pages" };
      await appendValues({
        telegramUserId: user.id,
        spreadsheetId: cfg.spreadsheet_id,
        sheetName: cfg.habit_sheet_name,
        values: [
          nowIso(),
          user.id,
          user.username,
          data.date,
          data.habit,
          data.status,
          data.value,
          data.unit,
          data.notes,
          text,
          "telegram_text",
        ],
      });
      return { ok: true, chatId, reply: `Habit tersimpan: ${data.habit} - ${data.status}` };
    }

    if (type === "food_text") {
      const cfg = await requireRegistered(user.id);
      const data = parseFoodText(text);
      if (!data?.food_item) return { ok: false, chatId, reply: "Format food belum valid. Contoh: food lunch nasi padang 1 porsi" };
      await appendValues({
        telegramUserId: user.id,
        spreadsheetId: cfg.spreadsheet_id,
        sheetName: cfg.food_sheet_name,
        values: [
          nowIso(),
          user.id,
          user.username,
          data.date,
          data.meal,
          data.food_item,
          data.serving,
          data.unit,
          data.calories,
          data.protein_g,
          data.carbs_g,
          data.fat_g,
          data.fiber_g,
          data.sugar_g,
          data.sodium_mg,
          data.cholesterol_mg,
          data.notes,
          "",
          "",
          data.confidence,
          text,
          "telegram_text",
        ],
      });
      return { ok: true, chatId, reply: `Food tersimpan: ${data.food_item}` };
    }

    if (type === "food_image") {
      const cfg = await requireRegistered(user.id);
      const image = await downloadTelegramPhoto(photo.file_id);
      const food = await analyzeFoodImage({
        imageBase64: image.base64,
        mimeType: image.mimeType,
        caption: text,
      });
      await appendValues({
        telegramUserId: user.id,
        spreadsheetId: cfg.spreadsheet_id,
        sheetName: cfg.food_sheet_name,
        values: [
          nowIso(),
          user.id,
          user.username,
          todayJakarta(),
          food.meal || "",
          food.food_item || "",
          food.serving || "",
          food.unit || "",
          food.calories || "",
          food.protein_g || "",
          food.carbs_g || "",
          food.fat_g || "",
          food.fiber_g || "",
          food.sugar_g || "",
          food.sodium_mg || "",
          food.cholesterol_mg || "",
          food.notes || "",
          photo.file_id,
          image.filePath,
          food.confidence || "",
          text,
          "telegram_image",
        ],
      });
      return {
        ok: true,
        chatId,
        reply: `Food image tersimpan: ${food.food_item || "makanan"} (${food.calories || "?"} kcal, confidence ${food.confidence || "?"})`,
      };
    }

    return { ok: false, chatId, reply: "Format belum dikenali. Kirim /help untuk contoh." };
  } catch (error) {
    if (error.code === "GOOGLE_NOT_CONNECTED") {
      return {
        ok: false,
        chatId,
        reply: ["Google belum connect. Buka link ini:", buildOAuthUrl({ telegramUserId: user.id, username: user.username })].join(
          "\n",
        ),
      };
    }
    if (error.code === "NOT_REGISTERED") {
      return { ok: false, chatId, reply: error.message };
    }
    return { ok: false, chatId, reply: `Gagal memproses input: ${error.message}` };
  }
}

