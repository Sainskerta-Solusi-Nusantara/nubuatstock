import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks, pickOutcomes } from "@/db/schema/picks";
import { companies } from "@/db/schema/companies";

/**
 * Archive query layer untuk halaman PUBLIK `/picks-archive`.
 *
 * Tujuan: transparansi track record. Menampilkan Daily Picks PUBLISHED yang
 * sudah lampau (trade_date < hari ini) beserta outcome T+1 / T+5 / T+20 yang
 * dievaluasi worker (`pick_outcomes`), di-grouping per bulan dengan agregat
 * hit-rate. Pure DB access — no HTTP, no auth (data historis bersifat edukasi).
 *
 * CATATAN visibilitas: hanya `status = 'published'` yang tampil. Level entry/SL/TP
 * historis sengaja TIDAK dibawa ke surface publik secara menonjol — fokus arsip
 * adalah HASIL (return %, hit TP/SL) untuk transparansi, bukan ajakan trading.
 */

export type ArchiveEvaluation = "T+1" | "T+5" | "T+20";

const EVALS: ArchiveEvaluation[] = ["T+1", "T+5", "T+20"];

export interface ArchivePickOutcome {
  returnPct: number;
  hitTp1: boolean;
  hitTp2: boolean;
  hitTp3: boolean;
  hitSl: boolean;
  status: string;
}

export interface ArchivePick {
  id: string;
  tradeDate: string;
  companyKode: string;
  namaPerusahaan: string | null;
  sectorKode: string | null;
  setupType: string;
  confidence: string;
  score: number;
  rewardRiskRatio: number;
  timeHorizon: string;
  /** Outcome per evaluation window. null = belum dievaluasi. */
  outcomes: Record<ArchiveEvaluation, ArchivePickOutcome | null>;
}

export interface ArchiveMonthAggregate {
  /** "YYYY-MM" */
  month: string;
  /** Label Indonesia, mis. "Januari 2026". */
  monthLabel: string;
  totalPicks: number;
  /** Jumlah pick yang sudah punya outcome di window ini. */
  evaluatedCount: Record<ArchiveEvaluation, number>;
  /** Hit-rate TP1 0..1 per window (di antara yang sudah dievaluasi). */
  tp1HitRate: Record<ArchiveEvaluation, number>;
  /** Hit-rate SL 0..1 per window. */
  slHitRate: Record<ArchiveEvaluation, number>;
  /** Rata-rata return % per window. */
  avgReturnPct: Record<ArchiveEvaluation, number>;
}

export interface ArchiveMonth {
  month: string;
  monthLabel: string;
  aggregate: ArchiveMonthAggregate;
  picks: ArchivePick[];
}

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const idx = Number.parseInt(m ?? "1", 10) - 1;
  return `${MONTH_NAMES_ID[idx] ?? month} ${y ?? ""}`.trim();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyEvalRecord<T>(value: T): Record<ArchiveEvaluation, T> {
  return { "T+1": value, "T+5": value, "T+20": value };
}

/**
 * Daftar bulan yang punya minimal satu pick PUBLISHED lampau, terbaru dulu.
 * Dipakai untuk index list + pagination + sitemap + static params.
 */
export async function listArchiveMonths(): Promise<
  Array<{ month: string; monthLabel: string; totalPicks: number }>
