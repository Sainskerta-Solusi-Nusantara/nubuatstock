import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { rateLimited } from "@/lib/security/response";

/**
 * Unit tests untuk rate limit per-IP di endpoint publik
 * (IMPROVEMENT_PLAN.md §8.2 item #10).
 *
 * Yang diuji:
 *   - getClientIp: x-forwarded-for (ambil IP pertama), x-real-ip fallback, unknown.
 *   - checkRateLimit: allow sampai limit, block setelahnya, retryAfter terisi,
 *     reset window setelah windowMs lewat, isolasi per-key (per-IP).
 *   - rateLimited: status 429 + header Retry-After (detik, minimal 1).
 */

function reqWith(headers: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  };
}

describe("getClientIp", () => {
  it("ambil IP pertama dari x-forwarded-for chain", () => {
    const req = reqWith({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
    expect(getClientIp(req)).toBe("203.0.113.7");
  });

  it("trim whitespace di IP pertama", () => {
    const req = reqWith({ "x-forwarded-for": "  198.51.100.5  , 10.0.0.1" });
    expect(getClientIp(req)).toBe("198.51.100.5");
  });

  it("fallback ke x-real-ip kalau tidak ada x-forwarded-for", () => {
    const req = reqWith({ "x-real-ip": "192.0.2.44" });
    expect(getClientIp(req)).toBe("192.0.2.44");
  });

  it("return 'unknown' kalau tidak ada header IP", () => {
    expect(getClientIp(reqWith({}))).toBe("unknown");
  });
});

describe("checkRateLimit (per-IP)", () => {
  let key: string;

  beforeEach(() => {
    // Key unik per test supaya bucket terisolasi & idempoten.
    key = `test:${Math.random().toString(36).slice(2)}`;
  });

  afterEach(() => {
    resetRateLimit(key);
    vi.useRealTimers();
  });

  it("allow request sampai limit, block sesudahnya", () => {
    const opts = { key, limit: 3, windowMs: 60_000 };
    expect(checkRateLimit(opts).allowed).toBe(true); // 1
    expect(checkRateLimit(opts).allowed).toBe(true); // 2
    expect(checkRateLimit(opts).allowed).toBe(true); // 3
    const blocked = checkRateLimit(opts); // 4 → over limit
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("remaining count turun tiap request", () => {
    const opts = { key, limit: 5, windowMs: 60_000 };
    expect(checkRateLimit(opts).remaining).toBe(4);
    expect(checkRateLimit(opts).remaining).toBe(3);
  });

  it("reset window setelah windowMs lewat", () => {
    vi.useFakeTimers();
    const opts = { key, limit: 1, windowMs: 1_000 };
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(false);
    vi.advanceTimersByTime(1_100);
    expect(checkRateLimit(opts).allowed).toBe(true);
  });

  it("isolasi antar key (IP berbeda tidak saling pengaruh)", () => {
    const a = { key: `${key}:a`, limit: 1, windowMs: 60_000 };
    const b = { key: `${key}:b`, limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(a).allowed).toBe(true);
    expect(checkRateLimit(a).allowed).toBe(false);
    // Key berbeda → window sendiri.
    expect(checkRateLimit(b).allowed).toBe(true);
    resetRateLimit(a.key);
    resetRateLimit(b.key);
  });
});

describe("RATE_LIMITS presets publik", () => {
  it("punya entry publicSearch & publicList yang sane", () => {
    expect(RATE_LIMITS.publicSearch.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.publicSearch.windowMs).toBeGreaterThan(0);
    expect(RATE_LIMITS.publicList.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.publicList.windowMs).toBeGreaterThan(0);
  });
});

describe("rateLimited response", () => {
  it("return status 429 dengan Retry-After (detik)", async () => {
    const res = rateLimited(2_500);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3"); // ceil(2500/1000)
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("Retry-After minimal 1 detik walau retryAfterMs kecil/undefined", () => {
    expect(rateLimited(0).headers.get("Retry-After")).toBe("1");
    expect(rateLimited(undefined).headers.get("Retry-After")).toBe("1");
  });
});
