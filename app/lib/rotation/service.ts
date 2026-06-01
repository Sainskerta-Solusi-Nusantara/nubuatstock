import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors } from "@/db/schema/reference";
import { cached, CACHE_TAGS, CACHE_TTL } from "@/lib/cache";
import {
  buildWeightedIndex,
  computeTrail,
  type Quadrant,
  type RotationPoint,
} from "@/lib/rotation/rrg";

/**
 * Relative Rotation Graph (RRG) — data service untuk 4-quadrant rotation chart.
 *
 * Perhitungan RRG murni (RS-Ratio, RS-Momentum, klasifikasi kuadran, weighted
 * index) ada di `@/lib/rotation/rrg`. Modul ini hanya meng-orchestrate pengambilan
 * data EOD dari Postgres lalu memanggil fungsi murni tersebut.
 *
 * Benchmark: synthetic IHSG proxy = weighted-average (mcap) top 30 emiten.
 */

// Re-export type publik agar konsumen lama (page / komponen) tidak perlu berubah.
export type { Quadrant, RotationPoint };

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

interface Bar {
  date: string;
  close: number;
}

async function getEntityCloses(kode: string, days = 90): Promise<Bar[]> {
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
async function getBulkEntityCloses(kodes: string[], days = 90): Promise<Map<string, Bar[]>> {
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
async function getBenchmarkCloses(days = 90): Promise<Bar[]> {
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

  return buildWeightedIndex(
    topCompanies.map((c) => ({
      bars: closesByKode.get(c.kode) ?? [],
      weight: Number(c.marketCap ?? 0) / totalMC,
    })),
  );
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

    const sectorBars = buildWeightedIndex(
      topInSector.map((c) => ({
        bars: closesByKode.get(c.kode) ?? [],
        weight: c.marketCap / totalMC,
      })),
    );
    if (sectorBars.length < 30) continue;

    const aligned: Array<{ date: string; ent: number; ben: number }> = [];
    for (const b of sectorBars) {
      const benClose = benchMap.get(b.date);
      if (benClose != null) aligned.push({ date: b.date, ent: b.close, ben: benClose });
    }
    if (aligned.length < 30) continue;

    const trail = computeTrail(
      aligned.map((a) => a.ent),
      aligned.map((a) => a.ben),
      {},
      aligned.map((a) => a.date),
    );
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
    const aligned: Array<{ date: string; ent: number; ben: number }> = [];
    for (const b of bars) {
      const ben = benchMap.get(b.date);
      if (ben != null) aligned.push({ date: b.date, ent: b.close, ben });
    }
    if (aligned.length < 30) continue;
    const trail = computeTrail(
      aligned.map((a) => a.ent),
      aligned.map((a) => a.ben),
      {},
      aligned.map((a) => a.date),
    );
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
