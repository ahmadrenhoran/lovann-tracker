import bcrypt from "bcryptjs";

const email = process.env.N8N_INSTANCE_OWNER_EMAIL || "";
const firstName = process.env.N8N_INSTANCE_OWNER_FIRST_NAME || "";
const lastName = process.env.N8N_INSTANCE_OWNER_LAST_NAME || "";
const password = process.env.N8N_OWNER_PASSWORD || "";
const hash = process.env.N8N_INSTANCE_OWNER_PASSWORD_HASH || "";

if (!email || !firstName || !lastName) {
  process.exit(0);
}

if (!password && !hash) {
  process.exit(0);
}

const passwordHash = hash || bcrypt.hashSync(password, 10);

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

process.stdout.write(
  [
    `export N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true`,
    `export N8N_INSTANCE_OWNER_EMAIL=${shellQuote(email)}`,
    `export N8N_INSTANCE_OWNER_FIRST_NAME=${shellQuote(firstName)}`,
    `export N8N_INSTANCE_OWNER_LAST_NAME=${shellQuote(lastName)}`,
    `export N8N_INSTANCE_OWNER_PASSWORD_HASH=${shellQuote(passwordHash)}`,
  ].join("\n"),
);
