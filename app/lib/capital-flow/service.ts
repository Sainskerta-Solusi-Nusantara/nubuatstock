import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { cached, CACHE_TAGS, CACHE_TTL } from "@/lib/cache";

/**
 * Capital Flow Heatmap — track flow modal antar market cap bucket over time.
 *
 * Approach:
 *   - 4 buckets by market cap: Mega (>Rp100T), Large (10-100T), Mid (1-10T), Small (<1T)
 *   - Per hari last 30 trading days, compute weighted return per bucket = Σ (Δprice × volume × mc_weight)
 *   - Visualize sebagai stacked area chart (% allocation) atau scatter (return per bucket per hari)
 *
 * Interpretation:
 *   - Large outperforms small + bullish broad market → risk-on, growth-friendly
 *   - Small outperforms large → retail-driven momentum, late-cycle
 *   - All buckets weak → broad risk-off
 *   - Large up, Small down → flight to safety / defensive
 */

export type Bucket = "Mega" | "Large" | "Mid" | "Small";

const BUCKET_THRESHOLDS_IDR: Record<Bucket, [number, number]> = {
  Mega: [100_000_000_000_000, Number.MAX_SAFE_INTEGER], // > Rp100T
  Large: [10_000_000_000_000, 100_000_000_000_000], // Rp10-100T
  Mid: [1_000_000_000_000, 10_000_000_000_000], // Rp1-10T
  Small: [0, 1_000_000_000_000], // < Rp1T
};

export interface DailyFlowPoint {
  date: string;
  buckets: Record<Bucket, { weightedReturn: number; count: number; valueIdr: number }>;
}

export interface CapitalFlowSummary {
  // Series untuk chart: 30 days × 4 buckets
  series: DailyFlowPoint[];
  // Cumulative return 30d per bucket
  cumulativeReturns: Record<Bucket, number>;
  // Total emiten in each bucket
  totalEmitenByBucket: Record<Bucket, number>;
  // Total market cap di each bucket (current)
  totalMcByBucket: Record<Bucket, number>;
  // Rotation indicator: leader bucket sekarang
  currentLeader: Bucket;
  // Last 5 days direction
  trend: "risk_on" | "risk_off" | "rotation_to_small" | "rotation_to_large" | "mixed";
}

function classifyBucket(marketCapIdr: number): Bucket {
  if (marketCapIdr >= BUCKET_THRESHOLDS_IDR.Mega[0]) return "Mega";
  if (marketCapIdr >= BUCKET_THRESHOLDS_IDR.Large[0]) return "Large";
  if (marketCapIdr >= BUCKET_THRESHOLDS_IDR.Mid[0]) return "Mid";
  return "Small";
}

