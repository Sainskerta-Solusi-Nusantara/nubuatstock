import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks, pickOutcomes, picksScoringRuns } from "@/db/schema/picks";
import { companies } from "@/db/schema/companies";
import { NotFoundError } from "@/lib/errors";
import type {
  FactorBreakdown,
  PickDetailDTO,
  PickListItemDTO,
  PicksHistoryQuery,
  PicksPerformanceBucket,
  PicksPerformanceDTO,
  SetupType,
} from "@/lib/types/picks";
import { setupTypeValues } from "@/lib/types/picks";

/**
 * Service layer untuk read API picks. Pure DB access — no HTTP, no Zod.
 *
 * Visibility:
 *  - getTodayPicks = picks pada trade_date published terbaru yang <= today
 *    (lihat getEffectivePickDate), status='published'. Caller yang slice ke
 *    entitlement user.
 */

function toListItem(row: {
  id: string;
  tradeDate: string;
  companyKode: string;
  namaPerusahaan: string | null;
  sectorKode: string | null;
  setupType: string;
  score: string;
  confidence: string;
  entryZoneLow: string;
  entryZoneHigh: string;
  stopLoss: string;
  tp1: string;
  tp2: string | null;
  tp3: string | null;
  rewardRiskRatio: string;
  timeHorizon: string;
  status: string;
  publishedAt: Date;
}): PickListItemDTO {
  return {
    id: row.id,
    tradeDate: row.tradeDate,
    companyKode: row.companyKode,
    namaPerusahaan: row.namaPerusahaan,
    sectorKode: row.sectorKode,
    setupType: row.setupType as PickListItemDTO["setupType"],
    score: Number.parseFloat(row.score),
    confidence: row.confidence as PickListItemDTO["confidence"],
    entryZoneLow: Number.parseFloat(row.entryZoneLow),
    entryZoneHigh: Number.parseFloat(row.entryZoneHigh),
    stopLoss: Number.parseFloat(row.stopLoss),
    tp1: Number.parseFloat(row.tp1),
    tp2: row.tp2 ? Number.parseFloat(row.tp2) : null,
    tp3: row.tp3 ? Number.parseFloat(row.tp3) : null,
    rewardRiskRatio: Number.parseFloat(row.rewardRiskRatio),
    timeHorizon: row.timeHorizon as PickListItemDTO["timeHorizon"],
    status: row.status as PickListItemDTO["status"],
    publishedAt: row.publishedAt.toISOString(),
  };
}

/**
 * Resolusi trade_date pick "aktif": trade_date published terbaru yang <= `onOrBefore`.
 * Dipakai supaya halaman tetap menampilkan picks terakhir di akhir pekan / pagi
 * sebelum run hari ini jalan (EOD selalu telat ≥1 hari dari kalender). Null kalau
 * belum ada pick sama sekali.
 */
export async function getEffectivePickDate(onOrBefore: string): Promise<string | null> {
  const rows = await db
    .select({ d: sql<string>`max(${dailyPicks.tradeDate})` })
    .from(dailyPicks)
    .where(and(lte(dailyPicks.tradeDate, onOrBefore), eq(dailyPicks.status, "published")));
  return rows[0]?.d ?? null;
}

export async function getTodayPicks(opts: { tradeDate: string }): Promise<PickListItemDTO[]> {
  // `tradeDate` di sini = batas atas kalender ("hari ini"), BUKAN match persis.
  // Picks pakai trade_date = tanggal EOD (selalu lag), jadi resolve ke yang terbaru
  // <= today, kalau tidak halaman kosong tiap akhir pekan / pagi sebelum run.
  const effectiveDate = await getEffectivePickDate(opts.tradeDate);
  if (!effectiveDate) return [];
  const rows = await db
    .select({
      id: dailyPicks.id,
      tradeDate: dailyPicks.tradeDate,
      companyKode: dailyPicks.companyKode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      setupType: dailyPicks.setupType,
      score: dailyPicks.score,
      confidence: dailyPicks.confidence,
      entryZoneLow: dailyPicks.entryZoneLow,
      entryZoneHigh: dailyPicks.entryZoneHigh,
      stopLoss: dailyPicks.stopLoss,
      tp1: dailyPicks.tp1,
      tp2: dailyPicks.tp2,
      tp3: dailyPicks.tp3,
      rewardRiskRatio: dailyPicks.rewardRiskRatio,
      timeHorizon: dailyPicks.timeHorizon,
      status: dailyPicks.status,
      publishedAt: dailyPicks.publishedAt,
    })
    .from(dailyPicks)
    .leftJoin(companies, eq(companies.kode, dailyPicks.companyKode))
    .where(
      and(
        eq(dailyPicks.tradeDate, effectiveDate),
        eq(dailyPicks.status, "published"),
      ),
    )
    .orderBy(desc(dailyPicks.score));
  return rows.map(toListItem);
}

