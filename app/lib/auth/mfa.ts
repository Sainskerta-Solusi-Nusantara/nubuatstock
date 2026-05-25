import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { mfaFactors, users } from "@/db/schema/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { recordAuthEvent } from "./audit";
import { getAppName } from "./config";

/**
 * TOTP (RFC 6238) — implementasi minimal stand-alone tanpa dep eksternal.
 *
 * - Secret di-generate 20 byte random, encode base32, simpan **encrypted** di
 *   `mfa_factors.secret_enc` via `lib/crypto.encryptSecret`.
 * - Step default 30 detik, digits 6, algorithm SHA-1 (kompatibel Google Auth,
 *   Authy, 1Password).
 * - Window verifikasi ±1 step untuk akomodasi clock skew.
 */

const TOTP_STEP = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = encoded.replace(/=+$/g, "").toUpperCase().replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new ValidationError("Format secret TOTP tidak valid");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const mod = 10 ** TOTP_DIGITS;
  return String(code % mod).padStart(TOTP_DIGITS, "0");
}

function totpAt(secret: Buffer, epochSec: number): string {
  return hotp(secret, Math.floor(epochSec / TOTP_STEP));
}

export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const secret = base32Decode(secretBase32);
  const now = Math.floor(Date.now() / 1000);
  for (let w = -TOTP_WINDOW; w <= TOTP_WINDOW; w++) {
    const candidate = totpAt(secret, now + w * TOTP_STEP);
    const a = Buffer.from(candidate);
    const b = Buffer.from(cleaned);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

// =================== High-level MFA Service ===================

export interface MfaSetupResult {
  factorId: string;
  secret: string;
  otpauthUrl: string;
}

export async function startTotpEnrollment(
  userId: string,
  email: string,
): Promise<MfaSetupResult> {
  const rawSecret = randomBytes(20);
  const secretBase32 = base32Encode(rawSecret);
  const issuer = encodeURIComponent(await getAppName());
  const label = encodeURIComponent(`${await getAppName()}:${email}`);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;

  const encryptedSecret = encryptSecret(secretBase32);
  const [row] = await db
    .insert(mfaFactors)
    .values({
      userId,
      factorType: "totp",
      label: "Authenticator App",
      secretEnc: encryptedSecret,
    })
    .returning({ id: mfaFactors.id });
  if (!row) throw new Error("Gagal membuat MFA factor");

  return { factorId: row.id, secret: secretBase32, otpauthUrl };
}

export async function confirmTotpEnrollment(
  userId: string,
  factorId: string,
  code: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(mfaFactors)
    .where(and(eq(mfaFactors.id, factorId), eq(mfaFactors.userId, userId)))
    .limit(1);
  const factor = rows[0];
  if (!factor) throw new NotFoundError("MFA factor");
  if (factor.confirmedAt) {
    throw new ValidationError("Factor sudah dikonfirmasi sebelumnya");
  }
  const secret = decryptSecret(factor.secretEnc);
  if (!verifyTotpCode(secret, code)) {
    throw new ValidationError("Kode TOTP salah");
  }
  await db
    .update(mfaFactors)
    .set({ confirmedAt: new Date(), lastUsedAt: new Date() })
    .where(eq(mfaFactors.id, factorId));
  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, userId));
  await recordAuthEvent({
    actorUserId: userId,
    action: "mfa_enabled",
    metadata: { factorId, factorType: "totp" },
  });
}

export async function verifyTotpForUser(userId: string, code: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(mfaFactors)
    .where(and(eq(mfaFactors.userId, userId), eq(mfaFactors.factorType, "totp")))
    .orderBy(desc(mfaFactors.confirmedAt))
    .limit(5);
  for (const factor of rows) {
    if (!factor.confirmedAt) continue;
    try {
      const secret = decryptSecret(factor.secretEnc);
      if (verifyTotpCode(secret, code)) {
        await db
          .update(mfaFactors)
          .set({ lastUsedAt: new Date() })
          .where(eq(mfaFactors.id, factor.id));
        return true;
      }
    } catch (err) {
      logger.warn({ err, factorId: factor.id }, "TOTP decrypt failed");
    }
  }
  return false;
}

export async function disableMfa(userId: string): Promise<void> {
  await db.delete(mfaFactors).where(eq(mfaFactors.userId, userId));
  await db.update(users).set({ mfaEnabled: false }).where(eq(users.id, userId));
  await recordAuthEvent({
    actorUserId: userId,
    action: "mfa_disabled",
  });
}

export async function userRequiresMfa(userId: string): Promise<boolean> {
  const rows = await db
    .select({ mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(rows[0]?.mfaEnabled);
}

export function assertMfaEnabled(session: { user: { mfaEnabled: boolean } }) {
  if (!session.user.mfaEnabled) {
    throw new ForbiddenError("MFA belum aktif");
  }
}
