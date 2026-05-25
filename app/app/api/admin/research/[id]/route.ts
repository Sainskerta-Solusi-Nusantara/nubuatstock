import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { researchReports } from "@/db/schema/research";
import { getSession } from "@/lib/auth/server";
import { requireAdminOrHigher } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";
import { slugify, ensureUniqueSlug } from "@/lib/research/admin";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  companyKode: z.string().regex(/^[A-Z][A-Z0-9]{2,4}$/).nullable().optional(),
  reportType: z.enum(["initiation", "update", "earnings_review", "thematic", "sector", "macro", "flash"]).optional(),
  rating: z.enum(["strong_buy", "buy", "hold", "sell", "strong_sell", "not_rated"]).optional(),
  timeHorizon: z.enum(["short_1_3m", "medium_3_12m", "long_12m_plus"]).optional(),
  currentPriceAtPublish: z.string().optional(),
  targetPrice: z.string().optional(),
  summary: z.string().min(1).max(5000).optional(),
  keyHighlights: z.array(z.string()).max(20).optional(),
  catalysts: z.array(z.string()).max(20).optional(),
  riskFactors: z.array(z.string()).max(20).optional(),
  sections: z.array(z.object({
    key: z.string(),
    title: z.string(),
    content: z.string(),
    order: z.number(),
  })).optional(),
  valuationMethod: z.string().max(200).optional(),
  tags: z.array(z.string()).max(20).optional(),
  minTierRequired: z.enum(["free", "starter", "pro", "elite"]).optional(),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requireAdminOrHigher(session);
    const { id } = await params;
    const rows = await db
      .select()
      .from(researchReports)
      .where(and(eq(researchReports.id, id), isNull(researchReports.deletedAt)))
      .limit(1);
    if (rows.length === 0) return fail(404, "NOT_FOUND", "Riset tidak ditemukan");
    return ok(rows[0]);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const actor = requireAdminOrHigher(session);
    const { id } = await params;
    const body = await req.json();
    const data = patchSchema.parse(body);

    const existing = await db
      .select()
      .from(researchReports)
      .where(and(eq(researchReports.id, id), isNull(researchReports.deletedAt)))
      .limit(1);
    if (existing.length === 0) return fail(404, "NOT_FOUND", "Riset tidak ditemukan");
    const before = existing[0]!;

    // Update slug kalau title berubah (kecuali sudah published — keep slug stable)
    let slug = before.slug;
    if (data.title && before.status !== "published" && data.title !== before.title) {
      const baseSlug = slugify(data.title, data.companyKode ?? before.companyKode);
      slug = await ensureUniqueSlug(baseSlug, id);
    }

    // Recalc upside kalau pricing berubah
    let upsidePct = before.upsideDownsidePct;
    const curStr = data.currentPriceAtPublish ?? before.currentPriceAtPublish;
    const tgtStr = data.targetPrice ?? before.targetPrice;
    if (curStr && tgtStr) {
      const cur = Number(curStr);
      const tgt = Number(tgtStr);
      if (cur > 0) upsidePct = String((tgt - cur) / cur);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date(), slug };
    if (data.title !== undefined) updates.title = data.title;
    if (data.companyKode !== undefined) updates.companyKode = data.companyKode;
    if (data.reportType !== undefined) updates.reportType = data.reportType;
    if (data.rating !== undefined) {
      updates.rating = data.rating;
      if (data.rating !== before.rating) updates.previousRating = before.rating;
    }
    if (data.timeHorizon !== undefined) updates.timeHorizon = data.timeHorizon;
    if (data.currentPriceAtPublish !== undefined) updates.currentPriceAtPublish = data.currentPriceAtPublish || null;
    if (data.targetPrice !== undefined) {
      updates.targetPrice = data.targetPrice || null;
      if (data.targetPrice && data.targetPrice !== before.targetPrice) updates.previousTargetPrice = before.targetPrice;
    }
    updates.upsideDownsidePct = upsidePct;
    if (data.summary !== undefined) updates.summary = data.summary;
    if (data.keyHighlights !== undefined) updates.keyHighlights = data.keyHighlights;
    if (data.catalysts !== undefined) updates.catalysts = data.catalysts;
    if (data.riskFactors !== undefined) updates.riskFactors = data.riskFactors;
    if (data.sections !== undefined) updates.sections = data.sections;
    if (data.valuationMethod !== undefined) updates.valuationMethod = data.valuationMethod || null;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.minTierRequired !== undefined) updates.minTierRequired = data.minTierRequired;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === "published" && before.status !== "published") {
        updates.publishedAt = new Date();
      }
    }

    await db.update(researchReports).set(updates).where(eq(researchReports.id, id));

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "research.update",
      targetType: "research_report",
      targetId: id,
      before: { status: before.status, rating: before.rating, targetPrice: before.targetPrice },
      after: { status: updates.status ?? before.status, rating: updates.rating ?? before.rating, targetPrice: updates.targetPrice ?? before.targetPrice },
    });

    return ok({ id, slug });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const actor = requireAdminOrHigher(session);
    const { id } = await params;

    await db.update(researchReports).set({ deletedAt: new Date(), status: "archived" }).where(eq(researchReports.id, id));

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "research.delete",
      targetType: "research_report",
      targetId: id,
    });

    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
