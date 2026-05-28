import { describe, expect, it } from "vitest";
import {
  addTradingDays,
  computeReturnPct,
  evaluatePickAt,
  resolveOutcomeStatus,
  type PickLevels,
} from "@/lib/picks/outcome";

/**
 * Tests untuk pure logic `lib/picks/outcome.ts` (gap audit §8.3 #13).
 * Data sintetis, tanpa DB. Mirror perilaku worker evaluate-pick-outcomes.
 */

const LEVELS: PickLevels = {
  entry: 100,
  sl: 90,
  tp1: 110,
  tp2: 120,
  tp3: 130,
};

describe("addTradingDays", () => {
  it("adds 1 trading day on a weekday (Wed -> Thu)", () => {
    // 2024-01-03 is a Wednesday (UTC)
    const start = new Date("2024-01-03T00:00:00Z");
    const out = addTradingDays(start, 1);
    expect(out.toISOString().slice(0, 10)).toBe("2024-01-04");
  });

  it("skips the weekend (Fri + 1 -> Mon)", () => {
    // 2024-01-05 is a Friday
    const start = new Date("2024-01-05T00:00:00Z");
    const out = addTradingDays(start, 1);
    // Sat/Sun skipped -> Monday 2024-01-08
    expect(out.toISOString().slice(0, 10)).toBe("2024-01-08");
    expect(out.getUTCDay()).toBe(1); // Monday
  });

  it("adds 5 trading days spanning a weekend (Mon -> next Mon)", () => {
    // 2024-01-01 is a Monday
    const start = new Date("2024-01-01T00:00:00Z");
    const out = addTradingDays(start, 5);
    // 5 weekdays later, skipping one weekend -> Monday 2024-01-08
    expect(out.toISOString().slice(0, 10)).toBe("2024-01-08");
  });

  it("never lands on a weekend", () => {
    const start = new Date("2024-03-01T00:00:00Z"); // Friday
    for (let n = 1; n <= 20; n++) {
      const day = addTradingDays(start, n).getUTCDay();
      expect(day).not.toBe(0); // Sun
      expect(day).not.toBe(6); // Sat
    }
  });
});

describe("computeReturnPct", () => {
  it("computes a positive return", () => {
    expect(computeReturnPct(110, 100)).toBeCloseTo(0.1, 10);
  });

  it("computes a negative return", () => {
    expect(computeReturnPct(85, 100)).toBeCloseTo(-0.15, 10);
  });

  it("is zero at entry", () => {
    expect(computeReturnPct(100, 100)).toBe(0);
  });
});

describe("resolveOutcomeStatus", () => {
  it("returns open when nothing hit and not terminal", () => {
    expect(
      resolveOutcomeStatus({
        hitTp1: false,
        hitTp2: false,
        hitTp3: false,
        hitSl: false,
        isTerminal: false,
      }),
    ).toBe("open");
  });

  it("returns expired when nothing hit and terminal", () => {
    expect(
      resolveOutcomeStatus({
        hitTp1: false,
        hitTp2: false,
        hitTp3: false,
        hitSl: false,
        isTerminal: true,
      }),
    ).toBe("expired");
  });

  it("prefers highest TP over SL when both flagged", () => {
    expect(
      resolveOutcomeStatus({
        hitTp1: true,
        hitTp2: true,
        hitTp3: false,
        hitSl: true,
        isTerminal: false,
      }),
    ).toBe("tp2_hit");
  });

  it("returns sl_hit when only SL flagged", () => {
    expect(
      resolveOutcomeStatus({
        hitTp1: false,
        hitTp2: false,
        hitTp3: false,
        hitSl: true,
        isTerminal: true,
      }),
    ).toBe("sl_hit");
  });
});

describe("evaluatePickAt", () => {
  it("hits TP before SL (TP reached, SL not touched)", () => {
    // high reaches tp1/tp2, low stays above sl
    const r = evaluatePickAt(118, 122, 95, LEVELS, false);
    expect(r.hitTp1).toBe(true);
    expect(r.hitTp2).toBe(true);
    expect(r.hitTp3).toBe(false);
    expect(r.hitSl).toBe(false);
    expect(r.statusAtEval).toBe("tp2_hit");
    expect(r.returnPct).toBeCloseTo(0.18, 10);
  });

  it("hits SL (low breaches sl, no TP reached)", () => {
    const r = evaluatePickAt(88, 105, 89, LEVELS, false);
    expect(r.hitTp1).toBe(false);
    expect(r.hitSl).toBe(true);
    expect(r.statusAtEval).toBe("sl_hit");
    expect(r.returnPct).toBeCloseTo(-0.12, 10);
  });

  it("expires at T+20 when no level hit, capturing T+20 return", () => {
    // window stayed between sl and tp1, terminal eval
    const r = evaluatePickAt(103, 108, 95, LEVELS, true);
    expect(r.hitTp1).toBe(false);
    expect(r.hitSl).toBe(false);
    expect(r.statusAtEval).toBe("expired");
    expect(r.returnPct).toBeCloseTo(0.03, 10);
  });

  it("stays open at non-terminal eval when no level hit", () => {
    const r = evaluatePickAt(103, 108, 95, LEVELS, false);
    expect(r.statusAtEval).toBe("open");
  });

  it("detects gap-open through TP (window high far above tp3)", () => {
    // Gap up: high blows past all TP levels
    const r = evaluatePickAt(135, 140, 99, LEVELS, false);
    expect(r.hitTp1).toBe(true);
    expect(r.hitTp2).toBe(true);
    expect(r.hitTp3).toBe(true);
    expect(r.statusAtEval).toBe("tp3_hit");
  });

  it("detects gap-open through SL (window low far below sl)", () => {
    // Gap down: low blows past sl, no TP reached
    const r = evaluatePickAt(80, 102, 78, LEVELS, true);
    expect(r.hitSl).toBe(true);
    expect(r.hitTp1).toBe(false);
    expect(r.statusAtEval).toBe("sl_hit");
    expect(r.returnPct).toBeCloseTo(-0.2, 10);
  });

  it("treats unset (null/<=0) TP2/TP3 levels as not hit", () => {
    const levels: PickLevels = { entry: 100, sl: 90, tp1: 110, tp2: null, tp3: 0 };
    const r = evaluatePickAt(115, 200, 95, levels, false);
    expect(r.hitTp1).toBe(true);
    expect(r.hitTp2).toBe(false);
    expect(r.hitTp3).toBe(false);
    expect(r.statusAtEval).toBe("tp1_hit");
  });

  it("does not flag hits when window extremes are non-finite (empty window)", () => {
    const r = evaluatePickAt(100, -Infinity, Infinity, LEVELS, true);
    expect(r.hitTp1).toBe(false);
    expect(r.hitSl).toBe(false);
    expect(r.statusAtEval).toBe("expired");
  });

  it("treats SL=0 as unset (never sl_hit)", () => {
    const levels: PickLevels = { entry: 100, sl: 0, tp1: 110, tp2: 120, tp3: 130 };
    const r = evaluatePickAt(95, 105, 50, levels, false);
    expect(r.hitSl).toBe(false);
    expect(r.statusAtEval).toBe("open");
  });
});
