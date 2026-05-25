#!/usr/bin/env tsx
/**
 * scripts/enrich-companies.ts
 *
 * Enrich seluruh `companies` di DB dengan data fundamental + profil dari Yahoo
 * Finance — sumber asli yang sama dipakai oleh banyak terminal saham (Yahoo
 * wraps IDX direct feed + uses public IDX e-Reporting financial statements).
 *
 * Per emiten, di-update:
 *   1. `companies.logo_url`     ← Yahoo logoUrl → Clearbit → Google Favicon (fallback)
 *   2. `companies.deskripsi`     ← assetProfile.longBusinessSummary
 *   3. `companies.website`       ← assetProfile.website
 *   4. `companies.sector_kode`   ← mapping Yahoo sector ke IDX-IC (kalau UNCLASSIFIED)
 *   5. `companies.market_cap_idr` & `shares_outstanding`
 *   6. `company_fundamentals`    ← PE, PBV, EPS, dividend yield, ROE, ROA, beta, dll
 *   7. `financial_statements_annual` ← 3-4 tahun terakhir income/balance/cashflow
 *   8. `financial_statements_quarterly` ← 4 kuartal terakhir
 *   9. `dividend_history`        ← Yahoo events.dividends
 *  10. `company_officers`        ← direksi (kalau ada di Yahoo)
 *
 * Source: query2.finance.yahoo.com/v10/finance/quoteSummary (public, free,
 * widely used by independent traders & dev tools — wraps the same IDX feed that
 * institutional vendors resell).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/enrich-companies.ts             # all active companies
 *   npx tsx --env-file=.env scripts/enrich-companies.ts BBRI BBCA   # specific tickers
 *   FORCE=1 npx tsx --env-file=.env scripts/enrich-companies.ts     # refetch even kalau fresh
 *
 * Behavior:
 *   - Throttle 800ms antar request (sequential + 1 retry × 2s backoff)
 *   - Stale check: skip kalau fundamentals.fetched_at < 24 jam yang lalu (override pakai FORCE=1)
 *   - Logging tiap 10 emiten, error per emiten di-log tapi tidak menghentikan batch
 *   - Total runtime ~12-15 menit untuk 980 emiten
 */

import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { companies } from "../db/schema/companies";
import {
  companyFundamentals,
  financialStatementsAnnual,
  financialStatementsQuarterly,
  dividendHistory,
  companyOfficers,
} from "../db/schema/fundamentals";

// yahoo-finance2 client — auto-handles crumb cookie + retry + rate limit
// (lebih reliable dari raw fetch yang sering kena HTTP 429).
import YahooFinance from "yahoo-finance2";
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] as never });

const MODULES = [
  "assetProfile",
  "summaryDetail",
  "defaultKeyStatistics",
  "financialData",
  "price",
  "incomeStatementHistory",
  "incomeStatementHistoryQuarterly",
  "balanceSheetHistory",
  "balanceSheetHistoryQuarterly",
  "cashflowStatementHistory",
  "cashflowStatementHistoryQuarterly",
] as const;

const THROTTLE_MS = 800;
const MAX_RETRIES = 2;
const STALE_HOURS = 24;
const FORCE = process.env.FORCE === "1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ────────────────────── Type helpers ────────────────────── */

interface YahooNumeric {
  raw?: number;
  fmt?: string;
  longFmt?: string;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && "raw" in (v as object)) {
    const r = (v as YahooNumeric).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
}

function bi(v: unknown): bigint | null {
  const n = num(v);
  if (n === null) return null;
  return BigInt(Math.round(n));
}

function epochToDate(v: unknown): Date | null {
  const n = num(v);
  if (n === null) return null;
  // Yahoo gives epoch seconds (or already a date object)
  return new Date((n < 1e12 ? n * 1000 : n));
}

function epochToDateStr(v: unknown): string | null {
  const d = epochToDate(v);
  return d ? d.toISOString().slice(0, 10) : null;
}

/* ────────────────────── Yahoo sector → IDX-IC ────────────────────── */

