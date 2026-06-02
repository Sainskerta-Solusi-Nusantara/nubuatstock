import { describe, expect, it } from "vitest";
import {
  projectTargets,
  guidelineScore,
  labelDegree,
  type ProjectionTarget,
} from "@/lib/elliott/projection";
import type { WaveSegment } from "@/db/schema/elliott";

/**
 * Tests untuk Elliott Wave P2 projection & guideline scoring
 * (lib/elliott/projection.ts). Semua fungsi PURE → kita bangun WaveSegment
 * sintetis dengan proporsi yang dikontrol dan verifikasi target/skor numerik.
 */

function seg(
  label: WaveSegment["label"],
  startPrice: number,
  endPrice: number,
  startDate = "2024-01-01",
  endDate = "2024-01-10",
): WaveSegment {
  return { label, startDate, endDate, startPrice, endPrice };
}

/** Cari target berdasar ratio (toleransi). */
function byRatio(targets: ProjectionTarget[], ratio: number): ProjectionTarget | undefined {
  return targets.find((t) => Math.abs(t.ratio - ratio) < 1e-9);
}

describe("projectTargets — impulse", () => {
  it("input kosong → array kosong", () => {
    expect(projectTargets([])).toEqual([]);
  });

  it("W1+W2 (belum W3) → proyeksi target Wave 3 berbasis 1.0/1.618/2.618 × W1", () => {
    // Up impulse: W1 100→120 (len 20), W2 120→110.
    const waves = [seg("1", 100, 120), seg("2", 120, 110)];
    const targets = projectTargets(waves);
    expect(targets).toHaveLength(3);

    // base = akhir W2 = 110, len W1 = 20.
    expect(byRatio(targets, 1.0)!.price).toBe(110 + 20 * 1.0); // 130
    expect(byRatio(targets, 1.618)!.price).toBe(Math.round(110 + 20 * 1.618)); // 142
    expect(byRatio(targets, 2.618)!.price).toBe(Math.round(110 + 20 * 2.618)); // 162
    expect(targets[0]!.label).toContain("Wave 3");
  });

  it("impulse turun: target Wave 3 di BAWAH base", () => {
    // Down impulse: W1 200→180 (len 20, trend -1), W2 180→190.
    const waves = [seg("1", 200, 180), seg("2", 180, 190)];
    const targets = projectTargets(waves);
    // base = 190, trend -1 → 190 - 20*1.618.
    expect(byRatio(targets, 1.618)!.price).toBe(Math.round(190 - 20 * 1.618)); // 158
    expect(byRatio(targets, 1.0)!.price).toBe(190 - 20); // 170
  });

  it("W3+W4 (belum W5) → proyeksi target Wave 5 berbasis 0.618/1.0/1.618 × W1", () => {
    // W1 len 20 (100→120), W3 110→160, W4 160→150.
    const waves = [seg("1", 100, 120), seg("2", 120, 110), seg("3", 110, 160), seg("4", 160, 150)];
    const targets = projectTargets(waves);
    expect(targets).toHaveLength(3);
    // base = akhir W4 = 150, len W1 = 20.
    expect(byRatio(targets, 1.0)!.price).toBe(150 + 20); // 170
    expect(byRatio(targets, 0.618)!.price).toBe(Math.round(150 + 20 * 0.618)); // 162
    expect(targets[0]!.label).toContain("Wave 5");
  });

  it("5 wave lengkap → proyeksi koreksi pasca-impulse (retrace tren)", () => {
    // Impulse up total 100→200 (len 100).
    const waves = [
      seg("1", 100, 130),
      seg("2", 130, 120),
      seg("3", 120, 180),
      seg("4", 180, 165),
      seg("5", 165, 200),
    ];
    const targets = projectTargets(waves);
    expect(targets).toHaveLength(3);
    // impulseEnd = 200, total = 100, trend +1, koreksi = end - total*ratio.
    expect(byRatio(targets, 0.382)!.price).toBe(Math.round(200 - 100 * 0.382)); // 162
    expect(byRatio(targets, 0.5)!.price).toBe(150);
    expect(byRatio(targets, 0.618)!.price).toBe(Math.round(200 - 100 * 0.618)); // 138
    expect(targets[0]!.label).toContain("Koreksi");
  });

  it("hanya W1 → proyeksi zona retrace Wave 2", () => {
    const waves = [seg("1", 100, 120)];
    const targets = projectTargets(waves);
    expect(targets).toHaveLength(3);
    // base = 120, len 20, retrace = base - trend*len*ratio.
    expect(byRatio(targets, 0.5)!.price).toBe(120 - 10); // 110
    expect(targets[0]!.label).toContain("Wave 2");
  });
});

