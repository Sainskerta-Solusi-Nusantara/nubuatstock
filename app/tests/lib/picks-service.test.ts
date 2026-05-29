import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk lib/picks/service.ts.
 *
 * service.ts mostly DB access, tapi punya logika non-trivial yang layak diuji
 * tanpa real DB:
 *   - toListItem mapping (via getTodayPicks): numeric string -> number, tp2/tp3
 *     nullable, publishedAt -> ISO string.
 *   - getPicksPerformance: dedup outcome per pick (priority final>T+20>T+5>T+1),
 *     hit-rate + avgReturn aggregation, bucket per setupType + "all", round4.
 *   - listPicksHistory: items + total + paging passthrough.
 *
 * Strategi mock (mirror tests/lib/screener.test.ts): stub `@/lib/db` dengan
 * chainable builder yang resolve ke canned rows berdasarkan bentuk query
 * (apakah .orderBy / .limit / .offset dipanggil).
 */

const state = {
  // rows untuk query "list" (orderBy dipanggil, ada limit/offset untuk history)
  listRows: [] as Array<Record<string, unknown>>,
  // rows untuk count query (count(*))
  countRows: [{ total: 0 }] as Array<Record<string, unknown>>,
  // rows untuk getPicksPerformance (leftJoin pickOutcomes, no orderBy/limit)
  perfRows: [] as Array<Record<string, unknown>>,
};

// NOTE: drizzle-orm is NOT mocked (the real schema needs it). The fake db
// builder ignores all conditions, so real eq/and/sql are harmless.
// NOTE: schema modules (@/db/schema/*) are NOT mocked — they are side-effect
// free and lib/types/picks.ts derives Zod schemas from the real drizzle tables.
// The fake db builder treats column refs as opaque, so real schema works fine.

vi.mock("@/lib/db", () => {
  function makeBuilder() {
    let sawOrderBy = false;
    let sawCount = false;
    const b: Record<string, unknown> = {};
    b.from = () => b;
    b.leftJoin = () => b;
    b.where = () => b;
    b.orderBy = () => {
      sawOrderBy = true;
      return b;
    };
    b.groupBy = () => b;
    b.limit = () => b;
    b.offset = () => b;
    function resolve(): unknown[] {
      // count query: select({ total: sql`count(*)` }) — detected via __markCount.
      if (sawCount) return state.countRows;
      // list queries (getTodayPicks / listPicksHistory rows) use .orderBy().
      if (sawOrderBy) return state.listRows;
      // getPicksPerformance: leftJoin outcomes, no orderBy.
      return state.perfRows;
    }
    b.then = (res: (v: unknown[]) => unknown) => res(resolve());
    // mark builder so we can detect count via the select() argument
    (b as { __markCount: () => void }).__markCount = () => {
      sawCount = true;
    };
    return b;
  }
  return {
    db: {
      select: (cols?: Record<string, unknown>) => {
        const b = makeBuilder() as Record<string, unknown> & { __markCount: () => void };
        // count query selects { total: sql`count(*)` }
        if (cols && "total" in cols && Object.keys(cols).length === 1) {
          b.__markCount();
        }
        return b;
      },
    },
  };
});

vi.mock("@/lib/logger", () => ({ logger: { info() {}, warn() {}, error() {}, debug() {} } }));

beforeEach(() => {
  state.listRows = [];
  state.countRows = [{ total: 0 }];
  state.perfRows = [];
});

function pickRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    tradeDate: "2026-05-30",
    companyKode: "BBRI",
    namaPerusahaan: "Bank BRI",
    sectorKode: "G",
    setupType: "breakout",
    score: "87.5",
    confidence: "high",
    entryZoneLow: "1000",
    entryZoneHigh: "1020",
    stopLoss: "950",
    tp1: "1100",
    tp2: "1200",
    tp3: null,
    rewardRiskRatio: "2.5",
    timeHorizon: "swing",
    status: "published",
    publishedAt: new Date("2026-05-30T01:00:00Z"),
    ...over,
  };
}

