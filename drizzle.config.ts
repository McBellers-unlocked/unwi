import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Drizzle-kit runs outside the Next.js runtime, so load .env.local manually.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/unwi";

// Aurora cluster enforces rds.force_ssl=1; drizzle-kit must use TLS for any
// non-local host. Append sslmode=require if missing.
const isLocal = /@localhost|@127\.0\.0\.1|:5433/.test(DATABASE_URL);
const url =
  isLocal || DATABASE_URL.includes("sslmode=")
    ? DATABASE_URL
    : DATABASE_URL + (DATABASE_URL.includes("?") ? "&" : "?") + "sslmode=require";

const config: Config = {
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
};

export default config;
