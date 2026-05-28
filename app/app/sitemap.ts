import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { researchReports } from "@/db/schema/research";

export const revalidate = 3600; // 1 jam — sitemap di-refresh per jam

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/research`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/glossary`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/subscription`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/disclaimer`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic: published research reports
  let researchEntries: MetadataRoute.Sitemap = [];
  try {
    const reports = await db
      .select({
        slug: researchReports.slug,
        publishedAt: researchReports.publishedAt,
        updatedAt: researchReports.updatedAt,
      })
      .from(researchReports)
      .where(
        and(
          eq(researchReports.status, "published"),
          isNull(researchReports.deletedAt),
        ),
      )
      .limit(5000);

    researchEntries = reports.map((r) => ({
      url: `${base}/research/${r.slug}`,
      lastModified: r.updatedAt ?? r.publishedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — return static only
  }

  return [...staticEntries, ...researchEntries];
}