async function getCapitalFlowSummaryRaw(daysBack = 30): Promise<CapitalFlowSummary> {
  // Build company → bucket mapping with current market cap
  const companyRows = await db
    .select({
      kode: companies.kode,
      marketCap: companyFundamentals.marketCapIdr,
    })
    .from(companies)
    .innerJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .where(eq(companies.isActive, true));

  const bucketByKode = new Map<string, Bucket>();
  const totalEmitenByBucket: Record<Bucket, number> = { Mega: 0, Large: 0, Mid: 0, Small: 0 };
  const totalMcByBucket: Record<Bucket, number> = { Mega: 0, Large: 0, Mid: 0, Small: 0 };

  for (const c of companyRows) {
    const mc = Number(c.marketCap ?? 0);
    if (mc <= 0) continue;
    const bucket = classifyBucket(mc);
    bucketByKode.set(c.kode, bucket);
    totalEmitenByBucket[bucket] += 1;
    totalMcByBucket[bucket] += mc;
  }

  // Get OHLC for last N+1 days
  const cutoff = new Date(Date.now() - (daysBack + 2) * 86400000).toISOString().slice(0, 10);
  const allBars = await db
    .select({
      kode: quotesEod.companyKode,
      date: quotesEod.tradeDate,
      close: quotesEod.close,
      volume: quotesEod.volume,
      valueIdr: quotesEod.valueIdr,
    })
    .from(quotesEod)
    .where(gte(quotesEod.tradeDate, cutoff));

  // Group by kode
  const barsByKode = new Map<string, Array<{ date: string; close: number; valueIdr: number }>>();
  for (const r of allBars) {
    const arr = barsByKode.get(r.kode) ?? [];
    arr.push({
      date: r.date,
      close: Number(r.close),
      valueIdr: Number(r.valueIdr),
    });
    barsByKode.set(r.kode, arr);
  }

  // Sort each by date asc
  for (const arr of barsByKode.values()) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Build daily flow points
  const dailyPoints = new Map<string, DailyFlowPoint>();

  for (const [kode, bars] of barsByKode.entries()) {
    const bucket = bucketByKode.get(kode);
    if (!bucket) continue;

    for (let i = 1; i < bars.length; i += 1) {
      const cur = bars[i]!;
      const prev = bars[i - 1]!;
      if (prev.close <= 0) continue;
      const ret = (cur.close - prev.close) / prev.close;
      const point = dailyPoints.get(cur.date) ?? {
        date: cur.date,
        buckets: {
          Mega: { weightedReturn: 0, count: 0, valueIdr: 0 },
          Large: { weightedReturn: 0, count: 0, valueIdr: 0 },
          Mid: { weightedReturn: 0, count: 0, valueIdr: 0 },
          Small: { weightedReturn: 0, count: 0, valueIdr: 0 },
        },
      };
      // Weight by transaction value (proxy untuk "money flowing")
      const w = cur.valueIdr;
      point.buckets[bucket].weightedReturn += ret * w;
      point.buckets[bucket].count += 1;
      point.buckets[bucket].valueIdr += w;
      dailyPoints.set(cur.date, point);
    }
  }

  // Normalize: weightedReturn / totalValue per bucket per day
  const series: DailyFlowPoint[] = Array.from(dailyPoints.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-daysBack)
    .map((p) => {
      const normalized: DailyFlowPoint["buckets"] = {
        Mega: { weightedReturn: 0, count: p.buckets.Mega.count, valueIdr: p.buckets.Mega.valueIdr },
        Large: { weightedReturn: 0, count: p.buckets.Large.count, valueIdr: p.buckets.Large.valueIdr },
        Mid: { weightedReturn: 0, count: p.buckets.Mid.count, valueIdr: p.buckets.Mid.valueIdr },
        Small: { weightedReturn: 0, count: p.buckets.Small.count, valueIdr: p.buckets.Small.valueIdr },
      };
      for (const b of ["Mega", "Large", "Mid", "Small"] as const) {
        normalized[b].weightedReturn = p.buckets[b].valueIdr > 0
          ? (p.buckets[b].weightedReturn / p.buckets[b].valueIdr) * 100
          : 0;
      }
      return { date: p.date, buckets: normalized };
    });

  // Cumulative return per bucket
  const cumulativeReturns: Record<Bucket, number> = { Mega: 0, Large: 0, Mid: 0, Small: 0 };
  for (const b of ["Mega", "Large", "Mid", "Small"] as const) {
    let prod = 1;
    for (const p of series) {
      prod *= 1 + p.buckets[b].weightedReturn / 100;
    }
    cumulativeReturns[b] = (prod - 1) * 100;
  }

  // Current leader = bucket with highest 5d cumulative return
  const last5 = series.slice(-5);
  const cum5: Record<Bucket, number> = { Mega: 0, Large: 0, Mid: 0, Small: 0 };
  for (const b of ["Mega", "Large", "Mid", "Small"] as const) {
    let prod = 1;
    for (const p of last5) prod *= 1 + p.buckets[b].weightedReturn / 100;
    cum5[b] = (prod - 1) * 100;
  }
  const sortedBuckets = (["Mega", "Large", "Mid", "Small"] as Bucket[]).sort((a, b) => cum5[b] - cum5[a]);
  const currentLeader = sortedBuckets[0]!;

  // Trend classification (rough)
  const megaRet = cum5.Mega;
  const smallRet = cum5.Small;
  let trend: CapitalFlowSummary["trend"] = "mixed";
  if (megaRet > 1 && smallRet > 1) trend = "risk_on";
  else if (megaRet < -1 && smallRet < -1) trend = "risk_off";
  else if (smallRet > megaRet + 1.5) trend = "rotation_to_small";
  else if (megaRet > smallRet + 1.5) trend = "rotation_to_large";

  return {
    series,
    cumulativeReturns,
    totalEmitenByBucket,
    totalMcByBucket,
    currentLeader,
    trend,
  };
}

export const getCapitalFlowSummary = cached(
  getCapitalFlowSummaryRaw,
  "getCapitalFlowSummary",
  { revalidate: CACHE_TTL.capitalFlow, tags: [CACHE_TAGS.capitalFlow] },
);
