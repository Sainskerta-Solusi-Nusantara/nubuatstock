import { describe, expect, it } from "vitest";
import {
  adLineSlope,
  adx,
  atr,
  bollinger,
  ema,
  linearSlope,
  macd,
  pctChange,
  rollingMean,
  rollingSum,
  rsi,
  sma,
  stochastic,
  trueRange,
} from "@/lib/picks/indicators";
import { computeLevels, findSupportResistance } from "@/lib/picks/levels";
import { classifySetup } from "@/lib/picks/setup";
import { scoreCandidate } from "@/lib/picks/scoring";
import type {
  ForeignFlowDailyInput,
  OhlcvBar,
  ScoringCandidateInput,
  ScoringWeights,
} from "@/lib/types/picks";

/**
 * Unit tests untuk lib/picks (Daily Picks — high-stake, audit #13).
 *
 * Fokus ke logika PURE:
 *  - Indikator teknikal (SMA/EMA/RSI/MACD/Bollinger/TR/ATR/ADX/Stoch/slope/dll)
 *    dengan deret known → expected.
 *  - Level engine (support/resistance, SL/TP, R/R rejection).
 *  - Setup classifier (continuation/reversal/breakout/pullback/range).
 *  - Scoring engine (komponen + total weighted, reject jika OHLCV < 50 / R/R rendah).
 *
 * DILEWATI (butuh DB/Redis, di luar scope file ini):
 *  - lib/picks/performance.ts (getPerformanceSnapshot) — query db.
 *  - lib/picks/service.ts — semua DTO loaders query db.
 *  - lib/picks/config.ts, universe.ts, narrative.ts, cross-deps.ts — db / IO.
 *  - worker/jobs/evaluate-pick-outcomes.ts — outcome eval (T+1/T+5/T+20, hit
 *    SL/TP, return) bersifat DB-bound dan fungsi internalnya tidak di-export,
 *    jadi tidak bisa di-test tanpa mengubah source.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Bar dengan high/low simetris di sekitar `price`. */
function bar(price: number, opts: Partial<OhlcvBar> = {}): OhlcvBar {
  const spread = opts.high != null || opts.low != null ? 0 : price * 0.01;
  return {
    date: opts.date ?? "2025-01-01",
    open: opts.open ?? price,
    high: opts.high ?? price + spread,
    low: opts.low ?? price - spread,
    close: opts.close ?? price,
    volume: opts.volume ?? 1_000_000,
    valueIdr: opts.valueIdr ?? price * 1_000_000,
  };
}

/** Bar eksplisit OHLC. */
function ohlc(o: number, h: number, l: number, c: number, vol = 1_000_000): OhlcvBar {
  return { date: "2025-01-01", open: o, high: h, low: l, close: c, volume: vol, valueIdr: c * vol };
}

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (arr[i] != null) return arr[i]!;
  }
  return null;
}

// ============================================================================
// SMA
// ============================================================================
describe("sma", () => {
  it("computes simple moving average with known series", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });

  it("returns all null when fewer values than period", () => {
    expect(sma([1, 2], 3)).toEqual([null, null]);
  });

  it("returns all null for non-positive period", () => {
    expect(sma([1, 2, 3], 0)).toEqual([null, null, null]);
  });

  it("uses a true sliding window (constant series)", () => {
    expect(sma([5, 5, 5, 5], 2)).toEqual([null, 5, 5, 5]);
  });
});

// ============================================================================
// EMA
// ============================================================================
describe("ema", () => {
  it("seeds with SMA of first period then applies smoothing factor", () => {
    // period 3 → k = 2/4 = 0.5. Seed = avg(1,2,3) = 2.
    // i=3: 4*0.5 + 2*0.5 = 3
    // i=4: 5*0.5 + 3*0.5 = 4
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).toBeCloseTo(2, 10);
    expect(out[3]).toBeCloseTo(3, 10);
    expect(out[4]).toBeCloseTo(4, 10);
  });

  it("on a constant series equals the constant", () => {
    const out = ema([7, 7, 7, 7, 7], 3);
    expect(out[4]).toBeCloseTo(7, 10);
  });

  it("returns all null when insufficient data", () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });
});

