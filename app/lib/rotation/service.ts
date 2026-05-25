import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors } from "@/db/schema/reference";
import { cached, CACHE_TAGS, CACHE_TTL } from "@/lib/cache";

/**
 * Relative Rotation Graph (RRG) — 4-quadrant rotation chart.
 *
 * Setiap entity (sektor atau emiten) di-plot:
 *   x-axis: JdK RS-Ratio (relative strength vs benchmark, normalized 100)
 *   y-axis: JdK RS-Momentum (rate of change of RS-Ratio, normalized 100)
 *
 * Quadrants:
 *   Leading (upper-right):     RS > 100 AND momentum > 100 — outperforming + still accelerating
 *   Weakening (lower-right):   RS > 100 AND momentum < 100 — outperforming but losing momentum
 *   Lagging (lower-left):      RS < 100 AND momentum < 100 — underperforming + decelerating
 *   Improving (upper-left):    RS < 100 AND momentum > 100 — underperforming but gaining momentum
 *
 * Typical rotation flow (clockwise): Improving → Leading → Weakening → Lagging → Improving
 *
 * Benchmark: weighted-average market return (IHSG proxy via mcap-weighted sectors)
 *
 * Implementation notes:
 *   - Simplified JdK formula: use 14-bar relative strength + 5-bar momentum
 *   - Output trail: last 6 weeks (3 weekly points by default — visualize rotation)
 */

export type Quadrant = "Leading" | "Weakening" | "Lagging" | "Improving";

export interface RotationPoint {
  date: string;
  rsRatio: number; // normalized 100
  rsMomentum: number; // normalized 100
  quadrant: Quadrant;
}

export interface RotationEntity {
  kode: string;
  name: string;
  logoUrl?: string | null;
  marketCapIdr?: number | null;
  trail: RotationPoint[];
  currentQuadrant: Quadrant;
  currentRs: number;
  currentMomentum: number;
}

/** Compute % returns array dari close prices. */
function returnsArray(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    out.push((closes[i]! - closes[i - 1]!) / closes[i - 1]!);
  }
  return out;
}

/** Cumulative return over last N bars. */
function cumReturn(closes: number[], lookback: number): number {
  if (closes.length < lookback + 1) return 0;
  const start = closes[closes.length - 1 - lookback]!;
  const end = closes[closes.length - 1]!;
  return (end - start) / start;
}

function classify(rs: number, mom: number): Quadrant {
  if (rs >= 100 && mom >= 100) return "Leading";
  if (rs >= 100 && mom < 100) return "Weakening";
  if (rs < 100 && mom < 100) return "Lagging";
  return "Improving";
}

/**
 * Compute RRG-style metrics untuk entity vs benchmark.
 *
 * @param entityCloses chronological close array
 * @param benchmarkCloses chronological close array (same dates aligned)
 * @returns trail of N points (last N weeks)
 */
function computeTrail(
  entityCloses: number[],
  benchmarkCloses: number[],
  pointsBack = 5,
  stepBars = 5,
): RotationPoint[] {
  const trail: RotationPoint[] = [];
  if (entityCloses.length !== benchmarkCloses.length || entityCloses.length < 30) return trail;

  // RS-Ratio: cumulative relative return normalized to 100 at start of window
  // Compute at each step
  const minBars = 25; // need enough for momentum
  const end = entityCloses.length - 1;
  const points: number[] = [];
  for (let i = pointsBack; i >= 0; i -= 1) {
    points.push(end - i * stepBars);
  }
  // Compute RS ratio at each point relative to start-of-trail
  const startIdx = points[0]!;
  if (startIdx < minBars) return trail;

  for (const idx of points) {
    if (idx < minBars) continue;
    // RS-Ratio: weighted cum return of entity vs benchmark over lookback 14
    const entRet = (entityCloses[idx]! - entityCloses[idx - 14]!) / entityCloses[idx - 14]!;
    const benRet = (benchmarkCloses[idx]! - benchmarkCloses[idx - 14]!) / benchmarkCloses[idx - 14]!;
    const rsRatio = 100 * (1 + (entRet - benRet));

    // RS-Momentum: change in RS-Ratio over last 5 bars
    let rsMomentum = 100;
    if (idx >= minBars + 5) {
      const entRetPrev = (entityCloses[idx - 5]! - entityCloses[idx - 19]!) / entityCloses[idx - 19]!;
      const benRetPrev = (benchmarkCloses[idx - 5]! - benchmarkCloses[idx - 19]!) / benchmarkCloses[idx - 19]!;
      const rsPrev = 100 * (1 + (entRetPrev - benRetPrev));
      rsMomentum = 100 * (1 + (rsRatio - rsPrev) / 100);
    }

    trail.push({
      date: `bar-${idx}`, // Simplified; could map to actual date if needed
      rsRatio,
      rsMomentum,
      quadrant: classify(rsRatio, rsMomentum),
    });
  }
  return trail;
}

