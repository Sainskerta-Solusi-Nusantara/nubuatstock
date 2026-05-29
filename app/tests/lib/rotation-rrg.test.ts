import { describe, expect, it } from "vitest";
import {
  buildWeightedIndex,
  classifyQuadrant,
  computeTrail,
  rsRatioAt,
  RRG_DEFAULTS,
  type Quadrant,
} from "@/lib/rotation/rrg";

/**
 * Unit tests — RRG (Relative Rotation Graph) engine murni (IMPROVEMENT_PLAN §3.C.5).
 *
 * Engine murni: tidak menyentuh DB. Data sintetis dibangun secara deterministik
 * untuk mem-validasi klasifikasi 4 kuadran (Leading / Weakening / Lagging / Improving),
 * formula RS-Ratio & RS-Momentum, serta weighted index builder.
 */

/** Deret close yang naik dengan compound growth `g` per bar, dimulai dari `start`. */
function growSeries(len: number, g: number, start = 100): number[] {
  const out: number[] = [start];
  for (let i = 1; i < len; i += 1) out.push(out[i - 1]! * (1 + g));
  return out;
}

/** Flat benchmark (tidak bergerak). */
function flatSeries(len: number, level = 100): number[] {
  return Array.from({ length: len }, () => level);
}

describe("classifyQuadrant", () => {
  it("maps the four corners correctly", () => {
    expect(classifyQuadrant(105, 105)).toBe<Quadrant>("Leading");
    expect(classifyQuadrant(105, 95)).toBe<Quadrant>("Weakening");
    expect(classifyQuadrant(95, 95)).toBe<Quadrant>("Lagging");
    expect(classifyQuadrant(95, 105)).toBe<Quadrant>("Improving");
  });

  it("treats exactly 100 as the >= boundary (Leading)", () => {
    expect(classifyQuadrant(100, 100)).toBe<Quadrant>("Leading");
    expect(classifyQuadrant(100, 99.9)).toBe<Quadrant>("Weakening");
    expect(classifyQuadrant(99.9, 100)).toBe<Quadrant>("Improving");
  });
});

describe("rsRatioAt", () => {
  it("returns 100 when entity and benchmark moved identically", () => {
    const ent = growSeries(40, 0.01);
    const ben = growSeries(40, 0.01);
    const rs = rsRatioAt(ent, ben, 30, 14);
    expect(rs).toBeCloseTo(100, 6);
  });

  it("returns > 100 when entity outperforms over the lookback", () => {
    const ent = growSeries(40, 0.02);
    const ben = growSeries(40, 0.0);
    expect(rsRatioAt(ent, ben, 30, 14)).toBeGreaterThan(100);
  });

  it("returns < 100 when entity underperforms over the lookback", () => {
    const ent = growSeries(40, -0.01);
    const ben = growSeries(40, 0.01);
    expect(rsRatioAt(ent, ben, 30, 14)).toBeLessThan(100);
  });
});

