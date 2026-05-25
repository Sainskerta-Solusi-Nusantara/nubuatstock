import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { featureFlags } from "@/db/schema/feature-flags";
import {
  ADMIN_AUDIT_ACTIONS,
  updateFeatureFlagInputSchema,
} from "@/lib/types/admin";
import { invalidateFeatureFlagCache } from "@/lib/feature-flags";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../_lib/audit";

interface RouteContext {
  params: Promise<{ key: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { key } = await ctx.params;
    const body = updateFeatureFlagInputSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);
    if (!existing) throw new NotFoundError("Feature flag");

    const patch: Partial<typeof featureFlags.$inferInsert> = { updatedAt: new Date() };
    if (body.description !== undefined) patch.description = body.description;
    if (body.category !== undefined) patch.category = body.category;
    if (body.defaultValue !== undefined) {
      patch.defaultValue = body.defaultValue;
    }
    if (body.rolloutStrategy !== undefined) patch.rolloutStrategy = body.rolloutStrategy;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [updated] = await db
      .update(featureFlags)
      .set(patch)
      .where(eq(featureFlags.key, key))
      .returning();

    invalidateFeatureFlagCache(key);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.FEATURE_FLAG_UPDATE,
      targetType: "feature_flag",
      targetId: key,
      before: existing,
      after: updated,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { key } = await ctx.params;
    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);
    if (!existing) throw new NotFoundError("Feature flag");

    await db.delete(featureFlags).where(eq(featureFlags.key, key));
    invalidateFeatureFlagCache(key);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.FEATURE_FLAG_DELETE,
      targetType: "feature_flag",
      targetId: key,
      before: existing,
    });

    return ok({ key, deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
