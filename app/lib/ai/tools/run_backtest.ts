import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface RunBacktestArgs {
  ticker: string;
  strategy: "sma_crossover" | "rsi_mean_reversion" | "breakout" | "buy_hold";
  params?: {
    fastPeriod?: number;
    slowPeriod?: number;
    period?: number;
    oversold?: number;
    overbought?: number;
    lookback?: number;
  };
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
  /**
   * Mode lanjutan (opsional). Default (kosong) = backtest standar — behavior
   * tidak berubah. "walk_forward" = uji robustness rolling OOS. "monte_carlo"
   * = distribusi outcome dari resample trade.
   */
  mode?: "walk_forward" | "monte_carlo";
}

/**
 * `run_backtest` — execute backtest strategy untuk ticker IDX.
 *
 * AI Buddy tool ini menjawab pertanyaan tipe:
 *   - "Jika saya beli BBRI tiap RSI < 30 dan jual saat RSI > 70, profitnya berapa 5 tahun terakhir?"
 *   - "Backtest SMA 20/50 crossover di BMRI dari 2024"
 *   - "Apakah breakout 20-day high di GOTO menguntungkan?"
 *
 * Output: equity curve summary + key metrics (total return, sharpe, max drawdown, win rate).
 */
export const runBacktestTool: ToolDefinition<RunBacktestArgs> = {
  name: "run_backtest",
  description:
    "Jalankan backtest strategy untuk satu ticker IDX dengan data historis. Strategi: 'sma_crossover' (fast/slow MA), 'rsi_mean_reversion' (RSI oversold/overbought), 'breakout' (N-day high), atau 'buy_hold' (baseline). " +
    "Output: total return %, annualized return, max drawdown, win rate, jumlah trade, profit factor.",
  parameters: {
    type: "object",
    properties: {
      ticker: {
        type: "string",
        description: "Kode ticker IDX (BBRI, GOTO, dll). Uppercase.",
        pattern: "^[A-Z0-9]{3,6}$",
      },
      strategy: {
        type: "string",
        enum: ["sma_crossover", "rsi_mean_reversion", "breakout", "buy_hold"],
        description:
          "Strategy jenis: 'sma_crossover' (golden/death cross), 'rsi_mean_reversion' (buy oversold/sell overbought), 'breakout' (N-day high), 'buy_hold' (baseline).",
      },
      params: {
        type: "object",
        description: "Parameter strategy. SMA crossover: { fastPeriod, slowPeriod }. RSI: { period, oversold, overbought }. Breakout: { lookback }. Buy-hold: kosong.",
        properties: {
          fastPeriod: { type: "number", description: "Fast SMA period (default 20)" },
          slowPeriod: { type: "number", description: "Slow SMA period (default 50)" },
          period: { type: "number", description: "RSI period (default 14)" },
          oversold: { type: "number", description: "RSI oversold threshold (default 30)" },
          overbought: { type: "number", description: "RSI overbought threshold (default 70)" },
          lookback: { type: "number", description: "Breakout lookback days (default 20)" },
        },
      },
      startDate: {
        type: "string",
        description: "Tanggal mulai backtest YYYY-MM-DD. Default 1 tahun lalu.",
      },
      endDate: {
        type: "string",
        description: "Tanggal akhir YYYY-MM-DD. Default hari ini.",
      },
      initialCapital: {
        type: "number",
        description: "Initial capital IDR. Default Rp 100juta.",
      },
      mode: {
        type: "string",
        enum: ["walk_forward", "monte_carlo"],
        description:
          "Opsional. Kosong = backtest standar. 'walk_forward' = uji robustness lewat rolling out-of-sample window (deteksi overfit). 'monte_carlo' = resample urutan trade untuk dapat distribusi outcome (probability of profit, sebaran drawdown/return).",
      },
    },
    required: ["ticker", "strategy"],
    additionalProperties: false,
  },
  async handler(args) {
    const ticker = args.ticker?.toUpperCase();
    if (!ticker || !/^[A-Z0-9]{3,6}$/.test(ticker)) {
      return {
        ok: false,
        error: { code: "INVALID_TICKER", message: "Ticker tidak valid" },
      };
    }

    try {
      const { runBacktest } = await import("@/lib/backtest/engine");

      // Default params per strategy
      const params: Record<string, number> = {};
      if (args.strategy === "sma_crossover") {
        params.fastPeriod = args.params?.fastPeriod ?? 20;
        params.slowPeriod = args.params?.slowPeriod ?? 50;
      } else if (args.strategy === "rsi_mean_reversion") {
        params.period = args.params?.period ?? 14;
        params.oversold = args.params?.oversold ?? 30;
        params.overbought = args.params?.overbought ?? 70;
      } else if (args.strategy === "breakout") {
        params.lookback = args.params?.lookback ?? 20;
      }

      const startDate = args.startDate ?? new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
      const endDate = args.endDate ?? new Date().toISOString().slice(0, 10);

      const baseInput = {
        ticker,
        strategy: args.strategy,
        params: params as never,
        startDate,
        endDate,
        initialCapital: args.initialCapital ?? 100_000_000,
        commissionPct: 0.0015,
      };

      // Mode lanjutan (additive) — default behavior di bawah tidak terpengaruh.
      if (args.mode === "walk_forward") {
        const { runWalkForward } = await import("@/lib/backtest/walk-forward");
        const wf = await runWalkForward(baseInput);
        return {
          ok: true,
          data: {
            mode: "walk_forward",
            ticker: wf.ticker,
            strategy: wf.strategy,
            period: `${wf.startDate} → ${wf.endDate}`,
            windows: wf.windows,
            trainRatio: wf.trainRatio,
            oos: {
              totalReturnPct: Number((wf.combinedOos.totalReturnPct * 100).toFixed(2)),
              annualizedReturnPct: Number((wf.combinedOos.annualizedReturnPct * 100).toFixed(2)),
              sharpeRatio: Number(wf.combinedOos.sharpeRatio.toFixed(2)),
              maxDrawdownPct: Number((wf.combinedOos.maxDrawdownPct * 100).toFixed(2)),
              winRate: Number((wf.combinedOos.winRate * 100).toFixed(1)),
              totalTrades: wf.combinedOos.totalTrades,
            },
            robustness: {
              verdict: wf.robustness.verdict,
              profitableWindows: wf.robustness.profitableWindows,
              consistencyPct: Number((wf.robustness.consistencyPct * 100).toFixed(0)),
              avgDegradationPct: Number((wf.robustness.avgDegradationPct * 100).toFixed(2)),
            },
            perWindow: wf.perWindow.map((w) => ({
              window: w.index,
              test: `${w.testStart} → ${w.testEnd}`,
              oosReturnPct: Number((w.test.totalReturnPct * 100).toFixed(2)),
              oosSharpe: Number(w.test.sharpeRatio.toFixed(2)),
              oosTrades: w.test.totalTrades,
            })),
            interpretation:
              wf.robustness.verdict === "robust"
                ? `Strategi ROBUST — profit konsisten di ${wf.robustness.profitableWindows}/${wf.windows} window out-of-sample. Indikasi tidak overfit.`
                : wf.robustness.verdict === "mixed"
                  ? `Hasil MIXED — cuma ${wf.robustness.profitableWindows}/${wf.windows} window OOS yang profit. Strategi belum tentu stabil.`
                  : `Strategi FRAGILE — mayoritas window OOS rugi (${wf.robustness.profitableWindows}/${wf.windows} profit). Indikasi overfit, hati-hati.`,
          },
        };
      }

      if (args.mode === "monte_carlo") {
        const { runMonteCarlo } = await import("@/lib/backtest/monte-carlo");
        const bt = await runBacktest(baseInput);
        const mc = runMonteCarlo(bt, { iterations: 1000 });
        return {
          ok: true,
          data: {
            mode: "monte_carlo",
            ticker: mc.ticker,
            strategy: mc.strategy,
            iterations: mc.iterations,
            tradesPerIteration: mc.tradesPerIteration,
            probabilityOfProfit: Number((mc.probabilityOfProfit * 100).toFixed(0)),
            probabilityDrawdownOver20: Number((mc.probabilityDrawdownOver20 * 100).toFixed(0)),
            finalReturnPct: {
              p5: Number((mc.finalReturnPct.p5 * 100).toFixed(2)),
              median: Number((mc.finalReturnPct.p50 * 100).toFixed(2)),
              p95: Number((mc.finalReturnPct.p95 * 100).toFixed(2)),
            },
            maxDrawdownPct: {
              p5: Number((mc.maxDrawdownPct.p5 * 100).toFixed(2)),
              median: Number((mc.maxDrawdownPct.p50 * 100).toFixed(2)),
              p95: Number((mc.maxDrawdownPct.p95 * 100).toFixed(2)),
            },
            observed: {
              totalReturnPct: Number((mc.observed.totalReturnPct * 100).toFixed(2)),
              maxDrawdownPct: Number((mc.observed.maxDrawdownPct * 100).toFixed(2)),
            },
            interpretation: `Dari ${mc.iterations.toLocaleString("id-ID")} simulasi resample ${mc.tradesPerIteration} trade: probability of profit ${(mc.probabilityOfProfit * 100).toFixed(0)}%, median return ${(mc.finalReturnPct.p50 * 100).toFixed(1)}%, sebaran p5..p95 ${(mc.finalReturnPct.p5 * 100).toFixed(1)}%..${(mc.finalReturnPct.p95 * 100).toFixed(1)}%. Spread lebar = hasil sensitif ke urutan trade.`,
          },
        };
      }

      const result = await runBacktest(baseInput);

      return {
        ok: true,
        data: {
          ticker: result.ticker,
          strategy: result.strategy,
          period: `${result.startDate} → ${result.endDate}`,
          metrics: {
            totalReturnPct: Number(result.totalReturnPct.toFixed(2)),
            annualizedReturnPct: Number(result.annualizedReturnPct.toFixed(2)),
            maxDrawdownPct: Number(result.maxDrawdownPct.toFixed(2)),
            sharpeRatio: Number(result.sharpeRatio.toFixed(2)),
            winRate: Number((result.winRate * 100).toFixed(1)),
            totalTrades: result.totalTrades,
            winningTrades: result.winningTrades,
            losingTrades: result.losingTrades,
            avgWinPct: Number(result.avgWinPct.toFixed(2)),
            avgLossPct: Number(result.avgLossPct.toFixed(2)),
            profitFactor: Number(result.profitFactor.toFixed(2)),
            finalEquity: Number(result.finalEquity.toFixed(0)),
          },
          recentTrades: result.trades.slice(-5).map((t) => ({
            entry: `${t.entryDate} @ ${t.entryPrice.toFixed(0)}`,
            exit: `${t.exitDate} @ ${t.exitPrice.toFixed(0)}`,
            returnPct: Number(t.returnPct.toFixed(2)),
            holdingDays: t.holdingDays,
          })),
          interpretation: buildInterpretation(result),
        },
      };
    } catch (err) {
      logger.warn({ err: (err as Error).message, ticker }, "Backtest tool failed");
      return {
        ok: false,
        error: {
          code: "BACKTEST_FAILED",
          message: err instanceof Error ? err.message : "Backtest gagal — mungkin tidak ada data untuk ticker/range ini",
        },
      };
    }
  },
};

