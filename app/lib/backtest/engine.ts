import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotesEod } from "@/db/schema/market";

/**
 * Backtest engine — vectorized SMA-based strategies untuk MVP.
 *
 * Strategy supported:
 *   - sma_crossover: buy saat fast MA cross di atas slow MA, sell saat sebaliknya
 *   - rsi_mean_reversion: buy saat RSI < oversold, sell saat RSI > overbought
 *   - breakout: buy saat close break N-day high, sell saat break N-day low
 *   - buy_hold: baseline — buy day 1, hold sampai end
 *
 * Position sizing: full equity (100%) — no leverage, no fractional, single
 * position pada satu waktu. Educational baseline; real strategy engine perlu
 * position sizing rules, slippage model, commission, dll.
 *
 * Output:
 *   - Equity curve (1 point per trading day)
 *   - List trades (entry, exit, return, holding days)
 *   - Metrics: total return, sharpe, max drawdown, win rate, profit factor
 */

export type StrategyType = "sma_crossover" | "rsi_mean_reversion" | "breakout" | "buy_hold";

export interface SMACrossoverParams {
  fastPeriod: number;
  slowPeriod: number;
}

export interface RSIParams {
  period: number;
  oversold: number;
  overbought: number;
}

export interface BreakoutParams {
  lookback: number;
}

export interface BacktestInput {
  ticker: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  initialCapital: number;
  strategy: StrategyType;
  params: SMACrossoverParams | RSIParams | BreakoutParams | Record<string, never>;
  commissionPct?: number; // 0.0015 = 0.15% (typical broker Indonesia)
}

export interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  returnPct: number;
  returnIdr: number;
  holdingDays: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdownPct: number;
  position: "in" | "out";
}

export interface BacktestResult {
  ticker: string;
  strategy: StrategyType;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
  benchmarkBuyHold: { finalEquity: number; returnPct: number };
}

interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function loadOhlcv(ticker: string, from: string, to: string): Promise<OhlcvBar[]> {
  const rows = await db
    .select({
      date: quotesEod.tradeDate,
      open: quotesEod.open,
      high: quotesEod.high,
      low: quotesEod.low,
      close: quotesEod.close,
      volume: quotesEod.volume,
    })
    .from(quotesEod)
    .where(
      and(
        eq(quotesEod.companyKode, ticker.toUpperCase()),
        gte(quotesEod.tradeDate, from),
        lte(quotesEod.tradeDate, to),
      ),
    )
    .orderBy(asc(quotesEod.tradeDate));

  return rows.map((r) => ({
    date: r.date as unknown as string,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function generateSignals(bars: OhlcvBar[], strategy: StrategyType, params: unknown): boolean[] {
  // Signals: true = "in market", false = "out of market"
  const signals: boolean[] = new Array(bars.length).fill(false);
  const closes = bars.map((b) => b.close);

  if (strategy === "buy_hold") {
    return signals.map(() => true);
  }

  if (strategy === "sma_crossover") {
    const p = params as SMACrossoverParams;
    const fast = sma(closes, p.fastPeriod);
    const slow = sma(closes, p.slowPeriod);
    for (let i = 0; i < bars.length; i++) {
      if (fast[i] != null && slow[i] != null) {
        signals[i] = fast[i]! > slow[i]!;
      }
    }
    return signals;
  }

  if (strategy === "rsi_mean_reversion") {
    const p = params as RSIParams;
    const r = rsi(closes, p.period);
    let inPos = false;
    for (let i = 0; i < bars.length; i++) {
      if (r[i] == null) { signals[i] = inPos; continue; }
      if (!inPos && r[i]! < p.oversold) inPos = true;
      else if (inPos && r[i]! > p.overbought) inPos = false;
      signals[i] = inPos;
    }
    return signals;
  }

  if (strategy === "breakout") {
    const p = params as BreakoutParams;
    let inPos = false;
    for (let i = p.lookback; i < bars.length; i++) {
      const window = closes.slice(i - p.lookback, i);
      const high = Math.max(...window);
      const low = Math.min(...window);
      if (!inPos && bars[i]!.close > high) inPos = true;
      else if (inPos && bars[i]!.close < low) inPos = false;
      signals[i] = inPos;
    }
    return signals;
  }

  return signals;
}

export async function runBacktest(input: BacktestInput): Promise<BacktestResult> {
  const bars = await loadOhlcv(input.ticker, input.startDate, input.endDate);
  if (bars.length < 50) {
    throw new Error(`Data tidak cukup untuk ${input.ticker} di range ${input.startDate} – ${input.endDate} (hanya ${bars.length} bar). Butuh min 50 trading day.`);
  }

  const signals = generateSignals(bars, input.strategy, input.params);
  const commissionPct = input.commissionPct ?? 0.0015;

  // Simulate sequential trading
  let cash = input.initialCapital;
  let shares = 0;
  let entryPrice = 0;
  let entryDate = "";
  let peak = input.initialCapital;
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const wantIn = signals[i] ?? false;
    const inPosition = shares > 0;

    // Transitions
    if (wantIn && !inPosition) {
      // Buy with full cash (less commission)
      shares = Math.floor((cash * (1 - commissionPct)) / bar.close / 100) * 100; // round to lot (100 shares)
      if (shares > 0) {
        cash -= shares * bar.close * (1 + commissionPct);
        entryPrice = bar.close;
        entryDate = bar.date;
      }
    } else if (!wantIn && inPosition) {
      // Sell
      const proceeds = shares * bar.close * (1 - commissionPct);
      cash += proceeds;
      const returnIdr = (bar.close - entryPrice) * shares - (proceeds + shares * entryPrice * commissionPct) * 0;
      const returnPct = (bar.close - entryPrice) / entryPrice;
      const holdingDays = (new Date(bar.date).getTime() - new Date(entryDate).getTime()) / 86400000;
      trades.push({
        entryDate, entryPrice, exitDate: bar.date, exitPrice: bar.close,
        shares, returnPct, returnIdr: shares * (bar.close - entryPrice),
        holdingDays: Math.round(holdingDays),
      });
      shares = 0;
    }

    const equity = cash + shares * bar.close;
    peak = Math.max(peak, equity);
    const dd = (equity - peak) / peak;
    equityCurve.push({ date: bar.date, equity, drawdownPct: dd, position: shares > 0 ? "in" : "out" });
  }

  // Close any open position at end
  if (shares > 0) {
    const lastBar = bars[bars.length - 1]!;
    const proceeds = shares * lastBar.close * (1 - commissionPct);
    cash += proceeds;
    const returnPct = (lastBar.close - entryPrice) / entryPrice;
    const holdingDays = (new Date(lastBar.date).getTime() - new Date(entryDate).getTime()) / 86400000;
    trades.push({
      entryDate, entryPrice, exitDate: lastBar.date, exitPrice: lastBar.close,
      shares, returnPct, returnIdr: shares * (lastBar.close - entryPrice),
      holdingDays: Math.round(holdingDays),
    });
    shares = 0;
  }

  const finalEquity = cash;
  const totalReturnPct = (finalEquity - input.initialCapital) / input.initialCapital;
  const totalDays = (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / 86400000;
  const annualizedReturnPct = Math.pow(1 + totalReturnPct, 365 / Math.max(totalDays, 1)) - 1;

  // Drawdown
  const maxDrawdownPct = Math.min(...equityCurve.map((p) => p.drawdownPct));

  // Sharpe (using daily returns, risk-free ~5% Indonesia)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1]!.equity;
    const cur = equityCurve[i]!.equity;
    if (prev > 0) dailyReturns.push((cur - prev) / prev);
  }
  const meanReturn = dailyReturns.reduce((s, r) => s + r, 0) / Math.max(dailyReturns.length, 1);
  const varReturn = dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / Math.max(dailyReturns.length, 1);
  const stdReturn = Math.sqrt(varReturn);
  const rfDaily = 0.05 / 252;
  const sharpeRatio = stdReturn > 0 ? ((meanReturn - rfDaily) / stdReturn) * Math.sqrt(252) : 0;

  // Trade stats
  const winning = trades.filter((t) => t.returnPct > 0);
  const losing = trades.filter((t) => t.returnPct < 0);
  const winRate = trades.length > 0 ? winning.length / trades.length : 0;
  const avgWin = winning.length > 0 ? winning.reduce((s, t) => s + t.returnPct, 0) / winning.length : 0;
  const avgLoss = losing.length > 0 ? losing.reduce((s, t) => s + t.returnPct, 0) / losing.length : 0;
  const profitFactor = losing.length > 0 ? Math.abs(winning.reduce((s, t) => s + t.returnIdr, 0) / losing.reduce((s, t) => s + t.returnIdr, 0)) : winning.length > 0 ? Infinity : 0;

  // Benchmark buy & hold
  const bhShares = Math.floor((input.initialCapital * (1 - commissionPct)) / bars[0]!.close / 100) * 100;
  const bhFinal = bhShares * bars[bars.length - 1]!.close + (input.initialCapital - bhShares * bars[0]!.close * (1 + commissionPct));

  return {
    ticker: input.ticker,
    strategy: input.strategy,
    startDate: input.startDate,
    endDate: input.endDate,
    initialCapital: input.initialCapital,
    finalEquity,
    totalReturnPct,
    annualizedReturnPct,
    maxDrawdownPct,
    sharpeRatio,
    totalTrades: trades.length,
    winningTrades: winning.length,
    losingTrades: losing.length,
    winRate,
    avgWinPct: avgWin,
    avgLossPct: avgLoss,
    profitFactor,
    trades,
    equityCurve,
    benchmarkBuyHold: {
      finalEquity: bhFinal,
      returnPct: (bhFinal - input.initialCapital) / input.initialCapital,
    },
  };
}
