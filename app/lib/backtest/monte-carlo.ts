import type { BacktestResult } from "./engine";

/**
 * Monte Carlo simulation atas hasil backtest.
 *
 * Ide: urutan trade dari satu backtest cuma SATU realisasi dari banyak yang
 * mungkin. Dengan resample urutan return trade (bootstrap with replacement),
 * kita bikin ribuan "alternate histories" untuk lihat distribusi outcome:
 *   - percentile equity curve (p5 / p50 / p95) terhadap jumlah trade
 *   - distribusi max drawdown
 *   - distribusi final return
 *   - probability of profit (P(final > modal awal))
 *
 * Catatan: ini app code (bukan workflow script), jadi `Math.random` boleh.
 * Tapi kita sediakan opsi `seed` untuk reproducibility (PRNG mulberry32).
 *
 * Resampling pakai per-trade returnPct (geometric compounding) — bukan equity
 * harian — supaya MC mengukur ketergantungan hasil pada urutan & komposisi trade.
 */

export interface MonteCarloOptions {
  /** Jumlah iterasi simulasi. Default 1000. Clamp 100..10000. */
  iterations?: number;
  /** Seed opsional untuk reproducibility. Kalau kosong → Math.random. */
  seed?: number;
}

export interface MonteCarloResult {
  ticker: string;
  strategy: string;
  iterations: number;
  initialCapital: number;
  /** Jumlah trade yang di-resample per iterasi (= jumlah trade backtest asli). */
  tradesPerIteration: number;
  /** Hasil backtest asli sebagai referensi. */
  observed: {
    finalEquity: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
  };
  /** Distribusi final return % across iterasi. */
  finalReturnPct: Distribution;
  /** Distribusi max drawdown % (negatif) across iterasi. */
  maxDrawdownPct: Distribution;
  /** Distribusi final equity (rupiah). */
  finalEquity: Distribution;
  /** P(final equity > modal awal). 0..1. */
  probabilityOfProfit: number;
  /** P(max drawdown lebih buruk dari -20%). 0..1 — risk-of-ruin proxy. */
  probabilityDrawdownOver20: number;
  /**
   * Percentile equity curves vs index trade (0..tradesPerIteration).
   * Tiap entry: { tradeIndex, p5, p50, p95 } dalam rupiah equity.
   */
  percentileBands: { tradeIndex: number; p5: number; p50: number; p95: number }[];
}

export interface Distribution {
  min: number;
  p5: number;
  p25: number;
  p50: number; // median
  p75: number;
  p95: number;
  max: number;
  mean: number;
}

/** mulberry32 PRNG — deterministik kalau di-seed. */
function makeRng(seed?: number): () => number {
  if (seed === undefined || seed === null || !Number.isFinite(seed)) {
    return Math.random;
  }
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

function distribution(values: number[]): Distribution {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);
  return {
    min: sorted[0] ?? 0,
    p5: percentile(sorted, 5),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
    mean,
  };
}

export function runMonteCarlo(
  backtestResult: BacktestResult,
  options: MonteCarloOptions = {},
): MonteCarloResult {
  const iterations = Math.max(100, Math.min(10_000, Math.floor(options.iterations ?? 1000)));
  const rng = makeRng(options.seed);

  const tradeReturns = backtestResult.trades.map((t) => t.returnPct);
  const n = tradeReturns.length;
  const initialCapital = backtestResult.initialCapital;

  if (n < 2) {
    throw new Error(
      "Monte Carlo butuh minimal 2 trade dari backtest. Strategi ini hampir tidak menghasilkan trade di periode tsebut — coba perpanjang range atau ganti strategi.",
    );
  }

  const finalReturns: number[] = [];
  const finalEquities: number[] = [];
  const maxDrawdowns: number[] = [];

  // Kumpulkan equity per langkah-trade untuk bikin percentile band.
  // equityByStep[step][iter] = equity setelah trade ke-(step). step 0 = modal awal.
  const steps = n; // jumlah trade resampled per iterasi = n
  const equityByStep: number[][] = Array.from({ length: steps + 1 }, () => new Array<number>(iterations));

  for (let iter = 0; iter < iterations; iter++) {
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDd = 0;
    equityByStep[0]![iter] = equity;

    for (let s = 0; s < steps; s++) {
      // Bootstrap: ambil satu trade return acak (with replacement).
      const pick = Math.floor(rng() * n);
      const r = tradeReturns[pick] ?? 0;
      equity = equity * (1 + r);
      peak = Math.max(peak, equity);
      const dd = peak > 0 ? (equity - peak) / peak : 0;
      maxDd = Math.min(maxDd, dd);
      equityByStep[s + 1]![iter] = equity;
    }

    finalEquities.push(equity);
    finalReturns.push((equity - initialCapital) / initialCapital);
    maxDrawdowns.push(maxDd);
  }

  // Percentile bands — subsample step kalau kebanyakan trade biar payload ringan.
  const maxBandPoints = 120;
  const stride = steps + 1 > maxBandPoints ? Math.ceil((steps + 1) / maxBandPoints) : 1;
  const percentileBands: { tradeIndex: number; p5: number; p50: number; p95: number }[] = [];
  for (let s = 0; s <= steps; s += stride) {
    const col = [...equityByStep[s]!].sort((a, b) => a - b);
    percentileBands.push({
      tradeIndex: s,
      p5: percentile(col, 5),
      p50: percentile(col, 50),
      p95: percentile(col, 95),
    });
  }
  // Pastikan titik terakhir selalu masuk.
  if (percentileBands[percentileBands.length - 1]?.tradeIndex !== steps) {
    const col = [...equityByStep[steps]!].sort((a, b) => a - b);
    percentileBands.push({
      tradeIndex: steps,
      p5: percentile(col, 5),
      p50: percentile(col, 50),
      p95: percentile(col, 95),
    });
  }

  const probabilityOfProfit = finalEquities.filter((e) => e > initialCapital).length / iterations;
  const probabilityDrawdownOver20 = maxDrawdowns.filter((d) => d < -0.2).length / iterations;

  return {
    ticker: backtestResult.ticker,
    strategy: backtestResult.strategy,
    iterations,
    initialCapital,
    tradesPerIteration: n,
    observed: {
      finalEquity: backtestResult.finalEquity,
      totalReturnPct: backtestResult.totalReturnPct,
      maxDrawdownPct: backtestResult.maxDrawdownPct,
    },
    finalReturnPct: distribution(finalReturns),
    maxDrawdownPct: distribution(maxDrawdowns),
    finalEquity: distribution(finalEquities),
    probabilityOfProfit,
    probabilityDrawdownOver20,
    percentileBands,
  };
}
