import { describe, expect, it } from "vitest";
import {
  classifyCorrective,
  detectCorrective,
  correctiveLengths,
  type CorrectivePrices,
} from "@/lib/elliott/corrective";
import type { ElliottPivot } from "@/lib/elliott/pivots";

/**
 * Tests untuk Corrective Wave Labeling (lib/elliott/corrective.ts) — P1.
 *
 * Strategi: bangun 4 pivot endpoint A-B-C eksplisit dan pastikan klasifikasi
 * zigzag (B retrace dangkal) vs flat (B retrace dalam) benar, serta penolakan
 * pola yang melanggar struktur koreksi.
 */

let idx = 0;
function pivot(price: number, type: "high" | "low"): ElliottPivot {
  idx += 1;
  return {
    index: idx,
    date: `2024-01-${String(idx).padStart(2, "0")}`,
    price,
    type,
    strength: 0.5,
  };
}

describe("lib/elliott/corrective — classifyCorrective", () => {
  it("mendeteksi ZIGZAG koreksi turun (B retrace dangkal ≤ 61.8%)", () => {
    idx = 0;
    // Koreksi down setelah uptrend:
    //   p0 = 200 (high, awal A)
    //   A  = 150 (low)   → Wave A = 50
    //   B  = 175 (high)  → Wave B = 25 = 50% A (dangkal → zigzag)
    //   C  = 130 (low)   → Wave C = 45 ≈ 0.9× A
    const pivots = [
      pivot(200, "high"),
      pivot(150, "low"),
      pivot(175, "high"),
      pivot(130, "low"),
    ];
    const res = classifyCorrective(pivots, "down");
    expect(res).not.toBeNull();
    expect(res!.subtype).toBe("zigzag");
    expect(res!.direction).toBe("down");
    expect(res!.segments.map((s) => s.label)).toEqual(["A", "B", "C"]);
    expect(res!.confidence).toBeGreaterThan(0.4);
  });

  it("mendeteksi FLAT koreksi turun (B retrace dalam ≥ 80%)", () => {
    idx = 0;
    // Flat:
    //   p0 = 200 (high)
    //   A  = 160 (low)   → Wave A = 40
    //   B  = 196 (high)  → Wave B = 36 = 90% A (dalam → flat)
    //   C  = 158 (low)   → Wave C = 38 ≈ 0.95× A
    const pivots = [
      pivot(200, "high"),
      pivot(160, "low"),
      pivot(196, "high"),
      pivot(158, "low"),
    ];
    const res = classifyCorrective(pivots, "down");
    expect(res).not.toBeNull();
    expect(res!.subtype).toBe("flat");
    expect(res!.confidence).toBeGreaterThan(0.4);
  });

  it("mendeteksi ZIGZAG koreksi naik (mirror)", () => {
    idx = 0;
    // Koreksi up setelah downtrend:
    //   p0 = 100 (low, awal A)
    //   A  = 150 (high) → Wave A = 50
    //   B  = 125 (low)  → Wave B = 25 = 50% A (dangkal → zigzag)
    //   C  = 170 (high) → Wave C = 45
    const pivots = [
      pivot(100, "low"),
      pivot(150, "high"),
      pivot(125, "low"),
      pivot(170, "high"),
    ];
    const res = classifyCorrective(pivots, "up");
    expect(res).not.toBeNull();
    expect(res!.subtype).toBe("zigzag");
    expect(res!.direction).toBe("up");
  });

  it("menolak pola dengan alternation salah", () => {
    idx = 0;
    // Dua high berurutan → bukan struktur A-B-C valid.
    const pivots = [
      pivot(200, "high"),
      pivot(180, "high"),
      pivot(175, "low"),
      pivot(130, "low"),
    ];
    expect(classifyCorrective(pivots, "down")).toBeNull();
  });

  it("menolak bila Wave B retrace > 138.2% Wave A", () => {
    idx = 0;
    //   p0 = 200, A = 180 (Wave A = 20), B = 230 (Wave B = 50 = 250% A) → tolak
    const pivots = [
      pivot(200, "high"),
      pivot(180, "low"),
      pivot(230, "high"),
      pivot(170, "low"),
    ];
    expect(classifyCorrective(pivots, "down")).toBeNull();
  });

  it("detectCorrective memilih kandidat dari 4 pivot terakhir", () => {
    idx = 0;
    // Tambahkan pivot awal yang tidak relevan, lalu 4 pivot zigzag valid.
    const pivots = [
      pivot(50, "low"),
      pivot(200, "high"),
      pivot(150, "low"),
      pivot(175, "high"),
      pivot(130, "low"),
    ];
    const res = detectCorrective(pivots);
    expect(res).not.toBeNull();
    expect(res!.segments.map((s) => s.label)).toEqual(["A", "B", "C"]);
  });
});

describe("lib/elliott/corrective — correctiveLengths", () => {
  it("menghitung panjang A/B/C absolut", () => {
    const p: CorrectivePrices = { p0: 200, pA: 150, pB: 175, pC: 130 };
    const { waveA, waveB, waveC } = correctiveLengths(p);
    expect(waveA).toBe(50);
    expect(waveB).toBe(25);
    expect(waveC).toBe(45);
  });
});
