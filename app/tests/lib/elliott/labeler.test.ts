import { describe, expect, it } from "vitest";
import { analyzeElliottWave } from "@/lib/elliott/labeler";
import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Tests integrasi untuk analyzeElliottWave (lib/elliott/labeler.ts):
 * pivots.ts → rules.ts → labeling impulse 1-2-3-4-5.
 */

let dayCounter = 0;
function nextDate(): string {
  dayCounter += 1;
  const d = new Date(2023, 0, 1);
  d.setDate(d.getDate() + dayCounter);
  return d.toISOString().slice(0, 10);
}

function bar(price: number): OhlcvBar {
  return {
    date: nextDate(),
    open: price,
    high: price + 0.5,
    low: price - 0.5,
    close: price,
    volume: 1_000,
    valueIdr: price * 1_000,
  };
}

/** Buat leg linear dari `from` ke `to` sepanjang `steps` bar. */
function leg(from: number, to: number, steps: number): OhlcvBar[] {
  const out: OhlcvBar[] = [];
  for (let i = 1; i <= steps; i += 1) {
    out.push(bar(from + ((to - from) * i) / steps));
  }
  return out;
}

describe("lib/elliott/labeler — analyzeElliottWave", () => {
  it("mengembalikan unknown saat data < 30 bar", () => {
    dayCounter = 0;
    const bars = leg(100, 110, 10);
    const res = analyzeElliottWave(bars);
    expect(res.waveType).toBe("unknown");
    expect(res.confidence).toBe(0);
  });

  it("mendeteksi impulse up 5-gelombang yang valid", () => {
    dayCounter = 0;
    // Susun impulse up klasik dengan retracement yang tidak melanggar hard rules:
    //   W1: 100 -> 130
    //   W2: 130 -> 112  (retrace ~60%)
    //   W3: 112 -> 180  (terpanjang)
    //   W4: 180 -> 155  (tetap di atas W1 top 130)
    //   W5: 155 -> 200
    const bars = [
      ...leg(100, 100, 5), // base
      ...leg(100, 130, 8),
      ...leg(130, 112, 6),
      ...leg(112, 180, 10),
      ...leg(180, 155, 6),
      ...leg(155, 200, 8),
    ];
    const res = analyzeElliottWave(bars);

    expect(res.waveType).toBe("impulse_up");
    expect(res.sequence).toHaveLength(5);
    expect(res.sequence.map((s) => s.label)).toEqual(["1", "2", "3", "4", "5"]);
    expect(res.confidence).toBeGreaterThan(0.4);
    expect(res.fibonacciLevels).not.toBeNull();
    // Semua reasoning hard-rule lolos (tidak ada penanda gagal).
    expect(res.reasoning.some((r) => r.toLowerCase().includes("gagal"))).toBe(false);
  });

  it("tidak melabeli impulse pada data sideways/noise", () => {
    dayCounter = 0;
    const bars: OhlcvBar[] = [];
    for (let i = 0; i < 60; i += 1) {
      bars.push(bar(100 + (i % 2 === 0 ? 1 : -1)));
    }
    const res = analyzeElliottWave(bars);
    // Sideways → tidak ada impulse valid (unknown), bukan crash.
    expect(["unknown"]).toContain(res.waveType);
  });

  it("mendeteksi koreksi A-B-C (zigzag) saat tidak ada impulse valid", () => {
    dayCounter = 0;
    // Hanya 3 leg koreksi turun (4 pivot) → tidak cukup untuk impulse,
    // tapi membentuk zigzag A-B-C valid:
    //   A: 200 -> 150  (Wave A = 50)
    //   B: 150 -> 175  (retrace 50% → dangkal → zigzag)
    //   C: 175 -> 130  (Wave C ≈ 0.9× A)
    const bars = [
      ...leg(200, 200, 8), // base agar bar ≥ 30 & pivot awal high terbentuk
      ...leg(200, 150, 8),
      ...leg(150, 175, 6),
      ...leg(175, 130, 8),
    ];
    const res = analyzeElliottWave(bars);
    expect(res.waveType).toBe("corrective");
    expect(res.correctiveSubtype).toBe("zigzag");
    expect(res.sequence.map((s) => s.label)).toEqual(["A", "B", "C"]);
    expect(res.confidence).toBeGreaterThan(0.4);
    expect(res.currentWave.toLowerCase()).toContain("zigzag");
  });

  it("mendeteksi koreksi A-B-C (flat) dengan Wave B retrace dalam", () => {
    dayCounter = 0;
    //   A: 200 -> 160  (Wave A = 40)
    //   B: 160 -> 196  (retrace 90% → dalam → flat)
    //   C: 196 -> 158  (Wave C ≈ 0.95× A)
    const bars = [
      ...leg(200, 200, 8),
      ...leg(200, 160, 8),
      ...leg(160, 196, 6),
      ...leg(196, 158, 8),
    ];
    const res = analyzeElliottWave(bars);
    expect(res.waveType).toBe("corrective");
    expect(res.correctiveSubtype).toBe("flat");
    expect(res.sequence.map((s) => s.label)).toEqual(["A", "B", "C"]);
  });
});
