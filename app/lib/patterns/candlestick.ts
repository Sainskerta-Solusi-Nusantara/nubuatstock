import type { OhlcvBar } from "@/lib/types/picks";
import type { PatternMatch } from "./types";

/**
 * Candlestick pattern detectors — focus pada last 1-3 bars (recent signal).
 *
 * Approach: tiap detector return MAX 1 match (the most recent occurrence in last 3 bars).
 *
 * Convention untuk candle metrics:
 *   - body = |close - open|
 *   - upperWick = high - max(open, close)
 *   - lowerWick = min(open, close) - low
 *   - range = high - low
 *   - isBullish = close > open
 *   - isBearish = close < open
 */

interface CandleMetrics {
  body: number;
  upperWick: number;
  lowerWick: number;
  range: number;
  isBullish: boolean;
  isBearish: boolean;
  midpoint: number;
}

function metrics(bar: OhlcvBar): CandleMetrics {
  const body = Math.abs(bar.close - bar.open);
  const upperWick = bar.high - Math.max(bar.open, bar.close);
  const lowerWick = Math.min(bar.open, bar.close) - bar.low;
  const range = bar.high - bar.low;
  return {
    body,
    upperWick,
    lowerWick,
    range,
    isBullish: bar.close > bar.open,
    isBearish: bar.close < bar.open,
    midpoint: (bar.open + bar.close) / 2,
  };
}

const RANGE_MIN_PCT = 0.005; // Skip ultra-flat bars (range < 0.5% of price)

/**
 * Hammer / Inverted Hammer — bullish reversal di downtrend.
 * - Hammer: lower wick ≥ 2× body, upper wick kecil
 * - Inverted Hammer: upper wick ≥ 2× body, lower wick kecil
 */
export function detectHammer(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];

  for (let i = bars.length - 1; i >= Math.max(0, bars.length - 3); i -= 1) {
    const b = bars[i]!;
    const m = metrics(b);
    if (m.range < b.close * RANGE_MIN_PCT) continue;
    if (m.body === 0) continue;

    // Trend filter: ada downtrend ≥ 3% di 5 bar sebelumnya
    const start = Math.max(0, i - 5);
    const priceStart = bars[start]!.close;
    const trend = ((b.close - priceStart) / priceStart) * 100;
    if (trend > -3) continue;

    // Hammer
    if (m.lowerWick >= 2 * m.body && m.upperWick <= m.body * 0.5) {
      return [{
        patternType: "hammer", // Reuse — TODO: add 'hammer' type
        category: "candlestick",
        direction: "bullish",
        status: "completed",
        startIndex: i,
        endIndex: i,
        confidence: 0.7,
        keyLevels: {
          breakout: b.high,
          target: b.high + (b.high - b.low),
          stop: b.low,
        },
        volumeConfirmation: false,
        narrative: `Hammer di ${b.date} setelah downtrend ${trend.toFixed(1)}%. Lower wick ${(m.lowerWick / m.body).toFixed(1)}× body — buyers reject lower prices. Bullish reversal candidate.`,
      }];
    }
  }
  return [];
}

/**
 * Bullish Engulfing — bar 2 fully engulfs bar 1's body, opposite color.
 */
export function detectBullishEngulfing(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];
  for (let i = bars.length - 1; i >= Math.max(1, bars.length - 3); i -= 1) {
    const b1 = bars[i - 1]!;
    const b2 = bars[i]!;
    const m1 = metrics(b1);
    const m2 = metrics(b2);
    if (m2.range < b2.close * RANGE_MIN_PCT) continue;
    if (!m1.isBearish || !m2.isBullish) continue;

    // b2 body engulfs b1 body
    if (b2.open <= b1.close && b2.close >= b1.open && m2.body > m1.body) {
      // Trend filter
      const start = Math.max(0, i - 5);
      const trend = ((b2.close - bars[start]!.close) / bars[start]!.close) * 100;
      if (trend > 0) continue; // Need prior downtrend

      return [{
        patternType: "bullish_engulfing",
        category: "candlestick",
        direction: "bullish",
        status: "completed",
        startIndex: i - 1,
        endIndex: i,
        confidence: 0.75,
        keyLevels: {
          breakout: b2.high,
          target: b2.high + m2.body,
          stop: b2.low,
        },
        volumeConfirmation: b2.volume > b1.volume * 1.2,
        narrative: `Bullish Engulfing di ${b2.date}: bar hijau menelan body bar merah sebelumnya. ${b2.volume > b1.volume * 1.2 ? "Volume konfirmasi. " : ""}Bullish reversal signal.`,
      }];
    }
  }
  return [];
}

