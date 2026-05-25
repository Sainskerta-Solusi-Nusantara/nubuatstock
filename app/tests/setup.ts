/**
 * Vitest global setup.
 *
 * - Set safe default env vars saat NODE_ENV !== production.
 * - Polyfills minimal (TextEncoder/TextDecoder ada di Node 18+, crypto.randomUUID
 *   ada di Node 19+ — skip kalau sudah tersedia).
 * - Mock-able fetch: by default vitest does NOT mock fetch; tests yang butuh
 *   panggilan jaringan WAJIB stub via `vi.spyOn(globalThis, "fetch")`.
 *
 * Penting: file ini TIDAK mengakses DB. Tests yang butuh DB harus skip / pakai
 * test DB terpisah (Postgres ephemeral) — itu di luar scope unit test.
 */
import { afterEach, vi } from "vitest";

// Pastikan APP_MASTER_KEY tersedia untuk tests yang import lib/crypto.ts.
// 32-byte hex constant — HANYA untuk test environment.
if (!process.env.APP_MASTER_KEY) {
  process.env.APP_MASTER_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/nubuat_test";
}

if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://localhost:6379";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

afterEach(() => {
  vi.restoreAllMocks();
});
