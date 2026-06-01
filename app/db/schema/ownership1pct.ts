import { bigint, index, integer, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * Data kepemilikan ≥1% per emiten (sumber: dashboard 1pct.klinikpenyesalan.com,
 * olahan dari laporan KSEI). UNTUK REVIEW di superadmin — dataset pembanding
 * dengan komposisi KSEI resmi (lihat schema `ksei.ts`).
 *
 * Dua tabel: ringkasan per emiten + daftar pemegang saham.
 */

export const ownership1pctEmiten = pgTable(
  "ownership_1pct_emiten",
  {
    id: ulid(),
    kode: text("kode").notNull(),
    issuerName: text("issuer_name").notNull().default(""),
    sector: text("sector"),
    industry: text("industry"),
    holderCount: integer("holder_count").notNull().default(0),
    pctSum: real("pct_sum").notNull().default(0), // total % dipegang holder ≥1%
    freeFloat: real("free_float").notNull().default(0), // 100 - pctSum
    cr1: real("cr1").notNull().default(0),
    cr3: real("cr3").notNull().default(0),
    hhi: real("hhi").notNull().default(0),
    ccs: real("ccs").notNull().default(0), // Composite Concentration Score
    ownershipType: text("ownership_type"),
    hasScripData: integer("has_scrip_data").notNull().default(0), // 0/1
    snapshotDate: text("snapshot_date"), // label posisi (mis. 2026-05-29)
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("ownership_1pct_emiten_kode_uq").on(t.kode),
    index("ownership_1pct_emiten_ff_idx").on(t.freeFloat),
    index("ownership_1pct_emiten_ccs_idx").on(t.ccs),
    index("ownership_1pct_emiten_sector_idx").on(t.sector),
  ],
);

export const ownership1pctHolder = pgTable(
  "ownership_1pct_holder",
  {
    id: ulid(),
    kode: text("kode").notNull(),
    investorName: text("investor_name").notNull().default(""),
    investorType: text("investor_type"),
    localForeign: text("local_foreign"), // D / F
    nationality: text("nationality"),
    domicile: text("domicile"),
    holdingsScripless: bigint("holdings_scripless", { mode: "number" }).notNull().default(0),
    holdingsScrip: bigint("holdings_scrip", { mode: "number" }).notNull().default(0),
    totalShares: bigint("total_shares", { mode: "number" }).notNull().default(0),
    percentage: real("percentage").notNull().default(0),
    rank: integer("rank").notNull().default(0),
    ...withTimestamps,
  },
  (t) => [
    index("ownership_1pct_holder_kode_idx").on(t.kode),
    index("ownership_1pct_holder_name_idx").on(t.investorName),
    index("ownership_1pct_holder_pct_idx").on(t.percentage),
  ],
);

export type Ownership1pctEmiten = typeof ownership1pctEmiten.$inferSelect;
export type Ownership1pctHolder = typeof ownership1pctHolder.$inferSelect;

/**
 * Data perubahan antar-periode (changelog) dari klinikpenyesalan — disimpan RAW
 * (jsonb) supaya semua data tersimpan dulu, pemetaan menyusul. Berisi:
 * changelog{new_stocks,removed_stocks,changes}, summary{topGainers,topLosers,
 * topHolders,topBoughtStocks,topSoldStocks}, newInvestorNames.
 */
export const ownership1pctChangelog = pgTable(
  "ownership_1pct_changelog",
  {
    id: ulid(),
    currentDate: text("current_date").notNull(),
    prevDate: text("prev_date"),
    raw: jsonbT<unknown>("raw").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [uniqueIndex("ownership_1pct_changelog_date_uq").on(t.currentDate)],
);
export type Ownership1pctChangelog = typeof ownership1pctChangelog.$inferSelect;
