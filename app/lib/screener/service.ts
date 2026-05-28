import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors, subSectors, papanListing } from "@/db/schema/reference";
import { technicalSnapshots } from "@/db/schema/technical";

/**
 * Screener service — query universe IDX by fundamental + reference filters.
 *
 * Architecture:
 * - Filters dibangun ke array `SQL.and(...conditions)`.
 * - Last close diambil via correlated subquery (latest trade_date per kode). Kalau tidak
 *   ada quote (emiten baru / fresh IPO), tetap muncul tapi `lastClose = null`.
 * - Sort options: market cap (default), PE, PBV, ROE, dividend yield, momentum (52w pos).
 * - Pagination via limit/offset.
 *
 * Sumber data fundamental: Yahoo Finance enrichment (lihat scripts/enrich-companies.ts).
 * Beberapa emiten ZERO data (kalau Yahoo tidak punya coverage); UI tampilkan "—".
 */

export type SortField =
  | "market_cap"
  | "pe"
  | "pbv"
  | "roe"
  | "dividend_yield"
  | "revenue_growth"
  | "stoch_k"
  | "rsi"
  | "kode";

export interface ScreenerFilters {
  // Reference
  sectorKode?: string;
  subSectorKode?: string;
  papanKode?: string;
  isSyariah?: boolean;
  search?: string; // matches kode OR nama_perusahaan

  // Valuation
  minMarketCap?: number;
  maxMarketCap?: number;
  minPe?: number;
  maxPe?: number;
  minPbv?: number;
  maxPbv?: number;

  // Profitability
  minRoe?: number; // 0-1 (15% = 0.15)
  minProfitMargin?: number;

  // Growth
  minRevenueGrowth?: number;

  // Financial health
  maxDebtToEquity?: number;
  minCurrentRatio?: number;

  // Income
  minDividendYield?: number;

  // Trading
  minAvgVolume3Mo?: number;

  // ===== Technical Filters (require technical_snapshots) =====
  // Momentum: Stochastic 10,5,5 (Swing Santai favorite)
  minStochK_10_5_5?: number;
  maxStochK_10_5_5?: number;
  /** True kalau %K > %D (momentum up) */
  stochBullishCross_10_5_5?: boolean;
  // Stochastic 14,3,3
  minStochK_14_3_3?: number;
  maxStochK_14_3_3?: number;
  // Stochastic 5,3,3
  minStochK_5_3_3?: number;
  maxStochK_5_3_3?: number;
  // RSI 14
  minRsi14?: number;
  maxRsi14?: number;
  // MACD
  macdAboveZero?: boolean;
  macdHistogramTurningUp?: boolean;
  macdHistogramTurningDown?: boolean;
  // MFI 14
  minMfi14?: number;
  maxMfi14?: number;
  // Trend state flags
  isAboveSma20?: boolean;
  isAboveSma50?: boolean;
  isAboveSma200?: boolean;
  isBullishMaStack?: boolean;
  isBearishMaStack?: boolean;
  isGoldenCrossRecent?: boolean;
  isDeathCrossRecent?: boolean;
  // Volatility
  isBbSqueeze?: boolean;
  minAtr14?: number;
  maxAtr14?: number;
  // Volume
  minVolumeRatio?: number; // volume_ratio_5d_vs_60d
  // ADX trend strength
  minAdx?: number;
  // 52-week proximity
  maxDistFrom52wHighPct?: number; // close to high
  maxDistFrom52wLowPct?: number; // close to low

