import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps, softDelete } from "./_base";
import { companies } from "./companies";
import { users } from "./auth";

/**
 * Modul Riset — laporan analisis ala sell-side sekuritas.
 *
 * Struktur mengikuti pola industri (universal, bukan proprietary):
 *   - Header: ticker, rating, target price, time horizon
 *   - Executive summary (bullets)
 *   - Investment thesis
 *   - Catalyst
 *   - Valuation methodology
 *   - Risk factors
 *   - Financial snapshot
 *   - Analyst & disclaimer
 *
 * Author = user dengan role analyst | admin | superadmin.
 * Status workflow: draft → review → published → archived
 */

export const researchRatingEnum = pgEnum("research_rating", [
  "strong_buy",
  "buy",
  "hold",
  "sell",
  "strong_sell",
  "not_rated",
]);

export const researchStatusEnum = pgEnum("research_status", [
  "draft",
  "review",
  "published",
  "archived",
]);

export const researchTimeHorizonEnum = pgEnum("research_time_horizon", [
  "short_1_3m",
  "medium_3_12m",
  "long_12m_plus",
]);

export const researchReportTypeEnum = pgEnum("research_report_type", [
  "initiation",
  "update",
  "earnings_review",
  "thematic",
  "sector",
  "macro",
  "flash",
]);

export interface ReportSection {
  /** Slug pengenal section: e.g. "exec_summary", "thesis", "catalyst", "valuation", "risk", "financials" */
  key: string;
  /** Judul yang ditampilkan */
  title: string;
  /** Markdown content */
  content: string;
  /** Urutan render */
  order: number;
}

export interface ValuationDetail {
  method: "dcf" | "pe_relative" | "pbv_relative" | "sum_of_parts" | "dividend_discount" | "ev_ebitda" | "other";
  description?: string;
  assumptions?: Record<string, unknown>;
  computedTargetPrice?: number;
}

/**
 * Master report.
 */
export const researchReports = pgTable(
  "research_reports",
  {
    id: ulid(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),

    // Subject — single-ticker atau thematic (multi-ticker).
    companyKode: text("company_kode").references(() => companies.kode, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    relatedTickers: jsonbT<string[]>("related_tickers").default([]).notNull(),
    sectorKode: text("sector_kode"),

    reportType: researchReportTypeEnum("report_type").notNull().default("update"),

    // Recommendation
    rating: researchRatingEnum("rating").notNull().default("not_rated"),
    previousRating: researchRatingEnum("previous_rating"),
    timeHorizon: researchTimeHorizonEnum("time_horizon").notNull().default("medium_3_12m"),

    // Prices
    currentPriceAtPublish: numeric("current_price_at_publish"),
    targetPrice: numeric("target_price"),
    previousTargetPrice: numeric("previous_target_price"),
    upsideDownsidePct: numeric("upside_downside_pct"), // (target - current) / current

    // Summary
    summary: text("summary").notNull(), // 1-2 paragraph executive summary
    keyHighlights: jsonbT<string[]>("key_highlights").default([]).notNull(), // 3-5 bullet points

    // Body — array of sections (markdown)
    sections: jsonbT<ReportSection[]>("sections").default([]).notNull(),

    // Valuation
    valuationMethod: text("valuation_method"),
    valuationDetail: jsonbT<ValuationDetail>("valuation_detail"),

    // Risk
    riskFactors: jsonbT<string[]>("risk_factors").default([]).notNull(),

    // Catalysts
    catalysts: jsonbT<string[]>("catalysts").default([]).notNull(),

    // Financial snapshot (denormalized for PDF gen speed)
    financialSnapshot: jsonbT<{
      revenue?: number;
      revenueGrowth?: number;
      netIncome?: number;
      netIncomeGrowth?: number;
      eps?: number;
      pe?: number;
      pbv?: number;
      roe?: number;
      debtToEquity?: number;
      dividendYield?: number;
      asOfDate?: string;
    }>("financial_snapshot"),

    // Tags & meta
    tags: jsonbT<string[]>("tags").default([]).notNull(),
    coverImageUrl: text("cover_image_url"),

    // Author
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authorName: text("author_name").notNull(), // denormalized for display kalau user di-soft-delete

    // Workflow
    status: researchStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),

    // Tier-gate access
    minTierRequired: text("min_tier_required").notNull().default("free"), // free|starter|pro|elite

    // Distribution
    pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true, mode: "date" }),
    pdfFileSize: integer("pdf_file_size"),

    // Analytics counters (denormalized — di-update by trigger atau on-demand)
    viewCount: integer("view_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),

    // SEO
    metaDescription: text("meta_description"),

    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("research_reports_slug_uq").on(t.slug),
    index("research_reports_company_idx").on(t.companyKode),
    index("research_reports_status_idx").on(t.status),
    index("research_reports_status_published_idx").on(t.status, t.publishedAt),
    index("research_reports_author_idx").on(t.authorUserId),
    index("research_reports_rating_idx").on(t.rating),
    index("research_reports_sector_idx").on(t.sectorKode),
  ],
);

/**
 * Riwayat view per user (untuk analytics + recently-viewed).
 */
export const researchViews = pgTable(
  "research_views",
  {
    id: ulid(),
    reportId: text("report_id")
      .notNull()
      .references(() => researchReports.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }), // null for anonymous
    ipHash: text("ip_hash"),
    viewedAt: timestamp("viewed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    durationSeconds: integer("duration_seconds"),
    referer: text("referer"),
  },
  (t) => [
    index("research_views_report_idx").on(t.reportId),
    index("research_views_user_idx").on(t.userId),
    index("research_views_viewed_at_idx").on(t.viewedAt),
  ],
);

/**
 * Riwayat download PDF (untuk analytics + rate limit).
 */
export const researchDownloads = pgTable(
  "research_downloads",
  {
    id: ulid(),
    reportId: text("report_id")
      .notNull()
      .references(() => researchReports.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    fileSize: integer("file_size"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("research_downloads_report_idx").on(t.reportId),
    index("research_downloads_user_idx").on(t.userId),
    index("research_downloads_user_time_idx").on(t.userId, t.downloadedAt),
  ],
);

export type ResearchReport = typeof researchReports.$inferSelect;
export type NewResearchReport = typeof researchReports.$inferInsert;
export type ResearchView = typeof researchViews.$inferSelect;
export type ResearchDownload = typeof researchDownloads.$inferSelect;
