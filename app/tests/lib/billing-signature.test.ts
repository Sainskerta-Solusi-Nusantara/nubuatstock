import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests untuk verifikasi signature webhook pembayaran
 * (IMPROVEMENT_PLAN.md §8.2 item #9).
 *
 * Yang diuji:
 *   - verifyMidtransSignature: SHA512(order_id + status_code + gross_amount + server_key)
 *     -> valid lolos, invalid/empty ditolak, server key dari env/secret (bukan hardcode).
 *   - verifyXenditSignature: x-callback-token == webhook_token (timing-safe),
 *     plus optional HMAC-SHA256 -> valid lolos, salah/kosong ditolak.
 *
 * Strategi mock: stub `@/lib/config.getSecret` supaya tidak perlu DB.
 * `ConfigurationError` tetap di-resolve dari modul asli `@/lib/errors`.
 */

const MIDTRANS_SERVER_KEY = "SB-Mid-server-TESTKEY1234567890";
const XENDIT_WEBHOOK_TOKEN = "xnd_callback_token_TESTabcdef";

// getSecret mock: dikontrol per-test via secretStore.
const secretStore = new Map<string, string>();

vi.mock("@/lib/config", () => ({
  getSecret: vi.fn(async (key: string) => {
    if (secretStore.has(key)) return secretStore.get(key)!;
    // Mirror perilaku asli: throw kalau secret tidak ada.
    throw new Error(`Secret not found: ${key}`);
  }),
}));

beforeEach(() => {
  secretStore.clear();
  secretStore.set("payment.midtrans.server_key", MIDTRANS_SERVER_KEY);
  secretStore.set("payment.xendit.webhook_token", XENDIT_WEBHOOK_TOKEN);
});

afterEach(() => {
  vi.clearAllMocks();
});

function midtransSig(orderId: string, statusCode: string, grossAmount: string): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${MIDTRANS_SERVER_KEY}`)
    .digest("hex");
}

describe("verifyMidtransSignature", () => {
  const base = {
    orderId: "INV-2026-0001",
    statusCode: "200",
    grossAmount: "100000.00",
  };

  it("accepts a correctly computed SHA512 signature_key", async () => {
    const { verifyMidtransSignature } = await import("@/lib/billing/providers");
    const signatureKey = midtransSig(base.orderId, base.statusCode, base.grossAmount);
    await expect(
      verifyMidtransSignature({ ...base, signatureKey }),
    ).resolves.toBe(true);
  });

  it("rejects a forged signature_key", async () => {
    const { verifyMidtransSignature } = await import("@/lib/billing/providers");
    await expect(
      verifyMidtransSignature({ ...base, signatureKey: "f".repeat(128) }),
    ).resolves.toBe(false);
  });

  it("rejects when signature_key is empty", async () => {
    const { verifyMidtransSignature } = await import("@/lib/billing/providers");
    await expect(
      verifyMidtransSignature({ ...base, signatureKey: "" }),
    ).resolves.toBe(false);
  });

  it("rejects when any signed field is tampered (amount changed)", async () => {
    const { verifyMidtransSignature } = await import("@/lib/billing/providers");
    // Signature dihitung untuk gross 100000, attacker kirim 1.00.
    const signatureKey = midtransSig(base.orderId, base.statusCode, base.grossAmount);
    await expect(
      verifyMidtransSignature({ ...base, grossAmount: "1.00", signatureKey }),
    ).resolves.toBe(false);
  });

  it("rejects when computed against a different server key (no hardcoded fallback)", async () => {
    const { verifyMidtransSignature } = await import("@/lib/billing/providers");
    const wrongKeySig = createHash("sha512")
      .update(`${base.orderId}${base.statusCode}${base.grossAmount}attacker-guess-key`)
      .digest("hex");
    await expect(
      verifyMidtransSignature({ ...base, signatureKey: wrongKeySig }),
    ).resolves.toBe(false);
  });

  it("throws ConfigurationError when server key is not configured", async () => {
    secretStore.delete("payment.midtrans.server_key");
    const { verifyMidtransSignature } = await import("@/lib/billing/providers");
    const { ConfigurationError } = await import("@/lib/errors");
    const signatureKey = midtransSig(base.orderId, base.statusCode, base.grossAmount);
    await expect(
      verifyMidtransSignature({ ...base, signatureKey }),
    ).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe("verifyXenditSignature", () => {
  it("accepts a matching x-callback-token", async () => {
    const { verifyXenditSignature } = await import("@/lib/billing/providers");
    await expect(
      verifyXenditSignature({ callbackToken: XENDIT_WEBHOOK_TOKEN }),
    ).resolves.toBe(true);
  });

  it("rejects a wrong x-callback-token", async () => {
    const { verifyXenditSignature } = await import("@/lib/billing/providers");
    await expect(
      verifyXenditSignature({ callbackToken: "wrong-token-value-here" }),
    ).resolves.toBe(false);
  });

  it("rejects an empty x-callback-token", async () => {
    const { verifyXenditSignature } = await import("@/lib/billing/providers");
    await expect(
      verifyXenditSignature({ callbackToken: "" }),
    ).resolves.toBe(false);
  });

  it("throws ConfigurationError when webhook token is not configured", async () => {
    secretStore.delete("payment.xendit.webhook_token");
    const { verifyXenditSignature } = await import("@/lib/billing/providers");
    const { ConfigurationError } = await import("@/lib/errors");
    await expect(
      verifyXenditSignature({ callbackToken: XENDIT_WEBHOOK_TOKEN }),
    ).rejects.toBeInstanceOf(ConfigurationError);
  });

  it("accepts when optional HMAC-SHA256 signature is also valid", async () => {
    const { verifyXenditSignature } = await import("@/lib/billing/providers");
    const rawBody = JSON.stringify({ id: "x1", external_id: "INV-1", status: "PAID" });
    const signature = createHmac("sha256", XENDIT_WEBHOOK_TOKEN).update(rawBody).digest("hex");
    await expect(
      verifyXenditSignature({ callbackToken: XENDIT_WEBHOOK_TOKEN, body: rawBody, signature }),
    ).resolves.toBe(true);
  });

  it("rejects when optional HMAC-SHA256 signature is invalid (body tampered)", async () => {
    const { verifyXenditSignature } = await import("@/lib/billing/providers");
    const signedBody = JSON.stringify({ amount: 100000 });
    const tamperedBody = JSON.stringify({ amount: 1 });
    const signature = createHmac("sha256", XENDIT_WEBHOOK_TOKEN).update(signedBody).digest("hex");
    await expect(
      verifyXenditSignature({
        callbackToken: XENDIT_WEBHOOK_TOKEN,
        body: tamperedBody,
        signature,
      }),
    ).resolves.toBe(false);
  });
});