  // Sort / paginate
  sort?: SortField;
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ScreenerRow {
  kode: string;
  namaPerusahaan: string;
  logoUrl: string | null;
  sectorKode: string | null;
  sectorName: string | null;
  papanKode: string | null;
  isSyariah: boolean;
  lastClose: number | null;
  changePct1d: number | null;
  marketCapIdr: number | null;
  peRatio: number | null;
  pbvRatio: number | null;
  roe: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
  revenueGrowthYoy: number | null;
  avgVolume3Mo: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  // Technical snapshot fields (may be null kalau snapshot belum dihitung)
  stochK_10_5_5: number | null;
  rsi14: number | null;
  isBullishMaStack: boolean;
  isBbSqueeze: boolean;
}

export interface ScreenerResult {
  rows: ScreenerRow[];
  total: number;
  filtersApplied: number;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const big = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function runScreener(filters: ScreenerFilters): Promise<ScreenerResult> {
  const conds: ReturnType<typeof eq>[] = [eq(companies.isActive, true)];
  let filtersApplied = 0;

  if (filters.sectorKode) {
    conds.push(eq(companies.sectorKode, filters.sectorKode));
    filtersApplied += 1;
  }
  if (filters.subSectorKode) {
    conds.push(eq(companies.subSectorKode, filters.subSectorKode));
    filtersApplied += 1;
  }
  if (filters.papanKode) {
    conds.push(eq(companies.papanKode, filters.papanKode));
    filtersApplied += 1;
  }
  if (filters.isSyariah) {
    conds.push(eq(companies.isSyariah, true));
    filtersApplied += 1;
  }
  if (filters.search) {
    const s = `%${filters.search.trim()}%`;
    conds.push(
      sql`(${companies.kode} ILIKE ${s} OR ${companies.namaPerusahaan} ILIKE ${s})`,
    );
    filtersApplied += 1;
  }

  if (filters.minMarketCap != null) {
    conds.push(gte(companyFundamentals.marketCapIdr, String(filters.minMarketCap)));
    filtersApplied += 1;
  }
  if (filters.maxMarketCap != null) {
    conds.push(lte(companyFundamentals.marketCapIdr, String(filters.maxMarketCap)));
    filtersApplied += 1;
  }
  if (filters.minPe != null) {
    conds.push(gte(companyFundamentals.peRatioTrailing, String(filters.minPe)));
    filtersApplied += 1;
  }
  if (filters.maxPe != null) {
    conds.push(lte(companyFundamentals.peRatioTrailing, String(filters.maxPe)));
    conds.push(sql`${companyFundamentals.peRatioTrailing} > 0`);
    filtersApplied += 1;
  }
  if (filters.minPbv != null) {
    conds.push(gte(companyFundamentals.pbvRatio, String(filters.minPbv)));
    filtersApplied += 1;
  }
  if (filters.maxPbv != null) {
    conds.push(lte(companyFundamentals.pbvRatio, String(filters.maxPbv)));
    filtersApplied += 1;
  }
  if (filters.minRoe != null) {
    conds.push(gte(companyFundamentals.roe, String(filters.minRoe)));
    filtersApplied += 1;
  }
  if (filters.minProfitMargin != null) {
    conds.push(gte(companyFundamentals.profitMargin, String(filters.minProfitMargin)));
    filtersApplied += 1;
  }
  if (filters.minRevenueGrowth != null) {
    conds.push(gte(companyFundamentals.revenueGrowthYoy, String(filters.minRevenueGrowth)));
    filtersApplied += 1;
  }
  if (filters.maxDebtToEquity != null) {
    conds.push(lte(companyFundamentals.debtToEquity, String(filters.maxDebtToEquity)));
    filtersApplied += 1;
  }
  if (filters.minCurrentRatio != null) {
    conds.push(gte(companyFundamentals.currentRatio, String(filters.minCurrentRatio)));
    filtersApplied += 1;
  }
  if (filters.minDividendYield != null) {
    conds.push(gte(companyFundamentals.dividendYield, String(filters.minDividendYield)));
    filtersApplied += 1;
  }
  if (filters.minAvgVolume3Mo != null) {
    conds.push(gte(companyFundamentals.avgVolume3Mo, BigInt(filters.minAvgVolume3Mo)));
    filtersApplied += 1;
  }

  // ===== Technical filters =====
  if (filters.minStochK_10_5_5 != null) {
    conds.push(gte(technicalSnapshots.stochK_10_5_5, String(filters.minStochK_10_5_5)));
    filtersApplied += 1;
  }
  if (filters.maxStochK_10_5_5 != null) {
    conds.push(lte(technicalSnapshots.stochK_10_5_5, String(filters.maxStochK_10_5_5)));
    filtersApplied += 1;
  }
  if (filters.stochBullishCross_10_5_5) {
    conds.push(sql`${technicalSnapshots.stochK_10_5_5} > ${technicalSnapshots.stochD_10_5_5}`);
    filtersApplied += 1;
  }
  if (filters.minStochK_14_3_3 != null) {
    conds.push(gte(technicalSnapshots.stochK_14_3_3, String(filters.minStochK_14_3_3)));
    filtersApplied += 1;
  }
  if (filters.maxStochK_14_3_3 != null) {
    conds.push(lte(technicalSnapshots.stochK_14_3_3, String(filters.maxStochK_14_3_3)));
    filtersApplied += 1;
  }
  if (filters.minStochK_5_3_3 != null) {
    conds.push(gte(technicalSnapshots.stochK_5_3_3, String(filters.minStochK_5_3_3)));
    filtersApplied += 1;
  }
  if (filters.maxStochK_5_3_3 != null) {
    conds.push(lte(technicalSnapshots.stochK_5_3_3, String(filters.maxStochK_5_3_3)));
    filtersApplied += 1;
  }
  if (filters.minRsi14 != null) {
    conds.push(gte(technicalSnapshots.rsi14, String(filters.minRsi14)));
    filtersApplied += 1;
  }
  if (filters.maxRsi14 != null) {
    conds.push(lte(technicalSnapshots.rsi14, String(filters.maxRsi14)));
    filtersApplied += 1;
  }
  if (filters.macdAboveZero) {
    conds.push(sql`${technicalSnapshots.macdLine} > 0`);
    filtersApplied += 1;
  }
  if (filters.macdHistogramTurningUp) {
    conds.push(eq(technicalSnapshots.macdHistogramTurningUp, true));
    filtersApplied += 1;
  }
  if (filters.macdHistogramTurningDown) {
    conds.push(eq(technicalSnapshots.macdHistogramTurningDown, true));
    filtersApplied += 1;
  }
  if (filters.minMfi14 != null) {
    conds.push(gte(technicalSnapshots.mfi14, String(filters.minMfi14)));
    filtersApplied += 1;
  }
  if (filters.maxMfi14 != null) {
    conds.push(lte(technicalSnapshots.mfi14, String(filters.maxMfi14)));
    filtersApplied += 1;
  }
  if (filters.isAboveSma20) {
    conds.push(eq(technicalSnapshots.isAboveSma20, true));
    filtersApplied += 1;
  }
  if (filters.isAboveSma50) {
    conds.push(eq(technicalSnapshots.isAboveSma50, true));
    filtersApplied += 1;
  }
  if (filters.isAboveSma200) {
    conds.push(eq(technicalSnapshots.isAboveSma200, true));
    filtersApplied += 1;
  }
  if (filters.isBullishMaStack) {
    conds.push(eq(technicalSnapshots.isBullishMaStack, true));
    filtersApplied += 1;
  }
  if (filters.isBearishMaStack) {
    conds.push(eq(technicalSnapshots.isBearishMaStack, true));
    filtersApplied += 1;
  }
  if (filters.isGoldenCrossRecent) {
    conds.push(eq(technicalSnapshots.isGoldenCrossRecent, true));
    filtersApplied += 1;
  }
  if (filters.isDeathCrossRecent) {
    conds.push(eq(technicalSnapshots.isDeathCrossRecent, true));
    filtersApplied += 1;
  }
  if (filters.isBbSqueeze) {
    conds.push(eq(technicalSnapshots.isBbSqueeze, true));
    filtersApplied += 1;
  }
  if (filters.minAtr14 != null) {
    conds.push(gte(technicalSnapshots.atr14, String(filters.minAtr14)));
    filtersApplied += 1;
  }
  if (filters.maxAtr14 != null) {
    conds.push(lte(technicalSnapshots.atr14, String(filters.maxAtr14)));
    filtersApplied += 1;
  }
  if (filters.minVolumeRatio != null) {
    conds.push(gte(technicalSnapshots.volumeRatio5dVs60d, String(filters.minVolumeRatio)));
    filtersApplied += 1;
  }
  if (filters.minAdx != null) {
    conds.push(gte(technicalSnapshots.adx14, String(filters.minAdx)));
    filtersApplied += 1;
  }
  if (filters.maxDistFrom52wHighPct != null) {
    conds.push(lte(technicalSnapshots.distFrom52wHighPct, String(filters.maxDistFrom52wHighPct)));
    filtersApplied += 1;
  }
  if (filters.maxDistFrom52wLowPct != null) {
    conds.push(lte(technicalSnapshots.distFrom52wLowPct, String(filters.maxDistFrom52wLowPct)));
    filtersApplied += 1;
  }

  const where = and(...conds);

  // Sort mapping
  const sortField = filters.sort ?? "market_cap";
  // Normalize sortDir defensively — value originates from query string.
  const sortDir: "asc" | "desc" = filters.sortDir === "asc" ? "asc" : "desc";
  const dir = sortDir === "asc" ? asc : desc;
  const orderBy = (() => {
    switch (sortField) {
      case "pe":
        return dir(companyFundamentals.peRatioTrailing);
      case "pbv":
        return dir(companyFundamentals.pbvRatio);
      case "roe":
        return dir(companyFundamentals.roe);
      case "dividend_yield":
        return dir(companyFundamentals.dividendYield);
      case "revenue_growth":
        return dir(companyFundamentals.revenueGrowthYoy);
      case "stoch_k":
        // NULLS LAST so emiten tanpa snapshot tidak menyumbat top hasil
        return sql`${technicalSnapshots.stochK_10_5_5} ${sql.raw(sortDir)} NULLS LAST`;
      case "rsi":
        return sql`${technicalSnapshots.rsi14} ${sql.raw(sortDir)} NULLS LAST`;
      case "kode":
        return dir(companies.kode);
      case "market_cap":
      default:
        return dir(companyFundamentals.marketCapIdr);
    }
  })();

  // Latest close subquery — most recent EOD per kode
  const latestCloseSub = sql<string>`(
    SELECT close
    FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
    ORDER BY ${quotesEod.tradeDate} DESC
    LIMIT 1
  )`;
  const prevCloseSub = sql<string>`(
    SELECT close
    FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
    ORDER BY ${quotesEod.tradeDate} DESC
    OFFSET 1 LIMIT 1
  )`;

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);