interface Bar {
  date: string;
  close: number;
}

async function getEntityCloses(kode: string, days = 60): Promise<Bar[]> {
  const rows = await db
    .select({ date: quotesEod.tradeDate, close: quotesEod.close })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, kode))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(days);
  return rows.slice().reverse().map((r) => ({ date: r.date, close: Number(r.close) }));
}

/**
 * Bulk fetch close prices untuk multiple emiten in single SQL query (eliminate N+1).
 * Returns Map kode → Bar[] chronological.
 */
async function getBulkEntityCloses(kodes: string[], days = 60): Promise<Map<string, Bar[]>> {
  if (kodes.length === 0) return new Map();

  // Fetch all records, kemudian filter "latest N per kode" di JS (Postgres ROW_NUMBER bisa tapi pricier).
  // Strategy: fetch N+1 hari (calendar) ke belakang dengan WHERE date >= cutoff, lalu trim per kode.
  const calendarDaysToFetch = Math.ceil(days * 1.5); // 1.5x untuk safety (weekend gaps)
  const cutoff = new Date(Date.now() - calendarDaysToFetch * 86400000).toISOString().slice(0, 10);

  const rows = await db
    .select({
      kode: quotesEod.companyKode,
      date: quotesEod.tradeDate,
      close: quotesEod.close,
    })
    .from(quotesEod)
    .where(
      sql`${quotesEod.companyKode} IN (${sql.join(kodes.map((k) => sql`${k}`), sql`, `)}) AND ${quotesEod.tradeDate} >= ${cutoff}`,
    )
    .orderBy(quotesEod.companyKode, quotesEod.tradeDate);

  const byKode = new Map<string, Bar[]>();
  for (const r of rows) {
    const arr = byKode.get(r.kode) ?? [];
    arr.push({ date: r.date, close: Number(r.close) });
    byKode.set(r.kode, arr);
  }
  // Trim each to last `days` bars (chronological, sorted asc)
  for (const [kode, bars] of byKode.entries()) {
    if (bars.length > days) {
      byKode.set(kode, bars.slice(-days));
    }
  }
  return byKode;
}

/**
 * Compute synthetic IHSG benchmark dari weighted average of top market cap emiten.
 * In production, use actual IHSG index data; for MVP this proxy works.
 */
async function getBenchmarkCloses(days = 60): Promise<Bar[]> {
  // Get top 30 emiten by market cap
  const topCompanies = await db
    .select({ kode: companies.kode, marketCap: companyFundamentals.marketCapIdr })
    .from(companies)
    .innerJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .where(eq(companies.isActive, true))
    .orderBy(desc(companyFundamentals.marketCapIdr))
    .limit(30);

  const totalMC = topCompanies.reduce((acc, c) => acc + Number(c.marketCap ?? 0), 0);
  if (totalMC === 0) return [];

  // BULK fetch — 1 query instead of 30
  const closesByKode = await getBulkEntityCloses(topCompanies.map((c) => c.kode), days);

  const dateMap = new Map<string, { totalWeighted: number; totalWeight: number }>();
  for (const c of topCompanies) {
    const bars = closesByKode.get(c.kode);
    if (!bars || bars.length === 0) continue;
    const weight = Number(c.marketCap ?? 0) / totalMC;
    const base = bars[0]!.close;
    for (const b of bars) {
      const normVal = (b.close / base) * 100;
      const cur = dateMap.get(b.date) ?? { totalWeighted: 0, totalWeight: 0 };
      cur.totalWeighted += normVal * weight;
      cur.totalWeight += weight;
      dateMap.set(b.date, cur);
    }
  }

  const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([date, v]) => ({
    date,
    close: v.totalWeight > 0 ? v.totalWeighted / v.totalWeight : 100,
  }));
}

