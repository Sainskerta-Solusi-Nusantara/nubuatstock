import { atr } from "./indicators";
import type { ComputedLevels, OhlcvBar } from "@/lib/types/picks";

/**
 * Support/Resistance & SL/TP calculator. Pure function.
 *
 * Pendekatan:
 *  - Pivot fractal: bar dianggap pivot high kalau high > N bar kiri & kanan;
 *    pivot low simetris.
 *  - Cluster pivot dalam radius (0.5 * ATR14) untuk dapatkan zona (low, high).
 *  - Entry zone = support cluster terdekat di bawah harga close terbaru
 *    (untuk continuation / pullback). Untuk breakout, entry = above resistance + small buffer.
 *  - SL = min(swing_low_20d, entry - 1.5 * ATR14), clip ke support terdekat di bawahnya.
 *  - TP1 = 1R, TP2 = 2R, TP3 = next resistance jika > 2R.
 */

interface PivotCluster {
  low: number;
  high: number;
  touches: number;
  lastIndex: number;
}

function findPivots(bars: OhlcvBar[], left = 3, right = 3): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = left; i < bars.length - right; i += 1) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j += 1) {
      if (j === i) continue;
      if (bars[j]!.high >= bars[i]!.high) isHigh = false;
      if (bars[j]!.low <= bars[i]!.low) isLow = false;
    }
    if (isHigh) highs.push(bars[i]!.high);
    if (isLow) lows.push(bars[i]!.low);
  }
  return { highs, lows };
}

function clusterLevels(levels: number[], tolerance: number): PivotCluster[] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: PivotCluster[] = [];
  let current: PivotCluster = { low: sorted[0]!, high: sorted[0]!, touches: 1, lastIndex: 0 };
  for (let i = 1; i < sorted.length; i += 1) {
    const v = sorted[i]!;
    if (v - current.high <= tolerance) {
      current.high = v;
      current.touches += 1;
      current.lastIndex = i;
    } else {
      clusters.push(current);
      current = { low: v, high: v, touches: 1, lastIndex: i };
    }
  }
  clusters.push(current);
  return clusters;
}

export interface FindLevelsResult {
  supports: PivotCluster[];
  resistances: PivotCluster[];
  atr14: number;
  lastClose: number;
}

export function findSupportResistance(bars: OhlcvBar[], lookback = 60): FindLevelsResult {
  const window = bars.slice(-Math.min(lookback, bars.length));
  if (window.length < 10) {
    return { supports: [], resistances: [], atr14: 0, lastClose: window.at(-1)?.close ?? 0 };
  }
  const atrSeries = atr(window, 14);
  const atrLast = atrSeries.at(-1) ?? 0;
  const tolerance = (atrLast || (window.at(-1)!.close * 0.005)) * 0.5;
  const { highs, lows } = findPivots(window);
  const lastClose = window.at(-1)!.close;
  const supports = clusterLevels(lows, tolerance).filter(
    (c) => (c.low + c.high) / 2 < lastClose,
  );
  const resistances = clusterLevels(highs, tolerance).filter(
    (c) => (c.low + c.high) / 2 > lastClose,
  );
  return { supports, resistances, atr14: atrLast ?? 0, lastClose };
}

export type SetupKind = "continuation" | "reversal" | "breakout" | "pullback" | "range";

export interface ComputeLevelsArgs {
  bars: OhlcvBar[];
  setup: SetupKind;
  minRrRatio: number;
}

export interface ComputeLevelsResult extends ComputedLevels {
  rejected: boolean;
  rejectionReason: string | null;
}

export function computeLevels({ bars, setup, minRrRatio }: ComputeLevelsArgs): ComputeLevelsResult {
  const empty: ComputeLevelsResult = {
    entryZoneLow: 0,
    entryZoneHigh: 0,
    stopLoss: 0,
    tp1: 0,
    tp2: null,
    tp3: null,
    atr14: 0,
    rewardRiskRatio: 0,
    rejected: true,
    rejectionReason: "Insufficient bars for levels",
  };
  if (bars.length < 30) return empty;

  const { supports, resistances, atr14, lastClose } = findSupportResistance(bars, 60);
  if (atr14 <= 0 || lastClose <= 0) {
    return { ...empty, rejectionReason: "Invalid ATR or last close" };
  }

  const swingWindow = bars.slice(-20);
  const swingLow20 = Math.min(...swingWindow.map((b) => b.low));
  const swingHigh20 = Math.max(...swingWindow.map((b) => b.high));

  let entryLow: number;
  let entryHigh: number;
  let stopLoss: number;

  if (setup === "breakout") {
    const resistance = resistances[0];
    if (!resistance) return { ...empty, rejectionReason: "No resistance for breakout" };
    entryLow = resistance.high;
    entryHigh = resistance.high + 0.5 * atr14;
    stopLoss = Math.max(swingLow20, entryLow - 1.5 * atr14);
  } else if (setup === "reversal") {
    entryLow = lastClose - 0.3 * atr14;
    entryHigh = lastClose + 0.3 * atr14;
    stopLoss = Math.min(swingLow20, entryLow - 1.5 * atr14);
  } else {
    // continuation, pullback, range → entry di support terdekat
    const support = supports.at(-1);
    if (support) {
      entryLow = support.low;
      entryHigh = support.high;
    } else {
      entryLow = lastClose - 0.5 * atr14;
      entryHigh = lastClose;
    }
    const supportFloor = supports.length > 1 ? supports.at(-2)!.low : swingLow20;
    stopLoss = Math.max(
      Math.min(supportFloor, entryLow - 1.5 * atr14),
      entryLow - 2.5 * atr14,
    );
    if (stopLoss >= entryLow) {
      stopLoss = entryLow - 1.5 * atr14;
    }
  }

  const entry = (entryLow + entryHigh) / 2;
  const risk = entry - stopLoss;
  if (risk <= 0) {
    return { ...empty, atr14, rejectionReason: "Risk <= 0" };
  }

  const tp1 = entry + 1 * risk;
  const tp2 = entry + 2 * risk;
  let tp3: number | null = null;
  // TP3 = next resistance kalau > 2R
  for (const r of resistances) {
    const mid = (r.low + r.high) / 2;
    if (mid > tp2) {
      tp3 = mid;
      break;
    }
  }
  if (tp3 === null && swingHigh20 > tp2) {
    tp3 = swingHigh20;
  }

  // Reward/risk ratio: ambil TP2 sebagai target realistis untuk MVP.
  const reward = tp2 - entry;
  const rr = reward / risk;

  if (rr < minRrRatio) {
    return {
      entryZoneLow: entryLow,
      entryZoneHigh: entryHigh,
      stopLoss,
      tp1,
      tp2,
      tp3,
      atr14,
      rewardRiskRatio: rr,
      rejected: true,
      rejectionReason: `R/R ${rr.toFixed(2)} < ${minRrRatio}`,
    };
  }

  return {
    entryZoneLow: round4(entryLow),
    entryZoneHigh: round4(entryHigh),
    stopLoss: round4(stopLoss),
    tp1: round4(tp1),
    tp2: round4(tp2),
    tp3: tp3 === null ? null : round4(tp3),
    atr14: round4(atr14),
    rewardRiskRatio: round2(rr),
    rejected: false,
    rejectionReason: null,
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
