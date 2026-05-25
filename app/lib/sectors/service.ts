import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors } from "@/db/schema/reference";
import { cached, CACHE_TAGS, CACHE_TTL } from "@/lib/cache";

/**
 * Sector Heatmap service — aggregate metrics per sektor IDX (IDX-IC classification).
 *
 * Output cocok untuk:
 *   - Sector heatmap grid (color = perf, size = market cap weight)
 *   - Sector ranking table (sortable)
 *   - Drill-down to /screener?sector=X
 *
 * Performance: single query dengan correlated subquery untuk last close.
 * Cached 5 menit di caller level (force-dynamic page tetap fresh per request).
 */

export interface SectorMetrics {
  kode: string;
  nama: string;
  totalEmiten: number;
  totalMarketCapIdr: number;
  // Performance (weighted by market cap)
  avgReturn1d: number | null;
  avgReturn5d: number | null;
  avgReturn30d: number | null;
  avgReturnYtd: number | null;
  // Aggregate valuation
  avgPe: number | null;
  avgPbv: number | null;
  avgRoe: number | null;
  avgDividendYield: number | null;
  // Top movers in sector
  topGainerKode: string | null;
  topGainerChangePct: number | null;
  topLoserKode: string | null;
  topLoserChangePct: number | null;
}

async function getSectorMetricsRaw(): Promise<SectorMetrics[]> {
  // Per-emiten compute via single big query.
  // Subqueries: last close, 5d ago close, 30d ago close, ytd start close.
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const lastClose = sql<string>`(
    SELECT close FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
    ORDER BY ${quotesEod.tradeDate} DESC LIMIT 1
  )`;
  const prevClose = sql<string>`(
    SELECT close FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
    ORDER BY ${quotesEod.tradeDate} DESC OFFSET 1 LIMIT 1
  )`;
  const close5d = sql<string>`(
    SELECT close FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
    ORDER BY ${quotesEod.tradeDate} DESC OFFSET 5 LIMIT 1
  )`;
  const close30d = sql<string>`(
    SELECT close FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
    ORDER BY ${quotesEod.tradeDate} DESC OFFSET 30 LIMIT 1
  )`;
  const closeYtd = sql<string>`(
    SELECT close FROM ${quotesEod}
    WHERE ${quotesEod.companyKode} = ${companies.kode}
      AND ${quotesEod.tradeDate} <= ${yearStart}
    ORDER BY ${quotesEod.tradeDate} DESC LIMIT 1
  )`;

  const rows = await db
    .select({
      kode: companies.kode,
      sectorKode: companies.sectorKode,
      sectorName: sectors.namaId,
      marketCapIdr: companyFundamentals.marketCapIdr,
      peRatio: companyFundamentals.peRatioTrailing,
      pbvRatio: companyFundamentals.pbvRatio,
      roe: companyFundamentals.roe,
      dividendYield: companyFundamentals.dividendYield,
      lastClose,
      prevClose,
      close5d,
      close30d,
      closeYtd,
    })
    .from(companies)
    .leftJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .leftJoin(sectors, eq(sectors.kode, companies.sectorKode))
    .where(eq(companies.isActive, true));

  // Aggregate by sectorKode
  const groups = new Map<string, {
    nama: string;
    items: Array<{
      kode: string;
      marketCap: number | null;
      pe: number | null;
      pbv: number | null;
      roe: number | null;
      divYield: number | null;
      ret1d: number | null;
      ret5d: number | null;
      ret30d: number | null;
      retYtd: number | null;
    }>;
  }>();

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const pct = (curr: number | null, prev: number | null): number | null => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  for (const r of rows) {
    const last = num(r.lastClose);
    const item = {
      kode: r.kode,
      marketCap: num(r.marketCapIdr),
      pe: num(r.peRatio),
      pbv: num(r.pbvRatio),
      roe: num(r.roe),
      divYield: num(r.dividendYield),
      ret1d: pct(last, num(r.prevClose)),
      ret5d: pct(last, num(r.close5d)),
      ret30d: pct(last, num(r.close30d)),
      retYtd: pct(last, num(r.closeYtd)),
    };

    const sectorKode = r.sectorKode ?? "UNKNOWN";
    const sectorName = r.sectorName ?? "Belum Diklasifikasi";
    const g = groups.get(sectorKode) ?? { nama: sectorName, items: [] };
    g.items.push(item);
    groups.set(sectorKode, g);
  }

  const out: SectorMetrics[] = [];

  for (const [kode, g] of groups.entries()) {
    const items = g.items;

    // Market-cap weighted average for returns + valuation.
    const wAvg = (key: keyof (typeof items)[0]): number | null => {
      let sumVal = 0;
      let sumW = 0;
      for (const it of items) {
        const v = it[key] as number | null;
        const w = it.marketCap;
        if (v == null || w == null || w <= 0) continue;
        sumVal += v * w;
        sumW += w;
      }
      return sumW > 0 ? sumVal / sumW : null;
    };

    // Total market cap
    const totalMC = items.reduce((acc, it) => acc + (it.marketCap ?? 0), 0);

    // Top gainer / loser by 1d return
    const sortedByRet = items
      .filter((it) => it.ret1d != null)
      .sort((a, b) => (b.ret1d! - a.ret1d!));
    const topGainer = sortedByRet[0] ?? null;
    const topLoser = sortedByRet[sortedByRet.length - 1] ?? null;

    out.push({
      kode,
      nama: g.nama,
      totalEmiten: items.length,
      totalMarketCapIdr: totalMC,
      avgReturn1d: wAvg("ret1d"),
      avgReturn5d: wAvg("ret5d"),
      avgReturn30d: wAvg("ret30d"),
      avgReturnYtd: wAvg("retYtd"),
      avgPe: wAvg("pe"),
      avgPbv: wAvg("pbv"),
      avgRoe: wAvg("roe"),
      avgDividendYield: wAvg("divYield"),
      topGainerKode: topGainer?.kode ?? null,
      topGainerChangePct: topGainer?.ret1d ?? null,
      topLoserKode: topLoser?.kode ?? null,
      topLoserChangePct: topLoser?.ret1d ?? null,
    });
  }

  // Sort by total market cap desc.
  out.sort((a, b) => b.totalMarketCapIdr - a.totalMarketCapIdr);
  return out;
}

// Cached wrapper — refresh tiap 5 menit. Worker bisa invalidate manual via revalidateTag('sectors').
export const getSectorMetrics = cached(
  getSectorMetricsRaw,
  "getSectorMetrics",
  { revalidate: CACHE_TTL.sectorMetrics, tags: [CACHE_TAGS.sectors] },
);
