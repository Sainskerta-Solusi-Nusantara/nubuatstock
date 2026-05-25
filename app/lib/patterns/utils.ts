import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Common utilities untuk pattern detection algorithms.
 */

export interface Pivot {
  index: number;
  date: string;
  price: number;
  type: "high" | "low";
}

/**
 * ZigZag pivot detection — find swing highs/lows yang move >= thresholdPct.
 * Standard di technical analysis.
 *
 * @param bars OHLCV chronological
 * @param thresholdPct Min % move untuk register pivot (default 3% untuk daily)
 */
export function findPivots(bars: OhlcvBar[], thresholdPct = 3): Pivot[] {
  if (bars.length < 3) return [];

  const pivots: Pivot[] = [];
  let lastPivot: Pivot = {
    index: 0,
    date: bars[0]!.date,
    price: bars[0]!.close,
    type: "low", // arbitrary start
  };

  let pendingHigh: Pivot | null = null;
  let pendingLow: Pivot | null = null;

  for (let i = 1; i < bars.length; i += 1) {
    const b = bars[i]!;
    const movePctUp = ((b.high - lastPivot.price) / lastPivot.price) * 100;
    const movePctDown = ((lastPivot.price - b.low) / lastPivot.price) * 100;

    // Update pending pivots
    if (pendingHigh && b.high > pendingHigh.price) {
      pendingHigh = { index: i, date: b.date, price: b.high, type: "high" };
    }
    if (pendingLow && b.low < pendingLow.price) {
      pendingLow = { index: i, date: b.date, price: b.low, type: "low" };
    }

    if (lastPivot.type === "low") {
      // Looking for high
      if (!pendingHigh) {
        pendingHigh = { index: i, date: b.date, price: b.high, type: "high" };
      }
      if (movePctUp >= thresholdPct) {
        // Pull back from pending high by 2x threshold? Simpler: confirm pivot
        const drawdownPct = ((pendingHigh.price - b.low) / pendingHigh.price) * 100;
        if (drawdownPct >= thresholdPct * 0.6) {
          pivots.push(pendingHigh);
          lastPivot = pendingHigh;
          pendingHigh = null;
          pendingLow = { index: i, date: b.date, price: b.low, type: "low" };
        }
      }
    } else {
      // Looking for low
      if (!pendingLow) {
        pendingLow = { index: i, date: b.date, price: b.low, type: "low" };
      }
      if (movePctDown >= thresholdPct) {
        const recoveryPct = ((b.high - pendingLow.price) / pendingLow.price) * 100;
        if (recoveryPct >= thresholdPct * 0.6) {
          pivots.push(pendingLow);
          lastPivot = pendingLow;
          pendingLow = null;
          pendingHigh = { index: i, date: b.date, price: b.high, type: "high" };
        }
      }
    }
  }

  return pivots;
}

/** Linear regression slope (for trendline). Returns slope in price units per bar. */
export function linearSlope(points: Array<{ x: number; y: number }>): number {
  const n = points.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Returns average of values */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Returns standard deviation (population) */
export function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
