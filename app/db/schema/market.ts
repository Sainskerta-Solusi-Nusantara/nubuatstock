import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";

/**
 * Market Data — quotes (EoD & intraday), broker summary, foreign flow.
 *
 * TimescaleDB note:
 * - `quotes_eod`, `quotes_intraday`, `foreign_flow_intraday` di-convert ke hypertable
 *   via raw SQL block dalam migration (lihat MARKET_HYPERTABLE_SQL di bawah).
 * - Drizzle tidak mendukung hypertable DDL native, jadi pakai post-migration SQL hook.
 * - Composite PK include partition column (`trade_date` / `ts`) supaya kompatibel
 *   dengan TimescaleDB constraint (semua UK harus include partition key).
 *
 * FK convention:
 * - Time-series tables FK ke `companies.kode` (unique text column), bukan ULID id.
 *   Alasan: query bandarmology selalu by ticker code, dan reference value lebih
 *   terbaca di log/audit. `kode` punya unique index di tabel companies.
 */

// ============================== quotes_eod ==============================

/**
 * `quotes_eod` — End-of-day OHLCV per company per trading date.
 *
 * Hypertable on `trade_date`, chunk 1 month. Composite PK (company_kode, trade_date).
 */
export const quotesEod = pgTable(
  "quotes_eod",
  {
    tradeDate: date("trade_date", { mode: "string" }).notNull(),
    companyKode: text("company_kode").notNull(),
    open: numeric("open", { precision: 18, scale: 4 }).notNull(),
    high: numeric("high", { precision: 18, scale: 4 }).notNull(),
    low: numeric("low", { precision: 18, scale: 4 }).notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
    volume: bigint("volume", { mode: "bigint" }).notNull(),
    valueIdr: numeric("value_idr", { precision: 24, scale: 2 }).notNull(),
    frequency: integer("frequency").notNull().default(0),
    vwap: numeric("vwap", { precision: 18, scale: 4 }),
    prevClose: numeric("prev_close", { precision: 18, scale: 4 }),
    ...withTimestamps,
  },
  (t) => [
    primaryKey({ columns: [t.companyKode, t.tradeDate] }),
    index("quotes_eod_company_date_idx").on(t.companyKode, t.tradeDate),
    index("quotes_eod_date_idx").on(t.tradeDate),
  ],
);

// ============================== quotes_intraday ==============================

/**
 * `quotes_intraday` — tick / snapshot intraday. Retention 30 hari (policy SQL).
 *
 * Hypertable on `ts`, chunk 1 day.
 */
export const quotesIntraday = pgTable(
  "quotes_intraday",
  {
    ts: timestamp("ts", { withTimezone: true, mode: "date" }).notNull(),
    companyKode: text("company_kode").notNull(),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    volume: bigint("volume", { mode: "bigint" }).notNull().default(sql`0`),
    bid: numeric("bid", { precision: 18, scale: 4 }),
    ask: numeric("ask", { precision: 18, scale: 4 }),
    bidVolume: bigint("bid_volume", { mode: "bigint" }),
    askVolume: bigint("ask_volume", { mode: "bigint" }),
  },
  (t) => [
    primaryKey({ columns: [t.companyKode, t.ts] }),
    index("quotes_intraday_company_ts_idx").on(t.companyKode, t.ts),
    index("quotes_intraday_ts_idx").on(t.ts),
  ],
);

// ============================== brokers ==============================

/**
 * `brokers` — referensi anggota bursa (broker code 2 huruf IDX, e.g., YP, PD, MG).
 *
 * Kategori: foreign | domestic | local — dipakai untuk agregasi foreign flow yang
 * sumber datanya per-broker (kalau vendor menyediakan flag asing/lokal).
 */
export const brokers = pgTable(
  "brokers",
  {
    kode: text("kode").primaryKey().notNull(),
    nama: text("nama").notNull(),
    kategori: text("kategori").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    index("brokers_kategori_idx").on(t.kategori),
    index("brokers_active_idx").on(t.isActive),
  ],
);

// ============================== broker_summary_daily ==============================

/**
 * `broker_summary_daily` — agregat aktivitas broker per emiten per hari.
 *
 * `side`: buy | sell | both — kalau vendor pisahkan, simpan 2 baris (buy & sell);
 * kalau vendor agregat satu baris dengan flag `both`, gunakan `net_value_idr`.
 */
export const brokerSummaryDaily = pgTable(
  "broker_summary_daily",
  {
    id: ulid(),
    tradeDate: date("trade_date", { mode: "string" }).notNull(),
    companyKode: text("company_kode").notNull(),
    brokerCode: text("broker_code")
      .notNull()
      .references(() => brokers.kode, { onDelete: "restrict", onUpdate: "cascade" }),
    brokerName: text("broker_name").notNull(),
    side: text("side").notNull(),
    volume: bigint("volume", { mode: "bigint" }).notNull().default(sql`0`),
    valueIdr: numeric("value_idr", { precision: 24, scale: 2 }).notNull().default("0"),
    avgPrice: numeric("avg_price", { precision: 18, scale: 4 }),
    netValueIdr: numeric("net_value_idr", { precision: 24, scale: 2 }),
    ...withTimestamps,
  },
  (t) => [
    index("broker_summary_company_date_broker_idx").on(t.companyKode, t.tradeDate, t.brokerCode),
    index("broker_summary_date_idx").on(t.tradeDate),
    uniqueIndex("broker_summary_uq").on(t.companyKode, t.tradeDate, t.brokerCode, t.side),
  ],
);

