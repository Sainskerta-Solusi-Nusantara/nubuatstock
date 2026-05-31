import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";

export const revalidate = 3600; // 1 jam — sitemap di-refresh per jam

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  // Halaman publik statis (tanpa duplikat; hanya rute yang benar-benar ada di app/).
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/saham`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/picks-archive`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/glossary`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/books`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/status`, lastModified: now, changeFrequency: "weekly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/disclaimer`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Halaman emiten publik (dinamis dari DB) -> /saham/[kode]
  let sahamEntries: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ kode: companies.kode })
      .from(companies)
      .where(eq(companies.isActive, true))
      .limit(5000);
    sahamEntries = rows.map((r) => ({
      url: `${base}/saham/${r.kode}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    // DB tak tersedia — kembalikan statis saja.
  }

  return [...staticEntries, ...sahamEntries];
}
