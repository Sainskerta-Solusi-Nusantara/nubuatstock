import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks, pickOutcomes } from "@/db/schema/picks";

/**
 * Track record aggregator untuk Daily Picks.
 *
 * Metric kunci:
 *   - Hit rate TP1: % picks yang capai TP1 di window evaluasi (T+1/T+5/T+20)
 *   - Avg return realized
 *   - Win/Loss ratio (TP hit / SL hit)
 *   - Breakdown per setup_type
 */

export interface PerformanceSnapshot {
  windowDays: number;
  totalPicks: number;
  evaluatedPicks: number;
  hitTp1Count: number;
  hitTp2Count: number;
  hitTp3Count: number;
  hitSlCount: number;
  expiredCount: number;
  tp1HitRate: number; // 0..1 — kasar (TP1 tersentuh, termasuk yang juga kena SL)
  /**
   * Winrate JUJUR berdasarkan verdict: win / (win + loss). Kasus "ambiguous"
   * (TP1 & SL dua-duanya tersentuh, urutan tak diketahui) dan "open" dikecualikan
   * dari pembagi. `expired` dihitung sebagai bukan-menang.
   */
  winRate: number; // 0..1
  winCount: number;
  lossCount: number;
  ambiguousCount: number;
  decidedCount: number; // win + loss (pembagi winRate)
  avgReturnPct: number;
  avgRRRealized: number;
  bySetup: Array<{
    setup: string;
    total: number;
    tp1HitRate: number;
    avgReturnPct: number;
  }>;
}

export async function getPerformanceSnapshot(opts: {
  windowDays?: number;
  evaluation?: "T+1" | "T+5" | "T+20";
} = {}): Promise<PerformanceSnapshot> {
  const windowDays = opts.windowDays ?? 90;
  const evaluation = opts.evaluation ?? "T+5";

  try {
    // Total picks dalam window
    const fromDate = new Date(Date.now() - windowDays * 86400_000).toISOString().slice(0, 10);

    const totalRow = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(dailyPicks)
      .where(and(eq(dailyPicks.status, "published"), gte(dailyPicks.tradeDate, fromDate)));
    const totalPicks = Number(totalRow[0]?.cnt ?? 0);

    // Outcomes untuk evaluation point yang dipilih
    const outRows = await db
      .select({
        pickId: pickOutcomes.pickId,
        returnPct: pickOutcomes.returnPct,
        hitTp1: pickOutcomes.hitTp1,
        hitTp2: pickOutcomes.hitTp2,
        hitTp3: pickOutcomes.hitTp3,
        hitSl: pickOutcomes.hitSl,
        status: pickOutcomes.statusAtEvaluation,
        verdict: pickOutcomes.verdict,
        setup: dailyPicks.setupType,
        rrRatio: dailyPicks.rewardRiskRatio,
      })
      .from(pickOutcomes)
      .innerJoin(dailyPicks, eq(pickOutcomes.pickId, dailyPicks.id))
      .where(and(
        eq(pickOutcomes.evaluationAt, evaluation),
        gte(dailyPicks.tradeDate, fromDate),
        eq(dailyPicks.status, "published"),
      ));

    const evaluatedPicks = outRows.length;
    let hitTp1 = 0, hitTp2 = 0, hitTp3 = 0, hitSl = 0, expired = 0;
    let winCount = 0, lossCount = 0, ambiguousCount = 0;
    let sumReturn = 0;
    let sumRRRealized = 0;

    const bySetupMap = new Map<string, { total: number; tp1Hits: number; sumReturn: number }>();

    for (const r of outRows) {
      if (r.hitTp1) hitTp1++;
      if (r.hitTp2) hitTp2++;
      if (r.hitTp3) hitTp3++;
      if (r.hitSl) hitSl++;
      if (r.verdict === "expired") expired++;
      else if (r.verdict === "win") winCount++;
      else if (r.verdict === "loss") lossCount++;
      else if (r.verdict === "ambiguous") ambiguousCount++;

      const ret = Number(r.returnPct ?? 0);
      sumReturn += ret;

      // R/R realized = abs(return) / risk, approx
      const rrPlanned = Number(r.rrRatio ?? 0);
      if (rrPlanned > 0) sumRRRealized += (ret >= 0 ? rrPlanned : -1);

      const setupKey = r.setup ?? "unknown";
      const entry = bySetupMap.get(setupKey) ?? { total: 0, tp1Hits: 0, sumReturn: 0 };
      entry.total++;
      if (r.hitTp1) entry.tp1Hits++;
      entry.sumReturn += ret;
      bySetupMap.set(setupKey, entry);
    }

    const tp1HitRate = evaluatedPicks > 0 ? hitTp1 / evaluatedPicks : 0;
    const decidedCount = winCount + lossCount;
    const winRate = decidedCount > 0 ? winCount / decidedCount : 0;
    const avgReturnPct = evaluatedPicks > 0 ? sumReturn / evaluatedPicks : 0;
    const avgRRRealized = evaluatedPicks > 0 ? sumRRRealized / evaluatedPicks : 0;

    const bySetup = Array.from(bySetupMap.entries()).map(([setup, m]) => ({
      setup,
      total: m.total,
      tp1HitRate: m.total > 0 ? m.tp1Hits / m.total : 0,
      avgReturnPct: m.total > 0 ? m.sumReturn / m.total : 0,
    })).sort((a, b) => b.total - a.total);

    return {
      windowDays,
      totalPicks,
      evaluatedPicks,
      hitTp1Count: hitTp1,
      hitTp2Count: hitTp2,
      hitTp3Count: hitTp3,
      hitSlCount: hitSl,
      expiredCount: expired,
      tp1HitRate,
      winRate,
      winCount,
      lossCount,
      ambiguousCount,
      decidedCount,
      avgReturnPct,
      avgRRRealized,
      bySetup,
    };
  } catch {
    return {
      windowDays,
      totalPicks: 0,
      evaluatedPicks: 0,
      hitTp1Count: 0, hitTp2Count: 0, hitTp3Count: 0, hitSlCount: 0, expiredCount: 0,
      tp1HitRate: 0, winRate: 0, winCount: 0, lossCount: 0, ambiguousCount: 0, decidedCount: 0,
      avgReturnPct: 0, avgRRRealized: 0,
      bySetup: [],
    };
  }
}
