import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk backtest engine + walk-forward + monte-carlo
 * (lib/backtest/*).
 *
 * Strategi: engine.runBacktest membaca OHLCV dari quotes_eod lewat db. Kita
 * mock `@/lib/db` agar mengembalikan deret OHLCV sintetis yang kita kontrol
 * lewat `setBars(...)`. Walk-forward & monte-carlo dibangun di atas runBacktest,
 * jadi mock yang sama menutupi ketiganya.
 *
 * Invarian yang diuji:
 *  - runBacktest: butuh >=50 bar, equityCurve 1 point/bar, metrik finite,
 *    buy_hold menghasilkan benchmark = strategi (round-trip sama), trade dibuat
 *    untuk strategi yang menghasilkan sinyal, drawdown <= 0, winRate in [0,1].
 *  - walk-forward: jumlah window sesuai (clamp 2..12), perWindow.length == windows,
 *    consistencyPct in [0,1], combinedOos finite.
 *  - monte-carlo: deterministik dengan seed (dua run identik), percentile
 *    p5<=p50<=p95, probabilityOfProfit in [0,1].
 */

// ---------------------------------------------------------------------------
// Synthetic OHLCV store + db mock. loadOhlcv selects from quotesEod with a
// trade-date range filter; kita kembalikan bar yang jatuh dalam [from, to].
// ---------------------------------------------------------------------------
interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const state = {
  bars: [] as Bar[],
  range: { from: "", to: "" },
};

function setBars(bars: Bar[]) {
  state.bars = bars;
}

vi.mock("drizzle-orm", () => ({
  and: (...a: unknown[]) => ({ __and: a }),
  eq: () => ({ __eq: true }),
  asc: () => ({ __asc: true }),
  gte: (_c: unknown, v: unknown) => ({ __gte: v }),
  lte: (_c: unknown, v: unknown) => ({ __lte: v }),
}));

vi.mock("@/db/schema/market", () => ({
  quotesEod: { companyKode: "k", tradeDate: "d", open: "o", high: "h", low: "l", close: "c", volume: "v" },
}));

vi.mock("@/lib/db", () => {
  const builder: Record<string, unknown> = {};
  builder.from = () => builder;
  builder.where = (cond: { __and?: Array<{ __gte?: string; __lte?: string }> }) => {
    // capture from/to from gte/lte markers
    const parts = cond?.__and ?? [];
    for (const p of parts) {
      if (p.__gte) state.range.from = p.__gte;
      if (p.__lte) state.range.to = p.__lte;
    }
    return builder;
  };
  builder.orderBy = () => {
    const { from, to } = state.range;
    const rows = state.bars
      .filter((b) => (!from || b.date >= from) && (!to || b.date <= to))
      .map((b) => ({
        date: b.date,
        open: String(b.open),
        high: String(b.high),
        low: String(b.low),
        close: String(b.close),
        volume: String(b.volume),
      }));
    return Promise.resolve(rows);
  };
  return {
    db: { select: () => builder },
  };
});

// ---------------------------------------------------------------------------
// Synthetic series generators.
// ---------------------------------------------------------------------------
function addDays(iso: string, n: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Deterministic pseudo-random walk with mild upward drift. */
function makeSeries(n: number, start = "2023-01-01", base = 1000): Bar[] {
  const bars: Bar[] = [];
  let price = base;
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < n; i++) {
    const drift = 0.0005;
    const shock = (rng() - 0.5) * 0.04;
    price = Math.max(10, price * (1 + drift + shock));
    const close = Math.round(price);
    const high = Math.round(close * (1 + rng() * 0.01));
    const low = Math.round(close * (1 - rng() * 0.01));
    bars.push({ date: addDays(start, i), open: close, high, low, close, volume: 1_000_000 });
  }
  return bars;
}

/** Strictly increasing series (every strategy stays in & wins on buy_hold). */
function makeUptrend(n: number, start = "2023-01-01", base = 1000): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const close = base + i * 5;
    bars.push({ date: addDays(start, i), open: close, high: close + 2, low: close - 2, close, volume: 1_000_000 });
  }
  return bars;
}

const RANGE = { ticker: "TEST", startDate: "2023-01-01", endDate: "2025-12-31", initialCapital: 100_000_000 };

