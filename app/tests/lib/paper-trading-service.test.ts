import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk paper-trading service (lib/paper-trading/service.ts).
 *
 * High-stake: ini engine eksekusi buy/sell virtual + valuasi portfolio. Salah
 * hitung fee/slippage/realized PnL = leaderboard & equity user salah.
 *
 * Yang diuji (executeBuy / executeSell / getPortfolioSummary):
 *   - Lot validation (kelipatan 100, positif).
 *   - Slippage 15bps: buy fill > last close, sell fill < last close.
 *   - Fee diterapkan ke cash (buy: totalCost = value + fee; sell: net = value - fee).
 *   - INSUFFICIENT_CASH / NO_POSITION / INSUFFICIENT_QTY / PRICE_UNAVAILABLE.
 *   - Realized PnL = (sellPrice - avgBuy) * qty - fee.
 *   - getPortfolioSummary mark-to-market (positionsValue, unrealized, return%).
 *
 * Strategi mock: stub `@/lib/db` dengan fake in-memory store yang mengimplementasi
 * chain drizzle yang dipakai service (select/from/where/limit/orderBy,
 * insert/values/returning, update/set/where). getLastClose dibaca dari store
 * quotesEod.
 */

// ---------------------------------------------------------------------------
// In-memory tables. Cukup untuk path yang diuji.
// ---------------------------------------------------------------------------
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  cashBalanceIdr: string;
  initialCapitalIdr: string;
  buyFeePct: string;
  sellFeePct: string;
  isDefault: string;
  createdAt: Date;
}
interface Position {
  id: string;
  portfolioId: string;
  companyKode: string;
  quantity: number;
  avgBuyPriceIdr: string;
  realizedPnlIdr: string;
  firstBoughtAt: Date | null;
  updatedAt?: Date;
}
interface Trade {
  id: string;
  portfolioId: string;
  companyKode: string;
  side: string;
  quantity: number;
  priceIdr: string;
  totalValueIdr: string;
  feeIdr: string;
  realizedPnlIdr: string | null;
  executedAt: Date;
  source: string;
  note: string | null | undefined;
}

const store = {
  portfolios: [] as Portfolio[],
  positions: [] as Position[],
  trades: [] as Trade[],
  // map kode -> last close
  quotes: new Map<string, number>(),
};

