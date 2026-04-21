import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Drizzle-kit runs outside the Next.js runtime, so load .env.local manually.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;

const config: Config = {
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/unwi",
  },
  strict: true,
  verbose: true,
};

export default config;
