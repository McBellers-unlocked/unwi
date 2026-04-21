/**
 * Runs Drizzle migrations on-demand. Invoked via `npm run db:migrate`.
 * For local dev you can also use `npm run db:push` for fast iteration.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/lib/db/client";

async function main() {
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("migrations applied");
  await pool.end();
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