const SECTOR_MAP: Record<string, string> = {
  "financial services": "FINANCIALS",
  financials: "FINANCIALS",
  energy: "ENERGY",
  "basic materials": "BASIC_MATERIALS",
  industrials: "INDUSTRIALS",
  "consumer defensive": "CONSUMER_STAPLES",
  "consumer cyclical": "CONSUMER_CYCLICALS",
  "consumer discretionary": "CONSUMER_CYCLICALS",
  healthcare: "HEALTHCARE",
  "real estate": "PROPERTIES_REAL_ESTATE",
  technology: "TECHNOLOGY",
  "communication services": "INFRASTRUCTURES",
  utilities: "INFRASTRUCTURES",
};

function mapSector(yahooSector?: string): string | null {
  if (!yahooSector) return null;
  return SECTOR_MAP[yahooSector.toLowerCase()] ?? null;
}

/* ────────────────────── HTTP fetch ────────────────────── */

async function fetchQuoteSummary(ticker: string): Promise<Record<string, unknown> | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const data = await yf.quoteSummary(`${ticker}.JK`, {
        modules: [...MODULES] as never,
      });
      return data as unknown as Record<string, unknown>;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (/(Quote not found|HTTP 404|No fundamentals|Not Found)/i.test(msg)) {
        return null;
      }
      if (attempt > MAX_RETRIES) {
        logger.warn({ ticker, err: msg }, "Yahoo fetch failed");
        return null;
      }
      await sleep(2000 * attempt);
    }
  }
  return null;
}

