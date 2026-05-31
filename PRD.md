# PRD: Lovann Telegram Tracker

## 1. Ringkasan Produk

Lovann Telegram Tracker adalah sistem pencatatan personal melalui Telegram yang menyimpan data ke Google Spreadsheet milik masing-masing user. User cukup menyiapkan Google Sheet sesuai template Lovann, membagikan link sheet melalui Telegram, lalu mengirim input harian berupa finance, habit, dan food tracker. Sistem diproses oleh n8n yang dideploy menggunakan Docker di Hugging Face Spaces, dengan deployment otomatis melalui GitHub Actions.

Tujuan utama produk adalah membuat tracking harian menjadi cepat, natural, dan rendah hambatan tanpa user perlu membuka spreadsheet secara manual.

## 2. Problem Statement

Banyak user ingin tracking pengeluaran, income, kebiasaan, dan makanan, tetapi proses membuka spreadsheet dan mengisi kolom satu per satu terlalu berat untuk aktivitas harian. Telegram lebih mudah karena user bisa mengetik cepat atau mengirim foto makanan. Sistem perlu mengubah input Telegram menjadi row terstruktur di spreadsheet user.

## 3. Target User

- User personal yang ingin tracking keuangan, habit, dan makanan.
- User yang nyaman menggunakan Telegram.
- User yang sudah punya atau bersedia menggunakan Google Sheets sebagai database pribadi.
- Early adopter yang bisa mengikuti format template spreadsheet Lovann.

## 4. Scope MVP

MVP harus mendukung:

- Registrasi link Google Sheet dari Telegram.
- Penyimpanan mapping `telegram_user_id -> spreadsheet_id`.
- Input finance dengan expense dan income.
- Input habit dengan status aktivitas harian.
- Input food via text.
- Input food via gambar Telegram dengan estimasi makanan.
- Append row ke Google Sheet user.
- Validasi format dasar.
- Reply Telegram untuk sukses, gagal, atau instruksi format.
- Deployment n8n via Docker di Hugging Face Spaces.
- Sync deployment dari GitHub ke Hugging Face memakai GitHub Actions.

Di luar MVP:

- Dashboard web mandiri.
- Multi-currency complex accounting.
- Bank sync otomatis.
- Nutrition accuracy medis.
- Subscription/payment system.
- Mobile app native.

## 5. Existing Spreadsheet Review

File referensi: `/Users/asani/Documents/tracking.xlsx`.

Workbook saat ini memiliki 3 sheet:

- `💰 Finance`
- `🌱 Habits`
- `🍽️ Food`

Struktur yang ditemukan:

- Finance memiliki area tracker di baris 3 dengan kolom `Date`, `Type`, `Category`, `Subcategory`, `Description`, `Amount`, `Payment Method`, `Tags`, `Notes`, `Goal`, `Column1`.
- Finance juga punya area budget/dashboard mulai sekitar baris 12.
- Habits memiliki area tracker di baris 3 dengan kolom `Date`, `Habit`, `Status`, `Notes`, `Day %`.
- Food memiliki area input mulai baris 6 dengan kolom `Date`, `Meal`, `Food Item`, `Serving`, `Unit`, `Calories`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, `Fiber (g)`, `Sugar (g)`, `Sodium (mg)`, `Cholesterol (mg)`, `Notes`.
- Food juga punya area dashboard harian di sisi kanan.

Rekomendasi penting:

- Pisahkan area input mentah dan dashboard/formula agar n8n selalu append ke lokasi yang stabil.
- Untuk Google Sheets, gunakan tab khusus input dengan header di baris 1.
- Dashboard boleh tetap ada, tapi sebaiknya membaca dari tab input mentah.

## 6. Rekomendasi Template Google Sheet

Template final sebaiknya punya tab berikut:

### 6.1 `Finance_Log`

Header baris 1:

| Column | Required | Description |
|---|---:|---|
| timestamp | yes | Waktu data diterima sistem |
| telegram_user_id | yes | ID user Telegram |
| telegram_username | no | Username Telegram |
| date | yes | Tanggal transaksi |
| type | yes | `income` atau `expense` |
| category | yes | Contoh: food, salary, transport |
| subcategory | no | Detail kategori |
| description | no | Deskripsi transaksi |
| amount | yes | Nominal angka |
| payment_method | no | cash, transfer, gopay, dll |
| tags | no | Tag bebas |
| notes | no | Catatan tambahan |
| raw_message | yes | Pesan asli Telegram |
| source | yes | `telegram_text` |

