import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sessions, users } from "@/db/schema/auth";
import { ADMIN_AUDIT_ACTIONS, suspendUserInputSchema } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../../_lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Suspend = set lockedUntil ke far future (atau argumen `untilIso`), plus invalidate semua session.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = suspendUserInputSchema.parse(await req.json());

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) throw new NotFoundError("User");

    const lockedUntil = body.untilIso
      ? new Date(body.untilIso)
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // ~100 tahun

    await db
      .update(users)
      .set({ lockedUntil, updatedAt: new Date() })
      .where(eq(users.id, id));

    await db.delete(sessions).where(eq(sessions.userId, id));

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.USER_SUSPEND,
      targetType: "user",
      targetId: id,
      metadata: { reason: body.reason, lockedUntil: lockedUntil.toISOString() },
    });

    return ok({ id, lockedUntil: lockedUntil.toISOString() });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) throw new NotFoundError("User");

    await db.update(users).set({ lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, id));

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.USER_UNSUSPEND,
      targetType: "user",
      targetId: id,
    });

    return ok({ id, lockedUntil: null });
  } catch (err) {
    return handleError(err);
  }
}
