import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Share-token untuk pitchdeck publik (mode slide 16:9).
 *
 * Token diturunkan deterministik dari APP_MASTER_KEY via HMAC — jadi:
 * - Stabil (link yang sudah dibagikan tetap valid),
 * - Tidak bisa ditebak (butuh master key untuk menghitung),
 * - Tanpa storage (tidak perlu tabel/secret tambahan).
 *
 * Untuk "rotasi" link (mematikan link lama), naikkan VERSION di bawah —
 * semua link lama otomatis invalid.
 */
const VERSION = "pitchdeck-share-v1";

export function getShareToken(): string {
  return createHmac("sha256", env.APP_MASTER_KEY).update(VERSION).digest("hex").slice(0, 32);
}

export function verifyShareToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = getShareToken();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://nubuat.sainskerta.net").replace(/\/$/, "");
}

/** URL publik lengkap untuk dibagikan (mode slide). */
export function getPublicPitchdeckUrl(): string {
  return `${baseUrl()}/pitchdeck?k=${getShareToken()}`;
}
