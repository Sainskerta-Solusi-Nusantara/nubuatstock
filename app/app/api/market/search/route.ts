import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/utils/api";
import { searchTickers } from "@/lib/market-data";
import { searchQuerySchema } from "@/lib/types/market";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { rateLimited } from "@/lib/security/response";

/**
 * GET /api/market/search?q=BBRI&limit=20
 *
 * Auth: required (session). Mengembalikan hasil DB + augmented adapter
 * (kalau tersedia).
 *
 * Defense-in-depth: per-IP rate limit (anti-scrape) didahulukan, lalu cek
 * session → 401 kalau anonim.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // SECURITY: per-IP rate limit (endpoint publik/no-auth, anti-scrape).
    const ip = getClientIp(req);
    const rl = checkRateLimit({ key: `public-search:${ip}`, ...RATE_LIMITS.publicSearch });
    if (!rl.allowed) return rateLimited(rl.retryAfterMs);

    // SECURITY: enforce login (throws UnauthorizedError → 401 via handleError).
    await requireSession();

    const url = new URL(req.url);
    const query = searchQuerySchema.parse({
      q: url.searchParams.get("q") ?? "",
      limit: url.searchParams.get("limit") ?? undefined,
    });
    const results = await searchTickers(query.q, query.limit);
    return ok({ q: query.q, count: results.length, results });
  } catch (err) {
    return handleError(err);
  }
}
