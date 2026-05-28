import { describe, expect, it } from "vitest";
import {
  detectBullPennant,
  detectBearPennant,
  detectInverseCupHandle,
  detectCupHandle,
  detectBullFlag,
  detectAllPatterns,
} from "@/lib/patterns/detectors";
import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Tests untuk continuation pattern detectors (P0 batch).
 *
 * Strategi: bangun deret OHLCV sintetis dengan geometri pattern yang diketahui
 * (valid case) + deret yang melanggar kriteria (negatif), lalu pastikan detektor
 * mengembalikan match yang benar / kosong.
 *
 * Konvensi bar helper:
 *   - close di-set eksplisit; high/low diberi spread kecil supaya pivot/range
 *     realistis tapi tidak mengganggu kriteria.
 */

let dayCounter = 0;
function nextDate(): string {
  dayCounter += 1;
  const d = new Date(2024, 0, 1);
  d.setDate(d.getDate() + dayCounter);
  return d.toISOString().slice(0, 10);
}

function bar(
  close: number,
  opts: { high?: number; low?: number; open?: number; volume?: number } = {},
): OhlcvBar {
  const high = opts.high ?? close * 1.005;
  const low = opts.low ?? close * 0.995;
  const open = opts.open ?? close;
  const volume = opts.volume ?? 1_000;
  return { date: nextDate(), open, high, low, close, volume, valueIdr: close * volume };
}

function flat(price: number, n: number, volume = 1_000): OhlcvBar[] {
  return Array.from({ length: n }, () => bar(price, { volume }));
}

/** Linear ramp inclusive from->to over n bars. */
function ramp(from: number, to: number, n: number, volume = 2_000): OhlcvBar[] {
  return Array.from({ length: n }, (_, i) => {
    const price = from + ((to - from) * i) / (n - 1);
    return bar(price, { volume });
  });
}

// ===================== BULL PENNANT =====================

describe("detectBullPennant", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    const lead = flat(100, 14, 1_000); // base history (>= 12 needed before consolidation)
    const pole = ramp(100, 140, 6, 5_000); // sharp +40% rally, high volume
    // Converging symmetrical triangle: highs descend from 140, lows ascend from 128.
    const consol: OhlcvBar[] = [];
    const hi = [139, 137, 135, 134, 133, 132.5, 132];
    const lo = [129, 130, 130.8, 131.2, 131.5, 131.7, 131.9];
    for (let i = 0; i < hi.length; i += 1) {
      const mid = (hi[i]! + lo[i]!) / 2;
      consol.push(bar(mid, { high: hi[i]!, low: lo[i]!, volume: 800 }));
    }
    return [...lead, ...pole, ...consol];
  }

  it("mendeteksi bull pennant pada pole tajam + segitiga menyempit", () => {
    const matches = detectBullPennant(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("bull_pennant");
    expect(m.direction).toBe("bullish");
    expect(m.category).toBe("continuation");
    expect(m.confidence).toBeGreaterThanOrEqual(0.5);
    expect(m.keyLevels.target).toBeGreaterThan(m.keyLevels.breakout);
    expect(m.volumeConfirmation).toBe(true);
  });

  it("TIDAK mendeteksi tanpa pole (sideways saja)", () => {
    dayCounter = 0;
    // Konsolidasi menyempit tapi tanpa rally sebelumnya.
    const lead = flat(100, 20, 1_000);
    const consol: OhlcvBar[] = [];
    const hi = [104, 103.5, 103, 102.5, 102.2, 102];
    const lo = [96, 96.5, 97, 97.5, 97.8, 98];
    for (let i = 0; i < hi.length; i += 1) {
      const mid = (hi[i]! + lo[i]!) / 2;
      consol.push(bar(mid, { high: hi[i]!, low: lo[i]!, volume: 900 }));
    }
    expect(detectBullPennant([...lead, ...consol])).toEqual([]);
  });

  it("TIDAK mendeteksi kalau range tidak menyempit (paralel/melebar)", () => {
    dayCounter = 0;
    const lead = flat(100, 14, 1_000);
    const pole = ramp(100, 140, 6, 5_000);
    // Range konstan/melebar — bukan pennant.
    const consol: OhlcvBar[] = [];
    const hi = [139, 139, 140, 141, 142, 143, 144];
    const lo = [129, 128, 127, 126, 125, 124, 123];
    for (let i = 0; i < hi.length; i += 1) {
      const mid = (hi[i]! + lo[i]!) / 2;
      consol.push(bar(mid, { high: hi[i]!, low: lo[i]!, volume: 800 }));
    }
    expect(detectBullPennant([...lead, ...pole, ...consol])).toEqual([]);
  });

  it("mengembalikan kosong untuk data terlalu pendek", () => {
    dayCounter = 0;
    expect(detectBullPennant(flat(100, 10))).toEqual([]);
  });
});

// ===================== BEAR PENNANT =====================

