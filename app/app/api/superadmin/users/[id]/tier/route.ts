import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";
import { getUserTier, setUserTierByAdmin } from "@/lib/billing";

const bodySchema = z.object({
  tier: z.enum(["free", "starter", "pro", "elite", "institutional"]),
  reason: z.string().max(280).optional(),
});

/**
 * POST /api/superadmin/users/[id]/tier
 * Body: { tier, reason? }
 * Superadmin-only override tier user (manual, tanpa pembayaran).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const actor = requireSuperadmin(session);
    const { id } = await params;
    const { tier, reason } = bodySchema.parse(await req.json());

    // Pastikan user ada.
    const rows = (await db.execute(
      sql`SELECT id, email FROM users WHERE id = ${id} LIMIT 1`,
    )) as unknown as Array<Record<string, unknown>>;
    const target = rows[0];
    if (!target) return fail(404, "USER_NOT_FOUND", "User tidak ditemukan");

    const beforeTier = await getUserTier(id);
    if (beforeTier === tier) {
      return ok({ unchanged: true, tier });
    }

    await setUserTierByAdmin({ userId: id, tierKode: tier, actorUserId: actor.userId, reason });

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "user.tier_change",
      targetType: "user",
      targetId: id,
      before: { tier: beforeTier },
      after: { tier },
      metadata: { targetEmail: target.email, reason: reason ?? null },
    });

    return ok({ userId: id, oldTier: beforeTier, newTier: tier });
  } catch (err) {
    return handleError(err);
  }
}