> {
  const today = todayStr();
  try {
    const rows = await db
      .select({
        month: sql<string>`to_char(${dailyPicks.tradeDate}::date, 'YYYY-MM')`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(dailyPicks)
      .where(and(eq(dailyPicks.status, "published"), lt(dailyPicks.tradeDate, today)))
      .groupBy(sql`to_char(${dailyPicks.tradeDate}::date, 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${dailyPicks.tradeDate}::date, 'YYYY-MM')`));

    return rows.map((r) => ({
      month: r.month,
      monthLabel: monthLabel(r.month),
      totalPicks: Number(r.cnt ?? 0),
    }));
  } catch {
    return [];
  }
}

/** Bounds [start, endExclusive) tanggal untuk sebuah bulan "YYYY-MM". */
function monthBounds(month: string): { start: string; endExclusive: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number.parseInt(m[1]!, 10);
  const mon = Number.parseInt(m[2]!, 10);
  if (mon < 1 || mon > 12) return null;
  const start = `${m[1]}-${m[2]}-01`;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const nextYear = mon === 12 ? year + 1 : year;
  const endExclusive = `${String(nextYear).padStart(4, "0")}-${String(nextMon).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

/**
 * Ambil semua pick PUBLISHED lampau untuk satu bulan + outcome per window,
 * lalu hitung agregat hit-rate.
 */
export async function getArchiveMonth(month: string): Promise<ArchiveMonth | null> {
  const bounds = monthBounds(month);
  if (!bounds) return null;
  const today = todayStr();

  try {
    const rows = await db
      .select({
        id: dailyPicks.id,
        tradeDate: dailyPicks.tradeDate,
        companyKode: dailyPicks.companyKode,
        namaPerusahaan: companies.namaPerusahaan,
        sectorKode: companies.sectorKode,
        setupType: dailyPicks.setupType,
        confidence: dailyPicks.confidence,
        score: dailyPicks.score,
        rewardRiskRatio: dailyPicks.rewardRiskRatio,
        timeHorizon: dailyPicks.timeHorizon,
        evaluationAt: pickOutcomes.evaluationAt,
        returnPct: pickOutcomes.returnPct,
        hitTp1: pickOutcomes.hitTp1,
        hitTp2: pickOutcomes.hitTp2,
        hitTp3: pickOutcomes.hitTp3,
        hitSl: pickOutcomes.hitSl,
        outcomeStatus: pickOutcomes.statusAtEvaluation,
      })
      .from(dailyPicks)
      .leftJoin(companies, eq(companies.kode, dailyPicks.companyKode))
      .leftJoin(pickOutcomes, eq(pickOutcomes.pickId, dailyPicks.id))
      .where(
        and(
          eq(dailyPicks.status, "published"),
          gte(dailyPicks.tradeDate, bounds.start),
          lt(dailyPicks.tradeDate, bounds.endExclusive),
          lt(dailyPicks.tradeDate, today),
        ),
      )
      .orderBy(desc(dailyPicks.tradeDate), desc(dailyPicks.score));

    if (rows.length === 0) return null;

    const byPick = new Map<string, ArchivePick>();
    for (const r of rows) {
      let pick = byPick.get(r.id);
      if (!pick) {
        pick = {
          id: r.id,
          tradeDate: r.tradeDate,
          companyKode: r.companyKode,
          namaPerusahaan: r.namaPerusahaan,
          sectorKode: r.sectorKode,
          setupType: r.setupType,
          confidence: r.confidence,
          score: Number.parseFloat(r.score),
          rewardRiskRatio: Number.parseFloat(r.rewardRiskRatio),
          timeHorizon: r.timeHorizon,
          outcomes: { "T+1": null, "T+5": null, "T+20": null },
        };
        byPick.set(r.id, pick);
      }
      const evalAt = r.evaluationAt as ArchiveEvaluation | "final" | null;
      if (evalAt && (EVALS as string[]).includes(evalAt)) {
        pick.outcomes[evalAt as ArchiveEvaluation] = {
          returnPct: r.returnPct ? Number.parseFloat(r.returnPct) : 0,
          hitTp1: r.hitTp1 ?? false,
          hitTp2: r.hitTp2 ?? false,
          hitTp3: r.hitTp3 ?? false,
          hitSl: r.hitSl ?? false,
          status: r.outcomeStatus ?? "unknown",
        };
      }
    }

    const picks = [...byPick.values()];

    // Agregat per window
    const evaluatedCount = emptyEvalRecord(0);
    const tp1Hits = emptyEvalRecord(0);
    const slHits = emptyEvalRecord(0);
    const sumReturn = emptyEvalRecord(0);

    for (const p of picks) {
      for (const ev of EVALS) {
        const o = p.outcomes[ev];
        if (!o) continue;
        evaluatedCount[ev] += 1;
        if (o.hitTp1) tp1Hits[ev] += 1;
        if (o.hitSl) slHits[ev] += 1;
        sumReturn[ev] += o.returnPct;
      }
    }

    const tp1HitRate = emptyEvalRecord(0);
    const slHitRate = emptyEvalRecord(0);
    const avgReturnPct = emptyEvalRecord(0);
    for (const ev of EVALS) {
      const n = evaluatedCount[ev];
      tp1HitRate[ev] = n > 0 ? round4(tp1Hits[ev] / n) : 0;
      slHitRate[ev] = n > 0 ? round4(slHits[ev] / n) : 0;
      avgReturnPct[ev] = n > 0 ? round4(sumReturn[ev] / n) : 0;
    }

    const aggregate: ArchiveMonthAggregate = {
      month,
      monthLabel: monthLabel(month),
      totalPicks: picks.length,
      evaluatedCount,
      tp1HitRate,
      slHitRate,
      avgReturnPct,
    };

    return { month, monthLabel: monthLabel(month), aggregate, picks };
  } catch {
    return null;
  }
}

/**
 * Versi paginated untuk halaman index: ambil N bulan terbaru (page) lengkap
 * dengan agregat + picks-nya. Pagination by-month (page mulai 1).
 */
export async function getArchivePage(opts: {
  page?: number;
  monthsPerPage?: number;
} = {}): Promise<{
  months: ArchiveMonth[];
  page: number;
  monthsPerPage: number;
  totalMonths: number;
  hasMore: boolean;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const monthsPerPage = Math.max(1, Math.min(12, opts.monthsPerPage ?? 3));

  const allMonths = await listArchiveMonths();
  const totalMonths = allMonths.length;
  const startIdx = (page - 1) * monthsPerPage;
  const slice = allMonths.slice(startIdx, startIdx + monthsPerPage);

  const months: ArchiveMonth[] = [];
  for (const m of slice) {
    const data = await getArchiveMonth(m.month);
    if (data) months.push(data);
  }

  return {
    months,
    page,
    monthsPerPage,
    totalMonths,
    hasMore: startIdx + monthsPerPage < totalMonths,
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
