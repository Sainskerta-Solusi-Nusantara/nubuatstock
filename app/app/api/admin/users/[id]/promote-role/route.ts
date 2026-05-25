import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { ADMIN_AUDIT_ACTIONS, promoteRoleInputSchema } from "@/lib/types/admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../../_lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = promoteRoleInputSchema.parse(await req.json());

    if (id === session.user.id && body.role !== "admin") {
      throw new ValidationError("Tidak bisa demote diri sendiri. Minta admin lain yang ubah.");
    }

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) throw new NotFoundError("User");

    if (existing.role === body.role) {
      return ok({ id, role: body.role });
    }

    await db
      .update(users)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(users.id, id));

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.USER_ROLE_CHANGE,
      targetType: "user",
      targetId: id,
      before: { role: existing.role },
      after: { role: body.role },
      metadata: { reason: body.reason },
    });

    return ok({ id, role: body.role });
  } catch (err) {
    return handleError(err);
  }
}