// ===========================================================================
// getTodayPicks -> toListItem mapping
// ===========================================================================
describe("getTodayPicks / toListItem mapping", () => {
  it("parses numeric strings to numbers and serializes publishedAt to ISO", async () => {
    state.listRows = [pickRow()];
    const { getTodayPicks } = await import("@/lib/picks/service");
    const items = await getTodayPicks({ tradeDate: "2026-05-30" });
    expect(items).toHaveLength(1);
    const it0 = items[0]!;
    expect(it0.score).toBe(87.5);
    expect(it0.entryZoneLow).toBe(1000);
    expect(it0.entryZoneHigh).toBe(1020);
    expect(it0.stopLoss).toBe(950);
    expect(it0.tp1).toBe(1100);
    expect(it0.tp2).toBe(1200);
    expect(it0.tp3).toBeNull();
    expect(it0.rewardRiskRatio).toBe(2.5);
    expect(it0.publishedAt).toBe("2026-05-30T01:00:00.000Z");
  });

  it("returns empty array when no published picks for the date", async () => {
    state.listRows = [];
    const { getTodayPicks } = await import("@/lib/picks/service");
    expect(await getTodayPicks({ tradeDate: "2026-05-30" })).toEqual([]);
  });

  it("handles null tp2/tp3 gracefully", async () => {
    state.listRows = [pickRow({ tp2: null, tp3: null })];
    const { getTodayPicks } = await import("@/lib/picks/service");
    const it0 = (await getTodayPicks({ tradeDate: "2026-05-30" }))[0]!;
    expect(it0.tp2).toBeNull();
    expect(it0.tp3).toBeNull();
  });
});

// ===========================================================================
// listPicksHistory
// ===========================================================================
describe("listPicksHistory", () => {
  it("returns items, total and paging passthrough", async () => {
    state.listRows = [pickRow(), pickRow({ id: "p2", companyKode: "TLKM" })];
    state.countRows = [{ total: 42 }];
    const { listPicksHistory } = await import("@/lib/picks/service");
    const res = await listPicksHistory({ limit: 20, offset: 40 });
    expect(res.items).toHaveLength(2);
    expect(res.total).toBe(42);
    expect(res.limit).toBe(20);
    expect(res.offset).toBe(40);
    expect(res.items[1]!.companyKode).toBe("TLKM");
  });
});

// ===========================================================================
// getPicksPerformance — dedup + aggregation
// ===========================================================================
describe("getPicksPerformance", () => {
  function perfRow(over: Partial<Record<string, unknown>> = {}) {
    return {
      pickId: "p1",
      setupType: "breakout",
      tradeDate: "2026-05-20",
      outcomeEvalAt: "T+20",
      hitTp1: true,
      hitTp2: false,
      hitTp3: false,
      hitSl: false,
      returnPct: "0.05",
      ...over,
    };
  }

  it("prefers the highest-priority outcome per pick (final > T+20 > T+5 > T+1)", async () => {
    // same pick p1 has T+5 (+10%) and final (-3%, hit SL). final wins.
    state.perfRows = [
      perfRow({ outcomeEvalAt: "T+5", returnPct: "0.10", hitTp1: true, hitSl: false }),
      perfRow({ outcomeEvalAt: "final", returnPct: "-0.03", hitTp1: false, hitSl: true }),
    ];
    const { getPicksPerformance } = await import("@/lib/picks/service");
    const res = await getPicksPerformance(30);
    const all = res.buckets.find((b) => b.setupType === "all")!;
    expect(all.total).toBe(1); // deduped to a single pick
    expect(all.slHitRate).toBe(1); // final outcome -> SL hit
    expect(all.tp1HitRate).toBe(0);
    expect(all.avgReturnPct).toBeCloseTo(-0.03, 4);
  });

  it("aggregates hit-rates and avg return across multiple picks", async () => {
    state.perfRows = [
      perfRow({ pickId: "p1", setupType: "breakout", outcomeEvalAt: "final", hitTp1: true, returnPct: "0.10" }),
      perfRow({ pickId: "p2", setupType: "breakout", outcomeEvalAt: "final", hitTp1: false, hitSl: true, returnPct: "-0.04" }),
    ];
    const { getPicksPerformance } = await import("@/lib/picks/service");
    const res = await getPicksPerformance(30);
    const all = res.buckets.find((b) => b.setupType === "all")!;
    expect(all.total).toBe(2);
    expect(all.tp1HitRate).toBe(0.5);
    expect(all.slHitRate).toBe(0.5);
    expect(all.avgReturnPct).toBeCloseTo((0.10 - 0.04) / 2, 4); // 0.03

    const breakout = res.buckets.find((b) => b.setupType === "breakout")!;
    expect(breakout.total).toBe(2);
    // a setup with no picks yields a zeroed bucket
    const reversal = res.buckets.find((b) => b.setupType === "reversal")!;
    expect(reversal.total).toBe(0);
    expect(reversal.tp1HitRate).toBe(0);
  });

  it("emits a bucket for 'all' plus every setup type", async () => {
    state.perfRows = [];
    const { getPicksPerformance } = await import("@/lib/picks/service");
    const res = await getPicksPerformance(7);
    const labels = res.buckets.map((b) => b.setupType);
    expect(labels).toContain("all");
    for (const s of ["continuation", "reversal", "breakout", "pullback", "range"]) {
      expect(labels).toContain(s);
    }
    expect(res.windowDays).toBe(7);
  });
});