export async function getPickById(id: string): Promise<PickDetailDTO> {
  const rows = await db
    .select({
      id: dailyPicks.id,
      runId: dailyPicks.runId,
      tradeDate: dailyPicks.tradeDate,
      companyKode: dailyPicks.companyKode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      setupType: dailyPicks.setupType,
      score: dailyPicks.score,
      confidence: dailyPicks.confidence,
      entryZoneLow: dailyPicks.entryZoneLow,
      entryZoneHigh: dailyPicks.entryZoneHigh,
      stopLoss: dailyPicks.stopLoss,
      tp1: dailyPicks.tp1,
      tp2: dailyPicks.tp2,
      tp3: dailyPicks.tp3,
      atr14: dailyPicks.atr14,
      rewardRiskRatio: dailyPicks.rewardRiskRatio,
      timeHorizon: dailyPicks.timeHorizon,
      factorBreakdown: dailyPicks.factorBreakdown,
      narrativeText: dailyPicks.narrativeText,
      narrativeGeneratedBy: dailyPicks.narrativeGeneratedBy,
      narrativeAt: dailyPicks.narrativeAt,
      status: dailyPicks.status,
      publishedAt: dailyPicks.publishedAt,
    })
    .from(dailyPicks)
    .leftJoin(companies, eq(companies.kode, dailyPicks.companyKode))
    .where(eq(dailyPicks.id, id))
    .limit(1);
  if (rows.length === 0) throw new NotFoundError("Pick");
  const r = rows[0]!;
  const base = toListItem({
    id: r.id,
    tradeDate: r.tradeDate,
    companyKode: r.companyKode,
    namaPerusahaan: r.namaPerusahaan,
    sectorKode: r.sectorKode,
    setupType: r.setupType,
    score: r.score,
    confidence: r.confidence,
    entryZoneLow: r.entryZoneLow,
    entryZoneHigh: r.entryZoneHigh,
    stopLoss: r.stopLoss,
    tp1: r.tp1,
    tp2: r.tp2,
    tp3: r.tp3,
    rewardRiskRatio: r.rewardRiskRatio,
    timeHorizon: r.timeHorizon,
    status: r.status,
    publishedAt: r.publishedAt,
  });
  const breakdown = (r.factorBreakdown ?? {}) as Partial<FactorBreakdown>;
  const factorBreakdown: FactorBreakdown = {
    technical: breakdown.technical ?? 0,
    bandarmology: breakdown.bandarmology ?? 0,
    fundamental: breakdown.fundamental ?? 0,
    sentiment: breakdown.sentiment ?? 0,
    macro: breakdown.macro ?? 0,
    risk_penalty: breakdown.risk_penalty ?? 0,
  };
  return {
    ...base,
    runId: r.runId,
    atr14: Number.parseFloat(r.atr14),
    factorBreakdown,
    narrativeText: r.narrativeText,
    narrativeGeneratedBy: r.narrativeGeneratedBy,
    narrativeAt: r.narrativeAt ? r.narrativeAt.toISOString() : null,
  };
}

