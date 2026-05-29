import { runBacktest, type BacktestInput, type BacktestResult, type EquityPoint } from "./engine";

/**
 * Walk-Forward analysis — uji robustness strategi vs overfitting.
 *
 * Ide dasar: bagi date range jadi beberapa window berurutan. Tiap window punya
 * porsi "in-sample" (train) dan "out-of-sample" (test). Di MVP ini strategi kita
 * BUKAN parametric-optimized (params fixed dari input), jadi WF di sini berfungsi
 * sebagai *rolling out-of-sample stress test*: kita jalankan strategi dengan
 * params yang sama di tiap segmen OOS dan lihat apakah performa konsisten antar
 * periode, atau cuma untung di satu fase market doang.
 *
 * Output:
 *   - perWindow: metrik per window (train range, test range, OOS return, sharpe,
 *     max drawdown, win rate, jumlah trade).
 *   - combinedOos: agregat semua segmen OOS dirangkai jadi satu equity curve
 *     (compounding antar segmen) + metrik gabungan.
 *
 * Reuse `runBacktest` internal — tiap segmen train & test = 1 panggilan engine.
 */

export interface WalkForwardOptions {
  /** Jumlah window berurutan. Default 4. */
  windows?: number;
  /** Porsi in-sample per window (0..1). Sisanya jadi out-of-sample. Default 0.7. */
  trainRatio?: number;
}

export interface WalkForwardWindow {
  index: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  /** Metrik in-sample (train). */
  train: {
    totalReturnPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    winRate: number;
    totalTrades: number;
  };
  /** Metrik out-of-sample (test) — yang utama buat menilai robustness. */
  test: {
    totalReturnPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    winRate: number;
    totalTrades: number;
  };
  /** Selisih test - train; mendekati 0 = konsisten (tidak overfit). */
  degradationPct: number;
}

export interface WalkForwardResult {
  ticker: string;
  strategy: string;
  startDate: string;
  endDate: string;
  windows: number;
  trainRatio: number;
  perWindow: WalkForwardWindow[];
  combinedOos: {
    /** Equity OOS dirangkai (compounding) — 1 point per trading day OOS. */
    equityCurve: EquityPoint[];
    initialCapital: number;
    finalEquity: number;
    totalReturnPct: number;
    annualizedReturnPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    winRate: number;
    totalTrades: number;
  };
  /** Ringkasan robustness untuk UI/AI. */
  robustness: {
    /** Berapa window dengan OOS return positif dari total. */
    profitableWindows: number;
    /** % window OOS positif. */
    consistencyPct: number;
    /** Rata-rata degradation test-vs-train across window. */
    avgDegradationPct: number;
    verdict: "robust" | "mixed" | "fragile";
  };
}

function toMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function toISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/**
 * Hitung metrik agregat dari equity curve OOS yang sudah dirangkai.
 * Konvensi mengikuti engine.ts (return %, sharpe annualized 252, rf 5%).
 */
function metricsFromCurve(
  curve: EquityPoint[],
  initialCapital: number,
  startDate: string,
  endDate: string,
): { totalReturnPct: number; annualizedReturnPct: number; sharpeRatio: number; maxDrawdownPct: number } {
  if (curve.length < 2) {
    return { totalReturnPct: 0, annualizedReturnPct: 0, sharpeRatio: 0, maxDrawdownPct: 0 };
  }
  const finalEquity = curve[curve.length - 1]!.equity;
  const totalReturnPct = (finalEquity - initialCapital) / initialCapital;
  const totalDays = (toMs(endDate) - toMs(startDate)) / DAY_MS;
  const annualizedReturnPct = Math.pow(1 + totalReturnPct, 365 / Math.max(totalDays, 1)) - 1;

  const dailyReturns: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1]!.equity;
    const cur = curve[i]!.equity;
    if (prev > 0) dailyReturns.push((cur - prev) / prev);
  }
  const meanReturn = dailyReturns.reduce((s, r) => s + r, 0) / Math.max(dailyReturns.length, 1);
  const varReturn = dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / Math.max(dailyReturns.length, 1);
  const stdReturn = Math.sqrt(varReturn);
  const rfDaily = 0.05 / 252;
  const sharpeRatio = stdReturn > 0 ? ((meanReturn - rfDaily) / stdReturn) * Math.sqrt(252) : 0;

  const maxDrawdownPct = Math.min(...curve.map((p) => p.drawdownPct));
  return { totalReturnPct, annualizedReturnPct, sharpeRatio, maxDrawdownPct };
}

