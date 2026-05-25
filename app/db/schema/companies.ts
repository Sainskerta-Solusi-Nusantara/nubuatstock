import {
  bigint,
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { softDelete, ulid, withTimestamps } from "./_base";
import { indices, papanListing, sectors, subSectors } from "./reference";

/**
 * `companies` — emiten IDX.
 *
 * - PK ULID untuk konsistensi internal; ticker disimpan di `kode` (unique).
 * - FK soft references ke reference data (papan, sectors, sub_sectors) — text→text.
 * - `marketCapIdr` & `freeFloatPct` boleh null; di-update oleh Market Data service (Agent 5).
 * - `isSyariah` di-flag via constituency JII / ISSI di `index_constituents`; field di sini
 *   adalah cache fast-lookup yang di-refresh on rebalancing.
 */
export const companies = pgTable(
  "companies",
  {
    id: ulid(),
    kode: text("kode").notNull().unique(),
    namaPerusahaan: text("nama_perusahaan").notNull(),
    papanKode: text("papan_kode")
      .notNull()
      .references(() => papanListing.kode, { onDelete: "restrict", onUpdate: "cascade" }),
    sectorKode: text("sector_kode")
      .notNull()
      .references(() => sectors.kode, { onDelete: "restrict", onUpdate: "cascade" }),
    subSectorKode: text("sub_sector_kode").references(() => subSectors.kode, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    tanggalIpo: date("tanggal_ipo", { mode: "string" }),
    sharesOutstanding: bigint("shares_outstanding", { mode: "bigint" }),
    marketCapIdr: numeric("market_cap_idr", { precision: 24, scale: 2 }),
    freeFloatPct: numeric("free_float_pct", { precision: 6, scale: 3 }),
    isActive: boolean("is_active").notNull().default(true),
    isSyariah: boolean("is_syariah").notNull().default(false),
    website: text("website"),
    logoUrl: text("logo_url"),
    deskripsi: text("deskripsi"),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("companies_kode_uq").on(t.kode),
    index("companies_sector_idx").on(t.sectorKode),
    index("companies_papan_idx").on(t.papanKode),
    index("companies_sub_sector_idx").on(t.subSectorKode),
    index("companies_active_idx").on(t.isActive),
    index("companies_syariah_idx").on(t.isSyariah),
  ],
);

/**
 * `index_constituents` — many-to-many companies × indices dengan periode efektif.
 *
 * - `effectiveTo` null = current member.
 * - Unique (index, company, effective_from) memastikan tidak ada duplicate insert
 *   pada rebalancing snapshot yang sama.
 */
export const indexConstituents = pgTable(
  "index_constituents",
  {
    id: ulid(),
    indexKode: text("index_kode")
      .notNull()
      .references(() => indices.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    companyKode: text("company_kode").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    weightPct: numeric("weight_pct", { precision: 8, scale: 5 }),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("index_constituents_uq").on(t.indexKode, t.companyKode, t.effectiveFrom),
    index("index_constituents_index_idx").on(t.indexKode),
    index("index_constituents_company_idx").on(t.companyKode),
    index("index_constituents_current_idx").on(t.indexKode, t.effectiveTo),
  ],
);

/**
 * `corporate_actions` — log aksi korporasi (dividend, split, RI, bonus, merger, dll).
 *
 * - `actionType` di-validasi via Zod enum di lib/types/companies.ts (text di DB untuk extensibility).
 * - `ratio` punya makna berbeda per action type (split 1:2 → "0.5", bonus 1:4 → "4", dll).
 *   Konvensi: simpan rasio sebagai numeric "newShares/oldShares".
 */
export const corporateActions = pgTable(
  "corporate_actions",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    actionType: text("action_type").notNull(),
    announcementDate: date("announcement_date", { mode: "string" }),
    exDate: date("ex_date", { mode: "string" }),
    recordDate: date("record_date", { mode: "string" }),
    paymentDate: date("payment_date", { mode: "string" }),
    ratio: numeric("ratio", { precision: 18, scale: 6 }),
    price: numeric("price", { precision: 18, scale: 4 }),
    description: text("description"),
    sourceUrl: text("source_url"),
    ...withTimestamps,
  },
  (t) => [
    index("corp_actions_company_idx").on(t.companyKode),
    index("corp_actions_type_idx").on(t.actionType),
    index("corp_actions_ex_date_idx").on(t.exDate),
    index("corp_actions_company_type_idx").on(t.companyKode, t.actionType),
  ],
);

/**
 * `dividends` — distribusi dividen, extends corporate_actions data dengan field spesifik.
 *
 * - `period` format: "FY2025" atau "Q1-2026" atau "INTERIM-2026".
 * - `dpr` (Dividend Payout Ratio) opsional; di-compute oleh Market Data dari laporan keuangan.
 */
export const dividends = pgTable(
  "dividends",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    period: text("period").notNull(),
    cumDate: date("cum_date", { mode: "string" }),
    exDate: date("ex_date", { mode: "string" }),
    recordingDate: date("recording_date", { mode: "string" }),
    paymentDate: date("payment_date", { mode: "string" }),
    dpr: numeric("dpr", { precision: 8, scale: 4 }),
    dividendPerShareIdr: numeric("dividend_per_share_idr", { precision: 18, scale: 4 }).notNull(),
    totalDividendIdr: numeric("total_dividend_idr", { precision: 24, scale: 2 }),
    ...withTimestamps,
  },
  (t) => [
    index("dividends_company_idx").on(t.companyKode),
    index("dividends_ex_date_idx").on(t.exDate),
    uniqueIndex("dividends_company_period_uq").on(t.companyKode, t.period),
  ],
);

/**
 * `shareholders_5pct` — laporan kepemilikan ≥5% (sumber: KSEI snapshot bulanan & e-Reporting OJK).
 *
 * - Snapshot, bukan time-series penuh. `reportDate` = tanggal cut-off laporan.
 * - `holderType` enum: institutional|individual|government|foreign|domestic
 *   (validasi di Zod, text di DB untuk extensibility).
 */
export const shareholders5pct = pgTable(
  "shareholders_5pct",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    holderName: text("holder_name").notNull(),
    holderType: text("holder_type").notNull(),
    sharesOwned: bigint("shares_owned", { mode: "bigint" }).notNull(),
    ownershipPct: numeric("ownership_pct", { precision: 8, scale: 4 }).notNull(),
    reportDate: date("report_date", { mode: "string" }).notNull(),
    ...withTimestamps,
  },
  (t) => [
    index("shareholders_company_idx").on(t.companyKode),
    index("shareholders_report_date_idx").on(t.reportDate),
    uniqueIndex("shareholders_snapshot_uq").on(t.companyKode, t.holderName, t.reportDate),
  ],
);