// ============================== foreign_flow_daily ==============================

/**
 * `foreign_flow_daily` — net foreign per emiten per hari.
 *
 * `net_value` = `foreign_buy_value` - `foreign_sell_value` (positive = inflow).
 */
export const foreignFlowDaily = pgTable(
  "foreign_flow_daily",
  {
    id: ulid(),
    tradeDate: date("trade_date", { mode: "string" }).notNull(),
    companyKode: text("company_kode").notNull(),
    foreignBuyValue: numeric("foreign_buy_value", { precision: 24, scale: 2 }).notNull().default("0"),
    foreignSellValue: numeric("foreign_sell_value", { precision: 24, scale: 2 }).notNull().default("0"),
    netValue: numeric("net_value", { precision: 24, scale: 2 }).notNull().default("0"),
    foreignBuyVolume: bigint("foreign_buy_volume", { mode: "bigint" }).notNull().default(sql`0`),
    foreignSellVolume: bigint("foreign_sell_volume", { mode: "bigint" }).notNull().default(sql`0`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("foreign_flow_daily_uq").on(t.tradeDate, t.companyKode),
    index("foreign_flow_daily_company_idx").on(t.companyKode, t.tradeDate),
  ],
);

// ============================== foreign_flow_intraday ==============================

/**
 * `foreign_flow_intraday` — granular foreign flow (tier-gated di service layer).
 *
 * Hypertable on `ts`, chunk 1 day. Composite PK include `ts` untuk constraint.
 * `granularity`: "5m" | "15m" | "1h" (validated di Zod).
 */
export const foreignFlowIntraday = pgTable(
  "foreign_flow_intraday",
  {
    ts: timestamp("ts", { withTimezone: true, mode: "date" }).notNull(),
    companyKode: text("company_kode").notNull(),
    granularity: text("granularity").notNull(),
    netValue: numeric("net_value", { precision: 24, scale: 2 }).notNull().default("0"),
    foreignBuyValue: numeric("foreign_buy_value", { precision: 24, scale: 2 }).notNull().default("0"),
    foreignSellValue: numeric("foreign_sell_value", { precision: 24, scale: 2 }).notNull().default("0"),
  },
  (t) => [
    primaryKey({ columns: [t.companyKode, t.granularity, t.ts] }),
    index("foreign_flow_intraday_company_ts_idx").on(t.companyKode, t.ts),
    index("foreign_flow_intraday_gran_idx").on(t.granularity, t.ts),
  ],
);

// ============================== TimescaleDB DDL ==============================

/**
 * Raw SQL untuk convert tabel time-series ke TimescaleDB hypertable + retention policy.
 *
 * Dijalankan oleh migration custom (lihat db/migrate.ts atau db/migrations/* post hook).
 * Idempotent: pakai `if_not_exists => true`.
 */
export const MARKET_HYPERTABLE_SQL = `
-- Convert quotes_eod ke hypertable on trade_date (chunk 1 bulan).
SELECT create_hypertable(
  'quotes_eod',
  'trade_date',
  chunk_time_interval => INTERVAL '1 month',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Convert quotes_intraday ke hypertable on ts (chunk 1 hari).
SELECT create_hypertable(
  'quotes_intraday',
  'ts',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Retention policy 30 hari untuk intraday.
SELECT add_retention_policy('quotes_intraday', INTERVAL '30 days', if_not_exists => TRUE);

-- Convert foreign_flow_intraday ke hypertable on ts (chunk 1 hari).
SELECT create_hypertable(
  'foreign_flow_intraday',
  'ts',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Retention 90 hari untuk foreign flow intraday (granular data tier Pro+ saja).
SELECT add_retention_policy('foreign_flow_intraday', INTERVAL '90 days', if_not_exists => TRUE);
`;

// ============================== Drizzle inferred types ==============================

export type QuoteEod = typeof quotesEod.$inferSelect;
export type NewQuoteEod = typeof quotesEod.$inferInsert;

export type QuoteIntraday = typeof quotesIntraday.$inferSelect;
export type NewQuoteIntraday = typeof quotesIntraday.$inferInsert;

export type Broker = typeof brokers.$inferSelect;
export type NewBroker = typeof brokers.$inferInsert;

export type BrokerSummaryDaily = typeof brokerSummaryDaily.$inferSelect;
export type NewBrokerSummaryDaily = typeof brokerSummaryDaily.$inferInsert;

export type ForeignFlowDaily = typeof foreignFlowDaily.$inferSelect;
export type NewForeignFlowDaily = typeof foreignFlowDaily.$inferInsert;

export type ForeignFlowIntraday = typeof foreignFlowIntraday.$inferSelect;
export type NewForeignFlowIntraday = typeof foreignFlowIntraday.$inferInsert;
