// Shared client-side types for advanced backtest UI.
// Mirror the server result shapes (lib/backtest/walk-forward.ts & monte-carlo.ts)
// minus the heavy internals — UI only needs these fields.

export interface AdvEquityPoint {
  date: string;
  equity: number;
  drawdownPct: number;
  position: "in" | "out";
}

export interface WfWindowMetrics {
  totalReturnPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRate: number;
  totalTrades: number;
}

export interface WfWindow {
  index: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  train: WfWindowMetrics;
  test: WfWindowMetrics;
  degradationPct: number;
}

export interface WalkForwardResultDTO {
  ticker: string;
  strategy: string;
  startDate: string;
  endDate: string;
  windows: number;
  trainRatio: number;
  perWindow: WfWindow[];
  combinedOos: {
    equityCurve: AdvEquityPoint[];
    initialCapital: number;
    finalEquity: number;
    totalReturnPct: number;
    annualizedReturnPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    winRate: number;
    totalTrades: number;
  };
  robustness: {
    profitableWindows: number;
    consistencyPct: number;
    avgDegradationPct: number;
    verdict: "robust" | "mixed" | "fragile";
  };
}

export interface Distribution {
  min: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  max: number;
  mean: number;
}

export interface MonteCarloResultDTO {
  ticker: string;
  strategy: string;
  iterations: number;
  initialCapital: number;
  tradesPerIteration: number;
  observed: { finalEquity: number; totalReturnPct: number; maxDrawdownPct: number };
  finalReturnPct: Distribution;
  maxDrawdownPct: Distribution;
  finalEquity: Distribution;
  probabilityOfProfit: number;
  probabilityDrawdownOver20: number;
  percentileBands: { tradeIndex: number; p5: number; p50: number; p95: number }[];
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}
export function fmtIdr(n: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
}
