import { describe, expect, it } from "vitest";
import {
  analyzeMarketSummary,
  SHIFT_LABEL_TEXT,
  WINDOW_ORDER,
  type FlowPoint,
  type MarketSummaryResult,
  type WindowKey,
  type WindowValue,
} from "@/lib/bandarmology/market-summary";

/**
 * Unit tests — Market Summary time-window (IMPROVEMENT_PLAN §2, NeoBDM signature).
 *
 * Engine murni: agregasi flow ke jendela W4/W3/W2 + D3/D2/D1 dan deteksi
 * pergeseran momentum. Data sintetis: tidak menyentuh DB.
 *
 * Konvensi seri: indeks 0 = hari terbaru (D1), tanggal mundur tiap hari.
 * Kita generate 20 hari trading; per-hari value ditentukan generator.
 */

/** Buat seri 20 hari, value(dayIndexFromLatest) -> number. dayIndex 0 = D1 terbaru. */
function series(valueFor: (dayIndexFromLatest: number) => number, n = 20): FlowPoint[] {
  const base = new Date("2026-05-29");
  const points: FlowPoint[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    points.push({ tradeDate: d.toISOString().slice(0, 10), value: valueFor(i) });
  }
  return points;
}

/** Index windows by key with non-optional typing for tests. */
function indexWindows(r: MarketSummaryResult): Record<WindowKey, WindowValue> {
  const map = {} as Record<WindowKey, WindowValue>;
  for (const w of r.windows) map[w.key] = w;
  return map;
}

describe("analyzeMarketSummary", () => {
  it("returns tidak_ada_data for empty input", () => {
    const r = analyzeMarketSummary([]);
    expect(r.shift).toBe("tidak_ada_data");
    expect(r.totalNet).toBe(0);
    expect(r.overallDirection).toBe("flat");
    // tetap memunculkan semua jendela (untuk UI grid).
    expect(r.windows.map((w) => w.key)).toEqual([...WINDOW_ORDER]);
    expect(r.windows.every((w) => w.days === 0)).toBe(true);
  });

  it("builds correct window ranges (W4 oldest .. D1 newest)", () => {
    // value = +1 setiap hari -> tiap jendela net = jumlah hari di jendela.
    const r = analyzeMarketSummary(series(() => 1));
    const byKey = indexWindows(r);
    expect(byKey.D1.days).toBe(1);
    expect(byKey.D2.days).toBe(1);
    expect(byKey.D3.days).toBe(1);
    expect(byKey.W2.days).toBe(5); // indeks 3..7
    expect(byKey.W3.days).toBe(5); // indeks 8..12
    expect(byKey.W4.days).toBe(5); // indeks 13..17
    expect(byKey.W2.net).toBe(5);
    expect(byKey.D1.avgPerDay).toBe(1);
  });

  it("detects strengthening accumulation (inflow grows from W4 -> D1)", () => {
    // older days (large i) small/negative inflow, recent days (small i) large inflow.
    // i=0 (D1) terbesar, i=19 terkecil.
    const r = analyzeMarketSummary(series((i) => (20 - i) * 100));
    expect(r.overallDirection).toBe("inflow");
    expect(r.shift).toBe("akumulasi_menguat");
    expect(r.momentumSlope).toBeGreaterThan(0);
  });

  it("detects weakening accumulation (inflow shrinks toward D1)", () => {
    // recent days small inflow, older days large inflow -> still inflow, decel.
    const r = analyzeMarketSummary(series((i) => (i + 1) * 100));
    expect(r.overallDirection).toBe("inflow");
    expect(r.shift).toBe("akumulasi_melemah");
    expect(r.momentumSlope).toBeLessThan(0);
  });

  it("detects strengthening distribution (outflow grows toward D1)", () => {
    // recent days strongly negative, older days mildly negative.
    const r = analyzeMarketSummary(series((i) => -(20 - i) * 100));
    expect(r.overallDirection).toBe("outflow");
    expect(r.shift).toBe("distribusi_menguat");
    expect(r.momentumSlope).toBeLessThan(0);
  });

  it("detects weakening distribution (outflow shrinks toward D1)", () => {
    const r = analyzeMarketSummary(series((i) => -(i + 1) * 100));
    expect(r.overallDirection).toBe("outflow");
    expect(r.shift).toBe("distribusi_melemah");
  });

  it("detects bullish reversal (outflow early -> inflow recent)", () => {
    // recent 3 days (i 0..2) strong inflow; weekly blocks (i>=3) outflow.
    const r = analyzeMarketSummary(series((i) => (i <= 2 ? 1000 : -300)));
    expect(r.shift).toBe("berbalik_ke_inflow");
  });

  it("detects bearish reversal (inflow early -> outflow recent)", () => {
    const r = analyzeMarketSummary(series((i) => (i <= 2 ? -1000 : 300)));
    expect(r.shift).toBe("berbalik_ke_outflow");
  });

  it("returns netral for steady inflow with no momentum shift", () => {
    // constant inflow every day -> early avg == late avg, delta ~ 0 (below threshold).
    const r = analyzeMarketSummary(series(() => 100));
    expect(r.overallDirection).toBe("inflow");
    expect(r.shift).toBe("netral");
    expect(Math.abs(r.momentumSlope)).toBeLessThan(1);
  });

  it("sorts unsorted input by date descending internally", () => {
    const pts = series((i) => (20 - i) * 100);
    const shuffled = [...pts].sort(() => 0.5 - Math.random());
    const r1 = analyzeMarketSummary(pts);
    const r2 = analyzeMarketSummary(shuffled);
    expect(r2.shift).toBe(r1.shift);
    expect(r2.totalNet).toBe(r1.totalNet);
    expect(r2.windows.map((w) => w.net)).toEqual(r1.windows.map((w) => w.net));
  });

  it("handles short series (only daily windows, no weekly data)", () => {
    const r = analyzeMarketSummary(series((i) => (3 - i) * 100, 3));
    const byKey = indexWindows(r);
    expect(byKey.D1.days).toBe(1);
    expect(byKey.D2.days).toBe(1);
    expect(byKey.D3.days).toBe(1);
    expect(byKey.W2.days).toBe(0);
    expect(byKey.W4.days).toBe(0);
    expect(r.shift).not.toBe("tidak_ada_data");
  });

  it("carries source metadata through", () => {
    const r = analyzeMarketSummary(series(() => 100), { source: "foreign" });
    expect(r.source).toBe("foreign");
  });

  it("exposes human-readable label text for every shift", () => {
    const labels = Object.keys(SHIFT_LABEL_TEXT) as Array<keyof typeof SHIFT_LABEL_TEXT>;
    for (const l of labels) {
      expect(SHIFT_LABEL_TEXT[l].length).toBeGreaterThan(0);
    }
  });
});
