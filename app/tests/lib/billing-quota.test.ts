import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk quota enforcement (lib/billing/quota.ts).
 *
 * High-stake: ini yang membatasi penggunaan berbayar (AI queries/hari, picks
 * unlock, backtest runs). Salah hitung = user dapat lebih dari yang dibayar,
 * atau diblok padahal masih punya kuota.
 *
 * Yang diuji:
 *   - getDailyWindowKey / getMonthlyWindowKey (pure, format YYYY-MM-DD / YYYY-MM,
 *     timezone WIB).
 *   - resolveLimit via consumeQuota / getRemainingQuota:
 *       * limit numerik dari entitlement (ai.queries_per_day)
 *       * unlimited (sentinel 999_999) -> tidak pernah throw
 *       * counter tanpa mapping (alerts.created) -> unlimited
 *       * boolean entitlement true -> unlimited, false -> deny (limit 0)
 *       * limitOverride
 *   - consumeQuota: kuota tersisa (used < limit) vs kuota habis (>limit ->
 *     QuotaExceededError), remaining math.
 *   - getRemainingQuota: baca counter Redis tanpa increment.
 *
 * Strategi mock:
 *   - `@/lib/billing/redis.getRedis` -> fake Redis in-memory dengan implementasi
 *     Lua INCR_AND_CHECK yang setara source (INCRBY + limit check + DECR).
 *   - `@/lib/db` -> stub: select() untuk getUserTier (limit) & getAllEntitlements
 *     (where), insert() no-op untuk best-effort persist.
 */

// ---------------------------------------------------------------------------
// Fake Redis. Hanya method yang dipakai quota.ts: eval, get, del, keys, mget.
// eval mengeksekusi semantik Lua INCR_AND_CHECK: INCRBY + (limit>=0 && cur>limit
// ? DECRBY & exceeded) untuk paritas dengan source.
// ---------------------------------------------------------------------------
const redisStore = new Map<string, number>();

const fakeRedis = {
  async eval(_script: string, _numKeys: number, ...args: string[]) {
    const [key, amountStr, limitStr] = args;
    const amount = Number(amountStr);
    const limit = Number(limitStr);
    const current = (redisStore.get(key!) ?? 0) + amount;
    redisStore.set(key!, current);
    if (limit >= 0 && current > limit) {
      redisStore.set(key!, current - amount);
      return [current - amount, 1];
    }
    return [current, 0];
  },
  async get(key: string) {
    const v = redisStore.get(key);
    return v === undefined ? null : String(v);
  },
  async del(key: string) {
    redisStore.delete(key);
  },
  async keys() {
    return [];
  },
  async mget() {
    return [];
  },
};

vi.mock("@/lib/billing/redis", () => ({
  getRedis: () => fakeRedis,
}));

// ---------------------------------------------------------------------------
// Fake DB. Entitlements driven via __setEntitlements. Tier select returns free.
// insert() returns a chainable no-op (values -> onConflictDoUpdate).
// ---------------------------------------------------------------------------
interface EntRow {
  key: string;
  value: unknown;
}

vi.mock("@/lib/db", () => {
  const state = { entRows: [] as EntRow[], tierKode: "free" };
  const buildSelect = () => ({
    from: () => {
      const whereResult = {
        then: (resolve: (rows: EntRow[]) => unknown) => resolve([...state.entRows]),
        limit: async () => [{ tierKode: state.tierKode, status: "active" }],
      };
      return { where: () => whereResult };
    },
  });
  const insertChain = {
    values: () => ({ onConflictDoUpdate: async () => undefined }),
  };
  return {
    db: {
      select: () => buildSelect(),
      insert: () => insertChain,
      delete: () => ({ where: async () => undefined }),
      __setEntitlements: (rows: EntRow[]) => {
        state.entRows = rows;
      },
      __setTier: (kode: string) => {
        state.tierKode = kode;
      },
    },
  };
});

type FakeDb = {
  __setEntitlements: (rows: EntRow[]) => void;
  __setTier: (kode: string) => void;
};

async function getFakeDb(): Promise<FakeDb> {
  const mod = (await import("@/lib/db")) as unknown as { db: FakeDb };
  return mod.db;
}