export async function runWalkForward(
  input: BacktestInput,
  options: WalkForwardOptions = {},
): Promise<WalkForwardResult> {
  const windows = Math.max(2, Math.min(12, Math.floor(options.windows ?? 4)));
  const trainRatio = Math.min(0.9, Math.max(0.3, options.trainRatio ?? 0.7));

  const totalStart = toMs(input.startDate);
  const totalEnd = toMs(input.endDate);
  const totalSpan = totalEnd - totalStart;
  if (totalSpan <= 0) {
    throw new Error("End date harus setelah start date untuk walk-forward.");
  }

  // Rolling windows: bagi span jadi N segmen yang sama, tiap segmen displit
  // train/test by ratio. Window i mencakup [totalStart + i*seg, +seg].
  const segSpan = totalSpan / windows;
  if (segSpan / DAY_MS < 60) {
    throw new Error(
      `Range terlalu pendek untuk ${windows} window. Tiap window perlu cukup data (min ~60 hari). Kurangi jumlah window atau perlebar range.`,
    );
  }

  const perWindow: WalkForwardWindow[] = [];
  const combinedOosTrades: { returnPct: number }[] = [];
  // Rangkai equity OOS dengan compounding: mulai dari initialCapital, tiap
  // segmen OOS men-scale equity berikutnya secara relatif.
  const combinedCurve: EquityPoint[] = [];
  let runningEquity = input.initialCapital;
  let runningPeak = input.initialCapital;
  let oosTotalTrades = 0;
  let oosWinningTrades = 0;

  for (let i = 0; i < windows; i++) {
    const winStart = totalStart + i * segSpan;
    const winEnd = i === windows - 1 ? totalEnd : totalStart + (i + 1) * segSpan;
    const splitPoint = winStart + (winEnd - winStart) * trainRatio;

    const trainStart = toISODate(winStart);
    const trainEnd = toISODate(splitPoint);
    const testStart = toISODate(splitPoint);
    const testEnd = toISODate(winEnd);

    let trainResult: BacktestResult | null = null;
    let testResult: BacktestResult | null = null;
    try {
      trainResult = await runBacktest({ ...input, startDate: trainStart, endDate: trainEnd });
    } catch {
      // Data train tidak cukup di window ini — skip metrik train (biarkan 0).
      trainResult = null;
    }
    try {
      testResult = await runBacktest({ ...input, startDate: testStart, endDate: testEnd });
    } catch {
      testResult = null;
    }

    const trainMetrics = {
      totalReturnPct: trainResult?.totalReturnPct ?? 0,
      sharpeRatio: trainResult?.sharpeRatio ?? 0,
      maxDrawdownPct: trainResult?.maxDrawdownPct ?? 0,
      winRate: trainResult?.winRate ?? 0,
      totalTrades: trainResult?.totalTrades ?? 0,
    };
    const testMetrics = {
      totalReturnPct: testResult?.totalReturnPct ?? 0,
      sharpeRatio: testResult?.sharpeRatio ?? 0,
      maxDrawdownPct: testResult?.maxDrawdownPct ?? 0,
      winRate: testResult?.winRate ?? 0,
      totalTrades: testResult?.totalTrades ?? 0,
    };

    perWindow.push({
      index: i + 1,
      trainStart,
      trainEnd,
      testStart,
      testEnd,
      train: trainMetrics,
      test: testMetrics,
      degradationPct: testMetrics.totalReturnPct - trainMetrics.totalReturnPct,
    });

    // Rangkai OOS equity curve: scale tiap point test relatif ke equity awalnya,
    // lalu compound ke runningEquity.
    if (testResult && testResult.equityCurve.length > 0) {
      const segInitial = testResult.initialCapital;
      const startEquityForSeg = runningEquity;
      for (const p of testResult.equityCurve) {
        const factor = p.equity / segInitial;
        const eq = startEquityForSeg * factor;
        runningPeak = Math.max(runningPeak, eq);
        combinedCurve.push({
          date: p.date,
          equity: eq,
          drawdownPct: (eq - runningPeak) / runningPeak,
          position: p.position,
        });
      }
      runningEquity = combinedCurve.length > 0 ? combinedCurve[combinedCurve.length - 1]!.equity : runningEquity;
      oosTotalTrades += testResult.totalTrades;
      oosWinningTrades += testResult.winningTrades;
      for (const t of testResult.trades) combinedOosTrades.push({ returnPct: t.returnPct });
    }
  }

  const firstTestStart = perWindow[0]?.testStart ?? input.startDate;
  const lastTestEnd = perWindow[perWindow.length - 1]?.testEnd ?? input.endDate;
  const combinedMetrics = metricsFromCurve(combinedCurve, input.initialCapital, firstTestStart, lastTestEnd);
  const finalEquity = combinedCurve.length > 0 ? combinedCurve[combinedCurve.length - 1]!.equity : input.initialCapital;

  const profitableWindows = perWindow.filter((w) => w.test.totalReturnPct > 0).length;
  const consistencyPct = perWindow.length > 0 ? profitableWindows / perWindow.length : 0;
  const avgDegradationPct =
    perWindow.length > 0 ? perWindow.reduce((s, w) => s + w.degradationPct, 0) / perWindow.length : 0;
  const verdict: "robust" | "mixed" | "fragile" =
    consistencyPct >= 0.75 && combinedMetrics.totalReturnPct > 0
      ? "robust"
      : consistencyPct >= 0.5
        ? "mixed"
        : "fragile";

  return {
    ticker: input.ticker,
    strategy: input.strategy,
    startDate: input.startDate,
    endDate: input.endDate,
    windows,
    trainRatio,
    perWindow,
    combinedOos: {
      equityCurve: combinedCurve,
      initialCapital: input.initialCapital,
      finalEquity,
      totalReturnPct: combinedMetrics.totalReturnPct,
      annualizedReturnPct: combinedMetrics.annualizedReturnPct,
      sharpeRatio: combinedMetrics.sharpeRatio,
      maxDrawdownPct: combinedMetrics.maxDrawdownPct,
      winRate: oosTotalTrades > 0 ? oosWinningTrades / oosTotalTrades : 0,
      totalTrades: oosTotalTrades,
    },
    robustness: {
      profitableWindows,
      consistencyPct,
      avgDegradationPct,
      verdict,
    },
  };
}
