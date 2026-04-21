import type { Config } from "drizzle-kit";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  // Keeps drizzle-kit usable in `generate`/`check` without a live DB.
  // The error surfaces only when push/migrate/studio need an actual connection.
}

const config: Config = {
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/unwi",
  },
  strict: true,
  verbose: true,
};

export default config;
