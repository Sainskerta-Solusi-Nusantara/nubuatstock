import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Pure-function technical indicators. Tidak ada side effect, tidak ada IO.
 * Semua input: array OhlcvBar berurutan dari paling lama → paling baru.
 *
 * Catatan presisi: kalkulasi pakai number (float64). Untuk MVP cukup; nanti
 * bisa di-port ke decimal.js kalau diperlukan presisi pasar.
 */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i]!;
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i += 1) {
    sum += values[i]! - values[i - period]!;
    out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i]!;
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gainSum += diff;
    else lossSum += -diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i]! - values[i - 1]!;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);
  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = fast[i];
    const s = slow[i];
    if (f == null || s == null) return null;
    return f - s;
  });
  // Signal = EMA of macdLine where macdLine != null
  const compact: number[] = [];
  const positions: number[] = [];
  for (let i = 0; i < macdLine.length; i += 1) {
    const v = macdLine[i];
    if (v != null) {
      compact.push(v);
      positions.push(i);
    }
  }
  const signalCompact = ema(compact, signalPeriod);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  for (let j = 0; j < positions.length; j += 1) {
    signal[positions[j]!] = signalCompact[j]!;
  }
  const histogram: (number | null)[] = values.map((_, i) => {
    const m = macdLine[i];
    const s = signal[i];
    if (m == null || s == null) return null;
    return m - s;
  });
  return { macd: macdLine, signal, histogram };
}

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
}

export function bollinger(values: number[], period = 20, stdDevs = 2): BollingerResult {
  const middle = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  const bandwidth: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i += 1) {
    let sumSq = 0;
    const m = middle[i]!;
    for (let j = i - period + 1; j <= i; j += 1) {
      const d = values[j]! - m;
      sumSq += d * d;
    }
    const sd = Math.sqrt(sumSq / period);
    upper[i] = m + stdDevs * sd;
    lower[i] = m - stdDevs * sd;
    bandwidth[i] = m === 0 ? 0 : (upper[i]! - lower[i]!) / m;
  }
  return { middle, upper, lower, bandwidth };
}

export function trueRange(bars: OhlcvBar[]): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length === 0) return out;
  out[0] = bars[0]!.high - bars[0]!.low;
  for (let i = 1; i < bars.length; i += 1) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    out[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return out;
}

export function atr(bars: OhlcvBar[], period = 14): (number | null)[] {
  const tr = trueRange(bars);
  const out: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += tr[i] ?? 0;
  out[period - 1] = sum / period;
  for (let i = period; i < bars.length; i += 1) {
    out[i] = (out[i - 1]! * (period - 1) + (tr[i] ?? 0)) / period;
  }
  return out;
}

/**
 * ADX(14) — Wilder smoothing. Mengembalikan array nilai ADX yang aligned dengan bars.
 */
export function adx(bars: OhlcvBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period * 2) return out;
  const plusDM: number[] = new Array(bars.length).fill(0);
  const minusDM: number[] = new Array(bars.length).fill(0);
  const tr: number[] = new Array(bars.length).fill(0);
  for (let i = 1; i < bars.length; i += 1) {
    const upMove = bars[i]!.high - bars[i - 1]!.high;
    const downMove = bars[i - 1]!.low - bars[i]!.low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }

  // Wilder smoothing initialization
  let trSum = 0;
  let plusSum = 0;
  let minusSum = 0;
  for (let i = 1; i <= period; i += 1) {
    trSum += tr[i]!;
    plusSum += plusDM[i]!;
    minusSum += minusDM[i]!;
  }
  const dx: number[] = new Array(bars.length).fill(0);
  let smoothTr = trSum;
  let smoothPlus = plusSum;
  let smoothMinus = minusSum;
  for (let i = period + 1; i < bars.length; i += 1) {
    smoothTr = smoothTr - smoothTr / period + tr[i]!;
    smoothPlus = smoothPlus - smoothPlus / period + plusDM[i]!;
    smoothMinus = smoothMinus - smoothMinus / period + minusDM[i]!;
    const plusDI = smoothTr === 0 ? 0 : (100 * smoothPlus) / smoothTr;
    const minusDI = smoothTr === 0 ? 0 : (100 * smoothMinus) / smoothTr;
    const denom = plusDI + minusDI;
    dx[i] = denom === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / denom;
  }
  // ADX = smoothed DX
  let adxSum = 0;
  const adxStart = period * 2;
  if (adxStart >= bars.length) return out;
  for (let i = period + 1; i <= adxStart; i += 1) adxSum += dx[i]!;
  out[adxStart] = adxSum / period;
  for (let i = adxStart + 1; i < bars.length; i += 1) {
    out[i] = (out[i - 1]! * (period - 1) + dx[i]!) / period;
  }
  return out;
}

