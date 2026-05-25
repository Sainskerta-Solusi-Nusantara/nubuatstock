import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { subscriptionTiers } from "@/db/schema/billing";
import { ADMIN_AUDIT_ACTIONS, updateTierInputSchema } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../_lib/audit";

interface RouteContext {
  params: Promise<{ kode: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { kode } = await ctx.params;
    const body = updateTierInputSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.kode, kode))
      .limit(1);
    if (!existing) throw new NotFoundError("Tier");

    const patch: Partial<typeof subscriptionTiers.$inferInsert> = { updatedAt: new Date() };
    if (body.nama !== undefined) patch.nama = body.nama;
    if (body.tagline !== undefined) patch.tagline = body.tagline ?? null;
    if (body.priceMonthlyIdr !== undefined) patch.priceMonthlyIdr = body.priceMonthlyIdr;
    if (body.priceAnnualIdr !== undefined) patch.priceAnnualIdr = body.priceAnnualIdr;
    if (body.trialDays !== undefined) patch.trialDays = body.trialDays;
    if (body.isPublic !== undefined) patch.isPublic = body.isPublic;
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    if (body.features !== undefined) patch.features = body.features;
    if (body.badge !== undefined) patch.badge = body.badge ?? null;
    if (body.ctaLabel !== undefined) patch.ctaLabel = body.ctaLabel ?? null;

    const [updated] = await db
      .update(subscriptionTiers)
      .set(patch)
      .where(eq(subscriptionTiers.kode, kode))
      .returning();

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.TIER_UPDATE,
      targetType: "subscription_tier",
      targetId: kode,
      before: existing,
      after: updated,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
