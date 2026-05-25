import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { researchReports } from "@/db/schema/research";
import { getSession } from "@/lib/auth/server";
import { requireAdminOrHigher } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";
import { slugify, ensureUniqueSlug } from "@/lib/research/admin";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  companyKode: z.string().regex(/^[A-Z][A-Z0-9]{2,4}$/).nullable().optional(),
  reportType: z.enum(["initiation", "update", "earnings_review", "thematic", "sector", "macro", "flash"]),
  rating: z.enum(["strong_buy", "buy", "hold", "sell", "strong_sell", "not_rated"]),
  timeHorizon: z.enum(["short_1_3m", "medium_3_12m", "long_12m_plus"]),
  currentPriceAtPublish: z.string().optional(),
  targetPrice: z.string().optional(),
  summary: z.string().min(1).max(5000),
  keyHighlights: z.array(z.string()).max(20).default([]),
  catalysts: z.array(z.string()).max(20).default([]),
  riskFactors: z.array(z.string()).max(20).default([]),
  sections: z.array(z.object({
    key: z.string(),
    title: z.string(),
    content: z.string(),
    order: z.number(),
  })).default([]),
  valuationMethod: z.string().max(200).default(""),
  tags: z.array(z.string()).max(20).default([]),
  minTierRequired: z.enum(["free", "starter", "pro", "elite"]).default("free"),
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const actor = requireAdminOrHigher(session);
    const body = await req.json();
    const data = bodySchema.parse(body);

    const baseSlug = slugify(data.title, data.companyKode);
    const slug = await ensureUniqueSlug(baseSlug);

    // Calculate upside if both prices
    let upsidePct: string | null = null;
    if (data.currentPriceAtPublish && data.targetPrice) {
      const cur = Number(data.currentPriceAtPublish);
      const tgt = Number(data.targetPrice);
      if (cur > 0) upsidePct = String((tgt - cur) / cur);
    }

    const inserted = await db
      .insert(researchReports)
      .values({
        slug,
        title: data.title,
        companyKode: data.companyKode ?? null,
        reportType: data.reportType,
        rating: data.rating,
        timeHorizon: data.timeHorizon,
        currentPriceAtPublish: data.currentPriceAtPublish || null,
        targetPrice: data.targetPrice || null,
        upsideDownsidePct: upsidePct,
        summary: data.summary,
        keyHighlights: data.keyHighlights,
        catalysts: data.catalysts,
        riskFactors: data.riskFactors,
        sections: data.sections,
        valuationMethod: data.valuationMethod || null,
        tags: data.tags,
        minTierRequired: data.minTierRequired,
        status: data.status,
        publishedAt: data.status === "published" ? new Date() : null,
        authorUserId: actor.userId,
        authorName: (actor as { email?: string; name?: string }).name ?? (actor as { email?: string }).email ?? "Admin",
      })
      .returning();

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "research.create",
      targetType: "research_report",
      targetId: inserted[0]!.id,
      metadata: { slug, title: data.title, status: data.status },
    });

    return ok({ id: inserted[0]!.id, slug });
  } catch (err) {
    return handleError(err);
  }
}