### 6.2 `Habit_Log`

Header baris 1:

| Column | Required | Description |
|---|---:|---|
| timestamp | yes | Waktu data diterima |
| telegram_user_id | yes | ID user Telegram |
| telegram_username | no | Username Telegram |
| date | yes | Tanggal habit |
| habit | yes | Nama habit |
| status | yes | `done`, `skipped`, `partial` |
| value | no | Nilai kuantitatif, misalnya 20 halaman |
| unit | no | pages, minutes, km, glass |
| notes | no | Catatan |
| raw_message | yes | Pesan asli Telegram |
| source | yes | `telegram_text` |

### 6.3 `Food_Log`

Header baris 1:

| Column | Required | Description |
|---|---:|---|
| timestamp | yes | Waktu data diterima |
| telegram_user_id | yes | ID user Telegram |
| telegram_username | no | Username Telegram |
| date | yes | Tanggal makan |
| meal | no | breakfast, lunch, dinner, snack |
| food_item | yes | Nama makanan |
| serving | no | Jumlah |
| unit | no | porsi, gram, bowl, pcs |
| calories | no | Estimasi kalori |
| protein_g | no | Estimasi protein |
| carbs_g | no | Estimasi karbo |
| fat_g | no | Estimasi lemak |
| fiber_g | no | Estimasi fiber |
| sugar_g | no | Estimasi gula |
| sodium_mg | no | Estimasi sodium |
| cholesterol_mg | no | Estimasi kolesterol |
| notes | no | Catatan |
| image_file_id | no | Telegram file ID |
| image_url_or_path | no | Link/path gambar jika disimpan |
| confidence | no | Confidence hasil image/text extraction |
| raw_message | no | Caption atau text asli |
| source | yes | `telegram_text` atau `telegram_image` |

### 6.4 `User_Config`

Ini bisa berupa Google Sheet admin milik sistem, bukan milik user.

| Column | Description |
|---|---|
| telegram_user_id | Primary key user |
| telegram_username | Username Telegram |
| spreadsheet_url | Link Google Sheet user |
| spreadsheet_id | ID Google Sheet hasil parsing |
| finance_sheet_name | Default `Finance_Log` |
| habit_sheet_name | Default `Habit_Log` |
| food_sheet_name | Default `Food_Log` |
| status | `active`, `blocked`, `invalid` |
| created_at | Waktu registrasi |
| updated_at | Waktu update |
| last_error | Error terakhir |

## 7. User Journey

### 7.1 Onboarding

1. User membuka bot Telegram Lovann.
2. Bot mengirim instruksi copy template Google Sheet.
3. User membuat salinan template.
4. User menghubungkan akun Google mereka melalui OAuth n8n.
5. User memberi izin akses Google Sheets sesuai flow OAuth.
6. User kirim:

```text
/register https://docs.google.com/spreadsheets/d/<spreadsheet_id>/edit
```

7. n8n validasi link dan akses sheet.
8. n8n menyimpan mapping ke `User_Config`.
9. Bot membalas:

```text
Sheet berhasil terhubung. Kamu sudah bisa input finance, habit, dan food.
```

### 7.2 Finance Input

Contoh format panjang:

```text
expense
date: 2026-05-31
category: food
subcategory: lunch
description: nasi padang
amount: 45000
payment: gopay
tags: meal
notes: warung dekat kantor
```

Contoh format pendek MVP:

```text
expense 45000 food nasi padang
income 500000 freelance desain logo
```

### 7.3 Habit Input

Contoh:

```text
habit reading done 20 pages
habit workout skipped
habit coding done 90 minutes
```

### 7.4 Food Input Text

Contoh:

```text
food lunch nasi padang 1 porsi
food snack pisang 1 buah
```

### 7.5 Food Input Image

1. User kirim foto makanan ke Telegram.
2. User boleh memberi caption:

```text
lunch, kira-kira 1 porsi
```

