/**
 * Pure (DB-free) logic for Daily Picks outcome evaluation.
 *
 * Diekstrak dari `worker/jobs/evaluate-pick-outcomes.ts` agar matematika
 * T+1/T+5/T+20 (hit SL/TP, resolusi status, return %) bisa di-unit-test
 * tanpa DB (gap audit §8.3 #13).
 *
 * Semua fungsi di sini deterministik dan tidak menyentuh DB/IO.
 */

export type Evaluation = "T+1" | "T+5" | "T+20" | "final";

/** Trading days offset per evaluation point. */
export const EVAL_DAYS: Record<Evaluation, number> = {
  "T+1": 1,
  "T+5": 5,
  "T+20": 20,
  final: 20,
};

export type OutcomeStatus =
  | "open"
  | "tp1_hit"
  | "tp2_hit"
  | "tp3_hit"
  | "sl_hit"
  | "expired";

/**
 * Add `n` trading days to `start`, skipping Sat/Sun.
 * Approximate — doesn't account for exchange holidays (close enough for MVP).
 */
export function addTradingDays(start: Date, n: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

/** Return as a fraction: (close - entry) / entry. */
export function computeReturnPct(closePrice: number, entry: number): number {
  return (closePrice - entry) / entry;
}

/**
 * Resolve the outcome status from the hit flags.
 *
 * Resolution: highest TP reached wins; SL only if no TP hit.
 * (Approx — without intraday timestamps we can't tell ordering, so highest
 * level reached in the window takes priority, matching worker behavior.)
 *
 * `expired` is applied only when nothing was hit AND this is the terminal
 * (T+20) evaluation point.
 */
export function resolveOutcomeStatus(args: {
  hitTp1: boolean;
  hitTp2: boolean;
  hitTp3: boolean;
  hitSl: boolean;
  isTerminal: boolean;
}): OutcomeStatus {
  const { hitTp1, hitTp2, hitTp3, hitSl, isTerminal } = args;

  let status: OutcomeStatus = "open";
  if (hitTp3) status = "tp3_hit";
  else if (hitTp2) status = "tp2_hit";
  else if (hitTp1) status = "tp1_hit";
  else if (hitSl) status = "sl_hit";

  if (isTerminal && status === "open") status = "expired";

  return status;
}

export interface PickLevels {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
}

export interface OutcomeEvaluation {
  priceAtEval: number;
  returnPct: number;
  hitTp1: boolean;
  hitTp2: boolean;
  hitTp3: boolean;
  hitSl: boolean;
  statusAtEval: OutcomeStatus;
}

/**
 * Evaluate a pick's outcome given the close price at the evaluation point and
 * the window's high/low extremes between trade start and the eval date.
 *
 * TP is hit when window high reaches the level; SL is hit when window low
 * reaches it (covers gap-open through a level). Levels ≤ 0 are treated as
 * "not set" and never count as hit.
 *
 * @param closePrice close at the evaluation date
 * @param highInWindow max high observed in [tradeStart, evalDate]
 * @param lowInWindow  min low observed in [tradeStart, evalDate]
 * @param levels       entry / sl / tp levels
 * @param isTerminal   true for the terminal (T+20) evaluation point
 */
export function evaluatePickAt(
  closePrice: number,
  highInWindow: number,
  lowInWindow: number,
  levels: PickLevels,
  isTerminal: boolean,
): OutcomeEvaluation {
  const { entry, sl, tp1, tp2, tp3 } = levels;

  const returnPct = computeReturnPct(closePrice, entry);

  const hitTp1 = tp1 > 0 && Number.isFinite(highInWindow) && highInWindow >= tp1;
  const hitTp2 =
    tp2 != null && tp2 > 0 && Number.isFinite(highInWindow) && highInWindow >= tp2;
  const hitTp3 =
    tp3 != null && tp3 > 0 && Number.isFinite(highInWindow) && highInWindow >= tp3;
  const hitSl = sl > 0 && Number.isFinite(lowInWindow) && lowInWindow <= sl;

  const statusAtEval = resolveOutcomeStatus({
    hitTp1,
    hitTp2,
    hitTp3,
    hitSl,
    isTerminal,
  });

  return {
    priceAtEval: closePrice,
    returnPct,
    hitTp1,
    hitTp2,
    hitTp3,
    hitSl,
    statusAtEval,
  };
}
