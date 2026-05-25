import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sessions, users } from "@/db/schema/auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../../_lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) throw new NotFoundError("User");

    const deleted = await db.delete(sessions).where(eq(sessions.userId, id)).returning({ id: sessions.id });

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.USER_FORCE_LOGOUT,
      targetType: "user",
      targetId: id,
      metadata: { sessionsKilled: deleted.length },
    });

    return ok({ id, sessionsKilled: deleted.length });
  } catch (err) {
    return handleError(err);
  }
}
