import { type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { tierEntitlements } from "@/db/schema/billing";
import { ADMIN_AUDIT_ACTIONS, updateEntitlementInputSchema } from "@/lib/types/admin";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../../../_lib/audit";

interface RouteContext {
  params: Promise<{ kode: string; key: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { kode, key } = await ctx.params;
    const body = updateEntitlementInputSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(tierEntitlements)
      .where(and(eq(tierEntitlements.tierKode, kode), eq(tierEntitlements.entitlementKey, key)))
      .limit(1);

    let updated;
    if (!existing) {
      // Upsert: kalau belum ada → insert.
      const [inserted] = await db
        .insert(tierEntitlements)
        .values({
          tierKode: kode,
          entitlementKey: key,
          entitlementValue: body.value,
          description: body.description ?? null,
        })
        .returning();
      updated = inserted;
    } else {
      const patch: Partial<typeof tierEntitlements.$inferInsert> = {
        entitlementValue: body.value,
        updatedAt: new Date(),
      };
      if (body.description !== undefined) patch.description = body.description ?? null;

      const [u] = await db
        .update(tierEntitlements)
        .set(patch)
        .where(eq(tierEntitlements.id, existing.id))
        .returning();
      updated = u;
    }

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.TIER_ENTITLEMENT_UPDATE,
      targetType: "tier_entitlement",
      targetId: `${kode}:${key}`,
      before: existing
        ? { value: existing.entitlementValue, description: existing.description }
        : undefined,
      after: { value: updated?.entitlementValue, description: updated?.description },
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
