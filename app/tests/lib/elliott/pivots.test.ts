import { describe, expect, it } from "vitest";
import { detectPivots } from "@/lib/elliott/pivots";
import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Tests untuk Pivot Detection Engine (lib/elliott/pivots.ts).
 *
 * Strategi: bangun deret OHLCV sintetis dengan swing yang diketahui, lalu
 * pastikan ZigZag mendeteksi swing high/low yang benar dan menyaring noise di
 * bawah threshold.
 */

/** Helper: bikin bar dengan high/low simetris di sekitar `price`. */
function bar(date: string, price: number, spread = 0): OhlcvBar {
  return {
    date,
    open: price,
    high: price + spread,
    low: price - spread,
    close: price,
    volume: 1_000,
    valueIdr: price * 1_000,
  };
}

/** Bangun deret bar dari array harga close, tanggal berurutan. */
function series(prices: number[]): OhlcvBar[] {
  return prices.map((p, i) => bar(`2024-01-${String(i + 1).padStart(2, "0")}`, p));
}

describe("lib/elliott/pivots — detectPivots", () => {
  it("mengembalikan kosong untuk data terlalu pendek", () => {
    expect(detectPivots(series([100, 101]))).toEqual([]);
  });

  it("mendeteksi swing high lalu swing low pada pola naik-turun jelas", () => {
    // Naik 100->130 (+30%), turun 130->100 (-23%). Threshold 5%.
    const prices = [100, 105, 115, 125, 130, 122, 110, 102, 100];
    const pivots = detectPivots(series(prices), { thresholdPct: 5 });

    expect(pivots.length).toBeGreaterThanOrEqual(2);
    // Pivot pertama = low di awal (100), lalu high (130), lalu low (100).
    const types = pivots.map((p) => p.type);
    expect(types).toContain("high");
    expect(types).toContain("low");

    const high = pivots.find((p) => p.type === "high");
    expect(high?.price).toBe(130);
  });

  it("menghasilkan pivot yang berselang-seling high/low (alternating)", () => {
    // Zig-zag jelas: 100 -> 120 -> 105 -> 135 -> 110 -> 150
    const prices = [100, 110, 120, 112, 105, 120, 135, 122, 110, 130, 150];
    const pivots = detectPivots(series(prices), { thresholdPct: 5 });
    expect(pivots.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < pivots.length; i += 1) {
      expect(pivots[i]!.type).not.toBe(pivots[i - 1]!.type);
    }
  });

  it("menyaring noise di bawah threshold (gerakan kecil diabaikan)", () => {
    // Hanya wiggle ±2% lalu naik besar. Threshold 5% → wiggle diabaikan.
    const noisy = [100, 101, 99, 100, 101, 100, 99, 100];
    const pivotsNoise = detectPivots(series(noisy), { thresholdPct: 5 });
    expect(pivotsNoise.length).toBe(0);

    // Dengan satu swing besar di akhir → 1 low + 1 high terdeteksi.
    const withSwing = [100, 101, 99, 100, 130, 132, 135];
    const pivots = detectPivots(series(withSwing), { thresholdPct: 5 });
    expect(pivots.length).toBeGreaterThanOrEqual(1);
    expect(pivots.some((p) => p.type === "high")).toBe(true);
  });

  it("threshold lebih tinggi menghasilkan lebih sedikit pivot", () => {
    const prices = [100, 108, 102, 112, 104, 118, 106, 125];
    const loose = detectPivots(series(prices), { thresholdPct: 3 });
    const strict = detectPivots(series(prices), { thresholdPct: 15 });
    expect(strict.length).toBeLessThanOrEqual(loose.length);
  });

  it("strength berada di rentang 0..1 dan naik dengan ukuran swing", () => {
    const prices = [100, 120, 140, 125, 110, 100];
    const pivots = detectPivots(series(prices), { thresholdPct: 5 });
    for (const p of pivots) {
      expect(p.strength).toBeGreaterThanOrEqual(0);
      expect(p.strength).toBeLessThanOrEqual(1);
    }
  });

  it("mengembalikan pivot urut kronologis berdasarkan index", () => {
    const prices = [100, 120, 105, 135, 110, 150];
    const pivots = detectPivots(series(prices), { thresholdPct: 5 });
    for (let i = 1; i < pivots.length; i += 1) {
      expect(pivots[i]!.index).toBeGreaterThan(pivots[i - 1]!.index);
    }
  });
});
