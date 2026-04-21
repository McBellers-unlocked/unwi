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
}

function buildPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. See .env.example for the format.",
    );
  }
  return new Pool({
    connectionString: url,
    // Aurora Serverless v2 tolerates short-lived idle connections well; the
    // default is fine for both local dev and Amplify server runtime.
    max: 10,
  });
}

// Hot-reload in Next.js dev mode would otherwise create dozens of Pools.
const pool = globalThis.__unwi_pg_pool ?? buildPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__unwi_pg_pool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
