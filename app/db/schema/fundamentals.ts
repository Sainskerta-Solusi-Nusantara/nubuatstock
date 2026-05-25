import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";
import { companies } from "./companies";

/**
 * Fundamentals snapshot per emiten — di-refresh oleh `scripts/enrich-companies.ts`
 * (default source: Yahoo Finance quoteSummary modules; bisa di-extend ke IDX
 * e-Reporting PDF parse di Tier Pro+).
 *
 * Semua numeric kolom store as PG `numeric` (no precision loss). Frontend convert
 * via Intl.NumberFormat saat display.
 *
 * Hanya 1 row aktif per emiten (UPSERT on company_kode). Historical snapshot
 * disimpan terpisah di `financial_statements_annual` (lihat di bawah).
 */
export const companyFundamentals = pgTable(
  "company_fundamentals",
  {
    id: ulid(),
    companyKode: text("company_kode")
      .notNull()
      .unique()
      .references(() => companies.kode, { onDelete: "cascade", onUpdate: "cascade" }),

    // ── Valuation ──
    marketCapIdr: numeric("market_cap_idr"),
    enterpriseValueIdr: numeric("enterprise_value_idr"),
    peRatioTrailing: numeric("pe_ratio_trailing"),
    peRatioForward: numeric("pe_ratio_forward"),
    pegRatio: numeric("peg_ratio"),
    pbvRatio: numeric("pbv_ratio"),
    psRatio: numeric("ps_ratio"),
    evEbitda: numeric("ev_ebitda"),

    // ── Profitability ──
    profitMargin: numeric("profit_margin"),
    operatingMargin: numeric("operating_margin"),
    grossMargin: numeric("gross_margin"),
    roe: numeric("roe"),
    roa: numeric("roa"),

    // ── Growth ──
    revenueGrowthYoy: numeric("revenue_growth_yoy"),
    earningsGrowthYoy: numeric("earnings_growth_yoy"),
    earningsGrowthQoq: numeric("earnings_growth_qoq"),

    // ── Financial health ──
    debtToEquity: numeric("debt_to_equity"),
    currentRatio: numeric("current_ratio"),
    quickRatio: numeric("quick_ratio"),
    totalCashIdr: numeric("total_cash_idr"),
    totalDebtIdr: numeric("total_debt_idr"),

    // ── Per share ──
    eps: numeric("eps"),
    bookValuePerShare: numeric("book_value_per_share"),
    dividendPerShareTtm: numeric("dividend_per_share_ttm"),
    dividendYield: numeric("dividend_yield"),
    payoutRatio: numeric("payout_ratio"),

    // ── Shares ──
    sharesOutstanding: bigint("shares_outstanding", { mode: "bigint" }),
    floatShares: bigint("float_shares", { mode: "bigint" }),
    insiderOwnPct: numeric("insider_own_pct"),
    institutionalOwnPct: numeric("institutional_own_pct"),
    sharesShort: bigint("shares_short", { mode: "bigint" }),

    // ── Trading ──
    beta: numeric("beta"),
    fiftyTwoWeekHigh: numeric("fifty_two_week_high"),
    fiftyTwoWeekLow: numeric("fifty_two_week_low"),
    fiftyDayAverage: numeric("fifty_day_average"),
    twoHundredDayAverage: numeric("two_hundred_day_average"),
    avgVolume3Mo: bigint("avg_volume_3mo", { mode: "bigint" }),
    avgVolume10Day: bigint("avg_volume_10day", { mode: "bigint" }),

    // ── Analyst consensus ──
    recommendationMean: numeric("recommendation_mean"),
    recommendationKey: text("recommendation_key"),
    targetMeanPrice: numeric("target_mean_price"),
    targetHighPrice: numeric("target_high_price"),
    targetLowPrice: numeric("target_low_price"),
    targetMedianPrice: numeric("target_median_price"),
    numberOfAnalysts: integer("number_of_analysts"),

    // ── Provenance ──
    source: text("source").notNull().default("yahoo_finance"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("company_fundamentals_kode_uq").on(t.companyKode),
    index("company_fundamentals_fetched_at_idx").on(t.fetchedAt),
  ],
);

/**
 * Snapshot laporan keuangan tahunan (annual). Yahoo Finance default return
 * 4 tahun terakhir. Per row = 1 fiscal year ending.
 */
export const financialStatementsAnnual = pgTable(
  "financial_statements_annual",
  {
    id: ulid(),
    companyKode: text("company_kode")
      .notNull()
      .references(() => companies.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    periodEnding: date("period_ending").notNull(),
    fiscalYear: integer("fiscal_year").notNull(),

    // Income statement
    totalRevenue: numeric("total_revenue"),
    costOfRevenue: numeric("cost_of_revenue"),
    grossProfit: numeric("gross_profit"),
    operatingExpense: numeric("operating_expense"),
    operatingIncome: numeric("operating_income"),
    netIncome: numeric("net_income"),
    ebit: numeric("ebit"),
    ebitda: numeric("ebitda"),
    eps: numeric("eps"),

    // Balance sheet
    totalAssets: numeric("total_assets"),
    totalCurrentAssets: numeric("total_current_assets"),
    cashAndEquivalents: numeric("cash_and_equivalents"),
    totalLiabilities: numeric("total_liabilities"),
    totalCurrentLiabilities: numeric("total_current_liabilities"),
    totalDebt: numeric("total_debt"),
    totalEquity: numeric("total_equity"),

    // Cash flow
    operatingCashflow: numeric("operating_cashflow"),
    investingCashflow: numeric("investing_cashflow"),
    financingCashflow: numeric("financing_cashflow"),
    freeCashflow: numeric("free_cashflow"),
    capitalExpenditures: numeric("capital_expenditures"),

    source: text("source").notNull().default("yahoo_finance"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("fs_annual_company_period_uq").on(t.companyKode, t.periodEnding),
    index("fs_annual_year_idx").on(t.companyKode, t.fiscalYear),
  ],
);

/**
 * Snapshot laporan keuangan kuartalan (last 4 quarters dari Yahoo).
 */
export const financialStatementsQuarterly = pgTable(
  "financial_statements_quarterly",
  {
    id: ulid(),
    companyKode: text("company_kode")
      .notNull()
      .references(() => companies.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    periodEnding: date("period_ending").notNull(),
    quarter: integer("quarter").notNull(), // 1-4
    fiscalYear: integer("fiscal_year").notNull(),

    totalRevenue: numeric("total_revenue"),
    grossProfit: numeric("gross_profit"),
    operatingIncome: numeric("operating_income"),
    netIncome: numeric("net_income"),
    ebitda: numeric("ebitda"),
    eps: numeric("eps"),

    totalAssets: numeric("total_assets"),
    totalLiabilities: numeric("total_liabilities"),
    totalEquity: numeric("total_equity"),

    operatingCashflow: numeric("operating_cashflow"),
    freeCashflow: numeric("free_cashflow"),

    source: text("source").notNull().default("yahoo_finance"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("fs_quarterly_company_period_uq").on(t.companyKode, t.periodEnding),
    index("fs_quarterly_yq_idx").on(t.companyKode, t.fiscalYear, t.quarter),
  ],
);

/**
 * Riwayat dividen — flat per pembayaran, bukan agregat tahunan.
 * (Annual aggregate bisa di-derive lewat materialized view.)
 */
export const dividendHistory = pgTable(
  "dividend_history",
  {
    id: ulid(),
    companyKode: text("company_kode")
      .notNull()
      .references(() => companies.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    paymentDate: date("payment_date"),
    exDate: date("ex_date"),
    cumDate: date("cum_date"),
    recordDate: date("record_date"),
    amountPerShare: numeric("amount_per_share").notNull(),
    currency: text("currency").notNull().default("IDR"),
    yieldOnExDate: numeric("yield_on_ex_date"),
    source: text("source").notNull().default("yahoo_finance"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("dividend_history_company_exdate_uq").on(t.companyKode, t.exDate),
    index("dividend_history_company_idx").on(t.companyKode),
    index("dividend_history_ex_date_idx").on(t.exDate),
  ],
);

/**
 * Pejabat / direksi perusahaan (officers) — dari Yahoo Finance assetProfile.companyOfficers.
 * Berguna untuk profile page.
 */
export const companyOfficers = pgTable(
  "company_officers",
  {
    id: ulid(),
    companyKode: text("company_kode")
      .notNull()
      .references(() => companies.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    name: text("name").notNull(),
    title: text("title"),
    age: integer("age"),
    yearOfBirth: integer("year_of_birth"),
    totalPayIdr: numeric("total_pay_idr"),
    exercisedValue: numeric("exercised_value"),
    unexercisedValue: numeric("unexercised_value"),
    source: text("source").notNull().default("yahoo_finance"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("officers_company_name_uq").on(t.companyKode, t.name),
    index("officers_company_idx").on(t.companyKode),
  ],
);

export type CompanyFundamentals = typeof companyFundamentals.$inferSelect;
export type NewCompanyFundamentals = typeof companyFundamentals.$inferInsert;
export type FinancialStatementAnnual = typeof financialStatementsAnnual.$inferSelect;
export type FinancialStatementQuarterly = typeof financialStatementsQuarterly.$inferSelect;
export type Dividend = typeof dividendHistory.$inferSelect;
export type CompanyOfficer = typeof companyOfficers.$inferSelect;
