import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import * as schema from "@/db/schema";

/**
 * Postgres client untuk app runtime.
 *
 * Pakai DATABASE_URL (POOLED kalau Neon). Pgbouncer Neon dalam mode transaction —
 * `prepare: false` WAJIB karena prepared statement tidak persist across query.
 */
const queryClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 25 : 10,
  idle_timeout: 30,
  connect_timeout: 10,
  // Disable prepared statements untuk kompatibilitas dengan pgbouncer transaction mode (Neon pooled).
  prepare: false,
  // Safety net: kill query yang berjalan > 30s (cegah stuck connection di pool).
  // Worker jobs berat (compute snapshots) punya unpooled connection terpisah via db/migrate.ts.
  connection: {
    statement_timeout: "30000",
  },
});

export const db = drizzle(queryClient, {
  schema,
  logger: env.NODE_ENV === "development",
});

export type DB = typeof db;
export { schema };
