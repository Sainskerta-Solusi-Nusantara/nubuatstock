import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors } from "@/db/schema/reference";
import { newsArticleTickers, newsArticles } from "@/db/schema/news";
import { computeVerdict, type VerdictResult } from "@/lib/verdict/service";

/**
 * Compare service — fetch parallel data untuk 2-4 ticker, di-bundle ke shape
 * yang nyaman buat side-by-side UI.
 *
 * Performance: data fetch parallel (Promise.all), verdict compute juga parallel.
 * 4 ticker × verdict (~150ms each) → total ~150ms karena paralel.
 */

export interface CompareTickerData {
  kode: string;
  found: boolean;
  namaPerusahaan: string | null;
  logoUrl: string | null;
  sectorName: string | null;
  isSyariah: boolean;
  // Price + change
  lastClose: number | null;
  changePct1d: number | null;
  changePct5d: number | null;
  changePct30d: number | null;
  changePctYtd: number | null;
  // Fundamentals
  marketCapIdr: number | null;
  peRatio: number | null;
  pbvRatio: number | null;
  roe: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  revenueGrowthYoy: number | null;
  earningsGrowthYoy: number | null;
  beta: number | null;
  // Range
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  // Verdict
  verdict: VerdictResult | null;
  // News count last 30d
  newsCount30d: number;
  bullishCount30d: number;
  bearishCount30d: number;
  // Price series for chart overlay (1y, normalized)
  priceSeries: Array<{ date: string; close: number }>;
}

function pct(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

async function fetchOneTicker(kode: string): Promise<CompareTickerData> {
  const k = kode.toUpperCase();
  const base: CompareTickerData = {
    kode: k,
    found: false,
    namaPerusahaan: null,
    logoUrl: null,
    sectorName: null,
    isSyariah: false,
    lastClose: null,
    changePct1d: null,
    changePct5d: null,
    changePct30d: null,
    changePctYtd: null,
    marketCapIdr: null,
    peRatio: null,
    pbvRatio: null,
    roe: null,
    dividendYield: null,
    profitMargin: null,
    debtToEquity: null,
    revenueGrowthYoy: null,
    earningsGrowthYoy: null,
    beta: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    verdict: null,
    newsCount30d: 0,
    bullishCount30d: 0,
    bearishCount30d: 0,
    priceSeries: [],
  };

  const [companyRow] = await db
    .select({
      kode: companies.kode,
      nama: companies.namaPerusahaan,
      logo: companies.logoUrl,
      sectorName: sectors.namaId,
      isSyariah: companies.isSyariah,
    })
    .from(companies)
    .leftJoin(sectors, eq(sectors.kode, companies.sectorKode))
    .where(eq(companies.kode, k))
    .limit(1);

  if (!companyRow) return base;
  base.found = true;
  base.namaPerusahaan = companyRow.nama;
  base.logoUrl = companyRow.logo;
  base.sectorName = companyRow.sectorName;
  base.isSyariah = companyRow.isSyariah;

  // Parallel fetches
  const [bars, fundRow, newsAgg, verdict] = await Promise.all([
    // 250 EOD bars
    db
      .select({
        date: quotesEod.tradeDate,
        close: quotesEod.close,
      })
      .from(quotesEod)
      .where(eq(quotesEod.companyKode, k))
      .orderBy(desc(quotesEod.tradeDate))
      .limit(250),
    // Fundamentals snapshot
    db
      .select()
      .from(companyFundamentals)
      .where(eq(companyFundamentals.companyKode, k))
      .limit(1)
      .then((r) => r[0]),
    // News aggregation 30d
    db
      .select({
        sentiment: newsArticles.sentiment,
        n: sql<number>`count(*)::int`,
      })
      .from(newsArticleTickers)
      .innerJoin(newsArticles, eq(newsArticles.id, newsArticleTickers.articleId))
      .where(
        and(
          eq(newsArticleTickers.companyKode, k),
          gte(newsArticles.publishedAt, new Date(Date.now() - 30 * 86400000)),
        ),
      )
      .groupBy(newsArticles.sentiment),
    // Verdict compute
    computeVerdict(k),
  ]);

  // Process bars
  const reversed = bars.slice().reverse();
  base.priceSeries = reversed.map((b) => ({
    date: b.date,
    close: Number(b.close),
  }));

  if (reversed.length > 0) {
    const last = Number(reversed[reversed.length - 1]!.close);
    base.lastClose = last;
    const prev1 = reversed.length > 1 ? Number(reversed[reversed.length - 2]!.close) : null;
    const prev5 = reversed.length > 5 ? Number(reversed[reversed.length - 6]!.close) : null;
    const prev30 = reversed.length > 30 ? Number(reversed[reversed.length - 31]!.close) : null;
    base.changePct1d = pct(last, prev1);
    base.changePct5d = pct(last, prev5);
    base.changePct30d = pct(last, prev30);

    // YTD: first close di tahun ini
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const firstThisYear = reversed.find((b) => b.date >= yearStart);
    if (firstThisYear) {
      base.changePctYtd = pct(last, Number(firstThisYear.close));
    }
  }

  // Fundamentals
  if (fundRow) {
    base.marketCapIdr = fundRow.marketCapIdr ? Number(fundRow.marketCapIdr) : null;
    base.peRatio = fundRow.peRatioTrailing ? Number(fundRow.peRatioTrailing) : null;
    base.pbvRatio = fundRow.pbvRatio ? Number(fundRow.pbvRatio) : null;
    base.roe = fundRow.roe ? Number(fundRow.roe) : null;
    base.dividendYield = fundRow.dividendYield ? Number(fundRow.dividendYield) : null;
    base.profitMargin = fundRow.profitMargin ? Number(fundRow.profitMargin) : null;
    base.debtToEquity = fundRow.debtToEquity ? Number(fundRow.debtToEquity) : null;
    base.revenueGrowthYoy = fundRow.revenueGrowthYoy ? Number(fundRow.revenueGrowthYoy) : null;
    base.earningsGrowthYoy = fundRow.earningsGrowthYoy ? Number(fundRow.earningsGrowthYoy) : null;
    base.beta = fundRow.beta ? Number(fundRow.beta) : null;
    base.fiftyTwoWeekHigh = fundRow.fiftyTwoWeekHigh ? Number(fundRow.fiftyTwoWeekHigh) : null;
    base.fiftyTwoWeekLow = fundRow.fiftyTwoWeekLow ? Number(fundRow.fiftyTwoWeekLow) : null;
  }

  // News
  for (const n of newsAgg) {
    base.newsCount30d += n.n;
    if (n.sentiment === "bullish") base.bullishCount30d = n.n;
    if (n.sentiment === "bearish") base.bearishCount30d = n.n;
  }

  base.verdict = verdict;

  return base;
}

export async function compareTickers(kodes: string[]): Promise<CompareTickerData[]> {
  const clean = Array.from(new Set(kodes.map((k) => k.toUpperCase().trim()).filter(Boolean))).slice(0, 4);
  if (clean.length === 0) return [];
  return Promise.all(clean.map(fetchOneTicker));
}
