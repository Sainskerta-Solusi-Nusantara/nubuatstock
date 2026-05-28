import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk resolusi tier & entitlement (lib/billing/entitlements.ts).
 *
 * High-stake: ini yang menentukan FITUR & AKSES per paket berbayar. Salah
 * mapping = user dapat fitur yang tidak dibayar, atau kebalikannya.
 *
 * Yang diuji (fungsi yang murni / bisa di-mock tanpa Redis):
 *   - isUnlimited (pure, sentinel 999_999)
 *   - getUserTier: active/trialing -> tier dari DB, fallback "free" kalau tak ada
 *     subscription, dan caching + invalidasi.
 *   - getAllEntitlements / getEntitlement: mapping tier -> entitlement value
 *     (Free/Starter/Pro/Elite), key tak dikenal -> null.
 *   - requireTier: perbandingan rank (TIER_RANK), downgrade, tier tak dikenal.
 *   - requireEntitlement: granted, missing -> ForbiddenError, boolean false ->
 *     ForbiddenError, predicate (limit enforcement).
 *
 * Strategi mock: stub `@/lib/db` dengan fake query builder yang dikontrol
 * per-test lewat helper __setTier / __setEntitlements (mirror pola
 * tests/lib/config.test.ts). Tidak butuh Redis di file ini.
 */

// ---------------------------------------------------------------------------
// Fake DB. getUserTier query: select(...).from(userSubscriptions).where(...).limit(1)
// getAllEntitlements query: select(...).from(tierEntitlements).where(...)  (no limit)
// Kita bedakan dua query lewat ada/tidaknya `.limit()`.
// ---------------------------------------------------------------------------

interface TierRow {
  tierKode: string;
  status: string;
}
interface EntRow {
  key: string;
  value: unknown;
}

vi.mock("@/lib/db", () => {
  // state per "tabel" yang dikembalikan query
  const state = {
    tierRows: [] as TierRow[],
    entRows: [] as EntRow[],
  };

  const buildSelect = () => {
    // Branch ditentukan saat .from() dipanggil.
    return {
      from: (_table: unknown) => {
        // Heuristik: query subscription pakai .limit(1) di akhir; query
        // entitlement langsung resolve di .where(). Kita kembalikan objek
        // yang mendukung kedua bentuk.
        const whereResult = {
          // entitlement path: await langsung setelah .where()
          then: (resolve: (rows: EntRow[]) => unknown) =>
            resolve([...state.entRows]),
          // subscription path: .limit(1) lalu await
          limit: async (_n: number) => [...state.tierRows],
        };
        return {
          where: (_cond: unknown) => whereResult,
        };
      },
    };
  };

  return {
    db: {
      select: () => buildSelect(),
      __setTier: (rows: TierRow[]) => {
        state.tierRows = rows;
      },
      __setEntitlements: (rows: EntRow[]) => {
        state.entRows = rows;
      },
    },
  };
});

type FakeDb = {
  __setTier: (rows: TierRow[]) => void;
  __setEntitlements: (rows: EntRow[]) => void;
};

async function getFakeDb(): Promise<FakeDb> {
  const mod = (await import("@/lib/db")) as unknown as { db: FakeDb };
  return mod.db;
}

// Map convenience untuk seed entitlement dari Record.
function entRowsFromMap(map: Record<string, unknown>): EntRow[] {
  return Object.entries(map).map(([key, value]) => ({ key, value }));
}

// Entitlement seed per tier (mirror seed produksi yang realistis).
const TIER_ENTITLEMENTS: Record<string, Record<string, unknown>> = {
  free: {
    "ai.queries_per_day": 3,
    "watchlist.max_items": 10,
    "alerts.max_active": 3,
    "feature.bandarmology_full": false,
    "feature.ai_deep_mode": false,
    "feature.api_access": false,
  },
  starter: {
    "ai.queries_per_day": 20,
    "watchlist.max_items": 50,
    "alerts.max_active": 20,
    "feature.bandarmology_full": false,
    "feature.ai_deep_mode": false,
    "feature.api_access": false,
  },
  pro: {
    "ai.queries_per_day": 100,
    "watchlist.max_items": 200,
    "alerts.max_active": 100,
    "feature.bandarmology_full": true,
    "feature.ai_deep_mode": true,
    "feature.api_access": false,
  },
  elite: {
    "ai.queries_per_day": 999_999,
    "watchlist.max_items": 999_999,
    "alerts.max_active": 999_999,
    "feature.bandarmology_full": true,
    "feature.ai_deep_mode": true,
    "feature.api_access": true,
  },
};

let uid = 0;
function freshUser(): string {
  // user id unik per test supaya cache (60s TTL) tidak bocor antar test.
  return `user-${++uid}-${Math.random().toString(36).slice(2)}`;
}

