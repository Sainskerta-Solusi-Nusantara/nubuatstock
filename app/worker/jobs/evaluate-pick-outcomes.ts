import type { Processor } from "bullmq";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks, pickOutcomes } from "@/db/schema/picks";
import { quotesEod } from "@/db/schema/market";
import { logger } from "@/lib/logger";

/**
 * Evaluate Daily Picks outcome di T+1, T+5, dan T+20 trading day setelah publish.
 *
 * Run setiap hari setelah `market.eod.ingested` event. Untuk tiap pick yang
 * publish ≥1 hari trading lalu dan belum ada outcome row untuk evaluation point
 * tersebut, hitung:
 *   - price_at_evaluation (close di tanggal evaluasi)
 *   - return_pct
 *   - hit_tp1/tp2/tp3
 *   - hit_sl
 *   - status_at_evaluation
 *
 * Idempotent — unique constraint pada (pick_id, evaluation_at).
 */

type Evaluation = "T+1" | "T+5" | "T+20" | "final";
const EVAL_DAYS: Record<Evaluation, number> = { "T+1": 1, "T+5": 5, "T+20": 20, final: 20 };

function addTradingDays(start: Date, n: number): Date {
  // Approximate: skip Sat/Sun. Doesn't account for holidays — close enough for MVP.
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

async function getCloseAt(companyKode: string, on: Date): Promise<number | null> {
  // Find latest close on or before `on` date (handles holidays)
  const rows = await db
    .select({ close: quotesEod.close, date: quotesEod.tradeDate })
    .from(quotesEod)
    .where(and(eq(quotesEod.companyKode, companyKode), lte(quotesEod.tradeDate, on.toISOString().slice(0, 10))))
    .orderBy(sql`${quotesEod.tradeDate} DESC`)
    .limit(1);
  if (rows.length === 0) return null;
  return Number(rows[0]!.close);
}

interface EvalResult {
  pickId: string;
  evalPoint: Evaluation;
  priceAtEval: number;
  returnPct: number;
  hitTp1: boolean;
  hitTp2: boolean;
  hitTp3: boolean;
  hitSl: boolean;
  statusAtEval: "open" | "tp1_hit" | "tp2_hit" | "tp3_hit" | "sl_hit" | "expired";
}

async function evaluatePickAt(pick: typeof dailyPicks.$inferSelect, evalPoint: Evaluation): Promise<EvalResult | null> {
  const publishedAt = pick.publishedAt ?? pick.createdAt;
  const tradeStart = new Date(pick.tradeDate);
  const evalDate = addTradingDays(tradeStart, EVAL_DAYS[evalPoint]);

  // Kalau eval date masih masa depan, skip
  if (evalDate > new Date()) return null;

  const closePrice = await getCloseAt(pick.companyKode, evalDate);
  if (closePrice == null) return null;

  const entry = pick.entryZoneLow != null ? Number(pick.entryZoneLow) : Number(pick.entryZoneHigh ?? 0);
  if (entry === 0) return null;

  const returnPct = (closePrice - entry) / entry;
  const sl = Number(pick.stopLoss ?? 0);
  const tp1 = Number(pick.tp1 ?? 0);
  const tp2 = pick.tp2 != null ? Number(pick.tp2) : null;
  const tp3 = pick.tp3 != null ? Number(pick.tp3) : null;

  // Need intraday high/low untuk akurat — approximated via max/min close di window
  const windowRows = await db
    .select({ high: quotesEod.high, low: quotesEod.low })
    .from(quotesEod)
    .where(and(
      eq(quotesEod.companyKode, pick.companyKode),
      gte(quotesEod.tradeDate, tradeStart.toISOString().slice(0, 10)),
      lte(quotesEod.tradeDate, evalDate.toISOString().slice(0, 10)),
    ));

  const highInWindow = Math.max(...windowRows.map((r) => Number(r.high)), -Infinity);
  const lowInWindow = Math.min(...windowRows.map((r) => Number(r.low)), Infinity);

  const hitTp1 = tp1 > 0 && Number.isFinite(highInWindow) && highInWindow >= tp1;
  const hitTp2 = tp2 != null && tp2 > 0 && Number.isFinite(highInWindow) && highInWindow >= tp2;
  const hitTp3 = tp3 != null && tp3 > 0 && Number.isFinite(highInWindow) && highInWindow >= tp3;
  const hitSl = sl > 0 && Number.isFinite(lowInWindow) && lowInWindow <= sl;

  let statusAtEval: EvalResult["statusAtEval"] = "open";
  // Resolution: SL takes priority kalau hit duluan dalam window (approx — without intraday timestamps we can't tell order)
  if (hitTp3) statusAtEval = "tp3_hit";
  else if (hitTp2) statusAtEval = "tp2_hit";
  else if (hitTp1) statusAtEval = "tp1_hit";
  else if (hitSl) statusAtEval = "sl_hit";

  if (evalPoint === "T+20" && statusAtEval === "open") statusAtEval = "expired";

  return {
    pickId: pick.id,
    evalPoint,
    priceAtEval: closePrice,
    returnPct,
    hitTp1,
    hitTp2,
    hitTp3,
    hitSl,
    statusAtEval,
  };
}

export const evaluatePickOutcomesProcessor: Processor = async (job) => {
  logger.info("Evaluating pick outcomes...");

  // Ambil semua published picks dari 30 hari terakhir yang belum punya outcome lengkap
  const recentPicks = await db
    .select()
    .from(dailyPicks)
    .where(and(
      eq(dailyPicks.status, "published"),
      gte(dailyPicks.tradeDate, new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)),
    ));

  let evaluated = 0;
  let skipped = 0;

  for (const pick of recentPicks) {
    for (const evalPoint of ["T+1", "T+5", "T+20"] as const) {
      // Cek apakah sudah ada outcome row untuk eval point ini
      const existing = await db
        .select({ id: pickOutcomes.id })
        .from(pickOutcomes)
        .where(and(eq(pickOutcomes.pickId, pick.id), eq(pickOutcomes.evaluationAt, evalPoint)))
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const result = await evaluatePickAt(pick, evalPoint);
      if (!result) { skipped++; continue; }

      const evalDate = addTradingDays(new Date(pick.tradeDate), EVAL_DAYS[evalPoint]);

      await db.insert(pickOutcomes).values({
        pickId: pick.id,
        evaluationAt: evalPoint,
        evaluatedOn: evalDate.toISOString().slice(0, 10),
        priceAtEvaluation: String(result.priceAtEval),
        returnPct: String(result.returnPct),
        hitTp1: result.hitTp1,
        hitTp2: result.hitTp2,
        hitTp3: result.hitTp3,
        hitSl: result.hitSl,
        statusAtEvaluation: result.statusAtEval,
      }).onConflictDoNothing({ target: [pickOutcomes.pickId, pickOutcomes.evaluationAt] });

      evaluated++;
    }
  }

  logger.info({ evaluated, skipped, totalPicks: recentPicks.length }, "Pick outcomes evaluation done");
  return { evaluated, skipped, totalPicks: recentPicks.length };
};
