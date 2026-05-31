const MEALS = new Set(["breakfast", "lunch", "dinner", "snack", "sarapan", "makan", "siang", "malam"]);
const HABIT_STATUSES = new Set(["done", "skipped", "partial", "selesai", "skip"]);

export function todayJakarta() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeAmount(value) {
  const raw = String(value || "").trim();
  const hasIndonesianThousands = /\d+\.\d{3}(\D|$)/.test(raw);
  const cleaned = hasIndonesianThousands
    ? raw.replace(/[^\d-]/g, "")
    : raw.replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export function parseKeyValue(text) {
  const out = {};
  for (const line of String(text || "").split("\n")) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    out[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return out;
}

export function parseFinance(text) {
  const raw = String(text || "").trim();
  const kv = parseKeyValue(raw);
  const tokens = raw.split(/\s+/);
  const first = tokens[0]?.toLowerCase();
  const type = (kv.type || first || "").toLowerCase();

  if (!["income", "expense"].includes(type)) return null;

  if (Object.keys(kv).length) {
    return {
      date: kv.date || kv.tanggal || todayJakarta(),
      type,
      category: kv.category || kv.kategori || "",
      subcategory: kv.subcategory || kv.sub || "",
      description: kv.description || kv.deskripsi || "",
      amount: normalizeAmount(kv.amount || kv.nominal || tokens[1]),
      payment_method: kv.payment || kv.payment_method || kv.metode || "",
      tags: kv.tags || "",
      notes: kv.notes || kv.catatan || "",
    };
  }

  return {
    date: todayJakarta(),
    type,
    amount: normalizeAmount(tokens[1]),
    category: tokens[2] || "",
    subcategory: "",
    description: tokens.slice(3).join(" "),
    payment_method: "",
    tags: "",
    notes: "",
  };
}

export function parseHabit(text) {
  const raw = String(text || "").trim();
  const tokens = raw.split(/\s+/);
  if (tokens[0]?.toLowerCase() !== "habit") return null;

  const habit = tokens[1] || "";
  const status = (tokens[2] || "").toLowerCase();
  if (!habit || !HABIT_STATUSES.has(status)) return null;

  return {
    date: todayJakarta(),
    habit,
    status: status === "selesai" ? "done" : status === "skip" ? "skipped" : status,
    value: tokens[3] || "",
    unit: tokens[4] || "",
    notes: tokens.slice(5).join(" "),
  };
}

export function parseFoodText(text) {
  const raw = String(text || "").trim();
  const tokens = raw.split(/\s+/);
  if (tokens[0]?.toLowerCase() !== "food") return null;

  let meal = tokens[1]?.toLowerCase() || "";
  let offset = 2;
  if (!MEALS.has(meal)) {
    meal = "";
    offset = 1;
  }

  const tail = tokens.slice(offset);
  const numberIndex = tail.findIndex((token) => /^\d+([.,]\d+)?$/.test(token));
  const foodTokens = numberIndex >= 0 ? tail.slice(0, numberIndex) : tail;
  const serving = numberIndex >= 0 ? tail[numberIndex] : "";
  const unit = numberIndex >= 0 ? tail[numberIndex + 1] || "" : "";

  return {
    date: todayJakarta(),
    meal,
    food_item: foodTokens.join(" "),
    serving,
    unit,
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    fiber_g: "",
    sugar_g: "",
    sodium_mg: "",
    cholesterol_mg: "",
    notes: tail.slice(numberIndex >= 0 ? numberIndex + 2 : foodTokens.length).join(" "),
    image_file_id: "",
    image_url_or_path: "",
    confidence: "",
  };
}

export function classifyText(text) {
  const raw = String(text || "").trim();
  const first = raw.split(/\s+/)[0]?.toLowerCase();
  if (raw.startsWith("/register")) return "register";
  if (raw.startsWith("/connect")) return "connect";
  if (raw.startsWith("/status")) return "status";
  if (raw.startsWith("/help") || raw.startsWith("/start")) return "help";
  if (["income", "expense"].includes(first)) return "finance";
  if (first === "habit") return "habit";
  if (first === "food") return "food_text";
  return "unknown";
}