beforeEach(async () => {
  const db = await getFakeDb();
  db.__setTier([]);
  db.__setEntitlements([]);
  const { invalidateAllEntitlementsCache } = await import("@/lib/billing/entitlements");
  invalidateAllEntitlementsCache();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// isUnlimited (pure)
// ===========================================================================
describe("isUnlimited", () => {
  it("treats the 999_999 sentinel (and above) as unlimited", async () => {
    const { isUnlimited } = await import("@/lib/billing/entitlements");
    expect(isUnlimited(999_999)).toBe(true);
    expect(isUnlimited(1_000_000)).toBe(true);
  });

  it("treats finite limits below the sentinel as bounded", async () => {
    const { isUnlimited } = await import("@/lib/billing/entitlements");
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(3)).toBe(false);
    expect(isUnlimited(999_998)).toBe(false);
  });
});

// ===========================================================================
// getUserTier
// ===========================================================================
describe("getUserTier", () => {
  it("returns the tier kode for an active subscription", async () => {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: "pro", status: "active" }]);
    const { getUserTier } = await import("@/lib/billing/entitlements");
    await expect(getUserTier(freshUser())).resolves.toBe("pro");
  });

  it("returns the tier kode for a trialing subscription", async () => {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: "elite", status: "trialing" }]);
    const { getUserTier } = await import("@/lib/billing/entitlements");
    await expect(getUserTier(freshUser())).resolves.toBe("elite");
  });

  it("falls back to free when the user has no subscription row", async () => {
    const db = await getFakeDb();
    db.__setTier([]);
    const { getUserTier } = await import("@/lib/billing/entitlements");
    await expect(getUserTier(freshUser())).resolves.toBe("free");
  });

  it("caches the resolved tier within TTL (second call hits cache)", async () => {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: "starter", status: "active" }]);
    const { getUserTier } = await import("@/lib/billing/entitlements");
    const u = freshUser();
    await expect(getUserTier(u)).resolves.toBe("starter");

    // Ubah DB ke pro — tanpa invalidasi cache, hasil tetap starter.
    db.__setTier([{ tierKode: "pro", status: "active" }]);
    await expect(getUserTier(u)).resolves.toBe("starter");
  });

  it("re-reads after invalidateUserCache (simulating an upgrade)", async () => {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: "free", status: "active" }]);
    const { getUserTier, invalidateUserCache } = await import(
      "@/lib/billing/entitlements"
    );
    const u = freshUser();
    await expect(getUserTier(u)).resolves.toBe("free");

    db.__setTier([{ tierKode: "pro", status: "active" }]);
    invalidateUserCache(u);
    await expect(getUserTier(u)).resolves.toBe("pro");
  });
});

// ===========================================================================
// getAllEntitlements / getEntitlement — tier -> entitlement mapping
// ===========================================================================
describe("entitlement mapping per tier", () => {
  async function seed(tier: string) {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: tier, status: "active" }]);
    db.__setEntitlements(entRowsFromMap(TIER_ENTITLEMENTS[tier]!));
  }

  it("Free: low limits and premium features disabled", async () => {
    await seed("free");
    const { getAllEntitlements, getEntitlement } = await import(
      "@/lib/billing/entitlements"
    );
    const u = freshUser();
    const ents = await getAllEntitlements(u);
    expect(ents["ai.queries_per_day"]).toBe(3);
    expect(ents["watchlist.max_items"]).toBe(10);
    expect(await getEntitlement<boolean>(u, "feature.bandarmology_full")).toBe(false);
    expect(await getEntitlement<boolean>(u, "feature.api_access")).toBe(false);
  });

  it("Starter: mid limits, premium still off", async () => {
    await seed("starter");
    const { getEntitlement } = await import("@/lib/billing/entitlements");
    const u = freshUser();
    expect(await getEntitlement<number>(u, "ai.queries_per_day")).toBe(20);
    expect(await getEntitlement<number>(u, "watchlist.max_items")).toBe(50);
    expect(await getEntitlement<boolean>(u, "feature.ai_deep_mode")).toBe(false);
  });

  it("Pro: high limits, bandarmology + deep AI on, no API access", async () => {
    await seed("pro");
    const { getEntitlement } = await import("@/lib/billing/entitlements");
    const u = freshUser();
    expect(await getEntitlement<number>(u, "ai.queries_per_day")).toBe(100);
    expect(await getEntitlement<boolean>(u, "feature.bandarmology_full")).toBe(true);
    expect(await getEntitlement<boolean>(u, "feature.ai_deep_mode")).toBe(true);
    expect(await getEntitlement<boolean>(u, "feature.api_access")).toBe(false);
  });

  it("Elite: unlimited-sentinel limits and all features on", async () => {
    await seed("elite");
    const { getEntitlement, isUnlimited } = await import(
      "@/lib/billing/entitlements"
    );
    const u = freshUser();
    const aiLimit = await getEntitlement<number>(u, "ai.queries_per_day");
    expect(isUnlimited(aiLimit!)).toBe(true);
    expect(await getEntitlement<boolean>(u, "feature.api_access")).toBe(true);
  });

  it("returns null for an entitlement key not present on the tier", async () => {
    await seed("free");
    const { getEntitlement } = await import("@/lib/billing/entitlements");
    expect(
      await getEntitlement(freshUser(), "feature.does_not_exist"),
    ).toBeNull();
  });

  it("an unknown/empty tier yields no entitlements (deny-by-default)", async () => {
    const db = await getFakeDb();
    // user resolves to free fallback, but tierEntitlements query returns nothing
    db.__setTier([]);
    db.__setEntitlements([]);
    const { getAllEntitlements } = await import("@/lib/billing/entitlements");
    await expect(getAllEntitlements(freshUser())).resolves.toEqual({});
  });
});