/**
 * Bearish Engulfing
 */
export function detectBearishEngulfing(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];
  for (let i = bars.length - 1; i >= Math.max(1, bars.length - 3); i -= 1) {
    const b1 = bars[i - 1]!;
    const b2 = bars[i]!;
    const m1 = metrics(b1);
    const m2 = metrics(b2);
    if (m2.range < b2.close * RANGE_MIN_PCT) continue;
    if (!m1.isBullish || !m2.isBearish) continue;
    if (b2.open >= b1.close && b2.close <= b1.open && m2.body > m1.body) {
      const start = Math.max(0, i - 5);
      const trend = ((b2.close - bars[start]!.close) / bars[start]!.close) * 100;
      if (trend < 0) continue;
      return [{
        patternType: "bearish_engulfing",
        category: "candlestick",
        direction: "bearish",
        status: "completed",
        startIndex: i - 1,
        endIndex: i,
        confidence: 0.75,
        keyLevels: {
          breakout: b2.low,
          target: b2.low - m2.body,
          stop: b2.high,
        },
        volumeConfirmation: b2.volume > b1.volume * 1.2,
        narrative: `Bearish Engulfing di ${b2.date}: bar merah menelan body bar hijau sebelumnya. ${b2.volume > b1.volume * 1.2 ? "Volume konfirmasi. " : ""}Bearish reversal signal.`,
      }];
    }
  }
  return [];
}

/**
 * Morning Star — 3-bar bullish reversal:
 *   Bar 1: long bearish
 *   Bar 2: small body (any color), gap down
 *   Bar 3: long bullish, close > Bar 1 midpoint
 */
export function detectMorningStar(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];
  for (let i = bars.length - 1; i >= Math.max(2, bars.length - 3); i -= 1) {
    const b1 = bars[i - 2]!;
    const b2 = bars[i - 1]!;
    const b3 = bars[i]!;
    const m1 = metrics(b1);
    const m2 = metrics(b2);
    const m3 = metrics(b3);
    if (!m1.isBearish || !m3.isBullish) continue;
    if (m1.body < b1.close * 0.015) continue; // Bar 1 must be substantial
    if (m2.body > m1.body * 0.4) continue; // Bar 2 small body
    if (m3.body < b3.close * 0.015) continue; // Bar 3 substantial
    if (b3.close < m1.midpoint) continue; // Bar 3 must penetrate bar 1 midpoint
    return [{
      patternType: "morning_star",
      category: "candlestick",
      direction: "bullish",
      status: "completed",
      startIndex: i - 2,
      endIndex: i,
      confidence: 0.75,
      keyLevels: {
        breakout: b3.high,
        target: b3.high + (b1.open - b3.low),
        stop: b2.low,
      },
      volumeConfirmation: false,
      narrative: `Morning Star di ${b3.date}: long red → small indecision → long green yang menembus midpoint bar pertama. Bullish reversal 3-bar pattern.`,
    }];
  }
  return [];
}

/**
 * Evening Star — mirror Morning Star.
 */
