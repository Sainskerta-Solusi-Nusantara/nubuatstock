import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests untuk screener service + presets (lib/screener/**).
 *
 * Fokus:
 * - Preset library integrity (id unik, filter keys valid, Swing Santai spec).
 * - `runScreener` filtersApplied counting untuk fundamental + technical filters.
 * - Sort field normalization (stoch_k / rsi / invalid sortDir).
 *
 * Strategi mock: stub `@/lib/db` dengan chainable query builder yang merekam
 * pemanggilan terakhir + mengembalikan canned rows — tidak perlu real Postgres.
 */

// ── Mock DB: chainable builder ──────────────────────────────────────────────
// runScreener melakukan 2 query:
//   1. count: select().from().leftJoin().leftJoin().where()  → [{ total }]
//   2. rows:  select().from().leftJoin()×3 .where().orderBy().limit().offset() → rows[]
// Kita bikin builder yang resolve ke array berbeda tergantung apakah orderBy dipanggil.
const state = {
  countResult: [{ total: 0 }] as Array<Record<string, unknown>>,
  rowsResult: [] as Array<Record<string, unknown>>,
  lastOrderBy: undefined as unknown,
};

vi.mock("@/lib/db", () => {
  function makeBuilder() {
    let sawOrderBy = false;
    const builder: Record<string, unknown> = {};
    const chain = (fn: string) =>
      ((...args: unknown[]) => {
        if (fn === "orderBy") {
          sawOrderBy = true;
          state.lastOrderBy = args[0];
        }
        return builder;
      });
    for (const m of ["select", "from", "leftJoin", "where", "orderBy", "limit", "offset"]) {
      builder[m] = chain(m);
    }
    // Make builder awaitable (drizzle queries are thenable).
    (builder as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
      resolve(sawOrderBy ? state.rowsResult : state.countResult);
    return builder;
  }
  return {
    db: {
      select: () => {
        const b = makeBuilder() as { select: () => unknown };
        return b.select();
      },
    },
  };
});

// db schema imports — biar tidak ikut nge-load real db connection di service.ts,
// mock di atas sudah cukup; schema modules pure (no side effects).

import { runScreener, type ScreenerFilters } from "@/lib/screener/service";
import { SCREENER_PRESETS, getPreset } from "@/lib/screener/presets";

beforeEach(() => {
  state.countResult = [{ total: 0 }];
  state.rowsResult = [];
  state.lastOrderBy = undefined;
});

// Set semua kunci ScreenerFilters yang valid (untuk validasi preset).
const VALID_FILTER_KEYS = new Set<keyof ScreenerFilters>([
  "sectorKode", "subSectorKode", "papanKode", "isSyariah", "search",
  "minMarketCap", "maxMarketCap", "minPe", "maxPe", "minPbv", "maxPbv",
  "minRoe", "minProfitMargin", "minRevenueGrowth", "maxDebtToEquity",
  "minCurrentRatio", "minDividendYield", "minAvgVolume3Mo",
  "minStochK_10_5_5", "maxStochK_10_5_5", "stochBullishCross_10_5_5",
  "minStochK_14_3_3", "maxStochK_14_3_3", "minStochK_5_3_3", "maxStochK_5_3_3",
  "minRsi14", "maxRsi14", "macdAboveZero", "macdHistogramTurningUp",
  "macdHistogramTurningDown", "minMfi14", "maxMfi14",
  "isAboveSma20", "isAboveSma50", "isAboveSma200", "isBullishMaStack",
  "isBearishMaStack", "isGoldenCrossRecent", "isDeathCrossRecent",
  "isBbSqueeze", "minAtr14", "maxAtr14", "minVolumeRatio", "minAdx",
  "maxDistFrom52wHighPct", "maxDistFrom52wLowPct",
  "sort", "sortDir", "limit", "offset",
]);

describe("SCREENER_PRESETS integrity", () => {
  it("punya id unik", () => {
    const ids = SCREENER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("setiap preset hanya memakai filter keys yang valid", () => {
    for (const preset of SCREENER_PRESETS) {
      for (const key of Object.keys(preset.filters)) {
        expect(
          VALID_FILTER_KEYS.has(key as keyof ScreenerFilters),
          `preset "${preset.id}" memakai filter key tak dikenal: ${key}`,
        ).toBe(true);
      }
    }
  });

  it("setiap preset punya name, description, dan philosophy non-kosong", () => {
    for (const preset of SCREENER_PRESETS) {
      expect(preset.name.trim().length).toBeGreaterThan(0);
      expect(preset.description.trim().length).toBeGreaterThan(0);
      expect(preset.philosophy.trim().length).toBeGreaterThan(0);
    }
  });

  it("getPreset mengembalikan preset yang benar / undefined", () => {
    expect(getPreset("swing-santai")?.id).toBe("swing-santai");
    expect(getPreset("does-not-exist")).toBeUndefined();
  });
});

describe('preset "swing-santai" (Mode Swing Santai) — spec compliance', () => {
  const p = getPreset("swing-santai");

  it("ada di library", () => {
    expect(p).toBeDefined();
  });

  it("filter sesuai spec: Stoch oversold, RSI recovering, > SMA50, MACD up, volume, ROE", () => {
    const f = p!.filters;
    // Stochastic 10,5,5 oversold + turning up (reversal proxy %K>%D)
    expect(f.maxStochK_10_5_5).toBeLessThanOrEqual(35);
    expect(f.stochBullishCross_10_5_5).toBe(true);
    // RSI 14 recovering from oversold (30-55 band)
    expect(f.minRsi14).toBe(30);
    expect(f.maxRsi14).toBeLessThanOrEqual(55);
    // Medium-term uptrend intact
    expect(f.isAboveSma50).toBe(true);
    // MACD histogram turning positive
    expect(f.macdHistogramTurningUp).toBe(true);
    // Volume confirmation
    expect(f.minVolumeRatio).toBeGreaterThanOrEqual(1.0);
    // Fundamental sanity check
    expect(f.minRoe).toBeGreaterThanOrEqual(0.08);
  });

  it("sort by Stochastic %K ascending (most oversold first)", () => {
    expect(p!.filters.sort).toBe("stoch_k");
    expect(p!.filters.sortDir).toBe("asc");
  });
});

describe("runScreener filtersApplied counting", () => {
  it("base (no filters) → 0 filter applied", async () => {
    state.countResult = [{ total: 5 }];
    const res = await runScreener({});
    expect(res.filtersApplied).toBe(0);
    expect(res.total).toBe(5);
  });

  it("menghitung fundamental + technical filters", async () => {
    const res = await runScreener({
      maxPe: 15, // 1
      minRoe: 0.1, // 1
      maxStochK_10_5_5: 35, // 1
      stochBullishCross_10_5_5: true, // 1
      minRsi14: 30, // 1
      maxRsi14: 55, // 1
      isAboveSma50: true, // 1
      macdHistogramTurningUp: true, // 1
      minVolumeRatio: 1.0, // 1
      minAtr14: 5, // 1
    });
    expect(res.filtersApplied).toBe(10);
  });

  it("flag false TIDAK menambah filter (hanya truthy)", async () => {
    const res = await runScreener({
      isAboveSma50: false,
      stochBullishCross_10_5_5: false,
      macdHistogramTurningUp: false,
    });
    expect(res.filtersApplied).toBe(0);
  });

  it("memetakan rows dengan changePct1d dari last/prev close", async () => {
    state.rowsResult = [
      {
        kode: "BBRI",
        namaPerusahaan: "Bank BRI",
        logoUrl: null,
        sectorKode: "G",
        sectorName: "Financials",
        papanKode: "UTAMA",
        isSyariah: false,
        lastClose: "110",
        prevClose: "100",
        marketCapIdr: "1000",
        peRatio: "10",
        pbvRatio: "2",
        roe: "0.2",
        debtToEquity: "1",
        dividendYield: "0.05",
        profitMargin: "0.3",
        revenueGrowthYoy: "0.1",
        avgVolume3Mo: "1000",
        fiftyTwoWeekHigh: "120",
        fiftyTwoWeekLow: "80",
        stochK_10_5_5: "18",
        rsi14: "40",
        isBullishMaStack: true,
        isBbSqueeze: false,
      },
    ];
    const res = await runScreener({ limit: 10 });
    expect(res.rows).toHaveLength(1);
    const row = res.rows[0]!;
    expect(row.kode).toBe("BBRI");
    expect(row.changePct1d).toBeCloseTo(10, 5);
    expect(row.stochK_10_5_5).toBe(18);
    expect(row.isBullishMaStack).toBe(true);
  });
});

describe("runScreener sort handling", () => {
  it("menerima sort stoch_k & rsi tanpa error", async () => {
    await expect(runScreener({ sort: "stoch_k", sortDir: "asc" })).resolves.toBeDefined();
    await expect(runScreener({ sort: "rsi", sortDir: "desc" })).resolves.toBeDefined();
  });

  it("sortDir invalid → tidak melempar (dinormalisasi ke desc)", async () => {
    await expect(
      runScreener({ sort: "market_cap", sortDir: "DROP TABLE" as unknown as "asc" }),
    ).resolves.toBeDefined();
  });
});
