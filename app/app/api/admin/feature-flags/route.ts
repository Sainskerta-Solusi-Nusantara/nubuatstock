import { type NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { featureFlags } from "@/db/schema/feature-flags";
import {
  ADMIN_AUDIT_ACTIONS,
  createFeatureFlagInputSchema,
} from "@/lib/types/admin";
import { invalidateFeatureFlagCache } from "@/lib/feature-flags";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../_lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select()
      .from(featureFlags)
      .orderBy(asc(featureFlags.category), asc(featureFlags.key));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = createFeatureFlagInputSchema.parse(await req.json());
    const [inserted] = await db
      .insert(featureFlags)
      .values({
        key: body.key,
        description: body.description,
        category: body.category,
        defaultValue: body.defaultValue,
        rolloutStrategy: body.rolloutStrategy,
        isActive: body.isActive,
      })
      .returning();

    invalidateFeatureFlagCache(body.key);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.FEATURE_FLAG_CREATE,
      targetType: "feature_flag",
      targetId: body.key,
      after: inserted,
    });

    return ok(inserted, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