export function detectEveningStar(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];
  for (let i = bars.length - 1; i >= Math.max(2, bars.length - 3); i -= 1) {
    const b1 = bars[i - 2]!;
    const b2 = bars[i - 1]!;
    const b3 = bars[i]!;
    const m1 = metrics(b1);
    const m2 = metrics(b2);
    const m3 = metrics(b3);
    if (!m1.isBullish || !m3.isBearish) continue;
    if (m1.body < b1.close * 0.015) continue;
    if (m2.body > m1.body * 0.4) continue;
    if (m3.body < b3.close * 0.015) continue;
    if (b3.close > m1.midpoint) continue;
    return [{
      patternType: "evening_star",
      category: "candlestick",
      direction: "bearish",
      status: "completed",
      startIndex: i - 2,
      endIndex: i,
      confidence: 0.75,
      keyLevels: {
        breakout: b3.low,
        target: b3.low - (b3.high - b1.open),
        stop: b2.high,
      },
      volumeConfirmation: false,
      narrative: `Evening Star di ${b3.date}: long green → small indecision → long red. Bearish reversal 3-bar pattern.`,
    }];
  }
  return [];
}

/**
 * Shooting Star — bearish reversal: small body bottom, long upper wick (≥ 2× body), little lower wick.
 */
export function detectShootingStar(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];
  for (let i = bars.length - 1; i >= Math.max(0, bars.length - 3); i -= 1) {
    const b = bars[i]!;
    const m = metrics(b);
    if (m.range < b.close * RANGE_MIN_PCT) continue;
    if (m.body === 0) continue;
    if (m.upperWick < 2 * m.body) continue;
    if (m.lowerWick > m.body * 0.5) continue;
    const start = Math.max(0, i - 5);
    const trend = ((b.close - bars[start]!.close) / bars[start]!.close) * 100;
    if (trend < 3) continue; // need prior uptrend
    return [{
      patternType: "shooting_star",
      category: "candlestick",
      direction: "bearish",
      status: "completed",
      startIndex: i,
      endIndex: i,
      confidence: 0.65,
      keyLevels: {
        breakout: b.low,
        target: b.low - (b.high - b.low),
        stop: b.high,
      },
      volumeConfirmation: false,
      narrative: `Shooting Star di ${b.date} setelah uptrend ${trend.toFixed(1)}%. Upper wick ${(m.upperWick / m.body).toFixed(1)}× body — buyers exhausted. Bearish reversal candidate.`,
    }];
  }
  return [];
}

/**
 * Doji — small body relative to range (≤ 5%). Indecision signal.
 * Only detect at trend extremes.
 */
export function detectDoji(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 5) return [];
  const i = bars.length - 1;
  const b = bars[i]!;
  const m = metrics(b);
  if (m.range < b.close * RANGE_MIN_PCT) return [];
  if (m.body > m.range * 0.1) return []; // Body ≤ 10% of range
  const start = Math.max(0, i - 5);
  const trend = ((b.close - bars[start]!.close) / bars[start]!.close) * 100;
  if (Math.abs(trend) < 3) return []; // Only meaningful at trend extreme
  const direction: "bullish" | "bearish" = trend > 0 ? "bearish" : "bullish";
  return [{
    patternType: "doji",
    category: "candlestick",
    direction,
    status: "completed",
    startIndex: i,
    endIndex: i,
    confidence: 0.55,
    keyLevels: {
      breakout: direction === "bullish" ? b.high : b.low,
      target: direction === "bullish" ? b.high + m.range : b.low - m.range,
      stop: direction === "bullish" ? b.low : b.high,
    },
    volumeConfirmation: false,
    narrative: `Doji di ${b.date} setelah ${trend > 0 ? "uptrend" : "downtrend"} ${trend.toFixed(1)}%. Indecision — pasar pause, kemungkinan reversal ${direction}.`,
  }];
}

export const CANDLESTICK_DETECTORS = [
  detectHammer,
  detectShootingStar,
  detectBullishEngulfing,
  detectBearishEngulfing,
  detectMorningStar,
  detectEveningStar,
  detectDoji,
];

export function detectCandlestickPatterns(bars: OhlcvBar[]): PatternMatch[] {
  const all: PatternMatch[] = [];
  for (const detector of CANDLESTICK_DETECTORS) {
    try {
      all.push(...detector(bars));
    } catch {
      // skip
    }
  }
  return all;
}
