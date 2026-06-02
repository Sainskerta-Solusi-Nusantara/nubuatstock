import { index, integer, pgTable, real, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";

/**
 * Rekomendasi harian dari sekuritas/broker (agregator).
 *
 * Nubuat berperan sebagai AGREGATOR: menampilkan pilihan saham harian dari
 * berbagai sekuritas (mis. Henan Putihrai, Mirae Asset, Indo Premier) dengan
 * mencantumkan SUMBER (teks, tanpa logo). Konten = riset pihak sekuritas;
 * kita atribusi + tautkan sumber, bukan klaim milik sendiri.
 *
 * Sumber tidak punya API publik → diisi via kurasi admin (superadmin) atau
 * fetcher per-sumber bila tersedia feed publik yang sah.
 */
export const securitiesPicks = pgTable(
  "securities_picks",
  {
    id: ulid(),
    pickDate: text("pick_date").notNull(), // YYYY-MM-DD
    securities: text("securities").notNull(), // nama sekuritas (sumber)
    kode: text("kode").notNull(),
    action: text("action"), // Buy / Trading Buy / Spec Buy / Buy on Weakness / Hold / Sell
    entryLow: real("entry_low"),
    entryHigh: real("entry_high"),
    support: real("support"),
    resistance: real("resistance"),
    target: real("target"),
    stopLoss: real("stop_loss"),
    rationale: text("rationale"),
    sourceUrl: text("source_url"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("securities_picks_uq").on(t.pickDate, t.securities, t.kode),
    index("securities_picks_date_idx").on(t.pickDate),
    index("securities_picks_kode_idx").on(t.kode),
  ],
);

export type SecuritiesPick = typeof securitiesPicks.$inferSelect;
export type NewSecuritiesPick = typeof securitiesPicks.$inferInsert;
