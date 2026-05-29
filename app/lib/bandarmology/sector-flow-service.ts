import { eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors } from "@/db/schema/reference";
import { cached, CACHE_TAGS, CACHE_TTL } from "@/lib/cache";
import {
  computeMultiWindowSectorFlow,
  type FlowBar,
  type FlowEmiten,
  type SectorFlowResult,
} from "@/lib/bandarmology/sector-flow";

/**
 * Sector Capital Flow service — IMPROVEMENT_PLAN §3.C.6.
 *
 * Query EOD + companies (marketCap, sektor) lalu jalankan engine murni
 * `computeSectorFlow` untuk beberapa window. Graceful: kalau tabel kosong /
 * data tipis, engine mengembalikan hasil dengan `hasData=false` / `sparse=true`
 * sehingga UI bisa menampilkan empty-state tanpa error.
 */

export interface SectorFlowBundle {
  /** Hasil per window (mis. {5: ..., 20: ...}). */
  byWindow: Record<number, SectorFlowResult>;
  /** Window yang dipakai. */
  windows: number[];
}

const DEFAULT_WINDOWS = [5, 20] as const;

async function getSectorFlowRaw(
  windows: number[] = [...DEFAULT_WINDOWS],
): Promise<SectorFlowBundle> {
  const maxWindow = Math.max(...windows);

  // 1. Klasifikasi sektor + market cap per emiten aktif.
  // marketCap diambil dari company_fundamentals (sumber yang sama dgn capital-flow & rotation).
  const companyRows = await db
    .select({
      kode: companies.kode,
      sectorKode: companies.sectorKode,
      sectorName: sectors.namaId,
      marketCap: companyFundamentals.marketCapIdr,
    })
    .from(companies)
    .innerJoin(companyFundamentals, eq(companyFundamentals.companyKode, companies.kode))
    .leftJoin(sectors, eq(sectors.kode, companies.sectorKode))
    .where(eq(companies.isActive, true));

  const metaByKode = new Map<
    string,
    { sectorKode: string; sectorName: string | null; marketCap: number }
  >();
  for (const c of companyRows) {
    const mc = Number(c.marketCap ?? 0);
    if (mc <= 0) continue;
    metaByKode.set(c.kode, {
      sectorKode: c.sectorKode,
      sectorName: c.sectorName,
      marketCap: mc,
    });
  }

  if (metaByKode.size === 0) {
    return { byWindow: computeMultiWindowSectorFlow([], windows), windows };
  }

  // 2. Bulk-fetch bar EOD untuk window terbesar (+ buffer kalender utk gap weekend/libur).
  const calendarDaysToFetch = Math.ceil(maxWindow * 1.8) + 5;
  const cutoff = new Date(Date.now() - calendarDaysToFetch * 86400000)
    .toISOString()
    .slice(0, 10);

  const allBars = await db
    .select({
      kode: quotesEod.companyKode,
      date: quotesEod.tradeDate,
      close: quotesEod.close,
      valueIdr: quotesEod.valueIdr,
    })
    .from(quotesEod)
    .where(gte(quotesEod.tradeDate, cutoff));

  const barsByKode = new Map<string, FlowBar[]>();
  for (const r of allBars) {
    if (!metaByKode.has(r.kode)) continue;
    const arr = barsByKode.get(r.kode) ?? [];
    arr.push({
      date: r.date,
      close: Number(r.close),
      valueIdr: Number(r.valueIdr),
    });
    barsByKode.set(r.kode, arr);
  }

  // 3. Susun input engine.
  const emiten: FlowEmiten[] = [];
  for (const [kode, meta] of metaByKode.entries()) {
    const bars = barsByKode.get(kode);
    if (!bars || bars.length < 2) continue;
    emiten.push({
      kode,
      sectorKode: meta.sectorKode,
      sectorName: meta.sectorName,
      marketCapIdr: meta.marketCap,
      bars,
    });
  }

  const byWindow = computeMultiWindowSectorFlow(emiten, windows);
  return { byWindow, windows };
}

export const getSectorFlow = cached(
  getSectorFlowRaw,
  "getSectorFlow",
  { revalidate: CACHE_TTL.capitalFlow, tags: [CACHE_TAGS.capitalFlow] },
);
