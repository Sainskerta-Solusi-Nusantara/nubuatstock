import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { researchReports, researchViews } from "@/db/schema/research";
import { companies } from "@/db/schema/companies";

export interface AdminResearchCountFilter {
  status?: "draft" | "review" | "published" | "archived";
  authorUserId?: string;
  q?: string;
}

async function countResearchRaw(filter: AdminResearchCountFilter = {}): Promise<number> {
  const conditions = [isNull(researchReports.deletedAt)];
  if (filter.status) conditions.push(eq(researchReports.status, filter.status));
  if (filter.authorUserId) conditions.push(eq(researchReports.authorUserId, filter.authorUserId));
  if (filter.q) {
    const q = `%${filter.q}%`;
    conditions.push(
      or(
        ilike(researchReports.title, q),
        ilike(researchReports.slug, q),
        ilike(researchReports.companyKode, q),
      )!,
    );
  }
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(researchReports)
    .where(and(...conditions));
  return row?.n ?? 0;
}

export const countResearch = countResearchRaw;

export interface ResearchListFilter {
  q?: string;            // search query
  ticker?: string;
  sector?: string;
  rating?: string;
  reportType?: string;
  authorId?: string;
  minTier?: string;
  limit?: number;
  offset?: number;
}

export async function listPublishedResearch(filter: ResearchListFilter = {}) {
  const conditions = [
    eq(researchReports.status, "published"),
    isNull(researchReports.deletedAt),
  ];
  if (filter.ticker) conditions.push(eq(researchReports.companyKode, filter.ticker.toUpperCase()));
  if (filter.sector) conditions.push(eq(researchReports.sectorKode, filter.sector));
  if (filter.rating) conditions.push(eq(researchReports.rating, filter.rating as never));
  if (filter.reportType) conditions.push(eq(researchReports.reportType, filter.reportType as never));
  if (filter.authorId) conditions.push(eq(researchReports.authorUserId, filter.authorId));
  if (filter.q) {
    const q = `%${filter.q}%`;
    conditions.push(
      or(
        ilike(researchReports.title, q),
        ilike(researchReports.summary, q),
        ilike(researchReports.slug, q),
        ilike(researchReports.companyKode, q),
      )!,
    );
  }

  const rows = await db
    .select({
      id: researchReports.id,
      slug: researchReports.slug,
      title: researchReports.title,
      summary: researchReports.summary,
      companyKode: researchReports.companyKode,
      companyName: companies.namaPerusahaan,
      sectorKode: researchReports.sectorKode,
      reportType: researchReports.reportType,
      rating: researchReports.rating,
      previousRating: researchReports.previousRating,
      targetPrice: researchReports.targetPrice,
      previousTargetPrice: researchReports.previousTargetPrice,
      currentPriceAtPublish: researchReports.currentPriceAtPublish,
      upsideDownsidePct: researchReports.upsideDownsidePct,
      timeHorizon: researchReports.timeHorizon,
      tags: researchReports.tags,
      coverImageUrl: researchReports.coverImageUrl,
      authorName: researchReports.authorName,
      publishedAt: researchReports.publishedAt,
      minTierRequired: researchReports.minTierRequired,
      viewCount: researchReports.viewCount,
      downloadCount: researchReports.downloadCount,
    })
    .from(researchReports)
    .leftJoin(companies, eq(companies.kode, researchReports.companyKode))
    .where(and(...conditions))
    .orderBy(desc(researchReports.publishedAt))
    .limit(filter.limit ?? 30)
    .offset(filter.offset ?? 0);

  return rows;
}

export async function getResearchBySlug(slug: string) {
  const rows = await db
    .select({
      report: researchReports,
      companyName: companies.namaPerusahaan,
      companyLogoUrl: companies.logoUrl,
    })
    .from(researchReports)
    .leftJoin(companies, eq(companies.kode, researchReports.companyKode))
    .where(
      and(
        eq(researchReports.slug, slug),
        eq(researchReports.status, "published"),
        isNull(researchReports.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function trackView(reportId: string, userId: string | null, ipHash: string | null, referer: string | null) {
  await db.insert(researchViews).values({
    reportId,
    userId,
    ipHash,
    referer,
  }).catch(() => undefined);
  await db
    .update(researchReports)
    .set({ viewCount: sql`${researchReports.viewCount} + 1` })
    .where(eq(researchReports.id, reportId))
    .catch(() => undefined);
}

export type ResearchListItem = Awaited<ReturnType<typeof listPublishedResearch>>[number];

export const RATING_DISPLAY: Record<string, { label: string; color: string; intent: "bull" | "bear" | "neutral" }> = {
  strong_buy: { label: "Strong Buy", color: "text-bull", intent: "bull" },
  buy: { label: "Buy", color: "text-bull", intent: "bull" },
  hold: { label: "Hold", color: "text-neutral", intent: "neutral" },
  sell: { label: "Sell", color: "text-bear", intent: "bear" },
  strong_sell: { label: "Strong Sell", color: "text-bear", intent: "bear" },
  not_rated: { label: "Not Rated", color: "text-muted-foreground", intent: "neutral" },
};

export const REPORT_TYPE_LABEL: Record<string, string> = {
  initiation: "Initiation",
  update: "Update",
  earnings_review: "Earnings Review",
  thematic: "Thematic",
  sector: "Sector",
  macro: "Macro",
  flash: "Flash Note",
};

export const HORIZON_LABEL: Record<string, string> = {
  short_1_3m: "1–3 bulan",
  medium_3_12m: "3–12 bulan",
  long_12m_plus: "12+ bulan",
};
