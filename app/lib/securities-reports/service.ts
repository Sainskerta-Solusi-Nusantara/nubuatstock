import { and, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { securitiesReports, type SecuritiesReport } from "@/db/schema/securities-reports";
import { logger } from "@/lib/logger";
import { fetchAllReports } from "./fetch";

export interface ReportsIngestResult {
  fetched: number;
  upserted: number;
  errors: string[];
}

/** Fetch semua sumber + upsert ke DB (idempotent per securities+externalId). */
export async function refreshSecuritiesReports(limit = 60): Promise<ReportsIngestResult> {
  const { rows, errors } = await fetchAllReports(limit);
  const now = new Date();
  let upserted = 0;
  for (const r of rows) {
    await db
      .insert(securitiesReports)
      .values({
        securities: r.securities,
        externalId: r.externalId,
        title: r.title,
        category: r.category,
        categoryType: r.categoryType,
        publishedAt: r.publishedAt,
        pdfUrl: r.pdfUrl,
        thumbnailUrl: r.thumbnailUrl,
        sourceUrl: r.sourceUrl,
        isMemberOnly: r.isMemberOnly ? 1 : 0,
        fetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [securitiesReports.securities, securitiesReports.externalId],
        set: {
          title: r.title,
          category: r.category,
          categoryType: r.categoryType,
          publishedAt: r.publishedAt,
          pdfUrl: r.pdfUrl,
          thumbnailUrl: r.thumbnailUrl,
          isMemberOnly: r.isMemberOnly ? 1 : 0,
          fetchedAt: now,
          updatedAt: now,
        },
      });
    upserted += 1;
  }
  logger.info({ fetched: rows.length, upserted, errors }, "securities reports refreshed");
  return { fetched: rows.length, upserted, errors };
}

export async function listSecuritiesReports(opts: {
  q?: string;
  securities?: string;
  limit?: number;
}): Promise<SecuritiesReport[]> {
  const conds = [];
  if (opts.q) conds.push(ilike(securitiesReports.title, `%${opts.q.trim()}%`));
  if (opts.securities) conds.push(eq(securitiesReports.securities, opts.securities));
  const where = conds.length ? and(...conds) : undefined;
  return db
    .select()
    .from(securitiesReports)
    .where(where)
    .orderBy(desc(securitiesReports.publishedAt))
    .limit(Math.min(300, opts.limit ?? 100));
}

export async function countSecuritiesReports(): Promise<{ total: number; sources: number }> {
  const [tot] = await db.select({ n: sql<number>`count(*)::int` }).from(securitiesReports);
  const srcs = await db.select({ s: securitiesReports.securities }).from(securitiesReports).groupBy(securitiesReports.securities);
  return { total: tot?.n ?? 0, sources: srcs.length };
}
