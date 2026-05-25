import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireTier } from "@/lib/billing/entitlements";
import { handleError, ok } from "@/lib/utils/api";
import { getBrokerSummary } from "@/lib/market-data";
import { brokerSummaryQuerySchema, tickerCodeSchema } from "@/lib/types/market";

/**
 * GET /api/market/broker-summary/[code]?from=YYYY-MM-DD&to=YYYY-MM-DD&side=buy|sell|both
 *
 * Tier minimum: starter. Data berasal dari DB (ingested by worker, not on-demand).
 */
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const session = await requireSession();
    await requireTier(session.userId, "starter");

    const { code } = await ctx.params;
    const parsedCode = tickerCodeSchema.parse(code);

    const url = new URL(req.url);
    const query = brokerSummaryQuerySchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      side: url.searchParams.get("side") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const rows = await getBrokerSummary(parsedCode, {
      fromDate: query.from,
      toDate: query.to,
      side: query.side,
      limit: query.limit,
    });

    return ok({ code: parsedCode, from: query.from, to: query.to, rows });
  } catch (err) {
    return handleError(err);
  }
}