function entRows(map: Record<string, unknown>): EntRow[] {
  return Object.entries(map).map(([key, value]) => ({ key, value }));
}

let uid = 0;
function freshUser(): string {
  return `quser-${++uid}-${Math.random().toString(36).slice(2)}`;
}

beforeEach(async () => {
  redisStore.clear();
  const db = await getFakeDb();
  db.__setEntitlements([]);
  db.__setTier("free");
  const { invalidateAllEntitlementsCache } = await import(
    "@/lib/billing/entitlements"
  );
  invalidateAllEntitlementsCache();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// Window key helpers (pure)
// ===========================================================================
describe("window key helpers", () => {
  it("getDailyWindowKey formats as YYYY-MM-DD", async () => {
    const { getDailyWindowKey } = await import("@/lib/billing/quota");
    // 2026-05-29T18:00:00Z -> WIB (+7) is 2026-05-30 01:00
    const key = getDailyWindowKey(new Date("2026-05-29T18:00:00Z"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(key).toBe("2026-05-30");
  });

  it("getDailyWindowKey respects the Asia/Jakarta timezone boundary", async () => {
    const { getDailyWindowKey } = await import("@/lib/billing/quota");
    // 2026-05-29T10:00:00Z -> WIB 17:00 same day
    expect(getDailyWindowKey(new Date("2026-05-29T10:00:00Z"))).toBe("2026-05-29");
  });

  it("getMonthlyWindowKey formats as YYYY-MM", async () => {
    const { getMonthlyWindowKey } = await import("@/lib/billing/quota");
    const key = getMonthlyWindowKey(new Date("2026-05-15T05:00:00Z"));
    expect(key).toMatch(/^\d{4}-\d{2}$/);
    expect(key).toBe("2026-05");
  });
});

// ===========================================================================
// consumeQuota — bounded limit from entitlement
// ===========================================================================
describe("consumeQuota with a bounded limit", () => {
  async function seedAiLimit(n: number) {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "ai.queries_per_day": n }));
  }

  it("increments and reports remaining while under the limit", async () => {
    await seedAiLimit(3);
    const { consumeQuota } = await import("@/lib/billing/quota");
    const u = freshUser();

    const r1 = await consumeQuota(u, "ai.queries");
    expect(r1.used).toBe(1);
    expect(r1.limit).toBe(3);
    expect(r1.remaining).toBe(2);
    expect(r1.unlimited).toBe(false);

    const r2 = await consumeQuota(u, "ai.queries");
    expect(r2.used).toBe(2);
    expect(r2.remaining).toBe(1);
  });

  it("allows consumption up to and including the limit", async () => {
    await seedAiLimit(3);
    const { consumeQuota } = await import("@/lib/billing/quota");
    const u = freshUser();
    await consumeQuota(u, "ai.queries");
    await consumeQuota(u, "ai.queries");
    const r3 = await consumeQuota(u, "ai.queries");
    expect(r3.used).toBe(3);
    expect(r3.remaining).toBe(0);
  });

  it("throws QuotaExceededError once the limit is exhausted", async () => {
    await seedAiLimit(3);
    const { consumeQuota } = await import("@/lib/billing/quota");
    const { QuotaExceededError } = await import("@/lib/errors");
    const u = freshUser();
    await consumeQuota(u, "ai.queries");
    await consumeQuota(u, "ai.queries");
    await consumeQuota(u, "ai.queries");
    await expect(consumeQuota(u, "ai.queries")).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
  });

  it("does not increment past the limit when rejected (counter held at cap)", async () => {
    await seedAiLimit(2);
    const { consumeQuota, getRemainingQuota } = await import("@/lib/billing/quota");
    const u = freshUser();
    await consumeQuota(u, "ai.queries");
    await consumeQuota(u, "ai.queries");
    await expect(consumeQuota(u, "ai.queries")).rejects.toThrow();
    // counter must still be 2 (the rejected attempt was decremented back)
    const remaining = await getRemainingQuota(u, "ai.queries");
    expect(remaining.used).toBe(2);
    expect(remaining.remaining).toBe(0);
  });

  it("rejects a batch amount that would overshoot the limit (atomic, no partial)", async () => {
    await seedAiLimit(5);
    const { consumeQuota, getRemainingQuota } = await import("@/lib/billing/quota");
    const u = freshUser();
    await consumeQuota(u, "ai.queries", { amount: 3 });
    // requesting 3 more would make 6 > 5 -> reject, leave at 3
    await expect(consumeQuota(u, "ai.queries", { amount: 3 })).rejects.toThrow();
    const remaining = await getRemainingQuota(u, "ai.queries");
    expect(remaining.used).toBe(3);
  });

  it("denies immediately when entitlement resolves to 0 (limit reached at first call)", async () => {
    await seedAiLimit(0);
    const { consumeQuota } = await import("@/lib/billing/quota");
    const { QuotaExceededError } = await import("@/lib/errors");
    await expect(consumeQuota(freshUser(), "ai.queries")).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
  });

  it("honours limitOverride, bypassing the entitlement value", async () => {
    await seedAiLimit(3);
    const { consumeQuota } = await import("@/lib/billing/quota");
    const u = freshUser();
    const r = await consumeQuota(u, "ai.queries", { limitOverride: 1 });
    expect(r.limit).toBe(1);
    expect(r.remaining).toBe(0);
    await expect(
      consumeQuota(u, "ai.queries", { limitOverride: 1 }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// consumeQuota — unlimited paths
// ===========================================================================
describe("consumeQuota with unlimited entitlements", () => {
  it("treats the 999_999 sentinel as unlimited and never throws", async () => {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "ai.queries_per_day": 999_999 }));
    const { consumeQuota } = await import("@/lib/billing/quota");
    const u = freshUser();
    const r = await consumeQuota(u, "ai.queries", { amount: 5000 });
    expect(r.unlimited).toBe(true);
    expect(r.limit).toBe(Number.MAX_SAFE_INTEGER);
    expect(r.remaining).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("treats a counter with no entitlement mapping as unlimited (alerts.created)", async () => {
    const { consumeQuota } = await import("@/lib/billing/quota");
    const r = await consumeQuota(freshUser(), "alerts.created");
    expect(r.unlimited).toBe(true);
  });

  it("treats a boolean=true entitlement as unlimited (backtest feature on)", async () => {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "feature.backtest_max_strategies": true }));
    const { consumeQuota } = await import("@/lib/billing/quota");
    const r = await consumeQuota(freshUser(), "backtest.runs", { amount: 100 });
    expect(r.unlimited).toBe(true);
  });

  it("treats a boolean=false entitlement as a hard deny (limit 0)", async () => {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "feature.backtest_max_strategies": false }));
    const { consumeQuota } = await import("@/lib/billing/quota");
    const { QuotaExceededError } = await import("@/lib/errors");
    await expect(
      consumeQuota(freshUser(), "backtest.runs"),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });
});

// ===========================================================================
// getRemainingQuota — read without increment
// ===========================================================================
describe("getRemainingQuota", () => {
  it("reports full quota remaining when nothing has been consumed", async () => {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "ai.queries_per_day": 10 }));
    const { getRemainingQuota } = await import("@/lib/billing/quota");
    const r = await getRemainingQuota(freshUser(), "ai.queries");
    expect(r.used).toBe(0);
    expect(r.limit).toBe(10);
    expect(r.remaining).toBe(10);
  });

  it("reflects prior consumption without incrementing further", async () => {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "ai.queries_per_day": 10 }));
    const { consumeQuota, getRemainingQuota } = await import("@/lib/billing/quota");
    const u = freshUser();
    await consumeQuota(u, "ai.queries", { amount: 4 });

    const r1 = await getRemainingQuota(u, "ai.queries");
    expect(r1.used).toBe(4);
    expect(r1.remaining).toBe(6);
    // calling again must NOT change the counter
    const r2 = await getRemainingQuota(u, "ai.queries");
    expect(r2.used).toBe(4);
  });

  it("clamps remaining at 0 and reports unlimited for sentinel limits", async () => {
    const db = await getFakeDb();
    db.__setEntitlements(entRows({ "ai.queries_per_day": 999_999 }));
    const { getRemainingQuota } = await import("@/lib/billing/quota");
    const r = await getRemainingQuota(freshUser(), "ai.queries");
    expect(r.unlimited).toBe(true);
    expect(r.remaining).toBe(Number.MAX_SAFE_INTEGER);
  });
});
