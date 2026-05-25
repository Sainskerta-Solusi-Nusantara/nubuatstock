import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireTier } from "@/lib/billing/entitlements";
import { handleError, ok } from "@/lib/utils/api";
import {
  getForeignFlowDaily,
  getForeignFlowIntraday,
  isIntradayGranularity,
  minTierForForeignFlowGranularity,
} from "@/lib/market-data";
import { parseIsoDate } from "@/lib/market-data/range";
import {
  foreignFlowQuerySchema,
  tickerCodeSchema,
  type IntradayGranularity,
} from "@/lib/types/market";

/**
 * GET /api/market/foreign-flow/[code]?granularity=1d|1h|15m|5m&from=&to=
 *
 * Tier gating:
 *   1d  → free
 *   1h  → starter
 *   15m → pro
 *   5m  → pro
 *
 * Data DB only (di-ingest oleh worker job).
 */
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const session = await requireSession();

    const { code } = await ctx.params;
    const parsedCode = tickerCodeSchema.parse(code);

    const url = new URL(req.url);
    const query = foreignFlowQuerySchema.parse({
      granularity: url.searchParams.get("granularity") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });

    const minTier = minTierForForeignFlowGranularity(query.granularity);
    await requireTier(session.userId, minTier);

    if (isIntradayGranularity(query.granularity)) {
      const fromTs = query.from ? parseIsoDate(query.from) : undefined;
      const toTs = query.to ? parseIsoDate(query.to) : undefined;
      const rows = await getForeignFlowIntraday(parsedCode, {
        granularity: query.granularity as IntradayGranularity,
        fromTs,
        toTs,
      });
      return ok({
        code: parsedCode,
        granularity: query.granularity,
        rows,
      });
    }

    // Daily branch — from/to wajib untuk paginasi sensible. Default = last 90 days.
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fromIso = query.from ?? ninetyDaysAgo.toISOString().slice(0, 10);
    const toIso = query.to ?? today.toISOString().slice(0, 10);

    const rows = await getForeignFlowDaily(parsedCode, {
      fromDate: fromIso,
      toDate: toIso,
    });
    return ok({
      code: parsedCode,
      granularity: query.granularity,
      from: fromIso,
      to: toIso,
      rows,
    });
  } catch (err) {
    return handleError(err);
  }
}
