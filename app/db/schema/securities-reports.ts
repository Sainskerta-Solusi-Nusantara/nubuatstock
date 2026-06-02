import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";

/**
 * Riset/insight dari sekuritas (agregator) — mis. Daily Keycalls Henan.
 *
 * Nubuat = agregator: tampilkan daftar riset publik dari berbagai sekuritas
 * dengan atribusi SUMBER (teks, tanpa logo) + tautan ke sumber asli. Konten
 * milik sekuritas; kita tidak klaim sebagai milik sendiri.
 *
 * Diisi via fetcher per-sumber (mis. Henan via Strapi) atau kurasi admin.
 */
export const securitiesReports = pgTable(
  "securities_reports",
  {
    id: ulid(),
    securities: text("securities").notNull(), // nama sekuritas (sumber)
    externalId: text("external_id").notNull(), // id unik di sumber (mis. "henan:974")
    title: text("title").notNull(),
    category: text("category"), // mis. "Keycalls", "Daily", "Macro"
    categoryType: text("category_type"), // mis. "Technical", "Fundamental"
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    pdfUrl: text("pdf_url"),
    thumbnailUrl: text("thumbnail_url"),
    sourceUrl: text("source_url"), // halaman sumber
    isMemberOnly: integer("is_member_only").notNull().default(0), // 0/1
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("securities_reports_uq").on(t.securities, t.externalId),
    index("securities_reports_pub_idx").on(t.publishedAt),
    index("securities_reports_sec_idx").on(t.securities),
  ],
);

export type SecuritiesReport = typeof securitiesReports.$inferSelect;
export type NewSecuritiesReport = typeof securitiesReports.$inferInsert;
