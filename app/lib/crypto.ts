import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { env } from "./env";

/**
 * AES-256-GCM encryption untuk app_secrets.
 *
 * Format ciphertext (base64): <iv:12><authTag:16><ciphertext:*>
 *
 * Master key dari env.APP_MASTER_KEY (32 byte raw, 64 hex char).
 * Algorithm versioning: AAD includes "nubuat:v1" so future versions can co-exist.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const AAD = Buffer.from("nubuat:v1");

const masterKey = Buffer.from(env.APP_MASTER_KEY, "hex");

if (masterKey.length !== 32) {
  throw new Error("APP_MASTER_KEY must decode to exactly 32 bytes");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  cipher.setAAD(AAD);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(ciphertextB64: string): string {
  const buf = Buffer.from(ciphertextB64, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, masterKey, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function hashFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateUlid(): string {
  // ULID akan di-handle by `ulid` npm package; helper di sini sebagai backstop.
  // Untuk SQL default, kita pakai PostgreSQL function (lihat db/schema/_base.ts).
  throw new Error("Use `ulid()` from `ulid` package or SQL default gen_ulid()");
}
