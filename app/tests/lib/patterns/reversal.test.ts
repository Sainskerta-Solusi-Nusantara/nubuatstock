import { describe, expect, it } from "vitest";
import {
  detectHeadShoulders,
  detectInverseHeadShoulders,
  detectRisingWedge,
  detectFallingWedge,
  detectSymmetricalTriangle,
} from "@/lib/patterns/detectors";
import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Tests untuk reversal pattern detectors (P1 batch):
 *   Head & Shoulders, Inverse H&S, Rising Wedge, Falling Wedge, Symmetrical Triangle.
 *
 * Strategi sama dengan detectors.test.ts: bangun OHLCV sintetis dengan geometri
 * pola yang diketahui (valid) + deret yang melanggar kriteria (negatif).
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

// ===================== HEAD & SHOULDERS =====================

describe("detectHeadShoulders", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    // 3 puncak: bahu kiri ~120, kepala ~135, bahu kanan ~120, neckline ~100.
    // Pivot threshold 3% — pakai ramp besar agar swing terdeteksi.
    const lead = flat(100, 6, 1_000);
    const up1 = ramp(100, 120, 6); // left shoulder up
    const dn1 = ramp(120, 100, 6); // back to neckline
    const up2 = ramp(100, 135, 7); // head up (tertinggi)
    const dn2 = ramp(135, 100, 7); // back to neckline
    const up3 = ramp(100, 120, 6); // right shoulder up
    const dn3 = ramp(120, 92, 8); // breakdown below neckline
    return [
      ...lead,
      ...up1,
      ...dn1.slice(1),
      ...up2.slice(1),
      ...dn2.slice(1),
      ...up3.slice(1),
      ...dn3.slice(1),
    ];
  }

  it("mendeteksi head & shoulders (3 puncak, kepala tertinggi)", () => {
    const matches = detectHeadShoulders(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("head_shoulders");
    expect(m.direction).toBe("bearish");
    expect(m.category).toBe("reversal");
    expect(m.keyLevels.neckline).toBeDefined();
    expect(m.keyLevels.target).toBeLessThan(m.keyLevels.breakout);
    expect(m.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("TIDAK mendeteksi kalau kepala tidak tertinggi (tiga puncak setara)", () => {
    dayCounter = 0;
    const lead = flat(100, 6, 1_000);
    const seq = [
      ...ramp(100, 120, 6),
      ...ramp(120, 100, 6).slice(1),
      ...ramp(100, 120, 6).slice(1), // "kepala" sama tinggi dengan bahu
      ...ramp(120, 100, 6).slice(1),
      ...ramp(100, 120, 6).slice(1),
      ...ramp(120, 100, 6).slice(1),
    ];
    expect(detectHeadShoulders([...lead, ...seq])).toEqual([]);
  });

  it("mengembalikan kosong untuk data terlalu pendek", () => {
    dayCounter = 0;
    expect(detectHeadShoulders(flat(100, 20))).toEqual([]);
  });
});

// ===================== INVERSE HEAD & SHOULDERS =====================

describe("detectInverseHeadShoulders", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    // Mirror: 3 lembah, kepala terendah, neckline ~100.
    // Awali dengan kenaikan supaya zigzag membentuk swing high pertama (~100)
    // sebelum turun ke left shoulder.
    const lead = [...flat(90, 4, 1_000), ...ramp(90, 100, 4)];
    const dn1 = ramp(100, 80, 6); // left shoulder down
    const up1 = ramp(80, 100, 6); // back to neckline
    const dn2 = ramp(100, 65, 7); // head down (terendah)
    const up2 = ramp(65, 100, 7);
    const dn3 = ramp(100, 80, 6); // right shoulder down
    const up3 = ramp(80, 110, 8); // breakout above neckline
    return [
      ...lead,
      ...dn1,
      ...up1.slice(1),
      ...dn2.slice(1),
      ...up2.slice(1),
      ...dn3.slice(1),
      ...up3.slice(1),
    ];
  }

  it("mendeteksi inverse head & shoulders (3 lembah, kepala terendah)", () => {
    const matches = detectInverseHeadShoulders(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("inverse_head_shoulders");
    expect(m.direction).toBe("bullish");
    expect(m.category).toBe("reversal");
    expect(m.keyLevels.target).toBeGreaterThan(m.keyLevels.breakout);
  });

  it("TIDAK mendeteksi pada head & shoulders normal (puncak, bukan lembah)", () => {
    dayCounter = 0;
    const lead = flat(100, 6, 1_000);
    const seq = [
      ...ramp(100, 120, 6),
      ...ramp(120, 100, 6).slice(1),
      ...ramp(100, 135, 7).slice(1),
      ...ramp(135, 100, 7).slice(1),
      ...ramp(100, 120, 6).slice(1),
      ...ramp(120, 92, 8).slice(1),
    ];
    expect(detectInverseHeadShoulders([...lead, ...seq])).toEqual([]);
  });
});

// ===================== RISING WEDGE =====================

describe("detectRisingWedge", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    // Highs & lows naik, tapi lows naik lebih curam → konvergen. Bearish.
    const n = 30;
    const out: OhlcvBar[] = [];
    for (let i = 0; i < n; i += 1) {
      const high = 100 + i * 1.0; // +1.0/bar
      const low = 90 + i * 1.4; // +1.4/bar (naik lebih cepat → menyempit)
      const mid = (high + low) / 2;
      out.push(bar(mid, { high, low, volume: 1_000 }));
    }
    return out;
  }

  it("mendeteksi rising wedge (konvergen naik → bearish)", () => {
    const matches = detectRisingWedge(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("rising_wedge");
    expect(m.direction).toBe("bearish");
    expect(m.category).toBe("reversal");
    expect(m.keyLevels.target).toBeLessThan(m.keyLevels.breakout);
  });

  it("TIDAK mendeteksi pada channel paralel naik (range konstan)", () => {
    dayCounter = 0;
    const out: OhlcvBar[] = [];
    for (let i = 0; i < 30; i += 1) {
      const high = 100 + i * 1.0;
      const low = 90 + i * 1.0; // paralel — tidak menyempit
      const mid = (high + low) / 2;
      out.push(bar(mid, { high, low, volume: 1_000 }));
    }
    expect(detectRisingWedge(out)).toEqual([]);
  });

  it("mengembalikan kosong untuk data terlalu pendek", () => {
    dayCounter = 0;
    expect(detectRisingWedge(flat(100, 10))).toEqual([]);
  });
});

