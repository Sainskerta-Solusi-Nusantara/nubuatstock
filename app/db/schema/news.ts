import { sql } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, softDelete, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * News domain — RSS-ingested financial news + sentiment scoring.
 *
 * - `news_sources` adalah RSS feed yang aktif (Kontan, Bisnis, CNBC ID, dll).
 *   Superadmin bisa CRUD via /superadmin/news-sources (future).
 * - `news_articles` adalah artikel hasil parse RSS, di-dedupe via (source_slug, external_id).
 * - `news_article_tickers` adalah join table untuk fast lookup "berita BBRI minggu ini".
 *   Detected via regex match nama emiten + kode di title/summary.
 * - Sentiment dianalisis batch oleh DeepSeek; `sentiment_analyzed_at` null = belum diproses.
 */

export const newsSentimentEnum = pgEnum("news_sentiment", [
  "bullish",
  "neutral",
  "bearish",
]);

export const newsSources = pgTable(
  "news_sources",
  {
    id: ulid(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    rssUrl: text("rss_url").notNull(),
    logoUrl: text("logo_url"),
    homepageUrl: text("homepage_url"),
    isActive: text("is_active", { enum: ["true", "false"] })
      .notNull()
      .default("true"),
    fetchIntervalMin: integer("fetch_interval_min").notNull().default(15),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true, mode: "date" }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: "date" }),
    fetchErrorCount: integer("fetch_error_count").notNull().default(0),
    lastErrorMessage: text("last_error_message"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("news_sources_slug_uq").on(t.slug),
    index("news_sources_active_idx").on(t.isActive),
  ],
);

export const newsArticles = pgTable(
  "news_articles",
  {
    id: ulid(),
    sourceSlug: text("source_slug").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    language: text("language").notNull().default("id"),
    categories: jsonbT<string[]>("categories").notNull().default(sql`'[]'::jsonb`),
    sentiment: newsSentimentEnum("sentiment"),
    sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }),
    sentimentReason: text("sentiment_reason"),
    sentimentAnalyzedAt: timestamp("sentiment_analyzed_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("news_articles_source_extid_uq").on(t.sourceSlug, t.externalId),
    index("news_articles_published_idx").on(t.publishedAt),
    index("news_articles_sentiment_idx").on(t.sentiment),
    index("news_articles_source_idx").on(t.sourceSlug),
    index("news_articles_pending_sentiment_idx").on(t.sentimentAnalyzedAt),
  ],
);

/**
 * Join table — satu artikel bisa membahas banyak emiten.
 * Relevance 0–1 (1 = pasti subject artikel, 0.3 = disebut sekilas).
 */
export const newsArticleTickers = pgTable(
  "news_article_tickers",
  {
    articleId: ulidRef("article_id"),
    companyKode: text("company_kode").notNull(),
    relevance: numeric("relevance", { precision: 3, scale: 2 })
      .notNull()
      .default("1.0"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("news_article_tickers_uq").on(t.articleId, t.companyKode),
    index("news_article_tickers_kode_idx").on(t.companyKode),
    index("news_article_tickers_article_idx").on(t.articleId),
  ],
);
