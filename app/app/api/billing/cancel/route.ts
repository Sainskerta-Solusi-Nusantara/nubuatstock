import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/utils/api";
import { cancelSubscription } from "@/lib/billing";
import { cancelRequestSchema } from "@/lib/types/billing";

/**
 * POST /api/billing/cancel
 *
 * Body: { reason?, immediate? }
 *
 * - Default: cancel_at_period_end=true (user tetap pakai sampai akhir periode).
 * - immediate=true: langsung downgrade ke free.
 *
 * Cancellation Free tier ditolak (tidak ada yang dibatalkan).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = cancelRequestSchema.parse(body);

    const updated = await cancelSubscription({
      userId: session.user.id,
      immediate: parsed.immediate,
      reason: parsed.reason,
      actorUserId: session.user.id,
    });

    return ok({ subscription: updated });
  } catch (err) {
    return handleError(err);
  }
}