function buildInterpretation(r: { totalReturnPct: number; sharpeRatio: number; maxDrawdownPct: number; winRate: number; profitFactor: number; totalTrades: number }): string {
  if (r.totalTrades === 0) return "Tidak ada trade ter-trigger di periode ini.";
  const parts: string[] = [];
  parts.push(r.totalReturnPct > 0 ? `Total return +${r.totalReturnPct.toFixed(1)}%` : `Total return ${r.totalReturnPct.toFixed(1)}% (loss)`);
  if (r.sharpeRatio > 1) parts.push("Sharpe > 1 (risk-adjusted return solid)");
  else if (r.sharpeRatio < 0.3) parts.push("Sharpe rendah (volatility tidak terkompensasi)");
  if (r.maxDrawdownPct < -20) parts.push(`Max drawdown ${r.maxDrawdownPct.toFixed(1)}% (cukup besar — psychological burden tinggi)`);
  if (r.winRate > 0.6) parts.push(`Win rate ${(r.winRate * 100).toFixed(0)}% (lebih sering profit)`);
  else if (r.winRate < 0.4) parts.push(`Win rate ${(r.winRate * 100).toFixed(0)}% (kurang dari 40%)`);
  if (r.profitFactor > 1.5) parts.push("Profit factor > 1.5 (winners > 1.5× losers)");
  parts.push(`Total ${r.totalTrades} trades`);
  return parts.join(". ") + ".";
}