describe("projectTargets — corrective", () => {
  it("A+B (belum C) → proyeksi target Wave C berbasis 1.0/1.272/1.618 × A", () => {
    // Koreksi turun: A 200→170 (len 30, dir -1), B 170→185.
    const waves = [seg("A", 200, 170), seg("B", 170, 185)];
    const targets = projectTargets(waves);
    expect(targets).toHaveLength(3);
    // base = akhir B = 185, dir -1, len A = 30.
    expect(byRatio(targets, 1.0)!.price).toBe(185 - 30); // 155
    expect(byRatio(targets, 1.618)!.price).toBe(Math.round(185 - 30 * 1.618)); // 137
    expect(targets[0]!.label).toContain("Wave C");
  });

  it("A-B-C lengkap → proyeksi lanjutan tren utama", () => {
    // Koreksi turun total 200→150 (len 50, dir -1).
    const waves = [seg("A", 200, 170), seg("B", 170, 185), seg("C", 185, 150)];
    const targets = projectTargets(waves);
    expect(targets).toHaveLength(3);
    // corrEnd = 150, total = 50, dir -1 → lanjutan = end + total*ratio (naik).
    expect(byRatio(targets, 0.382)!.price).toBe(Math.round(150 + 50 * 0.382)); // 169
    expect(byRatio(targets, 1.0)!.price).toBe(200);
    expect(targets[0]!.label).toContain("Lanjutan tren");
  });
});

describe("guidelineScore — impulse", () => {
  it("impulse 'rapi' (proporsi Fibonacci ideal) → skor tinggi", () => {
    // W1 len 20 (100→120); W2 retrace 0.6 (120→108, len 12);
    // W3 1.618×W1 (108→140.36 ~ len 32); W4 retrace ~0.38 W3; W5 ≈ W1.
    const waves = [
      seg("1", 100, 120), // len 20
      seg("2", 120, 108), // retrace 12/20 = 0.60 (golden)
      seg("3", 108, 140), // len 32 → 1.6× W1
      seg("4", 140, 128), // retrace 12/32 = 0.375 (tipikal)
      seg("5", 128, 148), // len 20 → equality 1.0× W1
    ];
    const { score, checks } = guidelineScore(waves, "impulse_up");
    expect(checks.length).toBe(5);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("impulse 'jelek' (proporsi melenceng) → skor rendah", () => {
    const waves = [
      seg("1", 100, 120), // len 20
      seg("2", 120, 101), // retrace 19/20 = 0.95 (terlalu dalam)
      seg("3", 101, 122), // len 21 → ~1.05× W1 (lemah)
      seg("4", 122, 104), // retrace 18/21 = 0.86 (terlalu dalam)
      seg("5", 104, 175), // len 71 → 3.55× W1 (jauh dari equality)
    ];
    const { score } = guidelineScore(waves, "impulse_up");
    expect(score).toBeLessThan(50);
  });

  it("skor deterministik & dalam rentang 0-100", () => {
    const waves = [seg("1", 100, 120), seg("2", 120, 110)];
    const a = guidelineScore(waves, "impulse_up");
    const b = guidelineScore(waves, "impulse_up");
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });
});

describe("guidelineScore — corrective", () => {
  it("zigzag sehat (B dangkal, C≈A, alternation benar) → skor tinggi", () => {
    // A 200→170 (len 30, dir -1); B retrace 0.5 (170→185, len 15);
    // C ≈ A (185→155, len 30).
    const waves = [seg("A", 200, 170), seg("B", 170, 185), seg("C", 185, 155)];
    const { score, checks } = guidelineScore(waves, "corrective");
    expect(checks.length).toBe(3);
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("struktur tak dikenal → skor 0", () => {
    expect(guidelineScore([], "unknown").score).toBe(0);
  });
});

describe("labelDegree", () => {
  it("memetakan timeframe ke degree", () => {
    expect(labelDegree("1M")).toBe("Primary");
    expect(labelDegree("1W")).toBe("Intermediate");
    expect(labelDegree("1D")).toBe("Minor");
  });

  it("fallback ke rentang kalender bila timeframe tak dikenal", () => {
    const longSwing = [seg("1", 100, 200, "2022-01-01", "2023-06-01")]; // >1 tahun
    expect(labelDegree("?", longSwing)).toBe("Primary");
    const midSwing = [seg("1", 100, 200, "2024-01-01", "2024-05-01")]; // ~4 bulan
    expect(labelDegree("?", midSwing)).toBe("Intermediate");
    const shortSwing = [seg("1", 100, 110, "2024-01-01", "2024-01-20")];
    expect(labelDegree("?", shortSwing)).toBe("Minor");
  });

  it("tanpa waves & timeframe tak dikenal → Minor", () => {
    expect(labelDegree(undefined)).toBe("Minor");
  });
});