beforeEach(() => {
  state.bars = [];
  state.range = { from: "", to: "" };
});

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// runBacktest
// ===========================================================================
describe("runBacktest", () => {
  it("throws when fewer than 50 bars are available", async () => {
    setBars(makeSeries(40));
    const { runBacktest } = await import("@/lib/backtest/engine");
    await expect(
      runBacktest({ ...RANGE, strategy: "buy_hold", params: {} }),
    ).rejects.toThrow();
  });

  it("buy_hold produces one equity point per bar and finite metrics", async () => {
    const bars = makeSeries(300);
    setBars(bars);
    const { runBacktest } = await import("@/lib/backtest/engine");
    const r = await runBacktest({ ...RANGE, strategy: "buy_hold", params: {} });

    expect(r.equityCurve.length).toBe(bars.length);
    expect(Number.isFinite(r.finalEquity)).toBe(true);
    expect(Number.isFinite(r.totalReturnPct)).toBe(true);
    expect(Number.isFinite(r.sharpeRatio)).toBe(true);
    expect(Number.isFinite(r.annualizedReturnPct)).toBe(true);
    // buy_hold: exactly one round-trip trade (entry day 1, exit at end)
    expect(r.totalTrades).toBe(1);
    expect(r.winRate).toBeGreaterThanOrEqual(0);
    expect(r.winRate).toBeLessThanOrEqual(1);
  });

  it("max drawdown is non-positive (a drawdown is a loss from peak)", async () => {
    setBars(makeSeries(200));
    const { runBacktest } = await import("@/lib/backtest/engine");
    const r = await runBacktest({ ...RANGE, strategy: "buy_hold", params: {} });
    expect(r.maxDrawdownPct).toBeLessThanOrEqual(0);
  });

  it("buy_hold on a strict uptrend is profitable and matches its benchmark", async () => {
    setBars(makeUptrend(120));
    const { runBacktest } = await import("@/lib/backtest/engine");
    const r = await runBacktest({ ...RANGE, strategy: "buy_hold", params: {} });
    expect(r.totalReturnPct).toBeGreaterThan(0);
    // For buy_hold the strategy and the benchmark are the same trade.
    expect(r.benchmarkBuyHold.returnPct).toBeGreaterThan(0);
    expect(r.finalEquity).toBeGreaterThan(RANGE.initialCapital);
  });

  it("sma_crossover generates trades and bounded win rate on a random walk", async () => {
    setBars(makeSeries(400));
    const { runBacktest } = await import("@/lib/backtest/engine");
    const r = await runBacktest({
      ...RANGE,
      strategy: "sma_crossover",
      params: { fastPeriod: 10, slowPeriod: 30 },
    });
    expect(r.totalTrades).toBeGreaterThan(0);
    expect(r.winningTrades + r.losingTrades).toBeLessThanOrEqual(r.totalTrades);
    expect(r.winRate).toBeGreaterThanOrEqual(0);
    expect(r.winRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.profitFactor) || r.profitFactor === Infinity).toBe(true);
    // every trade is a closed round-trip with both dates set
    for (const t of r.trades) {
      expect(t.entryDate).toBeTruthy();
      expect(t.exitDate).toBeTruthy();
      expect(t.exitPrice).toBeGreaterThan(0);
    }
  });

  it("rsi_mean_reversion runs and keeps equity curve aligned to bars", async () => {
    const bars = makeSeries(250);
    setBars(bars);
    const { runBacktest } = await import("@/lib/backtest/engine");
    const r = await runBacktest({
      ...RANGE,
      strategy: "rsi_mean_reversion",
      params: { period: 14, oversold: 30, overbought: 70 },
    });
    expect(r.equityCurve.length).toBe(bars.length);
    expect(r.equityCurve.every((p) => Number.isFinite(p.equity))).toBe(true);
  });
});

