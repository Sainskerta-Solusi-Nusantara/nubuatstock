import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { getQuote } from "@/lib/market-data";
import { tickerCodeSchema } from "@/lib/types/market";

/**
 * GET /api/market/quote/[code]
 *
 * Auth: required (session). Tier: free+ (semua user bisa lihat quote dasar).
 *
 * Cache: Redis 30s di service layer.
 */
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const { code } = await ctx.params;
    const parsed = tickerCodeSchema.parse(code);
    const quote = await getQuote(parsed);
    return ok(quote);
  } catch (err) {
    return handleError(err);
  }
}
