import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { appConfig } from "@/db/schema/config";
import { invalidateConfigCache } from "@/lib/config";
import { ADMIN_AUDIT_ACTIONS, updateConfigInputSchema } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../_lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = updateConfigInputSchema.parse(await req.json());

    const [existing] = await db.select().from(appConfig).where(eq(appConfig.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Config entry");

    const patch: Partial<typeof appConfig.$inferInsert> = {
      value: body.value,
      updatedAt: new Date(),
    };
    if (body.type !== undefined) patch.type = body.type;
    if (body.description !== undefined) patch.description = body.description ?? null;

    const [updated] = await db
      .update(appConfig)
      .set(patch)
      .where(eq(appConfig.id, id))
      .returning();

    invalidateConfigCache(existing.key);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.CONFIG_UPDATE,
      targetType: "app_config",
      targetId: existing.key,
      before: { value: existing.value, type: existing.type, description: existing.description },
      after: { value: updated?.value, type: updated?.type, description: updated?.description },
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
