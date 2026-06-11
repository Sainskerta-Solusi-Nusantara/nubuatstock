import type { Processor } from "bullmq";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks, pickOutcomes } from "@/db/schema/picks";
import { quotesEod } from "@/db/schema/market";
import { logger } from "@/lib/logger";
import {
  EVAL_DAYS,
  addTradingDays,
  evaluatePickAt as evaluateOutcome,
  resolveVerdict,
  type Evaluation,
  type Verdict,
} from "@/lib/picks/outcome";
import { resolveSlBeforeTp } from "@/lib/picks/intraday-resolve";

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
  verdict: Verdict;
}

/**
 * Tentukan verdict winrate jujur. Saat TP1 & SL dua-duanya tersentuh menurut
 * EOD, resolusi urutan via intraday 5-menit (on-the-fly). Selain itu tak perlu
 * fetch intraday.
 */
async function computeVerdict(
  pick: typeof dailyPicks.$inferSelect,
  evalPoint: Evaluation,
  hitTp1: boolean,
  hitSl: boolean,
): Promise<Verdict> {
  const isTerminal = evalPoint === "T+20";
  let slBeforeTp: boolean | null = null;
  if (hitTp1 && hitSl) {
    const evalDate = addTradingDays(new Date(pick.tradeDate), EVAL_DAYS[evalPoint]);
    const tp1 = Number(pick.tp1 ?? 0);
    const sl = Number(pick.stopLoss ?? 0);
    slBeforeTp = await resolveSlBeforeTp(
      pick.companyKode,
      pick.tradeDate,
      evalDate.toISOString().slice(0, 10),
      tp1,
      sl,
    );
  }
  return resolveVerdict({ hitTp1, hitSl, slBeforeTp, isTerminal });
}

async function evaluatePickAt(pick: typeof dailyPicks.$inferSelect, evalPoint: Evaluation): Promise<EvalResult | null> {
  const tradeStart = new Date(pick.tradeDate);
  const evalDate = addTradingDays(tradeStart, EVAL_DAYS[evalPoint]);

  // Kalau eval date masih masa depan, skip
  if (evalDate > new Date()) return null;

  const closePrice = await getCloseAt(pick.companyKode, evalDate);
  if (closePrice == null) return null;

  const entry = pick.entryZoneLow != null ? Number(pick.entryZoneLow) : Number(pick.entryZoneHigh ?? 0);
  if (entry === 0) return null;

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

  // Pure math: hit detection, return %, status resolution.
  const outcome = evaluateOutcome(
    closePrice,
    highInWindow,
    lowInWindow,
    {
      entry,
      sl: Number(pick.stopLoss ?? 0),
      tp1: Number(pick.tp1 ?? 0),
      tp2: pick.tp2 != null ? Number(pick.tp2) : null,
      tp3: pick.tp3 != null ? Number(pick.tp3) : null,
    },
    evalPoint === "T+20",
  );

  const verdict = await computeVerdict(pick, evalPoint, outcome.hitTp1, outcome.hitSl);

  return { pickId: pick.id, evalPoint, ...outcome, verdict };
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
  let backfilled = 0;
  let skipped = 0;

  for (const pick of recentPicks) {
    for (const evalPoint of ["T+1", "T+5", "T+20"] as const) {
      // Cek apakah sudah ada outcome row untuk eval point ini
      const existing = await db
        .select({
          id: pickOutcomes.id,
          verdict: pickOutcomes.verdict,
          hitTp1: pickOutcomes.hitTp1,
          hitSl: pickOutcomes.hitSl,
        })
        .from(pickOutcomes)
        .where(and(eq(pickOutcomes.pickId, pick.id), eq(pickOutcomes.evaluationAt, evalPoint)))
        .limit(1);

      if (existing.length > 0) {
        const row = existing[0]!;
        // Sudah final (win/loss/expired/open) → skip. Verdict null (row lama) atau
        // "ambiguous" (resolusi intraday belum berhasil) → (re)resolve. Ambiguous
        // di-retry tiap run karena intraday bisa baru tersedia / sempat error transien.
        if (row.verdict != null && row.verdict !== "ambiguous") { skipped++; continue; }
        const verdict = await computeVerdict(pick, evalPoint, row.hitTp1, row.hitSl);
        await db.update(pickOutcomes).set({ verdict }).where(eq(pickOutcomes.id, row.id));
        backfilled++;
        continue;
      }

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
        verdict: result.verdict,
      }).onConflictDoNothing({ target: [pickOutcomes.pickId, pickOutcomes.evaluationAt] });

      evaluated++;
    }
  }

  logger.info({ evaluated, backfilled, skipped, totalPicks: recentPicks.length }, "Pick outcomes evaluation done");
  return { evaluated, backfilled, skipped, totalPicks: recentPicks.length };
};
