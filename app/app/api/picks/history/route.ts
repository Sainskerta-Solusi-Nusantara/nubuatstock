import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { picksHistoryQuerySchema } from "@/lib/types/picks";
import { listPicksHistory } from "@/lib/picks/service";
import { requireSession } from "@/lib/picks/cross-deps";

/**
 * GET /api/picks/history
 *
 * Query params:
 *   from   — YYYY-MM-DD (opsional)
 *   to     — YYYY-MM-DD (opsional)
 *   setup  — continuation|reversal|breakout|pullback|range (opsional)
 *   limit  — int 1-200 (default 50)
 *   offset — int >= 0 (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const parsed = picksHistoryQuerySchema.parse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      setup: searchParams.get("setup") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    const result = await listPicksHistory(parsed);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
