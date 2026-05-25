import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { BOOTSTRAP_SQL } from "./schema/_base";

async function main() {
  logger.info("Running database migrations...");

  // Pakai UNPOOLED URL kalau tersedia (Neon: pgbouncer transaction mode tidak mendukung
  // DDL multi-statement & prepared statements yang dipakai Drizzle migrator).
  const connectionUrl = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  if (env.DATABASE_URL_UNPOOLED) {
    logger.info("Using DATABASE_URL_UNPOOLED for migration");
  }

  const sql = postgres(connectionUrl, { max: 1, prepare: false });
  const db = drizzle(sql);

  // 1. Bootstrap: extensions (pgcrypto, pgvector), ulid generator, updated_at trigger
  logger.info("Executing bootstrap SQL (extensions, gen_ulid function)...");
  await sql.unsafe(BOOTSTRAP_SQL);

  // 2. Drizzle migrations dari ./db/migrations
  logger.info("Applying Drizzle migrations...");
  await migrate(db, { migrationsFolder: "./db/migrations" });

  // 3. Post-migration: time-series setup
  //
  // Catatan: Beberapa schema agent (mis. Agent 5 market data) mengekspor `MARKET_HYPERTABLE_SQL`
  // untuk TimescaleDB hypertable. Neon serverless Postgres TIDAK support TimescaleDB
  // extension, jadi kita SKIP eksekusi tersebut. Untuk MVP fallback: regular indexed table
  // yang Agent 5 sudah definisikan tetap berfungsi — composite index pada
  // (company_kode, trade_date DESC) menjaga query performance untuk volume MVP.
  //
  // Migrate ke QuestDB / ClickHouse / self-hosted Postgres-with-Timescale saat scale demand.
  try {
    const { MARKET_HYPERTABLE_SQL } = await import("./schema/market");
    if (typeof MARKET_HYPERTABLE_SQL === "string" && MARKET_HYPERTABLE_SQL.length > 0) {
      logger.warn(
        "MARKET_HYPERTABLE_SQL terdeteksi tapi DI-SKIP — Neon tidak support TimescaleDB. " +
          "Time-series queries akan pakai regular indexed table sampai migrate ke vendor lain.",
      );
    }
  } catch {
    // Schema market belum ada — OK.
  }

  logger.info("Migrations complete");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Migration failed");
  process.exit(1);
});
