import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { companySearchQuerySchema } from "@/lib/types/companies";
import { searchCompanies } from "@/lib/companies";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { rateLimited } from "@/lib/security/response";

/**
 * GET /api/companies/search?q=&limit=
 *
 * Fuzzy match untuk command palette / autocomplete UI.
 * Ordering: exact kode → prefix kode → name contains.
 *
 * Public (no auth) → rate limit per-IP untuk cegah scraping.
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: per-IP rate limit (endpoint publik, anti-scrape).
    const ip = getClientIp(req);
    const rl = checkRateLimit({ key: `public-search:${ip}`, ...RATE_LIMITS.publicSearch });
    if (!rl.allowed) return rateLimited(rl.retryAfterMs);

    const { searchParams } = new URL(req.url);
    const parsed = companySearchQuerySchema.parse({
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? undefined,
    });
    const hits = await searchCompanies(parsed.q, { limit: parsed.limit });
    return ok({ items: hits });
  } catch (err) {
    return handleError(err);
  }
}
