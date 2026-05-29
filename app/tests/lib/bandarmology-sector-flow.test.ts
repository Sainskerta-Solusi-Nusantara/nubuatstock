import { describe, expect, it } from "vitest";
import {
  classifyTier,
  computeMultiWindowSectorFlow,
  computeSectorFlow,
  TIER_THRESHOLDS_IDR,
  type FlowEmiten,
} from "@/lib/bandarmology/sector-flow";

/**
 * Unit tests — Sector Capital Flow engine (IMPROVEMENT_PLAN §3.C.6).
 *
 * Engine murni: klasifikasi tier mcap + net capital flow (turnover x arah harga)
 * per (sektor, tier). Data sintetis, tidak menyentuh DB.
 */

const T = 1_000_000_000_000; // Rp1T

/** Helper: bangun emiten dengan harga naik/turun linear dan turnover konstan. */
function makeEmiten(
  kode: string,
  sectorKode: string,
  marketCapIdr: number,
  opts: { firstClose: number; lastClose: number; days?: number; dailyValue?: number },
): FlowEmiten {
  const days = opts.days ?? 5;
  const dailyValue = opts.dailyValue ?? 1_000_000_000;
  const bars = [];
  for (let i = 0; i < days; i += 1) {
    const t = days > 1 ? i / (days - 1) : 0;
    const close = opts.firstClose + (opts.lastClose - opts.firstClose) * t;
    const day = String(i + 1).padStart(2, "0");
    bars.push({ date: `2026-05-${day}`, close, valueIdr: dailyValue });
  }
  return { kode, sectorKode, sectorName: sectorKode, marketCapIdr, bars };
}

describe("classifyTier", () => {
  it("classifies by market cap thresholds", () => {
    expect(classifyTier(TIER_THRESHOLDS_IDR.Large)).toBe("Large");
    expect(classifyTier(50 * T)).toBe("Large");
    expect(classifyTier(5 * T)).toBe("Mid");
    expect(classifyTier(TIER_THRESHOLDS_IDR.Mid)).toBe("Mid");
    expect(classifyTier(0.5 * T)).toBe("Small");
    expect(classifyTier(0)).toBe("Small");
  });
});

describe("computeSectorFlow — empty / graceful", () => {
  it("returns hasData=false for empty input", () => {
    const r = computeSectorFlow([]);
    expect(r.hasData).toBe(false);
    expect(r.rows).toHaveLength(0);
    expect(r.rotation).toBe("mixed");
  });

  it("ignores emiten with <2 bars or zero market cap", () => {
    const r = computeSectorFlow([
      { kode: "AAA", sectorKode: "ENERGY", marketCapIdr: 50 * T, bars: [{ date: "2026-05-01", close: 100, valueIdr: 1e9 }] },
      { kode: "BBB", sectorKode: "ENERGY", marketCapIdr: 0, bars: [{ date: "2026-05-01", close: 100, valueIdr: 1e9 }, { date: "2026-05-02", close: 110, valueIdr: 1e9 }] },
    ]);
    expect(r.hasData).toBe(false);
    expect(r.emitenCount).toBe(0);
  });
});