/** Get rotation chart untuk semua sektor (data per sektor di-aggregate dari emitennya). */
async function getSectorRotationRaw(): Promise<RotationEntity[]> {
  const allSectors = await db
    .select({ kode: sectors.kode, nama: sectors.namaId })
    .from(sectors);

  const benchmark = await getBenchmarkCloses();
  if (benchmark.length < 30) return [];
  const benchMap = new Map(benchmark.map((b) => [b.date, b.close]));

  // Bulk fetch top 5 emiten per sector dengan 1 query (CTE-style approach):
  // Simple: get all sector candidates, batch fetch closes once.
  const sectorTopRows = await db
    .select({
      sectorKode: companies.sectorKode,
      kode: companies.kode,
      marketCap: companyFundamentals.marketCapIdr,
    })
    .from(companies)
    .leftJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .where(eq(companies.isActive, true))
    .orderBy(companies.sectorKode, desc(companyFundamentals.marketCapIdr));

  // Group + take top 5 per sector
  const top5PerSector = new Map<string, Array<{ kode: string; marketCap: number }>>();
  for (const r of sectorTopRows) {
    if (!r.sectorKode) continue;
    const arr = top5PerSector.get(r.sectorKode) ?? [];
    if (arr.length < 5 && r.marketCap != null) {
      arr.push({ kode: r.kode, marketCap: Number(r.marketCap) });
      top5PerSector.set(r.sectorKode, arr);
    }
  }

  // Collect ALL unique kodes across sectors → ONE bulk close fetch
  const allKodes = Array.from(new Set(Array.from(top5PerSector.values()).flat().map((c) => c.kode)));
  const closesByKode = await getBulkEntityCloses(allKodes);

  const out: RotationEntity[] = [];
  for (const s of allSectors) {
    const topInSector = top5PerSector.get(s.kode) ?? [];
    if (topInSector.length === 0) continue;
    const totalMC = topInSector.reduce((acc, c) => acc + c.marketCap, 0);
    if (totalMC === 0) continue;

    const dateMap = new Map<string, { totalWeighted: number; totalWeight: number }>();
    for (const c of topInSector) {
      const bars = closesByKode.get(c.kode);
      if (!bars || bars.length === 0) continue;
      const weight = c.marketCap / totalMC;
      const base = bars[0]!.close;
      for (const b of bars) {
        const normVal = (b.close / base) * 100;
        const cur = dateMap.get(b.date) ?? { totalWeighted: 0, totalWeight: 0 };
        cur.totalWeighted += normVal * weight;
        cur.totalWeight += weight;
        dateMap.set(b.date, cur);
      }
    }
    const sectorBars = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, close: v.totalWeight > 0 ? v.totalWeighted / v.totalWeight : 100 }));
    if (sectorBars.length < 30) continue;

    const aligned: Array<{ ent: number; ben: number }> = [];
    for (const b of sectorBars) {
      const benClose = benchMap.get(b.date);
      if (benClose != null) aligned.push({ ent: b.close, ben: benClose });
    }
    if (aligned.length < 30) continue;

    const trail = computeTrail(aligned.map((a) => a.ent), aligned.map((a) => a.ben));
    if (trail.length === 0) continue;
    const last = trail[trail.length - 1]!;
    out.push({
      kode: s.kode,
      name: s.nama,
      marketCapIdr: totalMC,
      trail,
      currentQuadrant: last.quadrant,
      currentRs: last.rsRatio,
      currentMomentum: last.rsMomentum,
    });
  }

  return out.sort((a, b) => b.currentRs - a.currentRs);
}

export const getSectorRotation = cached(
  getSectorRotationRaw,
  "getSectorRotation",
  { revalidate: CACHE_TTL.rotation, tags: [CACHE_TAGS.rotation] },
);

/** Get rotation chart untuk semua emiten dalam sektor tertentu. */
async function getEmittenRotationRaw(sectorKode?: string, limit = 30): Promise<RotationEntity[]> {
  const benchmark = await getBenchmarkCloses();
  if (benchmark.length < 30) return [];
  const benchMap = new Map(benchmark.map((b) => [b.date, b.close]));

  const filter = sectorKode
    ? [eq(companies.isActive, true), eq(companies.sectorKode, sectorKode)]
    : [eq(companies.isActive, true)];
  const candidates = await db
    .select({
      kode: companies.kode,
      name: companies.namaPerusahaan,
      logoUrl: companies.logoUrl,
      marketCap: companyFundamentals.marketCapIdr,
    })
    .from(companies)
    .leftJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .where(filter.length === 1 ? filter[0]! : sql`${filter[0]} AND ${filter[1]}`)
    .orderBy(desc(companyFundamentals.marketCapIdr))
    .limit(limit);

  // BULK fetch — 1 query instead of N
  const closesByKode = await getBulkEntityCloses(candidates.map((c) => c.kode));

  const out: RotationEntity[] = [];
  for (const c of candidates) {
    const bars = closesByKode.get(c.kode);
    if (!bars || bars.length < 30) continue;
    const aligned: Array<{ ent: number; ben: number }> = [];
    for (const b of bars) {
      const ben = benchMap.get(b.date);
      if (ben != null) aligned.push({ ent: b.close, ben });
    }
    if (aligned.length < 30) continue;
    const trail = computeTrail(aligned.map((a) => a.ent), aligned.map((a) => a.ben));
    if (trail.length === 0) continue;
    const last = trail[trail.length - 1]!;
    out.push({
      kode: c.kode,
      name: c.name,
      logoUrl: c.logoUrl,
      marketCapIdr: c.marketCap ? Number(c.marketCap) : null,
      trail,
      currentQuadrant: last.quadrant,
      currentRs: last.rsRatio,
      currentMomentum: last.rsMomentum,
    });
  }

  return out;
}

export const getEmittenRotation = cached(
  getEmittenRotationRaw,
  "getEmittenRotation",
  { revalidate: CACHE_TTL.rotation, tags: [CACHE_TAGS.rotation] },
);