describe("detectBearPennant", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    const lead = flat(100, 14, 1_000);
    const pole = ramp(100, 60, 6, 5_000); // sharp -40% drop
    // Converging: highs descend toward apex, lows ascend toward apex.
    const consol: OhlcvBar[] = [];
    const hi = [71, 70, 69.2, 68.6, 68.2, 68, 67.9];
    const lo = [61, 62, 62.8, 63.4, 63.8, 64, 64.2];
    for (let i = 0; i < hi.length; i += 1) {
      const mid = (hi[i]! + lo[i]!) / 2;
      consol.push(bar(mid, { high: hi[i]!, low: lo[i]!, volume: 800 }));
    }
    return [...lead, ...pole, ...consol];
  }

  it("mendeteksi bear pennant pada drop tajam + segitiga menyempit", () => {
    const matches = detectBearPennant(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("bear_pennant");
    expect(m.direction).toBe("bearish");
    expect(m.keyLevels.target).toBeLessThan(m.keyLevels.breakout);
  });

  it("TIDAK mendeteksi pada uptrend (salah arah pole)", () => {
    dayCounter = 0;
    const lead = flat(100, 14, 1_000);
    const pole = ramp(100, 140, 6, 5_000); // rally, bukan drop
    const consol: OhlcvBar[] = [];
    const hi = [139, 137, 135, 134, 133, 132];
    const lo = [129, 130, 130.8, 131.2, 131.5, 131.9];
    for (let i = 0; i < hi.length; i += 1) {
      const mid = (hi[i]! + lo[i]!) / 2;
      consol.push(bar(mid, { high: hi[i]!, low: lo[i]!, volume: 800 }));
    }
    expect(detectBearPennant([...lead, ...pole, ...consol])).toEqual([]);
  });
});

// ===================== INVERSE CUP & HANDLE =====================

describe("detectInverseCupHandle", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    // Detector needs bars.length >= cupDuration+15. Target cupDuration=30 with
    // lead padding so the 30-bar cup slice lands on a clean dome.
    const lead = flat(100, 12, 1_000); // padding before cup (need >= 50 bars total)
    // Cup slice = cupDuration(30) + 1 = 31 bars: rim 100 -> peak 130 -> rim 100.
    const up = ramp(100, 130, 15, 1_500); // 15 bars
    const down = ramp(130, 100, 17, 1_500); // 17 bars
    const cup = [...up, ...down.slice(1)]; // 31 bars, peak (130) in middle
    // Handle: small upward rebound near right rim, stays above rim, low volume.
    const handle: OhlcvBar[] = [];
    const hPrices = [102, 104, 105, 104, 103, 102, 101.5, 101]; // 8 bars
    for (const p of hPrices) handle.push(bar(p, { volume: 600 }));
    return [...lead, ...cup, ...handle]; // 51 bars total (>= 50 required)
  }

  it("mendeteksi inverse cup & handle (rounded top + handle ke atas)", () => {
    const matches = detectInverseCupHandle(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("inverse_cup_handle");
    expect(m.direction).toBe("bearish");
    expect(m.category).toBe("continuation");
    expect(m.keyLevels.target).toBeLessThan(m.keyLevels.breakout);
    expect(m.keyLevels.neckline).toBeDefined();
  });

  it("TIDAK mendeteksi pada cup normal (rounded BOTTOM)", () => {
    dayCounter = 0;
    // Rounded bottom (real cup & handle), bukan inverse.
    const lead = flat(130, 12, 1_000);
    const down = ramp(130, 100, 15, 1_500);
    const up = ramp(100, 130, 17, 1_500);
    const cup = [...down, ...up.slice(1)];
    const handle: OhlcvBar[] = [];
    for (const p of [128, 126, 125, 126, 127, 128, 127.5, 127]) handle.push(bar(p, { volume: 600 }));
    expect(detectInverseCupHandle([...lead, ...cup, ...handle])).toEqual([]);
  });

  it("mengembalikan kosong untuk data terlalu pendek", () => {
    dayCounter = 0;
    expect(detectInverseCupHandle(flat(100, 40))).toEqual([]);
  });
});

// ===================== REGRESSION: existing detectors still work =====================

describe("existing P0 detectors regression", () => {
  it("detectCupHandle masih mendeteksi rounded bottom + handle", () => {
    dayCounter = 0;
    // 31-bar cup (rim 130 -> bottom 100 -> rim 130) + 8-bar handle + lead padding.
    const lead = flat(130, 12, 1_000);
    const down = ramp(130, 100, 15, 1_500);
    const up = ramp(100, 130, 17, 1_500);
    const cup = [...down, ...up.slice(1)]; // 31 bars
    const handle: OhlcvBar[] = [];
    for (const p of [128, 126, 125, 126, 127, 128, 127.5, 127]) handle.push(bar(p, { volume: 600 }));
    const matches = detectCupHandle([...lead, ...cup, ...handle]);
    expect(matches.length).toBe(1);
    expect(matches[0]!.patternType).toBe("cup_handle");
  });

  it("detectBullFlag masih mendeteksi pole + flag", () => {
    dayCounter = 0;
    const lead = flat(100, 16, 1_000);
    const pole = ramp(100, 120, 7, 5_000);
    // Slight downward drift consolidation (flag).
    const consol = [
      bar(119, { volume: 700 }),
      bar(118.5, { volume: 700 }),
      bar(118, { volume: 700 }),
      bar(117.5, { volume: 700 }),
      bar(117, { volume: 700 }),
      bar(117.2, { volume: 700 }),
      bar(117, { volume: 700 }),
      bar(116.8, { volume: 700 }),
    ];
    const matches = detectBullFlag([...lead, ...pole, ...consol]);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]!.patternType).toBe("bull_flag");
  });
});

// ===================== AGGREGATOR =====================

describe("detectAllPatterns", () => {
  it("tidak melempar error untuk data acak & mengembalikan array", () => {
    dayCounter = 0;
    const bars: OhlcvBar[] = [];
    let p = 100;
    for (let i = 0; i < 120; i += 1) {
      p += Math.sin(i / 3) * 2 + (i % 5 === 0 ? 1 : -0.5);
      bars.push(bar(Math.max(10, p), { volume: 1_000 + (i % 7) * 100 }));
    }
    const result = detectAllPatterns(bars);
    expect(Array.isArray(result)).toBe(true);
    for (const m of result) {
      expect(m.confidence).toBeGreaterThanOrEqual(0);
      expect(m.confidence).toBeLessThanOrEqual(1);
      expect(m.startIndex).toBeLessThanOrEqual(m.endIndex);
    }
  });
});