let idSeq = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idSeq}`;
}

// We discriminate the target "table" by identity of the object passed to from().
// The schema modules export objects; we mock them with sentinels.
const T = {
  portfolios: { __t: "portfolios" },
  positions: { __t: "positions" },
  trades: { __t: "trades" },
  quotes: { __t: "quotes" },
  companies: { __t: "companies" },
  leaderboard: { __t: "leaderboard" },
};

// Column markers carry their owning table + field, so the builder can filter.
vi.mock("@/db/schema/paper-trading", () => ({
  paperPortfolios: { ...T.portfolios, id: "portfolios.id", userId: "portfolios.userId", cashBalanceIdr: "portfolios.cash", isDefault: "portfolios.isDefault", createdAt: "portfolios.createdAt" },
  paperPositions: { ...T.positions, id: "positions.id", portfolioId: "positions.portfolioId", companyKode: "positions.companyKode", realizedPnlIdr: "positions.realizedPnlIdr", quantity: "positions.quantity", avgBuyPriceIdr: "positions.avgBuyPriceIdr", firstBoughtAt: "positions.firstBoughtAt" },
  paperTrades: { ...T.trades, portfolioId: "trades.portfolioId", executedAt: "trades.executedAt" },
  paperLeaderboardSnapshots: { ...T.leaderboard },
}));
vi.mock("@/db/schema/companies", () => ({ companies: { ...T.companies, kode: "companies.kode" } }));
vi.mock("@/db/schema/market", () => ({ quotesEod: { ...T.quotes, companyKode: "quotes.companyKode", tradeDate: "quotes.tradeDate", close: "quotes.close" } }));

// drizzle-orm helpers — return inert markers, the fake builder ignores them.
vi.mock("drizzle-orm", () => ({
  and: (...a: unknown[]) => ({ __and: a }),
  eq: (col: unknown, val: unknown) => ({ __eq: [col, val] }),
  desc: (c: unknown) => ({ __desc: c }),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...vals: unknown[]) => ({ __sql: [strings, vals] }),
    {},
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

// Fake db. Each method returns a builder whose terminal resolves to rows.
vi.mock("@/lib/db", () => {
  return {
    db: {
      select: (cols?: Record<string, unknown>) => makeSelectBuilderWithQuotes(cols),
      insert: (t: { __t: string }) => ({
        values: (vals: Record<string, unknown>) => {
          const tbl = t.__t;
          if (tbl === "portfolios") {
            const row: Portfolio = {
              id: nextId("pf"),
              userId: vals.userId as string,
              name: vals.name as string,
              description: (vals.description as string) ?? null,
              cashBalanceIdr: vals.cashBalanceIdr as string,
              initialCapitalIdr: vals.initialCapitalIdr as string,
              buyFeePct: "0.0015",
              sellFeePct: "0.0025",
              isDefault: (vals.isDefault as string) ?? "false",
              createdAt: new Date(),
            };
            store.portfolios.push(row);
            return { returning: async () => [{ id: row.id }] };
          }
          if (tbl === "trades") {
            const row: Trade = {
              id: nextId("tr"),
              portfolioId: vals.portfolioId as string,
              companyKode: vals.companyKode as string,
              side: vals.side as string,
              quantity: vals.quantity as number,
              priceIdr: vals.priceIdr as string,
              totalValueIdr: vals.totalValueIdr as string,
              feeIdr: vals.feeIdr as string,
              realizedPnlIdr: (vals.realizedPnlIdr as string) ?? null,
              executedAt: vals.executedAt as Date,
              source: (vals.source as string) ?? "manual",
              note: vals.note as string | null | undefined,
            };
            store.trades.push(row);
            return { returning: async () => [row] };
          }
          if (tbl === "positions") {
            const row: Position = {
              id: nextId("ps"),
              portfolioId: vals.portfolioId as string,
              companyKode: vals.companyKode as string,
              quantity: vals.quantity as number,
              avgBuyPriceIdr: vals.avgBuyPriceIdr as string,
              realizedPnlIdr: "0",
              firstBoughtAt: (vals.firstBoughtAt as Date) ?? null,
            };
            store.positions.push(row);
            // insert position is awaited directly (no returning)
            return Promise.resolve(undefined) as unknown as { returning: () => Promise<unknown[]> };
          }
          return { returning: async () => [], onConflictDoUpdate: async () => undefined };
        },
      }),
      update: (t: { __t: string }) => ({
        set: (vals: Record<string, unknown>) => ({
          where: async (cond: { __eq?: [unknown, unknown] }) => {
            applyUpdate(t.__t, vals, cond);
          },
        }),
      }),
      delete: () => ({ where: async () => undefined }),
    },
  };
});

// Marker ("table.field") -> store row field name. Used both to filter & project.
const MARKER_TO_FIELD: Record<string, string> = {
  "portfolios.id": "id",
  "portfolios.userId": "userId",
  "portfolios.cash": "cashBalanceIdr",
  "portfolios.isDefault": "isDefault",
  "portfolios.createdAt": "createdAt",
  "positions.id": "id",
  "positions.portfolioId": "portfolioId",
  "positions.companyKode": "companyKode",
  "positions.realizedPnlIdr": "realizedPnlIdr",
  "positions.quantity": "quantity",
  "positions.avgBuyPriceIdr": "avgBuyPriceIdr",
  "positions.firstBoughtAt": "firstBoughtAt",
  "trades.portfolioId": "portfolioId",
  "trades.executedAt": "executedAt",
  "quotes.close": "close",
};

// Specialized select builder that handles getLastClose against store.quotes.
function makeSelectBuilderWithQuotes(cols?: Record<string, unknown>) {
  let table = "";
  const b: Record<string, unknown> = {};
  // Collected equality filters keyed by "table.field" -> expected value.
  const filters: Record<string, unknown> = {};
  // Apply select() projection: alias -> marker. When present, each output row is
  // rebuilt as { alias: row[field] }. Joins (companies) yield null for unknown.
  function project(rows: Record<string, unknown>[]): unknown[] {
    if (!cols) return rows;
    return rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [alias, marker] of Object.entries(cols)) {
        const field = typeof marker === "string" ? MARKER_TO_FIELD[marker] : undefined;
        out[alias] = field !== undefined ? row[field] : null;
      }
      return out;
    });
  }
  b.from = (t: { __t: string }) => {
    table = t.__t;
    return b;
  };
  b.leftJoin = () => b;
  b.innerJoin = () => b;
  function collect(cond: unknown): void {
    if (!cond || typeof cond !== "object") return;
    const c = cond as { __eq?: [unknown, unknown]; __and?: unknown[] };
    if (c.__eq) {
      const [colMarker, val] = c.__eq;
      if (typeof colMarker === "string") filters[colMarker] = val;
    }
    if (c.__and) for (const sub of c.__and) collect(sub);
  }
  b.where = (cond: unknown) => {
    collect(cond);
    return b;
  };
  b.groupBy = () => b;
  b.as = () => b;
  b.orderBy = () => b;
  function rowMatches(prefix: string, row: Record<string, unknown>, map: Record<string, string>): boolean {
    for (const [marker, expected] of Object.entries(filters)) {
      if (!marker.startsWith(`${prefix}.`)) continue;
      const field = map[marker];
      if (field === undefined) continue;
      if (row[field] !== expected) return false;
    }
    return true;
  }
  function resolveRows(): unknown[] {
    if (table === "portfolios") {
      const map: Record<string, string> = { "portfolios.id": "id", "portfolios.userId": "userId" };
      return project(
        store.portfolios.filter((r) => rowMatches("portfolios", r as unknown as Record<string, unknown>, map)) as unknown as Record<string, unknown>[],
      );
    }
    if (table === "positions") {
      const map: Record<string, string> = {
        "positions.id": "id",
        "positions.portfolioId": "portfolioId",
        "positions.companyKode": "companyKode",
      };
      return project(
        store.positions.filter((r) => rowMatches("positions", r as unknown as Record<string, unknown>, map)) as unknown as Record<string, unknown>[],
      );
    }
    if (table === "trades") {
      const map: Record<string, string> = { "trades.portfolioId": "portfolioId" };
      return project(
        store.trades.filter((r) => rowMatches("trades", r as unknown as Record<string, unknown>, map)) as unknown as Record<string, unknown>[],
      );
    }
    if (table === "quotes") {
      const kode = filters["quotes.companyKode"] as string | undefined;
      const close = kode != null ? store.quotes.get(kode) : undefined;
      return close == null ? [] : [{ close: String(close) }];
    }
    return [];
  }
  b.limit = async () => resolveRows();
  b.then = (res: (v: unknown[]) => unknown) => res(resolveRows());
  return b;
}

function applyUpdate(
  table: string,
  vals: Record<string, unknown>,
  cond: { __eq?: [unknown, unknown]; __and?: unknown[] },
): void {
  // Extract id/portfolioId from the eq() marker.
  const eqVal = cond?.__eq?.[1];
  if (table === "positions") {
    const pos = store.positions.find((p) => p.id === eqVal);
    if (!pos) return;
    if (typeof vals.quantity === "number") pos.quantity = vals.quantity;
    if (typeof vals.avgBuyPriceIdr === "string") pos.avgBuyPriceIdr = vals.avgBuyPriceIdr;
    if (vals.realizedPnlIdr && (vals.realizedPnlIdr as { __sql?: unknown }).__sql) {
      // sql`${col} + X` — interpolation vals = [colMarker, X]. Pick numeric.
      const [, sqlVals] = (vals.realizedPnlIdr as { __sql: [unknown, unknown[]] }).__sql;
      const delta = Number(sqlVals.find((v) => typeof v === "number"));
      pos.realizedPnlIdr = String(Number(pos.realizedPnlIdr) + delta);
    }
    return;
  }
  if (table === "portfolios") {
    const pf = store.portfolios.find((p) => p.id === eqVal);
    if (!pf) return;
    if (vals.cashBalanceIdr && (vals.cashBalanceIdr as { __sql?: unknown }).__sql) {
      const [strings, sqlVals] = (vals.cashBalanceIdr as { __sql: [TemplateStringsArray, unknown[]] }).__sql;
      const delta = Number(sqlVals.find((v) => typeof v === "number"));
      // determine sign from sql template string (contains '-' for buy, '+' for sell)
      const joined = Array.from(strings).join("");
      const sign = joined.includes("-") ? -1 : 1;
      pf.cashBalanceIdr = String(Number(pf.cashBalanceIdr) + sign * delta);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers to seed the store.
// ---------------------------------------------------------------------------
function seedPortfolio(over: Partial<Portfolio> = {}): Portfolio {
  const pf: Portfolio = {
    id: nextId("pf"),
    userId: "u1",
    name: "Portfolio Utama",
    description: null,
    cashBalanceIdr: "100000000",
    initialCapitalIdr: "100000000",
    buyFeePct: "0.0015",
    sellFeePct: "0.0025",
    isDefault: "true",
    createdAt: new Date(),
    ...over,
  };
  store.portfolios.push(pf);
  return pf;
}

beforeEach(() => {
  store.portfolios = [];
  store.positions = [];
  store.trades = [];
  store.quotes = new Map();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// applySlippage (via fill price) — buy up, sell down by 15bps
// ===========================================================================
describe("slippage 15bps", () => {
  it("buy fill price is last close rounded up by 15bps", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    const { executeBuy } = await import("@/lib/paper-trading/service");
    const { trade } = await executeBuy({
      portfolioId: pf.id,
      userId: "u1",
      kode: "BBRI",
      quantity: 100,
    });
    // 1000 * (1 + 15/10000) = 1001.5 -> round 1002
    expect(trade.priceIdr).toBe(1002);
  });

  it("sell fill price is last close rounded down by 15bps", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    store.positions.push({
      id: nextId("ps"),
      portfolioId: pf.id,
      companyKode: "BBRI",
      quantity: 200,
      avgBuyPriceIdr: "900",
      realizedPnlIdr: "0",
      firstBoughtAt: new Date(),
    });
    const { executeSell } = await import("@/lib/paper-trading/service");
    const { trade } = await executeSell({
      portfolioId: pf.id,
      userId: "u1",
      kode: "BBRI",
      quantity: 100,
    });
    // 1000 * (1 - 15/10000) = 998.5 -> round 999 (Math.round rounds .5 up)
    expect(trade.priceIdr).toBe(999);
  });

  it("overridePrice bypasses slippage", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    const { executeBuy } = await import("@/lib/paper-trading/service");
    const { trade } = await executeBuy({
      portfolioId: pf.id,
      userId: "u1",
      kode: "BBRI",
      quantity: 100,
      overridePrice: 1500,
    });
    expect(trade.priceIdr).toBe(1500);
  });
});

// ===========================================================================
// executeBuy
// ===========================================================================
describe("executeBuy", () => {
  it("rejects non-lot-of-100 quantity", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    const { executeBuy, PaperTradingError } = await import("@/lib/paper-trading/service");
    await expect(
      executeBuy({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 150 }),
    ).rejects.toBeInstanceOf(PaperTradingError);
  });

  it("rejects zero / negative quantity", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    const { executeBuy } = await import("@/lib/paper-trading/service");
    await expect(
      executeBuy({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 0 }),
    ).rejects.toThrow();
  });

  it("throws PRICE_UNAVAILABLE when no quote exists", async () => {
    const pf = seedPortfolio();
    const { executeBuy } = await import("@/lib/paper-trading/service");
    await expect(
      executeBuy({ portfolioId: pf.id, userId: "u1", kode: "ZZZZ", quantity: 100 }),
    ).rejects.toMatchObject({ code: "PRICE_UNAVAILABLE" });
  });

  it("throws NOT_FOUND when portfolio missing", async () => {
    store.quotes.set("BBRI", 1000);
    const { executeBuy } = await import("@/lib/paper-trading/service");
    await expect(
      executeBuy({ portfolioId: "nope", userId: "u1", kode: "BBRI", quantity: 100 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("applies fee and deducts cash = value + fee", async () => {
    const pf = seedPortfolio({ cashBalanceIdr: "100000000" });
    store.quotes.set("BBRI", 1000);
    const { executeBuy } = await import("@/lib/paper-trading/service");
    const { trade, portfolio } = await executeBuy({
      portfolioId: pf.id,
      userId: "u1",
      kode: "BBRI",
      quantity: 100,
      overridePrice: 1000,
    });
    const value = 1000 * 100; // 100000
    const fee = value * 0.0015; // 150
    expect(trade.totalValueIdr).toBe(value);
    expect(trade.feeIdr).toBeCloseTo(fee, 5);
    expect(portfolio.cashBalanceIdr).toBeCloseTo(100000000 - value - fee, 2);
  });

  it("throws INSUFFICIENT_CASH when totalCost exceeds cash", async () => {
    const pf = seedPortfolio({ cashBalanceIdr: "50000" });
    store.quotes.set("BBRI", 1000);
    const { executeBuy } = await import("@/lib/paper-trading/service");
    await expect(
      executeBuy({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 100, overridePrice: 1000 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CASH" });
  });

  it("recomputes weighted avg buy price when adding to a position", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    store.positions.push({
      id: nextId("ps"),
      portfolioId: pf.id,
      companyKode: "BBRI",
      quantity: 100,
      avgBuyPriceIdr: "800",
      realizedPnlIdr: "0",
      firstBoughtAt: new Date(),
    });
    const { executeBuy } = await import("@/lib/paper-trading/service");
    await executeBuy({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 100, overridePrice: 1200 });
    const pos = store.positions.find((p) => p.companyKode === "BBRI")!;
    expect(pos.quantity).toBe(200);
    // (100*800 + 100*1200)/200 = 1000
    expect(Number(pos.avgBuyPriceIdr)).toBeCloseTo(1000, 5);
  });
});

// ===========================================================================
// executeSell
// ===========================================================================
describe("executeSell", () => {
  function seedWithPosition(qty: number, avg: number, lastClose: number) {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", lastClose);
    store.positions.push({
      id: nextId("ps"),
      portfolioId: pf.id,
      companyKode: "BBRI",
      quantity: qty,
      avgBuyPriceIdr: String(avg),
      realizedPnlIdr: "0",
      firstBoughtAt: new Date(),
    });
    return pf;
  }

  it("throws NO_POSITION when no holding exists", async () => {
    const pf = seedPortfolio();
    store.quotes.set("BBRI", 1000);
    const { executeSell } = await import("@/lib/paper-trading/service");
    await expect(
      executeSell({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 100 }),
    ).rejects.toMatchObject({ code: "NO_POSITION" });
  });

  it("throws INSUFFICIENT_QTY when selling more than held", async () => {
    const pf = seedWithPosition(100, 900, 1000);
    const { executeSell } = await import("@/lib/paper-trading/service");
    await expect(
      executeSell({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 200 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_QTY" });
  });

  it("computes realized PnL = (sell - avg)*qty - fee and credits net proceeds", async () => {
    const pf = seedWithPosition(200, 900, 1000);
    const { executeSell } = await import("@/lib/paper-trading/service");
    const { trade, portfolio } = await executeSell({
      portfolioId: pf.id,
      userId: "u1",
      kode: "BBRI",
      quantity: 100,
      overridePrice: 1000,
    });
    const value = 1000 * 100; // 100000
    const fee = value * 0.0025; // 250
    const realized = (1000 - 900) * 100 - fee; // 10000 - 250 = 9750
    expect(trade.realizedPnlIdr).toBeCloseTo(realized, 2);
    // cash starts 100,000,000 + net proceeds (value - fee)
    expect(portfolio.cashBalanceIdr).toBeCloseTo(100000000 + value - fee, 2);
    // position decremented
    const pos = store.positions.find((p) => p.companyKode === "BBRI")!;
    expect(pos.quantity).toBe(100);
    expect(Number(pos.realizedPnlIdr)).toBeCloseTo(realized, 2);
  });

  it("zeroes quantity when fully sold", async () => {
    const pf = seedWithPosition(100, 900, 1000);
    const { executeSell } = await import("@/lib/paper-trading/service");
    await executeSell({ portfolioId: pf.id, userId: "u1", kode: "BBRI", quantity: 100, overridePrice: 1000 });
    const pos = store.positions.find((p) => p.companyKode === "BBRI")!;
    expect(pos.quantity).toBe(0);
  });
});

// ===========================================================================
// getPortfolioSummary — mark to market
// ===========================================================================
describe("getPortfolioSummary mark-to-market", () => {
  it("computes positionsValue, unrealized PnL and return% from last close", async () => {
    const pf = seedPortfolio({ cashBalanceIdr: "50000000", initialCapitalIdr: "100000000" });
    store.quotes.set("BBRI", 1100);
    store.positions.push({
      id: nextId("ps"),
      portfolioId: pf.id,
      companyKode: "BBRI",
      quantity: 1000,
      avgBuyPriceIdr: "1000",
      realizedPnlIdr: "5000",
      firstBoughtAt: new Date(),
    });
    const { getPortfolioSummary } = await import("@/lib/paper-trading/service");
    const s = (await getPortfolioSummary(pf.id, "u1"))!;
    expect(s.positionsValueIdr).toBe(1100 * 1000); // 1,100,000
    expect(s.unrealizedPnlIdr).toBeCloseTo((1100 - 1000) * 1000, 2); // 100,000
    expect(s.realizedPnlIdr).toBeCloseTo(5000, 2);
    const total = 50000000 + 1100000;
    expect(s.totalValueIdr).toBe(total);
    expect(s.totalReturnPct).toBeCloseTo(((total - 100000000) / 100000000) * 100, 5);
    expect(s.positionCount).toBe(1);
  });

  it("returns null for a portfolio not owned by the user", async () => {
    const pf = seedPortfolio({ userId: "owner" });
    const { getPortfolioSummary } = await import("@/lib/paper-trading/service");
    expect(await getPortfolioSummary(pf.id, "someone-else")).toBeNull();
  });

  it("excludes zero-qty positions from positionCount but counts their realized PnL", async () => {
    const pf = seedPortfolio();
    store.positions.push({
      id: nextId("ps"),
      portfolioId: pf.id,
      companyKode: "BBRI",
      quantity: 0,
      avgBuyPriceIdr: "1000",
      realizedPnlIdr: "12345",
      firstBoughtAt: new Date(),
    });
    const { getPortfolioSummary } = await import("@/lib/paper-trading/service");
    const s = (await getPortfolioSummary(pf.id, "u1"))!;
    expect(s.positionCount).toBe(0);
    expect(s.positionsValueIdr).toBe(0);
    expect(s.realizedPnlIdr).toBeCloseTo(12345, 2);
  });
});