3. n8n download gambar dari Telegram.
4. Sistem image analysis memperkirakan item makanan dan nutrisi.
5. Bot mengirim ringkasan estimasi.
6. Data masuk ke `Food_Log`.

## 8. Functional Requirements

### 8.1 Telegram Bot

- Menerima command `/start`, `/help`, `/register`, `/status`, `/unlink`.
- Menerima pesan text biasa.
- Menerima gambar makanan dengan atau tanpa caption.
- Membalas dengan status yang jelas.
- Menolak user yang belum register.

### 8.2 Sheet Registration

- Extract `spreadsheet_id` dari link Google Sheets.
- Validasi tab wajib ada: `Finance_Log`, `Habit_Log`, `Food_Log`.
- Validasi header minimum.
- Simpan mapping ke Google Sheet admin.
- Update mapping jika user register ulang.

### 8.3 Finance Tracker

- Deteksi `income` dan `expense`.
- Parse amount sebagai angka.
- Default `date` ke hari ini jika tidak diberikan.
- Append ke `Finance_Log`.
- Reply summary:

```text
Expense tersimpan: food - nasi padang - Rp45.000
```

### 8.4 Habit Tracker

- Parse habit name, status, optional value/unit.
- Status valid: `done`, `skipped`, `partial`.
- Default date ke hari ini.
- Append ke `Habit_Log`.

### 8.5 Food Tracker

- Parse food dari text.
- Download gambar dari Telegram jika input adalah photo.
- Estimasi makanan dan nutrisi dari text/caption/image.
- Append ke `Food_Log`.
- Tandai `confidence` agar user tahu estimasi tidak absolut.

### 8.6 Error Handling

- Jika user belum register, bot meminta `/register`.
- Jika sheet tidak bisa diakses, bot meminta user share ulang sheet.
- Jika header tidak sesuai, bot memberi daftar kolom yang hilang.
- Jika parsing gagal, bot memberi contoh format.
- Error teknis dicatat ke log n8n dan opsional ke tab `Error_Log`.

## 9. Non-Functional Requirements

- Response Telegram ideal di bawah 5 detik untuk text.
- Image food analysis boleh asynchronous jika lebih dari 5 detik.
- Data user disimpan di Google Sheet masing-masing, bukan database aplikasi utama.
- Sistem harus bisa redeploy dari GitHub Actions.
- Secrets tidak boleh disimpan di repo.
- n8n harus memakai `N8N_ENCRYPTION_KEY` tetap agar credential tidak rusak saat redeploy.
- Timezone default: `Asia/Jakarta`.

## 10. System Architecture

```text
Telegram User
  -> Telegram Bot API
  -> n8n on Hugging Face Space Docker
  -> Workflow Router
     -> Register Flow
     -> Finance Flow
     -> Habit Flow
     -> Food Text Flow
     -> Food Image Flow
  -> Google Sheets API
  -> User Google Spreadsheet
```

### Components

- Telegram Bot: input channel.
- n8n: orchestration, parsing, validation, routing, Google Sheets append.
- Hugging Face Spaces: Docker hosting for n8n service and optional image processing helper.
- Google Sheets: storage utama user dan admin registry.
- GitHub Actions: deploy repo ke Hugging Face Space.

## 11. n8n Workflow Design

### 11.1 Main Router Workflow

Nodes:

1. Telegram Trigger
2. Normalize Telegram Payload
3. Switch by message type/command
4. Execute Workflow: Register
5. Execute Workflow: Finance
6. Execute Workflow: Habit
7. Execute Workflow: Food Text
8. Execute Workflow: Food Image
9. Telegram Reply

### 11.2 Register Workflow

Nodes:

1. Extract spreadsheet URL.
2. Extract spreadsheet ID.
3. Google Sheets: read header from required tabs.
4. Validate schema.
5. Upsert row in admin `User_Config`.
6. Reply success or validation error.

### 11.3 Finance Workflow

Nodes:

1. Lookup user config.
2. Parse finance command.
3. Validate `type`, `amount`, `category`.
4. Normalize date and amount.
5. Google Sheets append row to `Finance_Log`.
6. Reply summary.

### 11.4 Habit Workflow

Nodes:

1. Lookup user config.
2. Parse habit command.
3. Validate habit and status.
4. Append row to `Habit_Log`.
5. Reply summary.

