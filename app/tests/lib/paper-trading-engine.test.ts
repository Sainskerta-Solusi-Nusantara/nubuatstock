import { describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk pure helpers di lib/paper-trading/engine.ts:
 *   - applySlippage: buy naik 15bps, sell turun 15bps, custom bps, rounding.
 *   - maskDisplayName: privacy masking untuk leaderboard publik.
 *   - konstanta SLIPPAGE_BPS / LOT_SIZE.
 *
 * Engine module mengimpor @/lib/db & @/lib/billing/entitlements di top-level;
 * kita stub keduanya agar import tidak menyentuh koneksi nyata. Test hanya
 * memanggil fungsi murni.
 */

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/billing/entitlements", () => ({ requireEntitlement: async () => true }));
vi.mock("@/lib/logger", () => ({ logger: { info() {}, warn() {}, error() {}, debug() {} } }));

describe("applySlippage", () => {
  it("buy pushes the fill price up by 15bps (default)", async () => {
    const { applySlippage } = await import("@/lib/paper-trading/engine");
    // 1000 * 1.0015 = 1001.5 -> round 1002
    expect(applySlippage(1000, "buy")).toBe(1002);
  });

  it("sell pushes the fill price down by 15bps (default)", async () => {
    const { applySlippage } = await import("@/lib/paper-trading/engine");
    // 1000 * 0.9985 = 998.5 -> round 999
    expect(applySlippage(1000, "sell")).toBe(999);
  });

  it("buy fill >= reference and sell fill <= reference", async () => {
    const { applySlippage } = await import("@/lib/paper-trading/engine");
    const ref = 5000;
    expect(applySlippage(ref, "buy")).toBeGreaterThanOrEqual(ref);
    expect(applySlippage(ref, "sell")).toBeLessThanOrEqual(ref);
  });

  it("honours a custom slippage bps", async () => {
    const { applySlippage } = await import("@/lib/paper-trading/engine");
    // 100 bps = 1% -> buy 10100, sell 9900
    expect(applySlippage(10000, "buy", 100)).toBe(10100);
    expect(applySlippage(10000, "sell", 100)).toBe(9900);
  });

  it("exports SLIPPAGE_BPS = 15 and LOT_SIZE = 100", async () => {
    const { SLIPPAGE_BPS, LOT_SIZE } = await import("@/lib/paper-trading/engine");
    expect(SLIPPAGE_BPS).toBe(15);
    expect(LOT_SIZE).toBe(100);
  });
});

describe("maskDisplayName", () => {
  it("multi-word name -> first name + last initial", async () => {
    const { maskDisplayName } = await import("@/lib/paper-trading/engine");
    expect(maskDisplayName("Budi Santoso")).toBe("Budi S.");
    expect(maskDisplayName("Andi Bagus Wijaya")).toBe("Andi W.");
  });

  it("single short name (<=3 chars) -> name + ***", async () => {
    const { maskDisplayName } = await import("@/lib/paper-trading/engine");
    expect(maskDisplayName("ali")).toBe("ali***");
  });

  it("single long name -> first 3 chars + masked tail", async () => {
    const { maskDisplayName } = await import("@/lib/paper-trading/engine");
    expect(maskDisplayName("andre")).toBe("and**");
    expect(maskDisplayName("alexander")).toBe("ale***");
  });

  it("empty / null / whitespace -> 'Trader'", async () => {
    const { maskDisplayName } = await import("@/lib/paper-trading/engine");
    expect(maskDisplayName("")).toBe("Trader");
    expect(maskDisplayName(null)).toBe("Trader");
    expect(maskDisplayName(undefined)).toBe("Trader");
    expect(maskDisplayName("   ")).toBe("Trader");
  });
});
