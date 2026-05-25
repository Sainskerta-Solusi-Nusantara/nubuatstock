import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { getOhlcv } from "@/lib/market-data";
import { rangeToDates, parseIsoDate } from "@/lib/market-data/range";
import { ohlcvQuerySchema, tickerCodeSchema } from "@/lib/types/market";

/**
 * GET /api/market/ohlcv/[code]?interval=1d|1wk|1mo&range=2y&from=&to=
 *
 * Auth: required.
 * Behavior: DB first; backfill via vendor adapter kalau gap.
 */
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const { code } = await ctx.params;
    const parsedCode = tickerCodeSchema.parse(code);

    const url = new URL(req.url);
    const query = ohlcvQuerySchema.parse({
      interval: url.searchParams.get("interval") ?? undefined,
      range: url.searchParams.get("range") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });

    let from: Date;
    let to: Date;
    if (query.from && query.to) {
      from = parseIsoDate(query.from);
      to = parseIsoDate(query.to);
    } else {
      const r = rangeToDates(query.range);
      from = r.from;
      to = r.to;
    }

    const bars = await getOhlcv(parsedCode, { from, to, interval: query.interval });
    return ok({
      code: parsedCode,
      interval: query.interval,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      bars,
    });
  } catch (err) {
    return handleError(err);
  }
}
