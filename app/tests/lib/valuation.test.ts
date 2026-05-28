import { describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk lib/valuation/** — high-stake numeric valuation models (audit #13).
 *
 * Cakupan:
 * - runDCF (two-stage DCF): perhitungan FCF projection, terminal value, PV, intrinsic
 *   value/share, margin of safety, recommendation classification, sensitivity grid,
 *   warnings, dan edge cases (growth > discount, FCF negatif, shares=0, currentPrice=0,
 *   discount == terminal growth → TV tidak terhitung).
 * - runReverseDCF (implied growth solver via binary search): konsistensi roundtrip dengan
 *   runDCF/computeNPV, monotonicity (market cap naik → implied growth naik), interpretation
 *   buckets, edge case FCF ≤ 0.
 * - runDDM (Gordon + 2-stage dividend discount): dividend projection, terminal value,
 *   applicability, warnings, edge cases.
 * - runGrahamNumber & runLynchFairValue (heuristics): formula correctness, growth cap,
 *   PEG, edge cases (EPS/BVPS ≤ 0).
 *
 * Strategi: fungsi inti murni (no I/O). `@/lib/db` di-mock agar import module tidak
 * membuka koneksi Postgres — kita TIDAK menguji builder*Inputs (DB-backed).
 *
 * Nilai referensi dihitung manual / via replikasi formula di komentar tiap test.
 * Toleransi numerik via toBeCloseTo (DCF outputnya range, bukan precision number).
 */

vi.mock("@/lib/db", () => ({ db: {} }));

import { runDCF, type DCFInputs } from "@/lib/valuation/dcf";
import { runReverseDCF, type ReverseDCFInputs } from "@/lib/valuation/reverse-dcf";
import { runDDM, type DDMInputs } from "@/lib/valuation/ddm";
import { runGrahamNumber, runLynchFairValue } from "@/lib/valuation/graham-lynch";

// ── Helpers untuk replikasi formula referensi ───────────────────────────────

/** Replika persis computeProjected dari dcf.ts (untuk cross-check independen). */
function refDcfEnterpriseValue(i: DCFInputs): {
  fcf: number[];
  pv: number[];
  terminalValue: number;
  terminalPv: number;
  ev: number;
} {
  const fcf: number[] = [];
  const pv: number[] = [];
  let cur = i.initialFcfIdr;
  for (let y = 1; y <= 10; y += 1) {
    const g = y <= 5 ? i.growthRateY1to5 : i.growthRateY6to10;
    cur = cur * (1 + g);
    fcf.push(cur);
    pv.push(cur / Math.pow(1 + i.discountRate, y));
  }
  const last = fcf[fcf.length - 1]!;
  let terminalValue = 0;
  let terminalPv = 0;
  if (i.discountRate > i.terminalGrowthRate) {
    terminalValue = (last * (1 + i.terminalGrowthRate)) / (i.discountRate - i.terminalGrowthRate);
    terminalPv = terminalValue / Math.pow(1 + i.discountRate, 10);
  }
  const ev = pv.reduce((a, b) => a + b, 0) + terminalPv;
  return { fcf, pv, terminalValue, terminalPv, ev };
}

/** Replika computeNPV dari reverse-dcf.ts. */
function refReverseNpv(initialFcf: number, growth: number, terminalGrowth: number, discountRate: number, years: number): number {
  let pv = 0;
  let fcf = initialFcf;
  for (let year = 1; year <= years; year += 1) {
    fcf = fcf * (1 + growth);
    pv += fcf / Math.pow(1 + discountRate, year);
  }
  if (discountRate > terminalGrowth) {
    const tv = (fcf * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
    pv += tv / Math.pow(1 + discountRate, years);
  }
  return pv;
}

const baseDcf: DCFInputs = {
  initialFcfIdr: 1000,
  growthRateY1to5: 0.1,
  growthRateY6to10: 0.05,
  terminalGrowthRate: 0.04,
  discountRate: 0.12,
  sharesOutstanding: 100,
  currentPrice: 50,
  marketCapIdr: 5000,
};

// ── runDCF ──────────────────────────────────────────────────────────────────

describe("runDCF — core projection & valuation", () => {
  it("projects FCF over 10 years with correct two-stage growth", () => {
    const r = runDCF(baseDcf);
    expect(r.projectedFcf).toHaveLength(10);
    // Year 1: 1000 * 1.10 = 1100
    expect(r.projectedFcf[0]).toBeCloseTo(1100, 6);
    // Year 5: 1000 * 1.10^5 = 1610.51
    expect(r.projectedFcf[4]).toBeCloseTo(1000 * Math.pow(1.1, 5), 6);
    // Year 6 switches to Y6to10 growth (5%): year5 * 1.05
    expect(r.projectedFcf[5]).toBeCloseTo(1000 * Math.pow(1.1, 5) * 1.05, 6);
    // Year 10: year5 * 1.05^5
    expect(r.projectedFcf[9]).toBeCloseTo(1000 * Math.pow(1.1, 5) * Math.pow(1.05, 5), 6);
  });

  it("discounts each year's FCF correctly", () => {
    const r = runDCF(baseDcf);
    expect(r.presentValues).toHaveLength(10);
    // PV year1 = 1100 / 1.12
    expect(r.presentValues[0]).toBeCloseTo(1100 / 1.12, 6);
    // PV year10 = fcf10 / 1.12^10
    const fcf10 = 1000 * Math.pow(1.1, 5) * Math.pow(1.05, 5);
    expect(r.presentValues[9]).toBeCloseTo(fcf10 / Math.pow(1.12, 10), 6);
  });

  it("computes terminal value via Gordon growth and discounts it", () => {
    const r = runDCF(baseDcf);
    const ref = refDcfEnterpriseValue(baseDcf);
    // TV = lastFcf * (1+g_term) / (r - g_term)
    expect(r.terminalValue).toBeCloseTo(ref.terminalValue, 4);
    expect(r.terminalValue).toBeCloseTo(26721.0348, 2);
    // PV(TV) = TV / 1.12^10
    expect(r.terminalPv).toBeCloseTo(ref.terminalPv, 4);
    expect(r.terminalPv).toBeCloseTo(8603.458, 2);
  });

  it("sums PVs + terminal PV into enterprise value and per-share intrinsic", () => {
    const r = runDCF(baseDcf);
    const ref = refDcfEnterpriseValue(baseDcf);
    expect(r.enterpriseValue).toBeCloseTo(ref.ev, 4);
    expect(r.enterpriseValue).toBeCloseTo(17122.526, 2);
    // intrinsic/share = EV / shares
    expect(r.intrinsicValuePerShare).toBeCloseTo(ref.ev / 100, 4);
    expect(r.intrinsicValuePerShare).toBeCloseTo(171.2253, 3);
  });

  it("computes margin of safety as (intrinsic - price)/price * 100", () => {
    const r = runDCF(baseDcf);
    const expected = ((r.intrinsicValuePerShare - baseDcf.currentPrice) / baseDcf.currentPrice) * 100;
    expect(r.marginOfSafetyPct).toBeCloseTo(expected, 6);
    expect(r.marginOfSafetyPct).toBeCloseTo(242.4505, 3);
  });

  it("classifies recommendation by margin thresholds", () => {
    // baseDcf margin ~242% > 40 → deeply_undervalued
    expect(runDCF(baseDcf).recommendation).toBe("deeply_undervalued");
    // Tune currentPrice so margin lands in each bucket.
    const ips = runDCF(baseDcf).intrinsicValuePerShare; // ~171.23
    // undervalued: 15 < margin <= 40 → price between ips/1.15 and ips/1.40
    const underPrice = ips / 1.3; // margin = 30%
    expect(runDCF({ ...baseDcf, currentPrice: underPrice }).recommendation).toBe("undervalued");
    // fair: -15 < margin <= 15 → price ~= ips
    expect(runDCF({ ...baseDcf, currentPrice: ips }).recommendation).toBe("fair");
    // overvalued: -40 < margin <= -15 → price = ips/0.75 (margin -25%)
    expect(runDCF({ ...baseDcf, currentPrice: ips / 0.75 }).recommendation).toBe("overvalued");
    // deeply_overvalued: margin <= -40 → price = ips/0.5 (margin -50%)
    expect(runDCF({ ...baseDcf, currentPrice: ips / 0.5 }).recommendation).toBe("deeply_overvalued");
  });

  it("builds 5x5 sensitivity grid with center row/col matching base case", () => {
    const r = runDCF(baseDcf);
    expect(r.sensitivity.discountRates).toHaveLength(5);
    expect(r.sensitivity.growthRates).toHaveLength(5);
    expect(r.sensitivity.matrix).toHaveLength(5);
    r.sensitivity.matrix.forEach((row) => expect(row).toHaveLength(5));
    // Center cell [2][2] uses base discount & growth → equals base intrinsic value.
    expect(r.sensitivity.matrix[2]![2]).toBeCloseTo(r.intrinsicValuePerShare, 4);
    // Discount rates centered around base (0.12): 0.08, 0.10, 0.12, 0.14, 0.16
    expect(r.sensitivity.discountRates[2]).toBeCloseTo(0.12, 6);
    expect(r.sensitivity.growthRates[2]).toBeCloseTo(0.1, 6);
  });

  it("sensitivity: lower discount rate increases value; higher discount lowers it", () => {
    const r = runDCF(baseDcf);
    const m = r.sensitivity.matrix;
    // Column fixed at center growth (idx 2), vary discount rows.
    expect(m[0]![2]!).toBeGreaterThan(m[2]![2]!); // lowest discount → highest value
    expect(m[4]![2]!).toBeLessThan(m[2]![2]!); // highest discount → lowest value
    // Row fixed at center discount (idx 2), vary growth cols.
    expect(m[2]![0]!).toBeLessThan(m[2]![2]!); // lowest growth → lower value
    expect(m[2]![4]!).toBeGreaterThan(m[2]![2]!); // highest growth → higher value
  });
});

describe("runDCF — sanity / monotonicity", () => {
  it("fair value rises when growth rate rises", () => {
    const low = runDCF({ ...baseDcf, growthRateY1to5: 0.05, growthRateY6to10: 0.025 });
    const high = runDCF({ ...baseDcf, growthRateY1to5: 0.2, growthRateY6to10: 0.1 });
    expect(high.intrinsicValuePerShare).toBeGreaterThan(low.intrinsicValuePerShare);
  });

  it("fair value falls when discount rate rises", () => {
    const cheap = runDCF({ ...baseDcf, discountRate: 0.1 });
    const pricey = runDCF({ ...baseDcf, discountRate: 0.18 });
    expect(pricey.intrinsicValuePerShare).toBeLessThan(cheap.intrinsicValuePerShare);
  });

  it("fair value scales linearly with initial FCF", () => {
    const a = runDCF({ ...baseDcf, initialFcfIdr: 1000 });
    const b = runDCF({ ...baseDcf, initialFcfIdr: 2000 });
    expect(b.enterpriseValue).toBeCloseTo(a.enterpriseValue * 2, 4);
  });
});

describe("runDCF — edge cases & warnings", () => {
  it("discount rate <= terminal growth → terminal value = 0 + warning", () => {
    const r = runDCF({ ...baseDcf, discountRate: 0.04, terminalGrowthRate: 0.04 });
    expect(r.terminalValue).toBe(0);
    expect(r.terminalPv).toBe(0);
    expect(r.warnings.some((w) => w.includes("terminal growth"))).toBe(true);
    // EV is then just sum of discounted explicit FCFs (still positive).
    expect(r.enterpriseValue).toBeGreaterThan(0);
  });

  it("growth > discount rate still computes (TV present while r>g_term)", () => {
    // growthRateY1to5 = 0.35 > discountRate 0.12, but terminal growth 0.04 < 0.12 so TV valid.
    const r = runDCF({ ...baseDcf, growthRateY1to5: 0.35, growthRateY6to10: 0.175 });
    expect(r.terminalValue).toBeGreaterThan(0);
    expect(Number.isFinite(r.intrinsicValuePerShare)).toBe(true);
    expect(r.warnings.some((w) => w.includes("Growth rate > 30%") || w.includes("agresif"))).toBe(true);
  });

  it("negative / zero initial FCF emits warning and yields non-positive value", () => {
    const neg = runDCF({ ...baseDcf, initialFcfIdr: -500 });
    expect(neg.warnings.some((w) => w.includes("negatif") || w.includes("FCF"))).toBe(true);
    expect(neg.intrinsicValuePerShare).toBeLessThan(0);

    const zero = runDCF({ ...baseDcf, initialFcfIdr: 0 });
    expect(zero.intrinsicValuePerShare).toBe(0);
    expect(zero.enterpriseValue).toBe(0);
  });

  it("shares outstanding = 0 → intrinsic value/share = 0 (no division by zero)", () => {
    const r = runDCF({ ...baseDcf, sharesOutstanding: 0 });
    expect(r.intrinsicValuePerShare).toBe(0);
    expect(Number.isFinite(r.intrinsicValuePerShare)).toBe(true);
  });

  it("current price = 0 → margin of safety = 0 (no division by zero)", () => {
    const r = runDCF({ ...baseDcf, currentPrice: 0 });
    expect(r.marginOfSafetyPct).toBe(0);
  });

  it("terminal growth > 5% emits sanity warning", () => {
    const r = runDCF({ ...baseDcf, terminalGrowthRate: 0.06 });
    expect(r.warnings.some((w) => w.includes("Terminal growth > 5%") || w.includes("GDP"))).toBe(true);
  });
});

// ── runReverseDCF ─────────────────────────────────────────────────────────────

const baseReverse: ReverseDCFInputs = {
  marketCapIdr: 0, // filled per test
  initialFcfIdr: 1000,
  terminalGrowth: 0.04,
  discountRate: 0.12,
  projectionYears: 10,
};

describe("runReverseDCF — implied growth solver", () => {
  it("recovers the growth used to generate the market cap (roundtrip)", () => {
    const trueGrowth = 0.12;
    const marketCap = refReverseNpv(1000, trueGrowth, 0.04, 0.12, 10);
    const r = runReverseDCF({ ...baseReverse, marketCapIdr: marketCap });
    // Binary search tolerance 0.5% of marketCap; implied growth should be close.
    expect(r.impliedGrowthY1to5).toBeCloseTo(trueGrowth, 2);
  });

  it("solved growth reproduces market cap within solver tolerance", () => {
    const marketCap = refReverseNpv(1000, 0.08, 0.04, 0.12, 10);
    const r = runReverseDCF({ ...baseReverse, marketCapIdr: marketCap });
    const npvAtSolved = refReverseNpv(1000, r.impliedGrowthY1to5, 0.04, 0.12, 10);
    // Within 1% of target market cap.
    expect(Math.abs(npvAtSolved - marketCap) / marketCap).toBeLessThan(0.01);
  });

  it("monotonic: higher market cap implies higher growth", () => {
    const lowCap = refReverseNpv(1000, 0.05, 0.04, 0.12, 10);
    const highCap = refReverseNpv(1000, 0.2, 0.04, 0.12, 10);
    const rLow = runReverseDCF({ ...baseReverse, marketCapIdr: lowCap });
    const rHigh = runReverseDCF({ ...baseReverse, marketCapIdr: highCap });
    expect(rHigh.impliedGrowthY1to5).toBeGreaterThan(rLow.impliedGrowthY1to5);
  });

  it("interpretation buckets follow solved growth", () => {
    // very_pessimistic: g < 0.02
    const capVeryPess = refReverseNpv(1000, 0.0, 0.04, 0.12, 10);
    expect(runReverseDCF({ ...baseReverse, marketCapIdr: capVeryPess }).interpretation).toBe("very_pessimistic");
    // pessimistic: 0.02 <= g < 0.08
    const capPess = refReverseNpv(1000, 0.05, 0.04, 0.12, 10);
    expect(runReverseDCF({ ...baseReverse, marketCapIdr: capPess }).interpretation).toBe("pessimistic");
    // fair: 0.08 <= g < 0.15
    const capFair = refReverseNpv(1000, 0.11, 0.04, 0.12, 10);
    expect(runReverseDCF({ ...baseReverse, marketCapIdr: capFair }).interpretation).toBe("fair");
    // optimistic: 0.15 <= g < 0.25
    const capOpt = refReverseNpv(1000, 0.2, 0.04, 0.12, 10);
    expect(runReverseDCF({ ...baseReverse, marketCapIdr: capOpt }).interpretation).toBe("optimistic");
    // very_optimistic: g >= 0.25
    const capVeryOpt = refReverseNpv(1000, 0.35, 0.04, 0.12, 10);
    expect(runReverseDCF({ ...baseReverse, marketCapIdr: capVeryOpt }).interpretation).toBe("very_optimistic");
  });

  it("reports iteration count and comment string", () => {
    const marketCap = refReverseNpv(1000, 0.1, 0.04, 0.12, 10);
    const r = runReverseDCF({ ...baseReverse, marketCapIdr: marketCap });
    expect(r.iterations).toBeGreaterThan(0);
    expect(r.iterations).toBeLessThanOrEqual(100);
    expect(typeof r.comment).toBe("string");
    expect(r.comment.length).toBeGreaterThan(0);
  });

  it("FCF <= 0 → not applicable, growth 0, warning", () => {
    const r = runReverseDCF({ ...baseReverse, marketCapIdr: 5000, initialFcfIdr: 0 });
    expect(r.impliedGrowthY1to5).toBe(0);
    expect(r.iterations).toBe(0);
    expect(r.warnings.some((w) => w.includes("FCF") || w.includes("applicable"))).toBe(true);
    expect(r.interpretation).toBe("fair");
  });
});

describe("runReverseDCF <-> runDCF consistency", () => {
  it("implied growth, when fed back into DCF, reproduces ~market cap as enterprise value", () => {
    const trueGrowth = 0.13;
    const marketCap = refReverseNpv(1000, trueGrowth, 0.04, 0.12, 10);
    const rev = runReverseDCF({ ...baseReverse, marketCapIdr: marketCap });
    // Build a DCF where Y6-10 growth = same as Y1-5 to match reverse-dcf single-stage solver.
    const dcf = runDCF({
      ...baseDcf,
      initialFcfIdr: 1000,
      growthRateY1to5: rev.impliedGrowthY1to5,
      growthRateY6to10: rev.impliedGrowthY1to5,
      terminalGrowthRate: 0.04,
      discountRate: 0.12,
    });
    expect(Math.abs(dcf.enterpriseValue - marketCap) / marketCap).toBeLessThan(0.01);
  });
});

// ── runDDM ────────────────────────────────────────────────────────────────────

const baseDdm: DDMInputs = {
  currentDps: 100,
  growthStage1: 0.08,
  terminalGrowth: 0.04,
  costOfEquity: 0.12,
  stage1Years: 5,
  currentPrice: 1500,
};

describe("runDDM — dividend discount model", () => {
  it("projects stage-1 dividends with compounding growth", () => {
    const r = runDDM(baseDdm);
    expect(r.projectedDividends).toHaveLength(5);
    expect(r.projectedDividends[0]).toBeCloseTo(100 * 1.08, 6);
    expect(r.projectedDividends[4]).toBeCloseTo(100 * Math.pow(1.08, 5), 6);
  });

  it("computes terminal value and total intrinsic value (manual reference)", () => {
    const r = runDDM(baseDdm);
    // Reference replication of ddm.ts.
    const divs: number[] = [];
    let d = 100;
    for (let y = 1; y <= 5; y += 1) {
      d = d * 1.08;
      divs.push(d);
    }
    const lastD = divs[divs.length - 1]!;
    const terminalDps = lastD * 1.04;
    const tv = terminalDps / (0.12 - 0.04);
    const tpv = tv / Math.pow(1.12, 5);
    const divsPv = divs.reduce((acc, dv, idx) => acc + dv / Math.pow(1.12, idx + 1), 0);
    expect(r.terminalValue).toBeCloseTo(tv, 4);
    expect(r.terminalPv).toBeCloseTo(tpv, 4);
    expect(r.totalIntrinsicValue).toBeCloseTo(divsPv + tpv, 4);
  });

  it("margin of safety and recommendation derive from intrinsic vs price", () => {
    const r = runDDM(baseDdm);
    const expected = ((r.totalIntrinsicValue - baseDdm.currentPrice) / baseDdm.currentPrice) * 100;
    expect(r.marginOfSafetyPct).toBeCloseTo(expected, 6);
    expect(["deeply_undervalued", "undervalued", "fair", "overvalued", "deeply_overvalued"]).toContain(r.recommendation);
  });

  it("sanity: intrinsic value rises with stage-1 growth", () => {
    const low = runDDM({ ...baseDdm, growthStage1: 0.02 });
    const high = runDDM({ ...baseDdm, growthStage1: 0.12 });
    expect(high.totalIntrinsicValue).toBeGreaterThan(low.totalIntrinsicValue);
  });

  it("applicability from dividend yield (>4% high, 2-4% medium, <2% low)", () => {
    // yield = dps/price*100. dps=100 → price 2000 = 5% high; 4000 = 2.5% medium; 10000 = 1% low.
    expect(runDDM({ ...baseDdm, currentPrice: 2000 }).applicability).toBe("high");
    expect(runDDM({ ...baseDdm, currentPrice: 4000 }).applicability).toBe("medium");
    expect(runDDM({ ...baseDdm, currentPrice: 10000 }).applicability).toBe("low");
  });

  it("cost of equity <= terminal growth → TV = 0 + warning", () => {
    const r = runDDM({ ...baseDdm, costOfEquity: 0.04, terminalGrowth: 0.04 });
    expect(r.terminalValue).toBe(0);
    expect(r.terminalPv).toBe(0);
    expect(r.warnings.some((w) => w.includes("terminal growth") || w.includes("Cost of equity"))).toBe(true);
  });

  it("DPS <= 0 emits warning", () => {
    const r = runDDM({ ...baseDdm, currentDps: 0 });
    expect(r.warnings.some((w) => w.includes("DPS"))).toBe(true);
  });

  it("aggressive stage-1 growth (>25%) emits warning", () => {
    const r = runDDM({ ...baseDdm, growthStage1: 0.3 });
    expect(r.warnings.some((w) => w.includes("agresif") || w.includes("Stage 1 growth"))).toBe(true);
  });
});

// ── Graham Number & Lynch Fair Value ──────────────────────────────────────────

describe("runGrahamNumber", () => {
  it("computes IV = sqrt(22.5 * EPS * BVPS)", () => {
    const r = runGrahamNumber({ eps: 100, bvps: 500, currentPrice: 1000 });
    expect(r.intrinsicValue).toBeCloseTo(Math.sqrt(22.5 * 100 * 500), 6);
    expect(r.intrinsicValue).toBeCloseTo(1060.66, 1); // sqrt(1,125,000)
    expect(r.applicable).toBe(true);
  });

  it("margin of safety relative to price", () => {
    const r = runGrahamNumber({ eps: 100, bvps: 500, currentPrice: 1000 });
    const expected = ((r.intrinsicValue - 1000) / 1000) * 100;
    expect(r.marginOfSafetyPct).toBeCloseTo(expected, 6);
  });

  it("EPS <= 0 → not applicable, IV 0", () => {
    const r = runGrahamNumber({ eps: -5, bvps: 500, currentPrice: 1000 });
    expect(r.applicable).toBe(false);
    expect(r.intrinsicValue).toBe(0);
    expect(r.recommendation).toBe("fair");
  });

  it("BVPS <= 0 → not applicable, IV 0", () => {
    const r = runGrahamNumber({ eps: 100, bvps: 0, currentPrice: 1000 });
    expect(r.applicable).toBe(false);
    expect(r.intrinsicValue).toBe(0);
  });

  it("sanity: IV rises with EPS", () => {
    const a = runGrahamNumber({ eps: 100, bvps: 500, currentPrice: 1000 });
    const b = runGrahamNumber({ eps: 200, bvps: 500, currentPrice: 1000 });
    expect(b.intrinsicValue).toBeGreaterThan(a.intrinsicValue);
  });
});

describe("runLynchFairValue", () => {
  it("IV = EPS * (growth% capped at 25), PEG = currentPE / growth%", () => {
    // growth 0.15 → fairPE 15 → IV = 100 * 15 = 1500
    const r = runLynchFairValue({ eps: 100, growthRate: 0.15, currentPrice: 1200 });
    expect(r.fairPE).toBeCloseTo(15, 6);
    expect(r.intrinsicValue).toBeCloseTo(1500, 6);
    // currentPE = 1200/100 = 12; PEG = 12/15 = 0.8
    expect(r.currentPE).toBeCloseTo(12, 6);
    expect(r.pegRatio).toBeCloseTo(0.8, 6);
  });

  it("caps growth at 25% for fair PE", () => {
    const r = runLynchFairValue({ eps: 100, growthRate: 0.5, currentPrice: 1200 });
    expect(r.fairPE).toBeCloseTo(25, 6); // capped
    expect(r.intrinsicValue).toBeCloseTo(2500, 6);
    expect(r.caveats.some((c) => c.includes("di-cap") || c.includes("cap"))).toBe(true);
  });

  it("margin of safety relative to price", () => {
    const r = runLynchFairValue({ eps: 100, growthRate: 0.15, currentPrice: 1200 });
    const expected = ((r.intrinsicValue - 1200) / 1200) * 100;
    expect(r.marginOfSafetyPct).toBeCloseTo(expected, 6);
    expect(r.marginOfSafetyPct).toBeCloseTo(25, 6); // 1500 vs 1200
  });

  it("sanity: IV rises with growth (below cap)", () => {
    const a = runLynchFairValue({ eps: 100, growthRate: 0.1, currentPrice: 1000 });
    const b = runLynchFairValue({ eps: 100, growthRate: 0.2, currentPrice: 1000 });
    expect(b.intrinsicValue).toBeGreaterThan(a.intrinsicValue);
  });

  it("negative growth clamps to 0 → fairPE 0, IV 0, peg null", () => {
    const r = runLynchFairValue({ eps: 100, growthRate: -0.1, currentPrice: 1000 });
    expect(r.fairPE).toBe(0);
    expect(r.intrinsicValue).toBe(0);
    expect(r.pegRatio).toBeNull();
  });
});