export async function listPicksHistory(q: PicksHistoryQuery): Promise<{
  items: PickListItemDTO[];
  total: number;
  limit: number;
  offset: number;
}> {
  const wheres = [eq(dailyPicks.status, "published")];
  if (q.from) wheres.push(gte(dailyPicks.tradeDate, q.from));
  if (q.to) wheres.push(lte(dailyPicks.tradeDate, q.to));
  if (q.setup) wheres.push(eq(dailyPicks.setupType, q.setup));

  const rows = await db
    .select({
      id: dailyPicks.id,
      tradeDate: dailyPicks.tradeDate,
      companyKode: dailyPicks.companyKode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      setupType: dailyPicks.setupType,
      score: dailyPicks.score,
      confidence: dailyPicks.confidence,
      entryZoneLow: dailyPicks.entryZoneLow,
      entryZoneHigh: dailyPicks.entryZoneHigh,
      stopLoss: dailyPicks.stopLoss,
      tp1: dailyPicks.tp1,
      tp2: dailyPicks.tp2,
      tp3: dailyPicks.tp3,
      rewardRiskRatio: dailyPicks.rewardRiskRatio,
      timeHorizon: dailyPicks.timeHorizon,
      status: dailyPicks.status,
      publishedAt: dailyPicks.publishedAt,
    })
    .from(dailyPicks)
    .leftJoin(companies, eq(companies.kode, dailyPicks.companyKode))
    .where(and(...wheres))
    .orderBy(desc(dailyPicks.tradeDate), desc(dailyPicks.score))
    .limit(q.limit)
    .offset(q.offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(dailyPicks)
    .where(and(...wheres));
  const total = Number(countRows[0]?.total ?? 0);

  return { items: rows.map(toListItem), total, limit: q.limit, offset: q.offset };
}

export async function getPicksPerformance(windowDays: number): Promise<PicksPerformanceDTO> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Pakai outcome "final" kalau ada, fallback ke "T+20"
  const rows = await db
    .select({
      pickId: dailyPicks.id,
      setupType: dailyPicks.setupType,
      tradeDate: dailyPicks.tradeDate,
      outcomeEvalAt: pickOutcomes.evaluationAt,
      hitTp1: pickOutcomes.hitTp1,
      hitTp2: pickOutcomes.hitTp2,
      hitTp3: pickOutcomes.hitTp3,
      hitSl: pickOutcomes.hitSl,
      returnPct: pickOutcomes.returnPct,
    })
    .from(dailyPicks)
    .leftJoin(pickOutcomes, eq(pickOutcomes.pickId, dailyPicks.id))
    .where(
      and(
        gte(dailyPicks.tradeDate, cutoffStr),
        eq(dailyPicks.status, "published"),
      ),
    );

  // Dedupe outcome per pickId: prefer 'final' > 'T+20' > 'T+5' > 'T+1'
  const priority: Record<string, number> = { final: 4, "T+20": 3, "T+5": 2, "T+1": 1 };
  const best = new Map<
    string,
    {
      setupType: string;
      hitTp1: boolean;
      hitTp2: boolean;
      hitTp3: boolean;
      hitSl: boolean;
      returnPct: number;
      priority: number;
    }
  >();
  for (const r of rows) {
    const evalAt = r.outcomeEvalAt ?? null;
    const p = evalAt ? priority[evalAt] ?? 0 : 0;
    const cur = best.get(r.pickId);
    const ret = r.returnPct ? Number.parseFloat(r.returnPct) : 0;
    if (!cur || p > cur.priority) {
      best.set(r.pickId, {
        setupType: r.setupType,
        hitTp1: r.hitTp1 ?? false,
        hitTp2: r.hitTp2 ?? false,
        hitTp3: r.hitTp3 ?? false,
        hitSl: r.hitSl ?? false,
        returnPct: ret,
        priority: p,
      });
    }
  }

  const buckets: PicksPerformanceBucket[] = [];
  const aggregate = (filter: (s: string) => boolean, label: SetupType | "all") => {
    const items = [...best.values()].filter((v) => filter(v.setupType));
    if (items.length === 0) {
      buckets.push({
        setupType: label,
        total: 0,
        tp1HitRate: 0,
        tp2HitRate: 0,
        tp3HitRate: 0,
        slHitRate: 0,
        avgReturnPct: 0,
      });
      return;
    }
    const total = items.length;
    const tp1 = items.filter((i) => i.hitTp1).length;
    const tp2 = items.filter((i) => i.hitTp2).length;
    const tp3 = items.filter((i) => i.hitTp3).length;
    const sl = items.filter((i) => i.hitSl).length;
    const avgReturn = items.reduce((acc, i) => acc + i.returnPct, 0) / total;
    buckets.push({
      setupType: label,
      total,
      tp1HitRate: round4(tp1 / total),
      tp2HitRate: round4(tp2 / total),
      tp3HitRate: round4(tp3 / total),
      slHitRate: round4(sl / total),
      avgReturnPct: round4(avgReturn),
    });
  };

  aggregate(() => true, "all");
  for (const setup of setupTypeValues) {
    aggregate((s) => s === setup, setup);
  }

  return {
    windowDays,
    evaluatedAt: new Date().toISOString(),
    buckets,
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export async function getLatestRun(): Promise<{
  id: string;
  runDate: string;
  status: string;
  picksGenerated: number;
  startedAt: Date;
  finishedAt: Date | null;
} | null> {
  const rows = await db
    .select({
      id: picksScoringRuns.id,
      runDate: picksScoringRuns.runDate,
      status: picksScoringRuns.status,
      picksGenerated: picksScoringRuns.picksGenerated,
      startedAt: picksScoringRuns.startedAt,
      finishedAt: picksScoringRuns.finishedAt,
    })
    .from(picksScoringRuns)
    .orderBy(desc(picksScoringRuns.startedAt))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0]!;
}

