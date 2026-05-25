import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { pickIdParamSchema } from "@/lib/types/picks";
import { getPickById } from "@/lib/picks/service";
import { requireSession } from "@/lib/picks/cross-deps";

/**
 * GET /api/picks/[id]
 *
 * Detail satu daily pick: entry zone, SL, TP1/2/3, factor breakdown, narrative.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const parsed = pickIdParamSchema.parse({ id });
    const pick = await getPickById(parsed.id);
    return ok(pick);
  } catch (err) {
    return handleError(err);
  }
}
