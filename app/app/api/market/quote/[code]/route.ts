import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/utils/api";
import { getQuote } from "@/lib/market-data";
import { tickerCodeSchema } from "@/lib/types/market";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { rateLimited } from "@/lib/security/response";

/**
 * GET /api/market/quote/[code]
 *
 * Auth: required (session). Tier: free+ (semua user login bisa lihat quote dasar).
 *
 * Cache: Redis 30s di service layer.
 *
 * Defense-in-depth: per-IP rate limit (anti-scrape quote vendor-backed yang
 * expensive lintas universe) didahulukan, lalu cek session → 401 kalau anonim.
 */
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    // SECURITY: per-IP rate limit (endpoint publik/no-auth, anti-scrape).
    const ip = getClientIp(req);
    const rl = checkRateLimit({ key: `public-list:${ip}`, ...RATE_LIMITS.publicList });
    if (!rl.allowed) return rateLimited(rl.retryAfterMs);

    // SECURITY: enforce login (throws UnauthorizedError → 401 via handleError).
    await requireSession();

    const { code } = await ctx.params;
    const parsed = tickerCodeSchema.parse(code);
    const quote = await getQuote(parsed);
    return ok(quote);
  } catch (err) {
    return handleError(err);
  }
}
