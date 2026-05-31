import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function ensureSchema() {
  await pool.query(`
    create table if not exists oauth_tokens (
      telegram_user_id text primary key,
      telegram_username text,
      access_token text,
      refresh_token text,
      scope text,
      token_type text,
      expiry_date bigint,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists user_configs (
      telegram_user_id text primary key,
      telegram_username text,
      spreadsheet_url text not null,
      spreadsheet_id text not null,
      finance_sheet_name text not null default 'Finance_Log',
      habit_sheet_name text not null default 'Habit_Log',
      food_sheet_name text not null default 'Food_Log',
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_error text
    );
  `);
}

export async function upsertOAuthToken(telegramUserId, username, tokens) {
  await pool.query(
    `
      insert into oauth_tokens (
        telegram_user_id, telegram_username, access_token, refresh_token,
        scope, token_type, expiry_date, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, now())
      on conflict (telegram_user_id) do update set
        telegram_username = excluded.telegram_username,
        access_token = excluded.access_token,
        refresh_token = coalesce(excluded.refresh_token, oauth_tokens.refresh_token),
        scope = excluded.scope,
        token_type = excluded.token_type,
        expiry_date = excluded.expiry_date,
        updated_at = now()
    `,
    [
      telegramUserId,
      username || "",
      tokens.access_token || null,
      tokens.refresh_token || null,
      tokens.scope || null,
      tokens.token_type || null,
      tokens.expiry_date || null,
    ],
  );
}

export async function getOAuthToken(telegramUserId) {
  const result = await pool.query("select * from oauth_tokens where telegram_user_id = $1", [
    String(telegramUserId),
  ]);
  return result.rows[0] || null;
}

export async function upsertUserConfig({ telegramUserId, username, spreadsheetUrl, spreadsheetId }) {
  await pool.query(
    `
      insert into user_configs (
        telegram_user_id, telegram_username, spreadsheet_url, spreadsheet_id,
        status, updated_at, last_error
      )
      values ($1, $2, $3, $4, 'active', now(), null)
      on conflict (telegram_user_id) do update set
        telegram_username = excluded.telegram_username,
        spreadsheet_url = excluded.spreadsheet_url,
        spreadsheet_id = excluded.spreadsheet_id,
        status = 'active',
        updated_at = now(),
        last_error = null
    `,
    [String(telegramUserId), username || "", spreadsheetUrl, spreadsheetId],
  );
}

export async function getUserConfig(telegramUserId) {
  const result = await pool.query("select * from user_configs where telegram_user_id = $1", [
    String(telegramUserId),
  ]);
  return result.rows[0] || null;
}

export async function setUserConfigError(telegramUserId, error) {
  await pool.query(
    `
      update user_configs
      set status = 'invalid', last_error = $2, updated_at = now()
      where telegram_user_id = $1
    `,
    [String(telegramUserId), String(error).slice(0, 500)],
  );
}

