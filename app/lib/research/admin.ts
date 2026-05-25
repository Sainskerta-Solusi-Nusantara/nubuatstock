import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { researchReports } from "@/db/schema/research";

/**
 * Admin-side helpers untuk research CRUD.
 * Bedanya dengan service.ts: ini bypass `status = "published"` filter — admin
 * bisa melihat & edit draft/review/archived juga.
 */

export interface AdminListFilter {
  status?: "draft" | "review" | "published" | "archived";
  authorUserId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listAdminResearch(filter: AdminListFilter = {}) {
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

  const rows = await db
    .select({
      id: researchReports.id,
      slug: researchReports.slug,
      title: researchReports.title,
      companyKode: researchReports.companyKode,
      reportType: researchReports.reportType,
      rating: researchReports.rating,
      targetPrice: researchReports.targetPrice,
      status: researchReports.status,
      minTierRequired: researchReports.minTierRequired,
      authorName: researchReports.authorName,
      publishedAt: researchReports.publishedAt,
      viewCount: researchReports.viewCount,
      downloadCount: researchReports.downloadCount,
      updatedAt: researchReports.updatedAt,
    })
    .from(researchReports)
    .where(and(...conditions))
    .orderBy(desc(researchReports.updatedAt))
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);

  return rows;
}

export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: researchReports.status, cnt: count() })
    .from(researchReports)
    .where(isNull(researchReports.deletedAt))
    .groupBy(researchReports.status);
  const out: Record<string, number> = { draft: 0, review: 0, published: 0, archived: 0 };
  for (const r of rows) out[r.status] = Number(r.cnt);
  return out;
}

export async function getAdminResearchById(id: string) {
  const rows = await db
    .select()
    .from(researchReports)
    .where(and(eq(researchReports.id, id), isNull(researchReports.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export function slugify(title: string, ticker?: string | null): string {
  const base = (ticker ? `${ticker}-` : "") + title;
  return base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 50; i++) {
    const existing = await db
      .select({ id: researchReports.id })
      .from(researchReports)
      .where(eq(researchReports.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    if (excludeId && existing[0]!.id === excludeId) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}
