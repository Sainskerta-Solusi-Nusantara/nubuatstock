import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { foreignFlowDaily, quotesEod } from "@/db/schema/market";
import type { ForeignFlowDailyInput, OhlcvBar, ScoringCandidateInput, SectorContext } from "@/lib/types/picks";

/**
 * Universe filter & data loader.
 *
 * MVP: ambil semua company `is_active=true` & soft-delete=null, kemudian filter
 * by 20-day average value (likuiditas) >= threshold dari config. Tidak ada
 * referensi index/papan whitelist — admin bisa atur lewat sectors/indices nanti.
 */

export interface UniverseFilterOptions {
  minAvgValueIdr: number;
  asOfDate: string; // YYYY-MM-DD batas atas window 20D
  lookbackDays?: number;
}

export interface UniverseRow {
  companyKode: string;
  sectorKode: string;
  marketCapIdr: number | null;
}

export async function loadUniverse(opts: UniverseFilterOptions): Promise<UniverseRow[]> {
  const lookback = opts.lookbackDays ?? 30; // ambil 30D agar 20 trading day cukup
  const cutoff = new Date(opts.asOfDate);
  cutoff.setDate(cutoff.getDate() - lookback);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Sub-query: avg(value_idr) 20D terakhir per company sampai asOfDate
  const avgValueSubquery = db
    .select({
      companyKode: quotesEod.companyKode,
      avgValue: sql<string>`avg(${quotesEod.valueIdr})`.as("avg_value"),
      barCount: sql<number>`count(*)`.as("bar_count"),
    })
    .from(quotesEod)
    .where(
      and(
        gte(quotesEod.tradeDate, cutoffStr),
        sql`${quotesEod.tradeDate} <= ${opts.asOfDate}`,
      ),
    )
    .groupBy(quotesEod.companyKode)
    .as("avg_value_sub");

  const rows = await db
    .select({
      companyKode: companies.kode,
      sectorKode: companies.sectorKode,
      marketCapIdr: companies.marketCapIdr,
      avgValue: avgValueSubquery.avgValue,
      barCount: avgValueSubquery.barCount,
    })
    .from(companies)
    .innerJoin(avgValueSubquery, eq(avgValueSubquery.companyKode, companies.kode))
    .where(
      and(
        eq(companies.isActive, true),
        isNull(companies.deletedAt),
      ),
    );

  const filtered: UniverseRow[] = [];
  for (const r of rows) {
    const avg = r.avgValue ? Number.parseFloat(r.avgValue) : 0;
    const bars = Number(r.barCount ?? 0);
    if (bars < 15) continue; // need at least 15 trading days in lookback
    if (avg < opts.minAvgValueIdr) continue;
    filtered.push({
      companyKode: r.companyKode,
      sectorKode: r.sectorKode,
      marketCapIdr: r.marketCapIdr ? Number.parseFloat(r.marketCapIdr) : null,
    });
  }
  return filtered;
}

export async function loadOhlcv(companyKode: string, days = 220): Promise<OhlcvBar[]> {
  const rows = await db
    .select()
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, companyKode))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(days);
  return rows
    .map((r) => ({
      date: r.tradeDate,
      open: Number.parseFloat(r.open),
      high: Number.parseFloat(r.high),
      low: Number.parseFloat(r.low),
      close: Number.parseFloat(r.close),
      volume: Number(r.volume),
      valueIdr: Number.parseFloat(r.valueIdr),
    }))
    .reverse();
}

export async function loadForeignFlow(
  companyKode: string,
  days = 20,
): Promise<ForeignFlowDailyInput[]> {
  const rows = await db
    .select({
      tradeDate: foreignFlowDaily.tradeDate,
      netValue: foreignFlowDaily.netValue,
    })
    .from(foreignFlowDaily)
    .where(eq(foreignFlowDaily.companyKode, companyKode))
    .orderBy(desc(foreignFlowDaily.tradeDate))
    .limit(days);
  return rows
    .map((r) => ({
      tradeDate: r.tradeDate,
      netValue: Number.parseFloat(r.netValue),
    }))
    .reverse();
}

/**
 * Hitung sector return 5D & IHSG return 5D (proxy: rata-rata return semua emiten
 * sebagai IHSG, & rata-rata return per sektor). Untuk MVP cukup approximation;
 * Agent 5 akan punya `indices` ingest sebenarnya nanti.
 */
export async function loadSectorContext(asOfDate: string): Promise<Map<string, SectorContext>> {
  const cutoff = new Date(asOfDate);
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db
    .select({
      companyKode: quotesEod.companyKode,
      sectorKode: companies.sectorKode,
      tradeDate: quotesEod.tradeDate,
      close: quotesEod.close,
    })
    .from(quotesEod)
    .innerJoin(companies, eq(companies.kode, quotesEod.companyKode))
    .where(
      and(
        gte(quotesEod.tradeDate, cutoffStr),
        sql`${quotesEod.tradeDate} <= ${asOfDate}`,
        eq(companies.isActive, true),
      ),
    )
    .orderBy(quotesEod.tradeDate);

  // group per company → ambil close pertama dan terakhir window
  const perCompany = new Map<string, { sectorKode: string; firstClose: number; lastClose: number }>();
  for (const r of rows) {
    const cur = perCompany.get(r.companyKode);
    const close = Number.parseFloat(r.close);
    if (!cur) {
      perCompany.set(r.companyKode, { sectorKode: r.sectorKode, firstClose: close, lastClose: close });
    } else {
      cur.lastClose = close;
    }
  }

  const perSector = new Map<string, number[]>();
  const allReturns: number[] = [];
  for (const v of perCompany.values()) {
    if (v.firstClose <= 0) continue;
    const ret = ((v.lastClose - v.firstClose) / v.firstClose) * 100;
    allReturns.push(ret);
    const arr = perSector.get(v.sectorKode) ?? [];
    arr.push(ret);
    perSector.set(v.sectorKode, arr);
  }
  const ihsgReturn5dPct =
    allReturns.length > 0
      ? allReturns.reduce((a, b) => a + b, 0) / allReturns.length
      : 0;
  const result = new Map<string, SectorContext>();
  for (const [sectorKode, arr] of perSector) {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    result.set(sectorKode, { sectorKode, sectorReturn5dPct: avg, ihsgReturn5dPct });
  }
  return result;
}

export async function buildCandidate(
  row: UniverseRow,
  sectorCtx: Map<string, SectorContext>,
): Promise<ScoringCandidateInput | null> {
  const [ohlcv, foreignFlow] = await Promise.all([
    loadOhlcv(row.companyKode, 220),
    loadForeignFlow(row.companyKode, 20),
  ]);
  if (ohlcv.length < 50) return null;
  return {
    companyKode: row.companyKode,
    sectorKode: row.sectorKode,
    marketCapIdr: row.marketCapIdr,
    ohlcv,
    foreignFlow,
    sectorContext: sectorCtx.get(row.sectorKode) ?? null,
  };
}