  // Total count
  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(companies)
    .leftJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .leftJoin(technicalSnapshots, eq(technicalSnapshots.companyKode, companies.kode))
    .where(where);
  const total = totalRows[0]?.total ?? 0;

  // Page rows
  const rows = await db
    .select({
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      logoUrl: companies.logoUrl,
      sectorKode: companies.sectorKode,
      sectorName: sectors.namaId,
      papanKode: companies.papanKode,
      isSyariah: companies.isSyariah,
      lastClose: latestCloseSub,
      prevClose: prevCloseSub,
      marketCapIdr: companyFundamentals.marketCapIdr,
      peRatio: companyFundamentals.peRatioTrailing,
      pbvRatio: companyFundamentals.pbvRatio,
      roe: companyFundamentals.roe,
      debtToEquity: companyFundamentals.debtToEquity,
      dividendYield: companyFundamentals.dividendYield,
      profitMargin: companyFundamentals.profitMargin,
      revenueGrowthYoy: companyFundamentals.revenueGrowthYoy,
      avgVolume3Mo: companyFundamentals.avgVolume3Mo,
      fiftyTwoWeekHigh: companyFundamentals.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: companyFundamentals.fiftyTwoWeekLow,
      // Technical fields (kalau ada di snapshot)
      stochK_10_5_5: technicalSnapshots.stochK_10_5_5,
      rsi14: technicalSnapshots.rsi14,
      isBullishMaStack: technicalSnapshots.isBullishMaStack,
      isBbSqueeze: technicalSnapshots.isBbSqueeze,
    })
    .from(companies)
    .leftJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .leftJoin(technicalSnapshots, eq(technicalSnapshots.companyKode, companies.kode))
    .leftJoin(sectors, eq(sectors.kode, companies.sectorKode))
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const mapped: ScreenerRow[] = rows.map((r) => {
    const last = num(r.lastClose);
    const prev = num(r.prevClose);
    const changePct = last != null && prev != null && prev !== 0 ? ((last - prev) / prev) * 100 : null;
    return {
      kode: r.kode,
      namaPerusahaan: r.namaPerusahaan,
      logoUrl: r.logoUrl,
      sectorKode: r.sectorKode,
      sectorName: r.sectorName,
      papanKode: r.papanKode,
      isSyariah: r.isSyariah,
      lastClose: last,
      changePct1d: changePct,
      marketCapIdr: num(r.marketCapIdr),
      peRatio: num(r.peRatio),
      pbvRatio: num(r.pbvRatio),
      roe: num(r.roe),
      debtToEquity: num(r.debtToEquity),
      dividendYield: num(r.dividendYield),
      profitMargin: num(r.profitMargin),
      revenueGrowthYoy: num(r.revenueGrowthYoy),
      avgVolume3Mo: big(r.avgVolume3Mo),
      fiftyTwoWeekHigh: num(r.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(r.fiftyTwoWeekLow),
      stochK_10_5_5: num(r.stochK_10_5_5),
      rsi14: num(r.rsi14),
      isBullishMaStack: r.isBullishMaStack ?? false,
      isBbSqueeze: r.isBbSqueeze ?? false,
    };
  });

  return { rows: mapped, total, filtersApplied };
}

export async function listSectors(): Promise<Array<{ kode: string; nama: string }>> {
  const rows = await db
    .select({ kode: sectors.kode, nama: sectors.namaId })
    .from(sectors)
    .orderBy(asc(sectors.namaId));
  return rows;
}

export async function listPapan(): Promise<Array<{ kode: string; nama: string }>> {
  const rows = await db
    .select({ kode: papanListing.kode, nama: papanListing.nama })
    .from(papanListing)
    .orderBy(asc(papanListing.kode));
  return rows;
}
