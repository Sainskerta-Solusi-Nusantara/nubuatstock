import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { picksPerformanceQuerySchema } from "@/lib/types/picks";
import { getPicksPerformance } from "@/lib/picks/service";
import { requireSession } from "@/lib/picks/cross-deps";

/**
 * GET /api/picks/performance?windowDays=30
 *
 * Aggregate hit-rate per setup_type untuk window N hari terakhir.
 * Outcomes diisi oleh worker T+1/T+5/T+20/final (job evaluasi terpisah —
 * MVP fokus generation; evaluator akan ditambahkan saat market data EOD T+N siap).
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const parsed = picksPerformanceQuerySchema.parse({
      windowDays: searchParams.get("windowDays") ?? undefined,
    });
    const result = await getPicksPerformance(parsed.windowDays);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