describe("computeSectorFlow — flow direction & tier rotation", () => {
  it("detects large-cap inflow and small-cap outflow", () => {
    const emiten: FlowEmiten[] = [
      // Large cap, price UP -> inflow
      makeEmiten("BIG1", "BANK", 50 * T, { firstClose: 100, lastClose: 120 }),
      makeEmiten("BIG2", "BANK", 30 * T, { firstClose: 200, lastClose: 220 }),
      // Small cap, price DOWN -> outflow
      makeEmiten("SML1", "TECH", 0.5 * T, { firstClose: 100, lastClose: 80 }),
      makeEmiten("SML2", "TECH", 0.3 * T, { firstClose: 50, lastClose: 40 }),
    ];
    const r = computeSectorFlow(emiten);

    expect(r.hasData).toBe(true);
    expect(r.emitenCount).toBe(4);

    // Tier net flow: Large positive, Small negative.
    expect(r.netFlowByTier.Large).toBeGreaterThan(0);
    expect(r.netFlowByTier.Small).toBeLessThan(0);

    // Rotation: large in, small/mid out -> flight to safety.
    expect(r.rotation).toBe("to_large");

    // Sector ordering: BANK (inflow) on top, TECH (outflow) bottom.
    expect(r.rows[0]?.sectorKode).toBe("BANK");
    expect(r.rows[r.rows.length - 1]?.sectorKode).toBe("TECH");
    expect(r.topInflowSector?.sectorKode).toBe("BANK");
    expect(r.topOutflowSector?.sectorKode).toBe("TECH");
  });

  it("detects rotation to small/mid (large out, small in)", () => {
    const emiten: FlowEmiten[] = [
      makeEmiten("BIG1", "BANK", 50 * T, { firstClose: 100, lastClose: 90 }), // large DOWN
      makeEmiten("SML1", "TECH", 0.5 * T, { firstClose: 100, lastClose: 130 }), // small UP
      makeEmiten("MID1", "TECH", 5 * T, { firstClose: 100, lastClose: 110 }), // mid UP
    ];
    const r = computeSectorFlow(emiten);
    expect(r.netFlowByTier.Large).toBeLessThan(0);
    expect(r.netFlowByTier.Small + r.netFlowByTier.Mid).toBeGreaterThan(0);
    expect(r.rotation).toBe("to_small");
  });

  it("detects broad inflow when all tiers rise", () => {
    const emiten: FlowEmiten[] = [
      makeEmiten("BIG1", "BANK", 50 * T, { firstClose: 100, lastClose: 110 }),
      makeEmiten("MID1", "TECH", 5 * T, { firstClose: 100, lastClose: 110 }),
      makeEmiten("SML1", "ENERGY", 0.5 * T, { firstClose: 100, lastClose: 110 }),
    ];
    const r = computeSectorFlow(emiten);
    expect(r.rotation).toBe("broad_inflow");
    expect(r.netFlowByTier.Large).toBeGreaterThan(0);
    expect(r.netFlowByTier.Mid).toBeGreaterThan(0);
    expect(r.netFlowByTier.Small).toBeGreaterThan(0);
  });

  it("normalizes intensity to [-1, 1] and largest cell hits ±1", () => {
    const emiten: FlowEmiten[] = [
      makeEmiten("BIG1", "BANK", 50 * T, { firstClose: 100, lastClose: 120, dailyValue: 10e9 }),
      makeEmiten("SML1", "TECH", 0.5 * T, { firstClose: 100, lastClose: 80, dailyValue: 1e9 }),
    ];
    const r = computeSectorFlow(emiten);
    const allIntensities = r.rows.flatMap((row) =>
      (["Large", "Mid", "Small"] as const).map((t) => row.cells[t].intensity),
    );
    for (const v of allIntensities) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    // BANK Large is the biggest magnitude positive -> intensity = +1.
    const bankLarge = r.rows.find((row) => row.sectorKode === "BANK")?.cells.Large.intensity;
    expect(bankLarge).toBeCloseTo(1, 5);
  });

  it("flags sparse when below significance threshold", () => {
    const r = computeSectorFlow(
      [makeEmiten("BIG1", "BANK", 50 * T, { firstClose: 100, lastClose: 110 })],
      { minEmitenForSignificance: 5 },
    );
    expect(r.sparse).toBe(true);
    expect(r.summary).toContain("indikatif");
  });
});

describe("computeMultiWindowSectorFlow", () => {
  it("computes each requested window", () => {
    const emiten: FlowEmiten[] = [
      makeEmiten("BIG1", "BANK", 50 * T, { firstClose: 100, lastClose: 120, days: 20 }),
    ];
    const out = computeMultiWindowSectorFlow(emiten, [5, 20]);
    expect(out[5]?.windowDays).toBe(5);
    expect(out[20]?.windowDays).toBe(20);
    expect(out[5]?.hasData).toBe(true);
    expect(out[20]?.hasData).toBe(true);
  });
});
