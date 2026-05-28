import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/utils/api";

/**
 * Standard HTTP 429 response untuk rate-limited request.
 *
 * Konsisten dengan envelope `fail()` di lib/utils/api (`{ ok: false, error }`)
 * supaya client bisa handle uniform. Menambah header `Retry-After` (detik,
 * sesuai RFC 7231 §7.1.3) supaya client tahu kapan boleh retry.
 *
 * @param retryAfterMs sisa waktu window dalam millisecond (dari RateLimitResult).
 */
export function rateLimited(retryAfterMs?: number): NextResponse<ApiError> {
  // RFC 7231: Retry-After dalam detik (integer), minimal 1.
  const retryAfterSec = Math.max(1, Math.ceil((retryAfterMs ?? 0) / 1000));

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Terlalu banyak permintaan. Coba lagi nanti.",
      },
    } satisfies ApiError,
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