// ===================== FALLING WEDGE =====================

describe("detectFallingWedge", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    // Highs & lows turun, tapi highs turun lebih curam → konvergen. Bullish.
    const n = 30;
    const out: OhlcvBar[] = [];
    for (let i = 0; i < n; i += 1) {
      const high = 130 - i * 1.4; // turun lebih cepat
      const low = 100 - i * 1.0;
      const mid = (high + low) / 2;
      out.push(bar(mid, { high, low, volume: 1_000 }));
    }
    return out;
  }

  it("mendeteksi falling wedge (konvergen turun → bullish)", () => {
    const matches = detectFallingWedge(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("falling_wedge");
    expect(m.direction).toBe("bullish");
    expect(m.category).toBe("reversal");
    expect(m.keyLevels.target).toBeGreaterThan(m.keyLevels.breakout);
  });

  it("TIDAK mendeteksi pada rising wedge (arah salah)", () => {
    dayCounter = 0;
    const out: OhlcvBar[] = [];
    for (let i = 0; i < 30; i += 1) {
      const high = 100 + i * 1.0;
      const low = 90 + i * 1.4;
      const mid = (high + low) / 2;
      out.push(bar(mid, { high, low, volume: 1_000 }));
    }
    expect(detectFallingWedge(out)).toEqual([]);
  });
});

// ===================== SYMMETRICAL TRIANGLE =====================

describe("detectSymmetricalTriangle", () => {
  function buildValid(): OhlcvBar[] {
    dayCounter = 0;
    // Highs turun + lows naik, magnitude seimbang → simetris.
    const prior = ramp(80, 100, 15); // prior uptrend → bias bullish
    const n = 30;
    const tri: OhlcvBar[] = [];
    for (let i = 0; i < n; i += 1) {
      const high = 120 - i * 0.7;
      const low = 80 + i * 0.7;
      const mid = (high + low) / 2;
      tri.push(bar(mid, { high, low, volume: 1_000 }));
    }
    return [...prior, ...tri];
  }

  it("mendeteksi symmetrical triangle (highs turun + lows naik konvergen)", () => {
    const matches = detectSymmetricalTriangle(buildValid());
    expect(matches.length).toBe(1);
    const m = matches[0]!;
    expect(m.patternType).toBe("symmetrical_triangle");
    expect(m.category).toBe("indecision");
    expect(["bullish", "bearish"]).toContain(m.direction);
    expect(m.keyLevels.breakout).toBeDefined();
  });

  it("bias bullish jika prior trend naik", () => {
    const matches = detectSymmetricalTriangle(buildValid());
    expect(matches[0]!.direction).toBe("bullish");
  });

  it("TIDAK mendeteksi ascending triangle (resistance flat)", () => {
    dayCounter = 0;
    const out: OhlcvBar[] = [];
    for (let i = 0; i < 30; i += 1) {
      const high = 120; // flat resistance
      const low = 90 + i * 0.8; // higher lows
      const mid = (high + low) / 2;
      out.push(bar(mid, { high, low, volume: 1_000 }));
    }
    expect(detectSymmetricalTriangle(out)).toEqual([]);
  });

  it("mengembalikan kosong untuk data terlalu pendek", () => {
    dayCounter = 0;
    expect(detectSymmetricalTriangle(flat(100, 10))).toEqual([]);
  });
});