async function fetchDividends(ticker: string): Promise<Array<{ exDate: string; amount: number }>> {
  try {
    const result = await yf.chart(`${ticker}.JK`, {
      period1: "2010-01-01",
      interval: "1d",
      events: "div",
    });
    const events = (result.events ?? {}) as { dividends?: Array<{ date: Date; amount: number }> };
    return (events.dividends ?? []).map((d) => ({
      exDate: (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().slice(0, 10),
      amount: d.amount,
    }));
  } catch {
    return [];
  }
}

/* ────────────────────── Logo strategy ────────────────────── */

async function resolveLogoUrl(opts: {
  yahooLogo?: string;
  website?: string;
  ticker: string;
}): Promise<string | null> {
  // Priority 1: Yahoo logoUrl (kadang tersedia untuk bluechip)
  if (opts.yahooLogo && opts.yahooLogo.startsWith("http")) return opts.yahooLogo;

  // Priority 2: Brandfetch CDN — kualitas logo lebih bagus dari Favicon (vector kalau ada,
  // PNG resolusi tinggi). Public CDN no-key untuk request basic.
  if (opts.website) {
    let domain: string;
    try {
      domain = new URL(opts.website).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }

    // Try Brandfetch CDN first
    try {
      const bfUrl = `https://cdn.brandfetch.io/${domain}/w/200/h/200`;
      const res = await fetch(bfUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (res.ok && (res.headers.get("content-type") ?? "").startsWith("image/")) return bfUrl;
    } catch {
      // continue
    }

    // Priority 3: Clearbit Logo API (free tier)
    try {
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      const res = await fetch(clearbitUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (res.ok) return clearbitUrl;
    } catch {
      // continue
    }

    // Priority 4: Google Favicon (always returns something, even generic globe)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  return null;
}

/* ────────────────────── Upsert per emiten ────────────────────── */

interface CompanyRow {
  kode: string;
  namaPerusahaan: string;
  website: string | null;
  sectorKode: string;
}

async function enrichOne(c: CompanyRow): Promise<{ ok: boolean; reason?: string }> {
  const data = await fetchQuoteSummary(c.kode);
  if (!data) return { ok: false, reason: "yahoo_404" };

  const profile = (data.assetProfile ?? {}) as Record<string, unknown>;
  const detail = (data.summaryDetail ?? {}) as Record<string, unknown>;
  const stats = (data.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const fin = (data.financialData ?? {}) as Record<string, unknown>;
  const price = (data.price ?? {}) as Record<string, unknown>;

  const yahooSector = profile.sector as string | undefined;
  const idxSectorMapped = mapSector(yahooSector);
  const website = (profile.website as string) || c.website || null;

  const logoUrl = await resolveLogoUrl({
    yahooLogo: profile.logo_url as string | undefined,
    website: website ?? undefined,
    ticker: c.kode,
  });

  // 1. UPDATE companies
  const companyUpdate: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (logoUrl) companyUpdate.logoUrl = logoUrl;
  const businessSummary = profile.longBusinessSummary as string | undefined;
  if (businessSummary) companyUpdate.deskripsi = businessSummary;
  if (website) companyUpdate.website = website;
  if (c.sectorKode === "UNCLASSIFIED" && idxSectorMapped) {
    companyUpdate.sectorKode = idxSectorMapped;
  }
  const marketCap = num(price.marketCap) ?? num(detail.marketCap);
  if (marketCap) companyUpdate.marketCapIdr = String(marketCap);
  const sharesOut = bi(stats.sharesOutstanding) ?? bi(price.sharesOutstanding);
  if (sharesOut) companyUpdate.sharesOutstanding = sharesOut;

  if (Object.keys(companyUpdate).length > 1) {
    await db.update(companies).set(companyUpdate).where(eq(companies.kode, c.kode));
  }

  // 2. UPSERT company_fundamentals
  const fundamentalsRow = {
    companyKode: c.kode,
    marketCapIdr: marketCap != null ? String(marketCap) : null,
    enterpriseValueIdr: numToStr(stats.enterpriseValue),
    peRatioTrailing: numToStr(detail.trailingPE) ?? numToStr(stats.trailingPE),
    peRatioForward: numToStr(detail.forwardPE) ?? numToStr(stats.forwardPE),
    pegRatio: numToStr(stats.pegRatio),
    pbvRatio: numToStr(stats.priceToBook),
    psRatio: numToStr(detail.priceToSalesTrailing12Months),
    evEbitda: numToStr(stats.enterpriseToEbitda),
    profitMargin: numToStr(fin.profitMargins) ?? numToStr(stats.profitMargins),
    operatingMargin: numToStr(fin.operatingMargins),
    grossMargin: numToStr(fin.grossMargins),
    roe: numToStr(fin.returnOnEquity),
    roa: numToStr(fin.returnOnAssets),
    revenueGrowthYoy: numToStr(fin.revenueGrowth),
    earningsGrowthYoy: numToStr(fin.earningsGrowth) ?? numToStr(stats.earningsQuarterlyGrowth),
    earningsGrowthQoq: numToStr(stats.earningsQuarterlyGrowth),
    debtToEquity: numToStr(fin.debtToEquity),
    currentRatio: numToStr(fin.currentRatio),
    quickRatio: numToStr(fin.quickRatio),
    totalCashIdr: numToStr(fin.totalCash),
    totalDebtIdr: numToStr(fin.totalDebt),
    eps: numToStr(stats.trailingEps) ?? numToStr(detail.trailingEps),
    bookValuePerShare: numToStr(stats.bookValue),
    dividendPerShareTtm: numToStr(detail.dividendRate) ?? numToStr(detail.trailingAnnualDividendRate),
    dividendYield: numToStr(detail.dividendYield) ?? numToStr(detail.trailingAnnualDividendYield),
    payoutRatio: numToStr(detail.payoutRatio),
    sharesOutstanding: sharesOut,
    floatShares: bi(stats.floatShares),
    insiderOwnPct: numToStr(stats.heldPercentInsiders),
    institutionalOwnPct: numToStr(stats.heldPercentInstitutions),
    sharesShort: bi(stats.sharesShort),
    beta: numToStr(detail.beta) ?? numToStr(stats.beta),
    fiftyTwoWeekHigh: numToStr(detail.fiftyTwoWeekHigh) ?? numToStr(stats["52WeekHigh"]),
    fiftyTwoWeekLow: numToStr(detail.fiftyTwoWeekLow) ?? numToStr(stats["52WeekLow"]),
    fiftyDayAverage: numToStr(detail.fiftyDayAverage),
    twoHundredDayAverage: numToStr(detail.twoHundredDayAverage),
    avgVolume3Mo: bi(detail.averageVolume),
    avgVolume10Day: bi(detail.averageDailyVolume10Day),
    recommendationMean: numToStr(fin.recommendationMean),
    recommendationKey: (fin.recommendationKey as string) ?? null,
    targetMeanPrice: numToStr(fin.targetMeanPrice),
    targetHighPrice: numToStr(fin.targetHighPrice),
    targetLowPrice: numToStr(fin.targetLowPrice),
    targetMedianPrice: numToStr(fin.targetMedianPrice),
    numberOfAnalysts: num(fin.numberOfAnalystOpinions) ?? null,
    source: "yahoo_finance",
    fetchedAt: new Date(),
  };

  await db
    .insert(companyFundamentals)
    .values(fundamentalsRow)
    .onConflictDoUpdate({
      target: companyFundamentals.companyKode,
      set: { ...fundamentalsRow, updatedAt: new Date() },
    });

  // 3. UPSERT financial_statements_annual
  const annualIs = ((data.incomeStatementHistory as Record<string, unknown>)?.incomeStatementHistory ?? []) as Array<Record<string, unknown>>;
  const annualBs = ((data.balanceSheetHistory as Record<string, unknown>)?.balanceSheetStatements ?? []) as Array<Record<string, unknown>>;
  const annualCf = ((data.cashflowStatementHistory as Record<string, unknown>)?.cashflowStatements ?? []) as Array<Record<string, unknown>>;

  for (let i = 0; i < annualIs.length; i++) {
    const is = annualIs[i] ?? {};
    const bs = annualBs[i] ?? {};
    const cf = annualCf[i] ?? {};
    const periodStr = epochToDateStr(is.endDate ?? bs.endDate ?? cf.endDate);
    if (!periodStr) continue;
    const periodEnding = new Date(periodStr);
    const fiscalYear = periodEnding.getUTCFullYear();
    const row = {
      companyKode: c.kode,
      periodEnding: periodStr,
      fiscalYear,
      totalRevenue: numToStr(is.totalRevenue),
      costOfRevenue: numToStr(is.costOfRevenue),
      grossProfit: numToStr(is.grossProfit),
      operatingExpense: numToStr(is.totalOperatingExpenses),
      operatingIncome: numToStr(is.operatingIncome),
      netIncome: numToStr(is.netIncome),
      ebit: numToStr(is.ebit),
      ebitda: null,
      eps: null,
      totalAssets: numToStr(bs.totalAssets),
      totalCurrentAssets: numToStr(bs.totalCurrentAssets),
      cashAndEquivalents: numToStr(bs.cash),
      totalLiabilities: numToStr(bs.totalLiab),
      totalCurrentLiabilities: numToStr(bs.totalCurrentLiabilities),
      totalDebt: numToStr(bs.longTermDebt),
      totalEquity: numToStr(bs.totalStockholderEquity),
      operatingCashflow: numToStr(cf.totalCashFromOperatingActivities),
      investingCashflow: numToStr(cf.totalCashflowsFromInvestingActivities),
      financingCashflow: numToStr(cf.totalCashFromFinancingActivities),
      freeCashflow: null,
      capitalExpenditures: numToStr(cf.capitalExpenditures),
      source: "yahoo_finance",
    };
    await db
      .insert(financialStatementsAnnual)
      .values(row)
      .onConflictDoUpdate({
        target: [financialStatementsAnnual.companyKode, financialStatementsAnnual.periodEnding],
        set: { ...row, updatedAt: new Date() },
      });
  }

  // 4. UPSERT financial_statements_quarterly
  const qIs = ((data.incomeStatementHistoryQuarterly as Record<string, unknown>)?.incomeStatementHistory ?? []) as Array<Record<string, unknown>>;
  const qBs = ((data.balanceSheetHistoryQuarterly as Record<string, unknown>)?.balanceSheetStatements ?? []) as Array<Record<string, unknown>>;
  const qCf = ((data.cashflowStatementHistoryQuarterly as Record<string, unknown>)?.cashflowStatements ?? []) as Array<Record<string, unknown>>;

  for (let i = 0; i < qIs.length; i++) {
    const is = qIs[i] ?? {};
    const bs = qBs[i] ?? {};
    const cf = qCf[i] ?? {};
    const periodStr = epochToDateStr(is.endDate ?? bs.endDate ?? cf.endDate);
    if (!periodStr) continue;
    const d = new Date(periodStr);
    const month = d.getUTCMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const fiscalYear = d.getUTCFullYear();
    const row = {
      companyKode: c.kode,
      periodEnding: periodStr,
      quarter,
      fiscalYear,
      totalRevenue: numToStr(is.totalRevenue),
      grossProfit: numToStr(is.grossProfit),
      operatingIncome: numToStr(is.operatingIncome),
      netIncome: numToStr(is.netIncome),
      ebitda: null,
      eps: null,
      totalAssets: numToStr(bs.totalAssets),
      totalLiabilities: numToStr(bs.totalLiab),
      totalEquity: numToStr(bs.totalStockholderEquity),
      operatingCashflow: numToStr(cf.totalCashFromOperatingActivities),
      freeCashflow: null,
      source: "yahoo_finance",
    };
    await db
      .insert(financialStatementsQuarterly)
      .values(row)
      .onConflictDoUpdate({
        target: [financialStatementsQuarterly.companyKode, financialStatementsQuarterly.periodEnding],
        set: { ...row, updatedAt: new Date() },
      });
  }

  // 5. UPSERT dividend_history (separate chart endpoint — optional, di-skip kalau SKIP_DIV=1)
  const divs = process.env.SKIP_DIV === "1" ? [] : await fetchDividends(c.kode);
  for (const d of divs) {
    await db
      .insert(dividendHistory)
      .values({
        companyKode: c.kode,
        exDate: d.exDate,
        amountPerShare: String(d.amount),
        currency: "IDR",
        source: "yahoo_finance",
      })
      .onConflictDoNothing({ target: [dividendHistory.companyKode, dividendHistory.exDate] });
  }

  // 6. UPSERT company_officers
  const officers = (profile.companyOfficers ?? []) as Array<Record<string, unknown>>;
  for (const o of officers) {
    if (!o.name) continue;
    await db
      .insert(companyOfficers)
      .values({
        companyKode: c.kode,
        name: String(o.name),
        title: (o.title as string) ?? null,
        age: num(o.age),
        yearOfBirth: num(o.yearBorn),
        totalPayIdr: numToStr(o.totalPay),
        exercisedValue: numToStr(o.exercisedValue),
        unexercisedValue: numToStr(o.unexercisedValue),
        source: "yahoo_finance",
      })
      .onConflictDoNothing({ target: [companyOfficers.companyKode, companyOfficers.name] });
  }

  return { ok: true };
}

function numToStr(v: unknown): string | null {
  const n = num(v);
  return n == null ? null : String(n);
}

/* ────────────────────── Main loop ────────────────────── */

async function main() {
  const argTickers = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((s) => s.toUpperCase());

  let targetCompanies: CompanyRow[];

  const baseSelect = db
    .select({
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      website: companies.website,
      sectorKode: companies.sectorKode,
    })
    .from(companies);

  if (argTickers.length > 0) {
    targetCompanies = await baseSelect.where(inArray(companies.kode, argTickers));
  } else if (!FORCE) {
    // Only those not yet enriched or stale > 24h
    targetCompanies = await db
      .select({
        kode: companies.kode,
        namaPerusahaan: companies.namaPerusahaan,
        website: companies.website,
        sectorKode: companies.sectorKode,
      })
      .from(companies)
      .leftJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
      .where(
        and(
          eq(companies.isActive, true),
          sql`(${companyFundamentals.fetchedAt} IS NULL OR ${companyFundamentals.fetchedAt} < NOW() - INTERVAL '${sql.raw(String(STALE_HOURS))} hours')`,
        ),
      );
  } else {
    targetCompanies = await baseSelect.where(eq(companies.isActive, true));
  }

  logger.info({ count: targetCompanies.length, force: FORCE }, "Starting enrichment");
  const startedAt = Date.now();
  let okCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < targetCompanies.length; i++) {
    const c = targetCompanies[i]!;
    try {
      const result = await enrichOne(c);
      if (result.ok) okCount++;
      else {
        if (result.reason === "yahoo_404") skippedCount++;
        else failCount++;
      }
    } catch (err) {
      failCount++;
      logger.error({ ticker: c.kode, err: (err as Error).message }, "Enrich failed");
    }

    if ((i + 1) % 10 === 0 || i === targetCompanies.length - 1) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      logger.info(
        {
          progress: `${i + 1}/${targetCompanies.length}`,
          ok: okCount,
          notFound: skippedCount,
          failed: failCount,
          elapsedSec: elapsed,
        },
        "Progress",
      );
    }

    await sleep(THROTTLE_MS);
  }

  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  logger.info({ ok: okCount, notFound: skippedCount, failed: failCount, totalSec }, "Enrichment complete");
  console.log(
    `\n✓ Enriched ${okCount}/${targetCompanies.length} emiten (${skippedCount} tidak ada di Yahoo, ${failCount} error) dalam ${totalSec}s\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Fatal");
  process.exit(1);
});
