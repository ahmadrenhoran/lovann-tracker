import { config } from "./config.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function getMessage(update) {
  return update?.message || update?.edited_message || null;
}

export function getTelegramUser(message) {
  const from = message?.from || {};
  return {
    id: String(from.id || ""),
    username: from.username || "",
    firstName: from.first_name || "",
  };
}

export function getChatId(message) {
  return message?.chat?.id;
}

export function getText(message) {
  return message?.text || message?.caption || "";
}

export function getLargestPhoto(message) {
  const photos = message?.photo || [];
  if (!photos.length) return null;
  return photos[photos.length - 1];
}

export async function sendTelegramMessage(chatId, text) {
  if (!config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`);
  }
}

export async function downloadTelegramPhoto(fileId) {
  const fileResponse = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/getFile?file_id=${fileId}`);
  if (!fileResponse.ok) {
    throw new Error(`Telegram getFile failed: ${fileResponse.status} ${await fileResponse.text()}`);
  }
  const fileData = await fileResponse.json();
  const filePath = fileData?.result?.file_path;
  if (!filePath) throw new Error("Telegram file_path is missing");

  const imageResponse = await fetch(`https://api.telegram.org/file/bot${config.telegramBotToken}/${filePath}`);
  if (!imageResponse.ok) {
    throw new Error(`Telegram file download failed: ${imageResponse.status} ${await imageResponse.text()}`);
  }
  const arrayBuffer = await imageResponse.arrayBuffer();
  const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(arrayBuffer);
  const ext = path.extname(filePath) || (mimeType.includes("png") ? ".png" : ".jpg");
  const safeName = `${String(fileId).replace(/[^a-zA-Z0-9_-]/g, "_")}${ext}`;
  const localPath = path.join(config.uploadDir, safeName);
  await mkdir(config.uploadDir, { recursive: true });
  await writeFile(localPath, buffer);
  return {
    base64: buffer.toString("base64"),
    mimeType,
    filePath,
    localPath,
  };
}