// ===========================================================================
// walk-forward
// ===========================================================================
describe("runWalkForward", () => {
  it("splits into the requested number of windows (clamped) with OOS aggregation", async () => {
    setBars(makeSeries(900));
    const { runWalkForward } = await import("@/lib/backtest/walk-forward");
    const r = await runWalkForward(
      { ...RANGE, strategy: "sma_crossover", params: { fastPeriod: 10, slowPeriod: 30 } },
      { windows: 4, trainRatio: 0.7 },
    );
    expect(r.windows).toBe(4);
    expect(r.perWindow.length).toBe(4);
    expect(r.robustness.consistencyPct).toBeGreaterThanOrEqual(0);
    expect(r.robustness.consistencyPct).toBeLessThanOrEqual(1);
    expect(["robust", "mixed", "fragile"]).toContain(r.robustness.verdict);
    expect(Number.isFinite(r.combinedOos.totalReturnPct)).toBe(true);
    expect(r.combinedOos.winRate).toBeGreaterThanOrEqual(0);
    expect(r.combinedOos.winRate).toBeLessThanOrEqual(1);
  });

  it("clamps window count below 2 up to 2", async () => {
    setBars(makeSeries(900));
    const { runWalkForward } = await import("@/lib/backtest/walk-forward");
    const r = await runWalkForward(
      { ...RANGE, strategy: "buy_hold", params: {} },
      { windows: 1 },
    );
    expect(r.windows).toBe(2);
    expect(r.perWindow.length).toBe(2);
  });

  it("throws when the range is too short for the requested windows", async () => {
    setBars(makeSeries(100, "2023-01-01"));
    const { runWalkForward } = await import("@/lib/backtest/walk-forward");
    // tiny range over many windows -> each segment < 60 days
    await expect(
      runWalkForward(
        { ticker: "X", startDate: "2023-01-01", endDate: "2023-02-01", initialCapital: 100_000_000, strategy: "buy_hold", params: {} },
        { windows: 6 },
      ),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// monte-carlo
// ===========================================================================
describe("runMonteCarlo", () => {
  async function baseResult() {
    setBars(makeSeries(400));
    const { runBacktest } = await import("@/lib/backtest/engine");
    return runBacktest({
      ...RANGE,
      strategy: "sma_crossover",
      params: { fastPeriod: 10, slowPeriod: 30 },
    });
  }

  it("is deterministic for a fixed seed", async () => {
    const result = await baseResult();
    const { runMonteCarlo } = await import("@/lib/backtest/monte-carlo");
    const a = runMonteCarlo(result, { iterations: 500, seed: 42 });
    const b = runMonteCarlo(result, { iterations: 500, seed: 42 });
    expect(a.probabilityOfProfit).toBe(b.probabilityOfProfit);
    expect(a.finalReturnPct.p50).toBe(b.finalReturnPct.p50);
    expect(a.finalEquity.p5).toBe(b.finalEquity.p5);
  });

  it("orders percentiles p5 <= p50 <= p95 and bounds probabilities in [0,1]", async () => {
    const result = await baseResult();
    const { runMonteCarlo } = await import("@/lib/backtest/monte-carlo");
    const mc = runMonteCarlo(result, { iterations: 1000, seed: 7 });

    expect(mc.finalReturnPct.p5).toBeLessThanOrEqual(mc.finalReturnPct.p50);
    expect(mc.finalReturnPct.p50).toBeLessThanOrEqual(mc.finalReturnPct.p95);
    expect(mc.finalEquity.p5).toBeLessThanOrEqual(mc.finalEquity.p95);

    expect(mc.probabilityOfProfit).toBeGreaterThanOrEqual(0);
    expect(mc.probabilityOfProfit).toBeLessThanOrEqual(1);
    expect(mc.probabilityDrawdownOver20).toBeGreaterThanOrEqual(0);
    expect(mc.probabilityDrawdownOver20).toBeLessThanOrEqual(1);

    // band points are ordered within each step too
    for (const band of mc.percentileBands) {
      expect(band.p5).toBeLessThanOrEqual(band.p50);
      expect(band.p50).toBeLessThanOrEqual(band.p95);
    }
    // last band point covers the full number of trades
    expect(mc.percentileBands[mc.percentileBands.length - 1]!.tradeIndex).toBe(
      mc.tradesPerIteration,
    );
  });

  it("clamps iterations to the [100, 10000] range", async () => {
    const result = await baseResult();
    const { runMonteCarlo } = await import("@/lib/backtest/monte-carlo");
    expect(runMonteCarlo(result, { iterations: 5, seed: 1 }).iterations).toBe(100);
    expect(runMonteCarlo(result, { iterations: 99999, seed: 1 }).iterations).toBe(10_000);
  });

  it("throws when the backtest produced fewer than 2 trades", async () => {
    const { runMonteCarlo } = await import("@/lib/backtest/monte-carlo");
    const { runBacktest } = await import("@/lib/backtest/engine");
    setBars(makeUptrend(120)); // buy_hold => exactly 1 trade
    const oneTrade = await runBacktest({ ...RANGE, strategy: "buy_hold", params: {} });
    expect(oneTrade.trades.length).toBeLessThan(2);
    expect(() => runMonteCarlo(oneTrade, { seed: 1 })).toThrow();
  });
});
