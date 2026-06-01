import { bigint, index, integer, pgTable, real, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";

/**
 * Status pemenuhan Free Float BEI per emiten.
 *
 * Sumber: ff.klinikpenyesalan.com (olahan Pengumuman BEI No.
 * Peng-S-00011/BEI.PLP/04-2026). Data tertanam sebagai JSON di
 * `<script id="rawData">` (HTML statis, BUKAN payload Next.js seperti 1pct).
 *
 * Field BEI: papan pencatatan, kapitalisasi, jumlah pemegang saham, % free
 * float aktual, ambang wajib (7,5 / 12,5 / 15%), dan status pemenuhan
 * (Telah Memenuhi / tenggat waktu / pengecualian / delisting).
 */
export const freeFloatStatus = pgTable(
  "ff_free_float",
  {
    id: ulid(),
    snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD posisi pengumuman
    kode: text("kode").notNull(),
    name: text("name").notNull().default(""),
    board: text("board"), // Utama / Pengembangan / Akselerasi / Ekonomi Baru
    marketCap: bigint("market_cap", { mode: "number" }).notNull().default(0),
    shareholders: integer("shareholders").notNull().default(0), // jumlah pemegang saham
    freeFloatPct: real("free_float_pct").notNull().default(0), // % free float aktual
    requiredPct: real("required_pct").notNull().default(0), // ambang wajib
    status: text("status"), // "Telah Memenuhi" / tenggat / pengecualian / delisting
    rank: integer("rank").notNull().default(0),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("ff_free_float_date_kode_uq").on(t.snapshotDate, t.kode),
    index("ff_free_float_kode_idx").on(t.kode),
    index("ff_free_float_board_idx").on(t.board),
    index("ff_free_float_ff_idx").on(t.freeFloatPct),
  ],
);

export type FreeFloatStatus = typeof freeFloatStatus.$inferSelect;
