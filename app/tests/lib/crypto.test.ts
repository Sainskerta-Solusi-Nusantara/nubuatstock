import { describe, expect, it } from "vitest";

/**
 * Crypto round-trip & validation tests.
 *
 * `lib/crypto.ts` membaca master key dari `lib/env.ts`. Setup.ts sudah
 * memastikan APP_MASTER_KEY tersedia sebelum module di-import.
 */
describe("lib/crypto", () => {
  it("encrypts then decrypts to original plaintext", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/crypto");
    const plaintext = "sk-test-1234-secret-value";
    const ciphertext = encryptSecret(plaintext);

    expect(ciphertext).not.toEqual(plaintext);
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);

    const decrypted = decryptSecret(ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it("produces different ciphertext for identical plaintext (random IV)", async () => {
    const { encryptSecret } = await import("@/lib/crypto");
    const plaintext = "same-input";
    const a = encryptSecret(plaintext);
    const b = encryptSecret(plaintext);
    expect(a).not.toEqual(b);
  });

  it("throws when ciphertext is too short or tampered", async () => {
    const { decryptSecret } = await import("@/lib/crypto");
    expect(() => decryptSecret("aGVsbG8=")).toThrow();
  });

  it("handles unicode plaintext correctly", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/crypto");
    const plaintext = "Sains di balik setiap trade — Nubuat";
    expect(decryptSecret(encryptSecret(plaintext))).toEqual(plaintext);
  });

  it("computes deterministic hashFingerprint", async () => {
    const { hashFingerprint } = await import("@/lib/crypto");
    const a = hashFingerprint("nubuat");
    const b = hashFingerprint("nubuat");
    expect(a).toEqual(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