// ===========================================================================
// requireTier — rank comparison
// ===========================================================================
describe("requireTier", () => {
  async function setTier(tier: string) {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: tier, status: "active" }]);
  }

  it("passes when current tier equals the required tier", async () => {
    await setTier("pro");
    const { requireTier } = await import("@/lib/billing/entitlements");
    await expect(requireTier(freshUser(), "pro")).resolves.toBeUndefined();
  });

  it("passes when current tier outranks the required tier", async () => {
    await setTier("elite");
    const { requireTier } = await import("@/lib/billing/entitlements");
    await expect(requireTier(freshUser(), "starter")).resolves.toBeUndefined();
  });

  it("throws TierRequiredError when current tier is below required (downgrade case)", async () => {
    await setTier("free");
    const { requireTier } = await import("@/lib/billing/entitlements");
    const { TierRequiredError } = await import("@/lib/errors");
    await expect(requireTier(freshUser(), "pro")).rejects.toBeInstanceOf(
      TierRequiredError,
    );
  });

  it("free user is blocked from any paid tier", async () => {
    await setTier("free");
    const { requireTier } = await import("@/lib/billing/entitlements");
    const { TierRequiredError } = await import("@/lib/errors");
    for (const t of ["starter", "pro", "elite", "institutional"] as const) {
      await expect(requireTier(freshUser(), t)).rejects.toBeInstanceOf(
        TierRequiredError,
      );
    }
  });

  it("requireTier(free) always passes regardless of tier", async () => {
    await setTier("free");
    const { requireTier } = await import("@/lib/billing/entitlements");
    await expect(requireTier(freshUser(), "free")).resolves.toBeUndefined();
  });
});

// ===========================================================================
// requireEntitlement — granted / missing / boolean-false / predicate
// ===========================================================================
describe("requireEntitlement", () => {
  async function seed(tier: string) {
    const db = await getFakeDb();
    db.__setTier([{ tierKode: tier, status: "active" }]);
    db.__setEntitlements(entRowsFromMap(TIER_ENTITLEMENTS[tier]!));
  }

  it("returns the value when the entitlement is granted (numeric)", async () => {
    await seed("pro");
    const { requireEntitlement } = await import("@/lib/billing/entitlements");
    await expect(
      requireEntitlement<number>(freshUser(), "watchlist.max_items"),
    ).resolves.toBe(200);
  });

  it("throws ForbiddenError when entitlement key is absent", async () => {
    await seed("free");
    const { requireEntitlement } = await import("@/lib/billing/entitlements");
    const { ForbiddenError } = await import("@/lib/errors");
    await expect(
      requireEntitlement(freshUser(), "feature.nonexistent"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws ForbiddenError when a boolean feature flag is false (Free)", async () => {
    await seed("free");
    const { requireEntitlement } = await import("@/lib/billing/entitlements");
    const { ForbiddenError } = await import("@/lib/errors");
    await expect(
      requireEntitlement(freshUser(), "feature.bandarmology_full"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns true when a boolean feature flag is enabled (Pro bandarmology)", async () => {
    await seed("pro");
    const { requireEntitlement } = await import("@/lib/billing/entitlements");
    await expect(
      requireEntitlement<boolean>(freshUser(), "feature.bandarmology_full"),
    ).resolves.toBe(true);
  });

  it("enforces a predicate (e.g. requested watchlist size within limit)", async () => {
    await seed("free"); // watchlist.max_items = 10
    const { requireEntitlement } = await import("@/lib/billing/entitlements");
    const u = freshUser();
    // adding the 8th item is fine (8 <= 10)
    await expect(
      requireEntitlement<number>(u, "watchlist.max_items", (max) => 8 <= max),
    ).resolves.toBe(10);
  });

  it("throws ForbiddenError when the predicate fails (watchlist over limit)", async () => {
    await seed("free"); // watchlist.max_items = 10
    const { requireEntitlement } = await import("@/lib/billing/entitlements");
    const { ForbiddenError } = await import("@/lib/errors");
    // attempting the 11th item exceeds the cap
    await expect(
      requireEntitlement<number>(
        freshUser(),
        "watchlist.max_items",
        (max) => 11 <= max,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
