/**
 * pg + Drizzle connection singleton. Matches the Callater pattern.
 *
 * A single Pool is sized for the Next.js server-runtime. For Amplify scheduled
 * functions, a new pool is created per invocation — that's fine; cron runs once
 * a day and the pool is torn down when the runtime exits.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __unwi_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __unwi_drizzle: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function buildPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. See .env.example for the format.",
    );
  }
  // Aurora cluster parameter group sets rds.force_ssl=1, so every non-local
  // connection MUST use TLS. AWS terminates with its own CA chain; disabling
  // cert verification is standard on managed RDS/Aurora where the cert is
  // ambient and trust is established by VPC + password + IAM.
  const isLocal = /@localhost|@127\.0\.0\.1|:5433/.test(url);
  return new Pool({
    connectionString: url,
    max: 10,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

/**
 * Lazy accessors. The Pool is only built on first query — this matters for
 * Next.js build-time static analysis and for Amplify's build step, both of
 * which may import modules that transitively reach this file before the
 * DATABASE_URL env var is available.
 */
export function getPool(): Pool {
  if (!globalThis.__unwi_pg_pool) {
    globalThis.__unwi_pg_pool = buildPool();
  }
  return globalThis.__unwi_pg_pool;
}

function getDb() {
  if (!globalThis.__unwi_drizzle) {
    globalThis.__unwi_drizzle = drizzle(getPool(), { schema });
  }
  return globalThis.__unwi_drizzle;
}

/**
 * Proxy that defers resolution of the drizzle client until the first property
 * access. Call-site ergonomics stay identical to `import { db } from ...`.
 */
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const real = getPool() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
