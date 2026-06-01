# Google Sheet Template

`/register` now auto-creates these tabs and headers if the spreadsheet is empty or incomplete.

Manual template reference:

## Finance_Log

```text
timestamp
telegram_user_id
telegram_username
date
type
category
subcategory
description
amount
payment_method
tags
notes
raw_message
source
```

## Habit_Log

```text
timestamp
telegram_user_id
telegram_username
date
habit
status
value
unit
notes
raw_message
source
```

## Food_Log

```text
timestamp
telegram_user_id
telegram_username
date
meal
food_item
serving
unit
calories
protein_g
carbs_g
fat_g
fiber_g
sugar_g
sodium_mg
cholesterol_mg
notes
image_file_id
image_url_or_path
confidence
raw_message
source
```

Recommended dashboard tabs:

- `Finance_Dashboard`
- `Habit_Dashboard`
- `Food_Dashboard`
- `Settings`

Keep dashboard formulas separate from log tabs. n8n appends only to the log tabs.