// ============================================================================
// RSI
// ============================================================================
describe("rsi", () => {
  it("returns 100 for a strictly increasing series (no losses)", () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = rsi(values, 14);
    expect(lastNonNull(out)).toBe(100);
  });

  it("first defined value sits at index = period", () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = rsi(values, 14);
    expect(out[13]).toBeNull();
    expect(out[14]).not.toBeNull();
  });

  it("returns all null when values length <= period", () => {
    const out = rsi([1, 2, 3], 14);
    expect(out.every((v) => v === null)).toBe(true);
  });

  it("oscillating series stays in valid 0..100 range and lands near 50", () => {
    // Alternating +1 / -1 around a mean → balanced gains/losses.
    const values: number[] = [];
    let p = 100;
    for (let i = 0; i < 40; i += 1) {
      p += i % 2 === 0 ? 1 : -1;
      values.push(p);
    }
    const last = lastNonNull(rsi(values, 14))!;
    expect(last).toBeGreaterThan(0);
    expect(last).toBeLessThan(100);
    expect(last).toBeGreaterThan(30);
    expect(last).toBeLessThan(70);
  });
});

// ============================================================================
// MACD
// ============================================================================
describe("macd", () => {
  it("macd line is null until slow EMA is defined", () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + i);
    const { macd: line, signal, histogram } = macd(values, 12, 26, 9);
    // slow EMA needs 26 bars → first defined macd at index 25
    expect(line[24]).toBeNull();
    expect(line[25]).not.toBeNull();
    // signal needs 9 more compacted points
    expect(lastNonNull(signal)).not.toBeNull();
    // histogram = macd - signal
    const i = values.length - 1;
    expect(histogram[i]).toBeCloseTo(line[i]! - signal[i]!, 8);
  });

  it("on uptrend the macd line is positive (fast above slow)", () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const line = macd(values).macd;
    expect(lastNonNull(line)!).toBeGreaterThan(0);
  });
});

// ============================================================================
// Bollinger
// ============================================================================
describe("bollinger", () => {
  it("on a constant series bands collapse to the mean and bandwidth is 0", () => {
    const values = new Array(30).fill(50);
    const bb = bollinger(values, 20, 2);
    const i = values.length - 1;
    expect(bb.middle[i]).toBe(50);
    expect(bb.upper[i]).toBeCloseTo(50, 10);
    expect(bb.lower[i]).toBeCloseTo(50, 10);
    expect(bb.bandwidth[i]).toBeCloseTo(0, 10);
  });

  it("upper/lower are symmetric around the middle band", () => {
    const values = Array.from({ length: 30 }, (_, i) => 100 + (i % 5));
    const bb = bollinger(values, 20, 2);
    const i = values.length - 1;
    const m = bb.middle[i]!;
    expect(bb.upper[i]! - m).toBeCloseTo(m - bb.lower[i]!, 8);
  });

  it("computes exact std-dev band for a known window", () => {
    // period 4 over last window [2,4,4,6]: mean=4, population sd = sqrt((4+0+0+4)/4)=sqrt(2)
    const values = [0, 0, 2, 4, 4, 6];
    const bb = bollinger(values, 4, 2);
    const i = 5;
    expect(bb.middle[i]).toBeCloseTo(4, 10);
    expect(bb.upper[i]).toBeCloseTo(4 + 2 * Math.SQRT2, 8);
    expect(bb.lower[i]).toBeCloseTo(4 - 2 * Math.SQRT2, 8);
  });
});

// ============================================================================
// True Range / ATR
// ============================================================================
describe("trueRange", () => {
  it("first bar TR is high - low", () => {
    const bars = [ohlc(10, 12, 8, 11)];
    expect(trueRange(bars)[0]).toBe(4);
  });

  it("accounts for gaps via previous close", () => {
    // prev close 11. Bar: high 20, low 18 → TR = max(2, |20-11|, |18-11|) = 9
    const bars = [ohlc(10, 12, 8, 11), ohlc(19, 20, 18, 19)];
    expect(trueRange(bars)[1]).toBe(9);
  });

  it("returns empty for empty input", () => {
    expect(trueRange([])).toEqual([]);
  });
});

