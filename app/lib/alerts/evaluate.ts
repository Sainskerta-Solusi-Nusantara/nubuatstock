import type {
  AlertCondition,
  AlertEvaluationContext,
  AlertEvaluationResult,
} from "@/lib/types/alerts";

/**
 * Pure evaluator. Tidak boleh I/O. Caller (worker) menyiapkan `ctx` dari market-data.
 *
 * Kontrak return:
 *   triggered=true → kondisi terpenuhi saat ini.
 *   snapshot      → angka konkret yang men-trigger, untuk audit & user-facing display.
 *
 * Edge cases:
 *   - Data nullable yang dibutuhkan tidak ada → triggered=false (skip).
 *   - Divide-by-zero pada prevClose=0 → triggered=false.
 */
export function evaluateCondition(
  condition: AlertCondition,
  ctx: AlertEvaluationContext,
): AlertEvaluationResult {
  switch (condition.type) {
    case "price_above": {
      const { value } = condition.params;
      if (ctx.last == null) return skip();
      const triggered = ctx.last > value;
      return {
        triggered,
        snapshot: {
          type: condition.type,
          threshold: value,
          last: ctx.last,
          asOf: ctx.asOf,
        },
      };
    }
    case "price_below": {
      const { value } = condition.params;
      if (ctx.last == null) return skip();
      const triggered = ctx.last < value;
      return {
        triggered,
        snapshot: {
          type: condition.type,
          threshold: value,
          last: ctx.last,
          asOf: ctx.asOf,
        },
      };
    }
    case "pct_change": {
      const { window, changePct, direction } = condition.params;
      const pct =
        window === "1d"
          ? ctx.changePctDay
          : window === "1w"
            ? ctx.changePctWeek
            : ctx.changePctMonth;
      if (pct == null) return skip();
      const triggered = direction === "up" ? pct >= changePct : pct <= -Math.abs(changePct);
      return {
        triggered,
        snapshot: {
          type: condition.type,
          window,
          observed: pct,
          threshold: changePct,
          direction,
          asOf: ctx.asOf,
        },
      };
    }
    case "volume_spike": {
      const { multiple } = condition.params;
      if (ctx.volume == null || !ctx.volumeAvg || ctx.volumeAvg <= 0) return skip();
      const ratio = ctx.volume / ctx.volumeAvg;
      const triggered = ratio >= multiple;
      return {
        triggered,
        snapshot: {
          type: condition.type,
          volume: ctx.volume,
          avg: ctx.volumeAvg,
          ratio,
          multiple,
          asOf: ctx.asOf,
        },
      };
    }
    case "ma_cross": {
      const { fast, slow, direction } = condition.params;
      const fastNow = ctx.ma[String(fast)] ?? null;
      const slowNow = ctx.ma[String(slow)] ?? null;
      const fastPrev = ctx.maPrev[String(fast)] ?? null;
      const slowPrev = ctx.maPrev[String(slow)] ?? null;
      if (
        fastNow == null ||
        slowNow == null ||
        fastPrev == null ||
        slowPrev == null
      ) {
        return skip();
      }
      const wasBelow = fastPrev < slowPrev;
      const isAbove = fastNow > slowNow;
      const isBelow = fastNow < slowNow;
      const wasAbove = fastPrev > slowPrev;
      const triggered =
        direction === "golden" ? wasBelow && isAbove : wasAbove && isBelow;
      return {
        triggered,
        snapshot: {
          type: condition.type,
          fast,
          slow,
          fastNow,
          slowNow,
          fastPrev,
          slowPrev,
          direction,
          asOf: ctx.asOf,
        },
      };
    }
    case "rsi_threshold": {
      const { period, threshold, direction } = condition.params;
      const value = ctx.rsi[String(period)] ?? null;
      if (value == null) return skip();
      const triggered = direction === "above" ? value >= threshold : value <= threshold;
      return {
        triggered,
        snapshot: {
          type: condition.type,
          period,
          value,
          threshold,
          direction,
          asOf: ctx.asOf,
        },
      };
    }
    default: {
      // Exhaustiveness: TypeScript memastikan switch lengkap; default = skip.
      return skip();
    }
  }
}

function skip(): AlertEvaluationResult {
  return { triggered: false, snapshot: {} };
}