describe("computeTrail — quadrant classification on synthetic data", () => {
  const N = 60;
  const ben = flatSeries(N, 100);

  it("returns empty when series too short", () => {
    expect(computeTrail(growSeries(10, 0.01), flatSeries(10))).toEqual([]);
  });

  it("returns empty when series lengths mismatch", () => {
    expect(computeTrail(growSeries(40, 0.01), flatSeries(39))).toEqual([]);
  });

  it("produces pointsBack+1 points for sufficient data", () => {
    const trail = computeTrail(growSeries(N, 0.005), ben);
    expect(trail.length).toBe(RRG_DEFAULTS.pointsBack + 1);
  });

  it("classifies an accelerating-outperformer as Leading", () => {
    // Benchmark flat; entity grows every bar and ACCELERATES recently → RS > 100 and
    // momentum > 100 (gap widening). Verified numerically.
    const ent = flatSeries(N, 100);
    for (let i = 1; i < N; i += 1) {
      const g = i >= N - 14 ? 0.02 : 0.005;
      ent[i] = ent[i - 1]! * (1 + g);
    }
    const trail = computeTrail(ent, ben);
    const last = trail[trail.length - 1]!;
    expect(last.rsRatio).toBeGreaterThan(100);
    expect(last.rsMomentum).toBeGreaterThan(100);
    expect(last.quadrant).toBe<Quadrant>("Leading");
  });

  it("classifies an accelerating-decliner as Lagging", () => {
    // Benchmark flat; entity declines every bar with the decline DEEPENING recently →
    // RS < 100 and momentum < 100. Verified numerically.
    const ent = flatSeries(N, 100);
    for (let i = 1; i < N; i += 1) {
      const g = i >= N - 14 ? -0.02 : -0.005;
      ent[i] = ent[i - 1]! * (1 + g);
    }
    const trail = computeTrail(ent, ben);
    const last = trail[trail.length - 1]!;
    expect(last.rsRatio).toBeLessThan(100);
    expect(last.rsMomentum).toBeLessThan(100);
    expect(last.quadrant).toBe<Quadrant>("Lagging");
  });

  it("classifies an entity that just started outperforming as Improving", () => {
    // Benchmark rose steadily over the whole 14-bar window, so the entity is still
    // behind cumulatively (RS < 100), but the entity surged in the last few bars so
    // the gap is narrowing (momentum >= 100). Verified numerically.
    const ent = flatSeries(N, 100);
    const benCustom = growSeries(N, 0.01); // benchmark steadily up
    for (let i = N - 3; i < N; i += 1) ent[i] = ent[i - 1]! * 1.03; // entity late surge
    const trail = computeTrail(ent, benCustom);
    const last = trail[trail.length - 1]!;
    expect(last.rsRatio).toBeLessThan(100);
    expect(last.rsMomentum).toBeGreaterThanOrEqual(100);
    expect(last.quadrant).toBe<Quadrant>("Improving");
  });

  it("classifies an entity losing its lead as Weakening", () => {
    // Entity compounded ahead through most of the window (RS > 100), then went flat
    // in the last 4 bars while the benchmark surged to catch up → momentum < 100.
    const ent = flatSeries(N, 100);
    for (let i = 1; i < N; i += 1) ent[i] = ent[i - 1]! * 1.01; // sustained lead
    for (let i = N - 4; i < N; i += 1) ent[i] = ent[i - 1]!; // recent flat
    const benCustom = flatSeries(N, 100);
    for (let i = N - 4; i < N; i += 1) benCustom[i] = benCustom[i - 1]! * 1.02; // benchmark catching up
    const trail = computeTrail(ent, benCustom);
    const last = trail[trail.length - 1]!;
    expect(last.rsRatio).toBeGreaterThan(100);
    expect(last.rsMomentum).toBeLessThan(100);
    expect(last.quadrant).toBe<Quadrant>("Weakening");
  });

  it("carries through provided dates as point labels", () => {
    const dates = Array.from({ length: N }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, "0")}`);
    const trail = computeTrail(growSeries(N, 0.005), ben, {}, dates);
    expect(trail.every((p) => p.date.startsWith("2026-01-"))).toBe(true);
  });
});

describe("buildWeightedIndex", () => {
  it("returns empty for no constituents", () => {
    expect(buildWeightedIndex([])).toEqual([]);
  });

  it("normalizes each constituent to 100 at its base date", () => {
    const idx = buildWeightedIndex([
      {
        bars: [
          { date: "2026-01-01", close: 50 },
          { date: "2026-01-02", close: 55 },
        ],
        weight: 1,
      },
    ]);
    expect(idx[0]!.close).toBeCloseTo(100, 6); // base
    expect(idx[1]!.close).toBeCloseTo(110, 6); // +10%
  });

  it("weights constituents by their weight", () => {
    // A doubles (200), B flat (100). Equal weight → average 150.
    const idx = buildWeightedIndex([
      { bars: [{ date: "d1", close: 10 }, { date: "d2", close: 20 }], weight: 1 },
      { bars: [{ date: "d1", close: 30 }, { date: "d2", close: 30 }], weight: 1 },
    ]);
    const d2 = idx.find((p) => p.date === "d2")!;
    expect(d2.close).toBeCloseTo(150, 6);
  });

  it("ignores zero/negative weights and empty bars", () => {
    const idx = buildWeightedIndex([
      { bars: [{ date: "d1", close: 100 }], weight: 0 },
      { bars: [], weight: 5 },
    ]);
    expect(idx).toEqual([]);
  });

  it("sorts output chronologically by date string", () => {
    const idx = buildWeightedIndex([
      {
        bars: [
          { date: "2026-03-01", close: 100 },
          { date: "2026-01-01", close: 100 },
          { date: "2026-02-01", close: 100 },
        ],
        weight: 1,
      },
    ]);
    expect(idx.map((p) => p.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });
});
