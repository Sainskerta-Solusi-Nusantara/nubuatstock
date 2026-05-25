import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests untuk `lib/config.ts`:
 * - getConfig returns defaultValue saat key tidak ada
 * - getSecret throws kalau secret kosong
 * - Cache TTL invalidate behavior
 *
 * Strategi mock: kita stub `lib/db` dengan `vi.mock` agar tidak perlu real DB.
 */

vi.mock("@/lib/db", () => {
  const rows: Array<Record<string, unknown>> = [];
  const buildSelect = () => ({
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  });
  return {
    db: {
      select: () => buildSelect(),
      __setRows: (r: Array<Record<string, unknown>>) => {
        rows.length = 0;
        rows.push(...r);
      },
    },
  };
});

describe("lib/config", () => {
  beforeEach(async () => {
    const { db } = (await import("@/lib/db")) as unknown as {
      db: { __setRows: (r: Array<Record<string, unknown>>) => void };
    };
    db.__setRows([]);
    const { invalidateConfigCache } = await import("@/lib/config");
    invalidateConfigCache();
  });

  it("returns defaultValue when key not found", async () => {
    const { getConfig } = await import("@/lib/config");
    const value = await getConfig<string>("nonexistent.key", {
      defaultValue: "fallback",
    });
    expect(value).toEqual("fallback");
  });

  it("throws ConfigNotFoundError without defaultValue", async () => {
    const { getConfig, ConfigNotFoundError } = await import("@/lib/config");
    await expect(getConfig("nonexistent.key")).rejects.toBeInstanceOf(
      ConfigNotFoundError,
    );
  });

  it("returns value from db row", async () => {
    const { db } = (await import("@/lib/db")) as unknown as {
      db: { __setRows: (r: Array<Record<string, unknown>>) => void };
    };
    db.__setRows([{ key: "app.name", value: "Nubuat", scope: {} }]);
    const { getConfig } = await import("@/lib/config");
    const value = await getConfig<string>("app.name");
    expect(value).toEqual("Nubuat");
  });

  it("getSecret throws SecretNotFoundError when row missing", async () => {
    const { getSecret, SecretNotFoundError } = await import("@/lib/config");
    await expect(getSecret("ai.deepseek.api_key")).rejects.toBeInstanceOf(
      SecretNotFoundError,
    );
  });

  it("caches subsequent reads within TTL", async () => {
    const { db } = (await import("@/lib/db")) as unknown as {
      db: { __setRows: (r: Array<Record<string, unknown>>) => void };
    };
    db.__setRows([{ key: "k1", value: 42, scope: {} }]);
    const { getConfig } = await import("@/lib/config");
    const first = await getConfig<number>("k1");
    // Mutate the underlying rows — cache should still return original.
    db.__setRows([{ key: "k1", value: 99, scope: {} }]);
    const second = await getConfig<number>("k1");
    expect(first).toEqual(42);
    expect(second).toEqual(42);
  });
});