describe("atr", () => {
  it("returns all null when fewer bars than period", () => {
    const bars = Array.from({ length: 5 }, () => ohlc(10, 11, 9, 10));
    expect(atr(bars, 14).every((v) => v === null)).toBe(true);
  });

  it("constant-range bars produce ATR equal to that range", () => {
    // every bar high-low = 2, no gaps → TR steady = 2 → ATR = 2
    const bars = Array.from({ length: 20 }, () => ohlc(10, 11, 9, 10));
    const out = atr(bars, 14);
    expect(lastNonNull(out)).toBeCloseTo(2, 6);
  });
});

// ============================================================================
// ADX
// ============================================================================
describe("adx", () => {
  it("returns all null when fewer than 2*period bars", () => {
    const bars = Array.from({ length: 20 }, () => ohlc(10, 11, 9, 10));
    expect(adx(bars, 14).every((v) => v === null)).toBe(true);
  });

  it("strong uptrend yields a high ADX (> 25)", () => {
    const bars: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 60; i += 1) {
      p += 2;
      bars.push(ohlc(p - 2, p + 1, p - 1, p));
    }
    const last = lastNonNull(adx(bars, 14))!;
    expect(last).toBeGreaterThan(25);
    expect(last).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// pctChange / rolling
// ============================================================================
describe("pctChange", () => {
  it("computes percent change over given periods", () => {
    const out = pctChange([100, 110, 121], 1);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeCloseTo(10, 10);
    expect(out[2]).toBeCloseTo(10, 10);
  });

  it("returns null when the base value is zero (no division by zero)", () => {
    const out = pctChange([0, 5], 1);
    expect(out[1]).toBeNull();
  });
});

describe("rollingSum & rollingMean", () => {
  it("rollingSum slides correctly", () => {
    expect(rollingSum([1, 2, 3, 4], 2)).toEqual([null, 3, 5, 7]);
  });

  it("rollingMean aliases sma", () => {
    expect(rollingMean([2, 4, 6], 3)).toEqual([null, null, 4]);
  });
});

// ============================================================================
// adLineSlope / linearSlope
// ============================================================================
describe("linearSlope", () => {
  it("returns the slope of a perfect line", () => {
    expect(linearSlope([0, 2, 4, 6])).toBeCloseTo(2, 10);
  });

  it("returns 0 for a single point", () => {
    expect(linearSlope([5])).toBe(0);
  });

  it("returns 0 for a flat line", () => {
    expect(linearSlope([3, 3, 3, 3])).toBeCloseTo(0, 10);
  });
});

describe("adLineSlope", () => {
  it("returns 0 when fewer bars than lookback", () => {
    const bars = Array.from({ length: 5 }, () => ohlc(10, 11, 9, 10));
    expect(adLineSlope(bars, 20)).toBe(0);
  });

  it("is positive when closes print near the high (accumulation)", () => {
    // close near high each bar → MFM positive → cumulative AD rising → slope > 0
    const bars = Array.from({ length: 25 }, (_, i) =>
      ohlc(10 + i, 11 + i, 9 + i, 10.9 + i, 1_000_000),
    );
    expect(adLineSlope(bars, 20)).toBeGreaterThan(0);
  });

  it("is negative when closes print near the low (distribution)", () => {
    const bars = Array.from({ length: 25 }, (_, i) =>
      ohlc(10 + i, 11 + i, 9 + i, 9.1 + i, 1_000_000),
    );
    expect(adLineSlope(bars, 20)).toBeLessThan(0);
  });
});

// ============================================================================
// Stochastic
// ============================================================================
describe("stochastic", () => {
  it("close at the top of the range gives %K near 100", () => {
    // build a window where the last close is the highest high
    const bars: OhlcvBar[] = [];
    for (let i = 0; i < 14; i += 1) bars.push(ohlc(10, 12, 8, 10));
    bars.push(ohlc(11, 12, 8, 12)); // last close = window high
    const { k } = stochastic(bars, 14, 1, 1);
    expect(lastNonNull(k)!).toBeCloseTo(100, 6);
  });

  it("close at the bottom of the range gives %K near 0", () => {
    const bars: OhlcvBar[] = [];
    for (let i = 0; i < 14; i += 1) bars.push(ohlc(10, 12, 8, 10));
    bars.push(ohlc(9, 12, 8, 8)); // last close = window low
    const { k } = stochastic(bars, 14, 1, 1);
    expect(lastNonNull(k)!).toBeCloseTo(0, 6);
  });

  it("flat range (no high/low spread) returns midpoint 50", () => {
    const bars = Array.from({ length: 14 }, () => ohlc(10, 10, 10, 10));
    const { k } = stochastic(bars, 14, 1, 1);
    expect(lastNonNull(k)).toBe(50);
  });

  it("%D smoothing produces null until enough %K points exist", () => {
    const bars = Array.from({ length: 20 }, (_, i) => ohlc(10 + i, 12 + i, 8 + i, 10 + i));
    const { d } = stochastic(bars, 14, 3, 3);
    // need kPeriod-1 + (kSmoothing-1) + (dSmoothing-1) bars before first %D
    expect(d[15]).toBeNull();
    expect(lastNonNull(d)).not.toBeNull();
  });
});

// ============================================================================
// Levels (support/resistance + SL/TP)
// ============================================================================

/** Synthetic uptrend with clear swing structure for level detection. */
function uptrendBars(n: number, start = 100): OhlcvBar[] {
  const bars: OhlcvBar[] = [];
  let p = start;
  for (let i = 0; i < n; i += 1) {
    // gentle uptrend with small oscillation to create pivots
    const wobble = Math.sin(i / 3) * 2;
    const c = p + wobble;
    bars.push(ohlc(c - 0.5, c + 1.5, c - 1.5, c, 2_000_000));
    p += 0.8;
  }
  return bars;
}

describe("findSupportResistance", () => {
  it("returns empty levels for too-short windows", () => {
    const res = findSupportResistance(uptrendBars(5), 60);
    expect(res.supports).toEqual([]);
    expect(res.resistances).toEqual([]);
  });

  it("supports lie below and resistances above the last close", () => {
    const bars = uptrendBars(80);
    const res = findSupportResistance(bars, 60);
    expect(res.lastClose).toBeGreaterThan(0);
    for (const s of res.supports) {
      expect((s.low + s.high) / 2).toBeLessThan(res.lastClose);
    }
    for (const r of res.resistances) {
      expect((r.low + r.high) / 2).toBeGreaterThan(res.lastClose);
    }
    expect(res.atr14).toBeGreaterThan(0);
  });
});

describe("computeLevels", () => {
  it("rejects when fewer than 30 bars", () => {
    const out = computeLevels({ bars: uptrendBars(10), setup: "continuation", minRrRatio: 1.5 });
    expect(out.rejected).toBe(true);
    expect(out.rejectionReason).toContain("Insufficient bars");
  });

  it("produces a coherent SL/TP ladder when accepted", () => {
    const bars = uptrendBars(80);
    const out = computeLevels({ bars, setup: "continuation", minRrRatio: 0.1 });
    expect(out.rejected).toBe(false);
    const entry = (out.entryZoneLow + out.entryZoneHigh) / 2;
    // SL below entry, TP1 above entry, TP2 above TP1
    expect(out.stopLoss).toBeLessThan(entry);
    expect(out.tp1).toBeGreaterThan(entry);
    expect(out.tp2!).toBeGreaterThan(out.tp1);
    expect(out.rewardRiskRatio).toBeGreaterThan(0);
    expect(out.atr14).toBeGreaterThan(0);
  });

  it("rejects when reward/risk is below the minimum", () => {
    const bars = uptrendBars(80);
    // Impossibly high R/R requirement → forced rejection but levels still reported.
    const out = computeLevels({ bars, setup: "continuation", minRrRatio: 100 });
    expect(out.rejected).toBe(true);
    expect(out.rejectionReason).toMatch(/R\/R/);
    expect(out.rewardRiskRatio).toBeLessThan(100);
  });

  it("R/R of exactly 2.0 follows from the TP2 = entry + 2R definition", () => {
    const bars = uptrendBars(80);
    const out = computeLevels({ bars, setup: "continuation", minRrRatio: 0.1 });
    expect(out.rejected).toBe(false);
    const entry = (out.entryZoneLow + out.entryZoneHigh) / 2;
    const risk = entry - out.stopLoss;
    const reward = out.tp2! - entry;
    expect(reward / risk).toBeCloseTo(out.rewardRiskRatio, 1);
    // by construction reward = 2 * risk
    expect(out.rewardRiskRatio).toBeCloseTo(2, 1);
  });
});

// ============================================================================
// Setup classifier
// ============================================================================
describe("classifySetup", () => {
  it("defaults to low-confidence range for too-short series", () => {
    const out = classifySetup({ bars: uptrendBars(10) });
    expect(out.setupType).toBe("range");
    expect(out.confidence).toBe("low");
  });

  it("classifies a rising trend with pullbacks as continuation/pullback (not reversal)", () => {
    // Uptrend with oscillation so RSI stays in the 50-72 sweet spot rather than
    // pinning at 100 (a perfectly linear ramp would classify as range).
    const bars: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 120; i += 1) {
      const wobble = Math.sin(i / 4) * 3;
      p += 0.6;
      const c = p + wobble;
      bars.push(ohlc(c - 0.5, c + 1, c - 1, c, 2_000_000));
    }
    const out = classifySetup({ bars });
    // Trending-up structure should never be flagged as a reversal.
    expect(out.setupType).not.toBe("reversal");
    expect(["continuation", "pullback", "breakout", "range"]).toContain(out.setupType);
    expect(["low", "medium", "high"]).toContain(out.confidence);
  });

  it("returns a valid setup type for a downtrend", () => {
    const bars: OhlcvBar[] = [];
    let p = 200;
    for (let i = 0; i < 80; i += 1) {
      p -= 1;
      bars.push(ohlc(p + 0.5, p + 1, p - 1, p, 1_000_000));
    }
    const out = classifySetup({ bars });
    expect(["range", "reversal", "continuation", "breakout", "pullback"]).toContain(out.setupType);
  });
});

// ============================================================================
// Scoring engine
// ============================================================================

function weights(over: Partial<ScoringWeights> = {}): ScoringWeights {
  return {
    technical: 0.4,
    bandarmology: 0.2,
    fundamental: 0.15,
    sentiment: 0.1,
    macro: 0.15,
    risk_penalty: 0.2,
    ...over,
  };
}

function candidate(bars: OhlcvBar[], over: Partial<ScoringCandidateInput> = {}): ScoringCandidateInput {
  return {
    companyKode: "TEST",
    sectorKode: "SEC",
    marketCapIdr: 10_000_000_000_000,
    ohlcv: bars,
    foreignFlow: [],
    sectorContext: null,
    ...over,
  };
}

describe("scoreCandidate", () => {
  it("rejects candidates with fewer than 50 OHLCV bars", () => {
    const out = scoreCandidate({
      candidate: candidate(uptrendBars(40)),
      weights: weights(),
      weightsVersion: "v1",
      minRrRatio: 1.5,
    });
    expect(out.rejected).toBe(true);
    expect(out.rejectionReason).toContain("Insufficient OHLCV");
    expect(out.score).toBe(0);
    expect(out.companyKode).toBe("TEST");
  });

  it("produces a clamped 0..100 score with all factor breakdowns present", () => {
    const bars: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 220; i += 1) {
      p += 0.5;
      bars.push(ohlc(p - 0.3, p + 0.7, p - 0.7, p, 2_000_000 + i * 1000));
    }
    const out = scoreCandidate({
      candidate: candidate(bars),
      weights: weights(),
      weightsVersion: "v1",
      minRrRatio: 0.1,
    });
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
    for (const key of ["technical", "bandarmology", "fundamental", "sentiment", "macro", "risk_penalty"] as const) {
      expect(out.breakdown[key]).toBeGreaterThanOrEqual(0);
      expect(out.breakdown[key]).toBeLessThanOrEqual(100);
    }
    expect(out.breakdown.sentiment).toBe(50); // neutral, never fabricated
    expect(out.weightsVersion).toBe("v1");
  });

  it("strong uptrend scores higher on the technical factor than a flat series", () => {
    const flat: OhlcvBar[] = Array.from({ length: 220 }, () => ohlc(100, 100.5, 99.5, 100, 1_000_000));
    const up: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 220; i += 1) {
      p += 0.8;
      up.push(ohlc(p - 0.3, p + 0.7, p - 0.7, p, 2_000_000));
    }
    const flatOut = scoreCandidate({ candidate: candidate(flat), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 });
    const upOut = scoreCandidate({ candidate: candidate(up), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 });
    expect(upOut.breakdown.technical).toBeGreaterThan(flatOut.breakdown.technical);
  });

  it("bandarmology factor rewards net foreign inflows", () => {
    const bars: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 60; i += 1) {
      p += 0.5;
      bars.push(ohlc(p - 0.3, p + 0.7, p - 0.7, p, 2_000_000));
    }
    const inflow: ForeignFlowDailyInput[] = Array.from({ length: 20 }, (_, i) => ({
      tradeDate: `2025-01-${String(i + 1).padStart(2, "0")}`,
      netValue: 1_000_000_000,
    }));
    const outflow: ForeignFlowDailyInput[] = inflow.map((r) => ({ ...r, netValue: -1_000_000_000 }));

    const inOut = scoreCandidate({ candidate: candidate(bars, { foreignFlow: inflow }), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 });
    const outOut = scoreCandidate({ candidate: candidate(bars, { foreignFlow: outflow }), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 });
    expect(inOut.breakdown.bandarmology).toBeGreaterThan(outOut.breakdown.bandarmology);
  });

  it("fundamental factor tiers by market cap and is neutral when unknown", () => {
    const bars: OhlcvBar[] = Array.from({ length: 60 }, (_, i) => ohlc(100 + i, 101 + i, 99 + i, 100 + i, 2_000_000));
    const mk = (cap: number | null) =>
      scoreCandidate({ candidate: candidate(bars, { marketCapIdr: cap }), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 }).breakdown.fundamental;
    expect(mk(null)).toBe(50);
    expect(mk(0)).toBe(50);
    expect(mk(6_000_000_000_000)).toBe(65); // 5T..50T tier
    expect(mk(60_000_000_000_000)).toBe(60); // >=50T tier
    expect(mk(100_000_000_000)).toBe(45); // small cap
  });

  it("macro factor rewards sector outperformance vs IHSG", () => {
    const bars: OhlcvBar[] = Array.from({ length: 60 }, (_, i) => ohlc(100 + i, 101 + i, 99 + i, 100 + i, 2_000_000));
    const strong = scoreCandidate({
      candidate: candidate(bars, { sectorContext: { sectorKode: "SEC", sectorReturn5dPct: 5, ihsgReturn5dPct: 1 } }),
      weights: weights(), weightsVersion: "v1", minRrRatio: 0.1,
    }).breakdown.macro;
    const weak = scoreCandidate({
      candidate: candidate(bars, { sectorContext: { sectorKode: "SEC", sectorReturn5dPct: -5, ihsgReturn5dPct: 1 } }),
      weights: weights(), weightsVersion: "v1", minRrRatio: 0.1,
    }).breakdown.macro;
    const neutral = scoreCandidate({
      candidate: candidate(bars, { sectorContext: null }),
      weights: weights(), weightsVersion: "v1", minRrRatio: 0.1,
    }).breakdown.macro;
    expect(strong).toBe(80);
    expect(weak).toBe(20);
    expect(neutral).toBe(50);
  });

  it("risk penalty rises for thin liquidity (low traded value)", () => {
    const mkBars = (value: number): OhlcvBar[] => {
      const bars: OhlcvBar[] = [];
      let p = 100;
      for (let i = 0; i < 60; i += 1) {
        p += 0.2;
        bars.push({ date: "2025-01-01", open: p, high: p + 0.3, low: p - 0.3, close: p, volume: 1_000_000, valueIdr: value });
      }
      return bars;
    };
    const liquid = scoreCandidate({ candidate: candidate(mkBars(10_000_000_000)), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 }).breakdown.risk_penalty;
    const thin = scoreCandidate({ candidate: candidate(mkBars(100_000_000)), weights: weights(), weightsVersion: "v1", minRrRatio: 0.1 }).breakdown.risk_penalty;
    expect(thin).toBeGreaterThan(liquid);
  });

  it("propagates levels rejection (R/R too low) while still reporting score", () => {
    const bars: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 80; i += 1) {
      p += 0.6;
      bars.push(ohlc(p - 0.3, p + 0.7, p - 0.7, p, 2_000_000));
    }
    const out = scoreCandidate({
      candidate: candidate(bars),
      weights: weights(),
      weightsVersion: "v1",
      minRrRatio: 100, // impossible → levels.rejected
    });
    expect(out.rejected).toBe(true);
    expect(out.rejectionReason).toMatch(/R\/R/);
    // score is still computed (not zeroed like the <50-bar path)
    expect(out.score).toBeGreaterThanOrEqual(0);
  });
});