/**
 * `financial_statements_meta` — pointer ke laporan keuangan emiten.
 *
 * - Tidak menyimpan angka detail (itu di-fetch live oleh Agent 5 atau di tabel terpisah);
 *   meta ini hanya pointer ke source URL (IDX e-Reporting / OJK).
 */
export const financialStatementsMeta = pgTable(
  "financial_statements_meta",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    period: text("period").notNull(),
    periodType: text("period_type").notNull(),
    isAudited: boolean("is_audited").notNull().default(false),
    filedAt: timestamp("filed_at", { withTimezone: true, mode: "date" }),
    sourceUrl: text("source_url"),
    ...withTimestamps,
  },
  (t) => [
    index("fs_meta_company_idx").on(t.companyKode),
    uniqueIndex("fs_meta_company_period_uq").on(t.companyKode, t.period, t.periodType),
  ],
);

// =================== Drizzle inferred types ===================

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type IndexConstituent = typeof indexConstituents.$inferSelect;
export type NewIndexConstituent = typeof indexConstituents.$inferInsert;

export type CorporateAction = typeof corporateActions.$inferSelect;
export type NewCorporateAction = typeof corporateActions.$inferInsert;

export type Dividend = typeof dividends.$inferSelect;
export type NewDividend = typeof dividends.$inferInsert;

export type Shareholder5pct = typeof shareholders5pct.$inferSelect;
export type NewShareholder5pct = typeof shareholders5pct.$inferInsert;

export type FinancialStatementMeta = typeof financialStatementsMeta.$inferSelect;
export type NewFinancialStatementMeta = typeof financialStatementsMeta.$inferInsert;