### 11.5 Food Workflow

Text:

1. Lookup user config.
2. Parse meal and food item.
3. Estimate nutrition from known rules or AI model.
4. Append row to `Food_Log`.

Image:

1. Download Telegram file.
2. Store temporary image in Hugging Face `/tmp` or persistent path if enabled.
3. Analyze image using selected vision model/API.
4. Generate structured nutrition estimate.
5. Append row to `Food_Log`.
6. Reply with confidence and note that values are estimates.

## 12. Deployment Requirements

### 12.1 Hugging Face Spaces

Use Docker Space.

Required `README.md` frontmatter:

```yaml
---
title: Lovann n8n Tracker
sdk: docker
app_port: 7860
---
```

Required Docker environment:

```text
N8N_PORT=7860
N8N_LISTEN_ADDRESS=0.0.0.0
N8N_USER_FOLDER=/data/.n8n
GENERIC_TIMEZONE=Asia/Jakarta
TZ=Asia/Jakarta
```

Important secrets:

```text
N8N_ENCRYPTION_KEY
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER
N8N_BASIC_AUTH_PASSWORD
WEBHOOK_URL=https://<hf-username>-<space-name>.hf.space/
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_AI_API_KEY
TELEGRAM_BOT_TOKEN
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST
DB_POSTGRESDB_PORT
DB_POSTGRESDB_DATABASE
DB_POSTGRESDB_USER
DB_POSTGRESDB_PASSWORD
```

Recommendation:

- Use external Postgres as the n8n database.
- Enable Hugging Face persistent storage only for temporary files, workflow exports, and operational backup, not as the primary database.
- Use Google OAuth for Google Sheets access.
- Use Google AI for food image recognition and nutrition estimation.

### 12.2 GitHub Actions

GitHub Actions should push repository contents to Hugging Face Space remote on `main`.

Required GitHub Secrets:

```text
HF_TOKEN
HF_USERNAME
HF_SPACE_NAME
```

Deployment action behavior:

- Checkout GitHub repo.
- Add Hugging Face Space as remote.
- Push `main` to Space.

## 13. Security and Privacy

- User spreadsheet links are sensitive enough to protect.
- Bot must not expose another user's spreadsheet ID.
- n8n editor must be protected with login/basic auth.
- Google credential must be stored only in n8n credentials or secrets.
- Telegram bot token must be secret.
- Do not log full food images longer than needed unless user consents.
- Optional: add `/delete_my_data` to remove mapping from admin registry.

## 14. Data Ownership

- User owns their Google Sheet.
- Lovann only stores registry mapping and operational logs.
- If user runs `/unlink`, Lovann stops writing to that sheet but does not delete sheet contents.

## 15. Success Metrics

- User can register sheet in under 2 minutes.
- 95% text finance input successfully parsed.
- 90% habit input successfully parsed.
- 80% food text input successfully parsed.
- Image food input returns usable estimate in under 30 seconds.
- Failed append rate under 2% after onboarding.

## 16. Acceptance Criteria MVP

- Given a user sends `/register <google_sheet_url>`, when sheet headers are valid, then registry stores the spreadsheet ID.
- Given a registered user sends `expense 45000 food nasi padang`, then a row appears in `Finance_Log`.
- Given a registered user sends `income 500000 freelance desain logo`, then a row appears in `Finance_Log`.
- Given a registered user sends `habit reading done 20 pages`, then a row appears in `Habit_Log`.
- Given a registered user sends `food lunch nasi padang 1 porsi`, then a row appears in `Food_Log`.
- Given a registered user sends a food photo, then a row appears in `Food_Log` with `source=telegram_image`.
- Given an unregistered user sends input, bot replies with registration instruction.
- Given sheet headers are invalid, bot replies with missing columns.

## 17. Implementation Phases

### Phase 1: Template and Bot Foundation

- Finalize Google Sheet template.
- Create Telegram bot.
- Deploy n8n locally with Docker.
- Build `/start`, `/help`, and `/register`.

### Phase 2: Text Tracking

- Implement finance parser.
- Implement habit parser.
- Implement food text parser.
- Append to Google Sheets.
- Add validation and replies.

### Phase 3: Hugging Face Deployment

