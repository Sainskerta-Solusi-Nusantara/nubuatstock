import { bigint, date, index, integer, pgTable, real, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, withTimestamps, jsonbT } from "./_base";

/**
 * Komposisi kepemilikan saham dari KSEI (file "BalancePos" harian/periodik).
 *
 * Sumber: KSEI (web.ksei.co.id) — file pipe-delimited per emiten dengan rincian
 * kepemilikan Lokal vs Asing × 9 tipe investor:
 *   IS=Asuransi, CP=Korporasi, PF=Dana Pensiun, IB=Bank/Inst. Keuangan,
 *   ID=Individu, MF=Reksa Dana, SC=Sekuritas, FD=Yayasan, OT=Lainnya.
 *
 * Satu baris = satu emiten pada satu tanggal posisi. Di-upload admin tiap KSEI
 * rilis posisi baru → bisa bandingkan antar-periode.
 */

export type KseiBreakdown = {
  IS: number; CP: number; PF: number; IB: number; ID: number;
  MF: number; SC: number; FD: number; OT: number;
};

export const kseiOwnership = pgTable(
  "ksei_ownership",
  {
    id: ulid(),
    posDate: date("pos_date").notNull(), // tanggal posisi KSEI (YYYY-MM-DD)
    kode: text("kode").notNull(), // ticker emiten
    secType: text("sec_type").notNull().default("EQUITY"),
    secNum: bigint("sec_num", { mode: "number" }).notNull().default(0), // total saham tercatat di KSEI
    priceIdr: bigint("price_idr", { mode: "number" }).notNull().default(0),
    localTotal: bigint("local_total", { mode: "number" }).notNull().default(0),
    foreignTotal: bigint("foreign_total", { mode: "number" }).notNull().default(0),
    // Persen kepemilikan asing terhadap total KSEI (foreignTotal / secNum * 100).
    foreignPct: real("foreign_pct").notNull().default(0),
    localPct: real("local_pct").notNull().default(0),
    // Rincian per tipe investor (saham). Nama kolom *_comp untuk hindari kata
    // kunci SQL "foreign".
    local: jsonbT<KseiBreakdown>("local_comp").notNull(),
    foreign: jsonbT<KseiBreakdown>("foreign_comp").notNull(),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("ksei_ownership_date_kode_uq").on(t.posDate, t.kode),
    index("ksei_ownership_kode_idx").on(t.kode),
    index("ksei_ownership_date_idx").on(t.posDate),
    index("ksei_ownership_foreign_pct_idx").on(t.foreignPct),
  ],
);

export type KseiOwnership = typeof kseiOwnership.$inferSelect;
export type NewKseiOwnership = typeof kseiOwnership.$inferInsert;

/** Metadata tiap upload/posisi (untuk daftar periode & jumlah baris). */
export const kseiOwnershipImport = pgTable(
  "ksei_ownership_import",
  {
    id: ulid(),
    posDate: date("pos_date").notNull(),
    rowCount: integer("row_count").notNull().default(0),
    fileName: text("file_name"),
    actorUserId: text("actor_user_id"),
    ...withTimestamps,
  },
  (t) => [uniqueIndex("ksei_ownership_import_date_uq").on(t.posDate)],
);
