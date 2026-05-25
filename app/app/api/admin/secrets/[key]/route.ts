import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { appSecrets } from "@/db/schema/config";
import { invalidateConfigCache } from "@/lib/config";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../_lib/audit";

interface RouteContext {
  params: Promise<{ key: string }>;
}

/**
 * DELETE /api/admin/secrets/[key]
 * Set encryptedValue=NULL. Slot tetap ada (so admin tetap tahu fitur yang butuh).
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { key } = await ctx.params;

    const [existing] = await db.select().from(appSecrets).where(eq(appSecrets.key, key)).limit(1);
    if (!existing) throw new NotFoundError("Secret slot");

    await db
      .update(appSecrets)
      .set({ encryptedValue: null, lastRotatedAt: new Date(), updatedAt: new Date() })
      .where(eq(appSecrets.key, key));

    invalidateConfigCache(key);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.SECRET_CLEAR,
      targetType: "app_secret",
      targetId: key,
      metadata: { wasConfigured: !!existing.encryptedValue },
    });

    return ok({ key, isConfigured: false });
  } catch (err) {
    return handleError(err);
  }
}
