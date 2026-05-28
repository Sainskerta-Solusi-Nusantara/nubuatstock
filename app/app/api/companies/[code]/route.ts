import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { tickerSchema } from "@/lib/types/companies";
import { getCompany } from "@/lib/companies";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { rateLimited } from "@/lib/security/response";

/**
 * GET /api/companies/[code]
 *
 * Return detail emiten (join papan + sector + sub_sector).
 *
 * Public (no auth) → rate limit per-IP untuk cegah scraping seluruh universe.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    // SECURITY: per-IP rate limit (endpoint publik, anti-scrape).
    const ip = getClientIp(req);
    const rl = checkRateLimit({ key: `public-list:${ip}`, ...RATE_LIMITS.publicList });
    if (!rl.allowed) return rateLimited(rl.retryAfterMs);

    const { code } = await ctx.params;
    const validated = tickerSchema.parse(code.toUpperCase());
    const company = await getCompany(validated);
    return ok(company);
  } catch (err) {
    return handleError(err);
  }
}
