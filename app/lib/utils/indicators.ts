/**
 * Technical indicator helpers (client-side, MVP).
 *
 * Input: array of OHLCV bars sorted ascending by date.
 * Output: arrays of `{ time, value }` aligned to input length (with `null` at
 * the head for the warm-up window).
 *
 * Semua perhitungan pakai `Number` — untuk presisi tinggi pindahkan ke server.
 */

import type { OhlcvBar } from "@/lib/types/market";

export interface SeriesPoint {
  time: string;
  value: number;
}

function toCloseNumbers(bars: OhlcvBar[]): number[] {
  return bars.map((b) => Number(b.close));
}

export function sma(bars: OhlcvBar[], period: number): SeriesPoint[] {
  if (period <= 0) return [];
  const closes = toCloseNumbers(bars);
  const out: SeriesPoint[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) {
      out.push({ time: bars[i].date, value: sum / period });
    }
  }
  return out;
}

export function ema(bars: OhlcvBar[], period: number): SeriesPoint[] {
  if (period <= 0 || bars.length < period) return [];
  const closes = toCloseNumbers(bars);
  const k = 2 / (period + 1);
  const out: SeriesPoint[] = [];
  let prevEma = 0;
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sum += closes[i];
      continue;
    }
    if (i === period - 1) {
      sum += closes[i];
      prevEma = sum / period;
      out.push({ time: bars[i].date, value: prevEma });
      continue;
    }
    const value = closes[i] * k + prevEma * (1 - k);
    prevEma = value;
    out.push({ time: bars[i].date, value });
  }
  return out;
}

export function rsi(bars: OhlcvBar[], period = 14): SeriesPoint[] {
  if (bars.length < period + 1) return [];
  const closes = toCloseNumbers(bars);
  const out: SeriesPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  out.push({
    time: bars[period].date,
    value: avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRs),
  });

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push({
      time: bars[i].date,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs),
    });
  }
  return out;
}

export interface MacdPoint extends SeriesPoint {
  signal: number;
  histogram: number;
}

export function macd(
  bars: OhlcvBar[],
  fast = 12,
  slow = 26,
  signal = 9,
): MacdPoint[] {
  if (bars.length < slow + signal) return [];
  const emaFast = ema(bars, fast);
  const emaSlow = ema(bars, slow);
  // Align: emaSlow starts at index `slow - 1`, emaFast at `fast - 1`.
  const offsetFast = bars.length - emaFast.length;
  const offsetSlow = bars.length - emaSlow.length;
  const start = Math.max(offsetFast, offsetSlow);

  const macdRaw: SeriesPoint[] = [];
  for (let i = start; i < bars.length; i++) {
    const f = emaFast[i - offsetFast].value;
    const s = emaSlow[i - offsetSlow].value;
    macdRaw.push({ time: bars[i].date, value: f - s });
  }

  // Signal: EMA of macd line.
  const k = 2 / (signal + 1);
  let prev = 0;
  let warm = 0;
  const out: MacdPoint[] = [];
  for (let i = 0; i < macdRaw.length; i++) {
    if (i < signal - 1) {
      warm += macdRaw[i].value;
      continue;
    }
    if (i === signal - 1) {
      warm += macdRaw[i].value;
      prev = warm / signal;
    } else {
      prev = macdRaw[i].value * k + prev * (1 - k);
    }
    out.push({
      time: macdRaw[i].time,
      value: macdRaw[i].value,
      signal: prev,
      histogram: macdRaw[i].value - prev,
    });
  }
  return out;
}

export interface BollingerPoint {
  time: string;
  middle: number;
  upper: number;
  lower: number;
}

export function bollinger(
  bars: OhlcvBar[],
  period = 20,
  stdDev = 2,
): BollingerPoint[] {
  if (bars.length < period) return [];
  const closes = toCloseNumbers(bars);
  const out: BollingerPoint[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    out.push({
      time: bars[i].date,
      middle: mean,
      upper: mean + sd * stdDev,
      lower: mean - sd * stdDev,
    });
  }
  return out;
}
