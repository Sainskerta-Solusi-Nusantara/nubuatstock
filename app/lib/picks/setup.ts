import { adx, bollinger, ema, macd, rsi, sma } from "./indicators";
import type {
  ClassifiedSetup,
  Confidence,
  OhlcvBar,
  SetupType,
  TimeHorizon,
} from "@/lib/types/picks";

/**
 * Setup classifier. Rule-based, pure function.
 *
 * Mengkategorisasi pola harga ke salah satu setup_type:
 *   continuation | reversal | breakout | pullback | range
 *
 * Dan menentukan time_horizon serta confidence. Tidak ada hardcode threshold
 * harga absolut — semua relative ke ATR / persentase.
 */

export interface ClassifyArgs {
  bars: OhlcvBar[];
}

export function classifySetup({ bars }: ClassifyArgs): ClassifiedSetup {
  if (bars.length < 50) {
    return { setupType: "range", timeHorizon: "swing_3_5d", confidence: "low" };
  }
  const closes = bars.map((b) => b.close);
  const last = closes.at(-1)!;
  const sma20 = sma(closes, 20).at(-1) ?? null;
  const sma50 = sma(closes, 50).at(-1) ?? null;
  const sma200 = closes.length >= 200 ? sma(closes, 200).at(-1) ?? null : null;
  const ema20 = ema(closes, 20).at(-1) ?? null;
  const rsi14 = rsi(closes, 14).at(-1) ?? null;
  const macdResult = macd(closes);
  const macdLast = macdResult.macd.at(-1) ?? null;
  const signalLast = macdResult.signal.at(-1) ?? null;
  const histLast = macdResult.histogram.at(-1) ?? null;
  const histPrev = macdResult.histogram.at(-2) ?? null;
  const bb = bollinger(closes, 20, 2);
  const bbWidthLast = bb.bandwidth.at(-1) ?? null;
  const bbWidthPrev20 = bb.bandwidth
    .slice(-40, -1)
    .filter((v): v is number => v !== null);
  const bbWidthMedian =
    bbWidthPrev20.length > 0 ? median(bbWidthPrev20) : bbWidthLast ?? 0;
  const adxLast = adx(bars, 14).at(-1) ?? null;
  const trendUp =
    sma20 !== null && sma50 !== null && last > sma20 && sma20 > sma50;
  const trendDown =
    sma20 !== null && sma50 !== null && last < sma20 && sma20 < sma50;

  // BREAKOUT: konsolidasi (BB width kompresi) + harga break atas range
  if (
    bbWidthLast !== null &&
    bbWidthMedian > 0 &&
    bbWidthLast < bbWidthMedian * 0.7 &&
    last >= (bb.upper.at(-1) ?? Infinity) * 0.99
  ) {
    return {
      setupType: "breakout",
      timeHorizon: "swing_3_5d",
      confidence: pickConfidence([adxLast, rsi14], "breakout"),
    };
  }

  // REVERSAL: oversold (RSI<35) + histogram MACD turning up
  if (
    rsi14 !== null &&
    rsi14 < 38 &&
    histLast !== null &&
    histPrev !== null &&
    histLast > histPrev
  ) {
    return {
      setupType: "reversal",
      timeHorizon: "swing_1_3w",
      confidence: pickConfidence([adxLast, rsi14], "reversal"),
    };
  }

  // PULLBACK: trend up, harga test EMA20 / SMA20
  if (trendUp && ema20 !== null && last >= ema20 * 0.97 && last <= ema20 * 1.02) {
    return {
      setupType: "pullback",
      timeHorizon: "swing_3_5d",
      confidence: pickConfidence([adxLast, rsi14], "pullback"),
    };
  }

  // CONTINUATION: trend up persisten + RSI sweet spot 50-70 + MACD positif
  if (
    trendUp &&
    rsi14 !== null &&
    rsi14 >= 50 &&
    rsi14 <= 72 &&
    macdLast !== null &&
    signalLast !== null &&
    macdLast > signalLast
  ) {
    return {
      setupType: "continuation",
      timeHorizon: sma200 !== null && last > sma200 ? "swing_1_3w" : "swing_3_5d",
      confidence: pickConfidence([adxLast, rsi14], "continuation"),
    };
  }

  // Default: range — low ADX
  return {
    setupType: "range",
    timeHorizon: "swing_3_5d",
    confidence: trendDown ? "low" : pickConfidence([adxLast, rsi14], "range"),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

function pickConfidence(
  signals: (number | null)[],
  setup: SetupType,
): Confidence {
  const adxLast = signals[0];
  const rsi14 = signals[1];
  if (adxLast == null || rsi14 == null) return "low";
  if (setup === "breakout" || setup === "continuation") {
    if (adxLast > 30 && rsi14 > 55) return "high";
    if (adxLast > 22) return "medium";
    return "low";
  }
  if (setup === "reversal") {
    if (rsi14 < 28) return "high";
    if (rsi14 < 35) return "medium";
    return "low";
  }
  if (setup === "pullback") {
    if (adxLast > 25) return "high";
    if (adxLast > 18) return "medium";
    return "low";
  }
  return "low";
}

export type { TimeHorizon };