- Create Docker Space.
- Add Dockerfile and README frontmatter.
- Configure secrets.
- Configure `WEBHOOK_URL`.
- Import n8n workflows.

### Phase 4: GitHub Actions

- Create deploy workflow.
- Push to Hugging Face Space automatically.
- Document rollback by reverting GitHub commit.

### Phase 5: Food Image

- Download Telegram images.
- Add image analysis workflow.
- Add nutrition estimate step.
- Add confidence and user-facing disclaimer.

### Phase 6: Hardening

- Add `Error_Log`.
- Add retry on Google Sheets append failure.
- Add schema revalidation command `/status`.
- Add `/unlink`.
- Add admin monitoring.

## 18. Product Decisions

### 18.1 Google Sheets Credential

Decision: use Google OAuth.

Reason:

- OAuth lets Lovann write to spreadsheets owned by each user's Google account without asking them to share files to a service account email.
- This is more natural for consumer users because they understand "connect Google account" better than "share to this technical email".
- OAuth supports private spreadsheets while keeping ownership under the user's Google account.
- n8n can store and refresh Google credentials after the user authorizes access.

Tradeoff:

- OAuth onboarding is more complex than service account onboarding.
- The Google Cloud project must configure OAuth consent screen, scopes, redirect URI, and client secret.
- The product must handle revoked/expired Google authorization by asking the user to reconnect.

### 18.2 n8n Database

Decision: use external Postgres.

Reason:

- Hugging Face Spaces can restart, rebuild, or lose non-persistent disk state.
- n8n stores workflows, credentials, executions, and settings in its database.
- External Postgres is more reliable for production than SQLite on container disk.
- SQLite is acceptable for local development only.

### 18.3 Food Image Recognition

Decision: use Google AI.

Reason:

- Food tracking needs multimodal image understanding plus structured JSON output.
- Google AI can analyze image plus caption and return estimated food items, servings, calories, and macros.
- Keeping this as an API call inside n8n is simpler than hosting a custom vision model in the Hugging Face Space.

### 18.4 Food Image Confirmation

Decision: save immediately, then let user correct.

Reason:

- The product's core value is low-friction tracking. Requiring confirmation for every meal photo adds friction.
- Nutrition from images is always an estimate, so rows should include `confidence`, `source=telegram_image`, and the raw caption/message.
- User can edit the Google Sheet manually if the estimate is wrong.

Confirmation is not required, including for low-confidence estimates. The bot should still reply with a short summary and confidence so the user can manually correct the spreadsheet if needed.

### 18.5 Dashboard Formula Placement

Decision: keep dashboards in the same user spreadsheet, but separate from protected raw log tabs.

Reason:

- Same spreadsheet is easier for users: data entry logs and dashboard live in one file.
- n8n needs stable append-only tabs with simple headers in row 1.
- Dashboard formulas, charts, budgets, and summaries should not be mixed into the same rows/columns where n8n appends data.
- Protected dashboard tabs reduce accidental formula edits while keeping everything accessible.

Recommended tab structure:

- `Finance_Log`, `Habit_Log`, `Food_Log`: raw append-only tabs used by n8n.
- `Finance_Dashboard`, `Habit_Dashboard`, `Food_Dashboard`: formulas, charts, summaries.
- `Settings`: categories, budget targets, habit list, food goals.

## 19. Suggested Product Decisions

- Use Google OAuth for Google Sheets access.
- Use external Postgres for n8n data.
- Use Google AI for food image recognition.
- Use Google Sheet admin registry for user mapping, not only n8n static data.
- Use simple command grammar first before natural-language AI parsing.
- Save food image estimates immediately but mark `confidence` and `source`.
- Keep dashboard tabs in the same spreadsheet but separate from log tabs.

## 20. References

- n8n Docker installation: https://docs.n8n.io/hosting/installation/docker/
- n8n deployment environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
- n8n webhook URL configuration: https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/
- Hugging Face Docker Spaces: https://huggingface.co/docs/hub/main/en/spaces-sdks-docker
- Hugging Face Spaces overview: https://huggingface.co/docs/hub/main/spaces-overview
- Hugging Face Spaces with GitHub Actions: https://huggingface.co/docs/hub/main/en/spaces-github-actions