export function pctChange(values: number[], periods = 1): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = periods; i < values.length; i += 1) {
    const prev = values[i - periods]!;
    if (prev === 0) {
      out[i] = null;
      continue;
    }
    out[i] = ((values[i]! - prev) / prev) * 100;
  }
  return out;
}

export function rollingMean(values: number[], period: number): (number | null)[] {
  return sma(values, period);
}

export function rollingSum(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i]!;
  out[period - 1] = sum;
  for (let i = period; i < values.length; i += 1) {
    sum += values[i]! - values[i - period]!;
    out[i] = sum;
  }
  return out;
}

/**
 * Accumulation/Distribution line slope (positif = akumulasi).
 * Mengembalikan slope linear regression atas N hari terakhir.
 */
export function adLineSlope(bars: OhlcvBar[], lookback = 20): number {
  if (bars.length < lookback) return 0;
  const start = bars.length - lookback;
  const ad: number[] = [];
  let cum = 0;
  for (let i = start; i < bars.length; i += 1) {
    const { high, low, close, volume } = bars[i]!;
    const range = high - low;
    const mfm = range === 0 ? 0 : ((close - low) - (high - close)) / range;
    cum += mfm * volume;
    ad.push(cum);
  }
  return linearSlope(ad);
}

/**
 * Stochastic Oscillator dengan parameter %K period, %K smoothing, %D smoothing.
 *
 * Formula:
 *   raw_%K = 100 × (close - low_K_period) / (high_K_period - low_K_period)
 *   %K = SMA(raw_%K, K_smoothing)
 *   %D = SMA(%K, D_smoothing)
 *
 * Common settings:
 *   - Fast (5, 3, 3) — scalping
 *   - Default (14, 3, 3) — standard
 *   - Slow / "Swing Santai" (10, 5, 5) — swing trader Indonesia favorite (smoother sinyal, less whipsaw)
 *
 * Output range 0-100. Overbought > 80, oversold < 20.
 */
export interface StochasticResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function stochastic(
  bars: OhlcvBar[],
  kPeriod: number,
  kSmoothing: number,
  dSmoothing: number,
): StochasticResult {
  const n = bars.length;
  const rawK: (number | null)[] = new Array(n).fill(null);

  for (let i = kPeriod - 1; i < n; i += 1) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j += 1) {
      const b = bars[j]!;
      if (b.high > hi) hi = b.high;
      if (b.low < lo) lo = b.low;
    }
    const range = hi - lo;
    if (range > 0) {
      rawK[i] = ((bars[i]!.close - lo) / range) * 100;
    } else {
      rawK[i] = 50; // No range = midpoint
    }
  }

  // Smooth K with SMA
  const k = smoothNullable(rawK, kSmoothing);
  // %D = SMA of %K
  const d = smoothNullable(k, dSmoothing);

  return { k, d };
}

/** SMA helper untuk array yang punya null leading values. */
function smoothNullable(values: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < period) continue;
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const v = values[j];
      if (v != null) {
        sum += v;
        count += 1;
      }
    }
    out[i] = count === period ? sum / period : null;
  }
  return out;
}

export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}
