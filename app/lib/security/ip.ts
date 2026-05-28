/**
 * Helper untuk ambil IP klien dari request Next.js.
 *
 * Di belakang reverse proxy / Vercel, IP asli ada di header `x-forwarded-for`
 * (comma-separated chain `client, proxy1, proxy2`) — kita ambil entry PERTAMA
 * karena itu IP klien asli (proxy menambah dirinya di belakang).
 *
 * Fallback ke `x-real-ip` (nginx) kalau `x-forwarded-for` tidak ada.
 *
 * Use case: rate limit per-IP di endpoint publik (anti-abuse / anti-scrape).
 */

/** Minimal shape — cukup `headers.get()` (cocok dgn Request / NextRequest). */
interface HasHeaders {
  headers: { get(name: string): string | null };
}

/**
 * Ambil IP klien dari request. Return `"unknown"` kalau tidak ada header
 * (mis. local dev tanpa proxy) supaya rate-limit key tetap deterministik.
 */
export function getClientIp(req: HasHeaders): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Format: "client, proxy1, proxy2" → ambil IP pertama (klien asli).
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}
