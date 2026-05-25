import { and, desc, eq, gte, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticleTickers, newsArticles, newsSources } from "@/db/schema/news";
import { companies } from "@/db/schema/companies";
import { cached, CACHE_TAGS, CACHE_TTL } from "@/lib/cache";

export interface NewsListItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: Date;
  sourceSlug: string;
  sourceName: string;
  sourceLogo: string | null;
  sentiment: "bullish" | "neutral" | "bearish" | null;
  sentimentScore: number | null;
  sentimentReason: string | null;
  tickers: Array<{ kode: string; relevance: number; namaPerusahaan: string | null }>;
}

export interface NewsListFilters {
  source?: string;
  sentiment?: "bullish" | "neutral" | "bearish";
  ticker?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const sourceCache = new Map<string, { name: string; logo: string | null }>();
let sourceCacheLoadedAt = 0;
const SOURCE_TTL = 5 * 60 * 1000;

async function getSourceMap(): Promise<Map<string, { name: string; logo: string | null }>> {
  if (Date.now() - sourceCacheLoadedAt < SOURCE_TTL && sourceCache.size > 0) return sourceCache;
  sourceCache.clear();
  const rows = await db.select().from(newsSources);
  for (const r of rows) sourceCache.set(r.slug, { name: r.name, logo: r.logoUrl });
  sourceCacheLoadedAt = Date.now();
  return sourceCache;
}

async function listNewsRaw(filters: NewsListFilters = {}): Promise<NewsListItem[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  const conditions = [] as ReturnType<typeof eq>[];

  if (filters.source) conditions.push(eq(newsArticles.sourceSlug, filters.source));
  if (filters.sentiment) conditions.push(eq(newsArticles.sentiment, filters.sentiment));
  if (filters.search) {
    conditions.push(ilike(newsArticles.title, `%${filters.search}%`));
  }

  // Filter by ticker via subquery on join table.
  if (filters.ticker) {
    const tickerSub = db
      .select({ articleId: newsArticleTickers.articleId })
      .from(newsArticleTickers)
      .where(eq(newsArticleTickers.companyKode, filters.ticker.toUpperCase()));
    conditions.push(inArray(newsArticles.id, tickerSub));
  }

  const rows = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      summary: newsArticles.summary,
      url: newsArticles.url,
      imageUrl: newsArticles.imageUrl,
      publishedAt: newsArticles.publishedAt,
      sourceSlug: newsArticles.sourceSlug,
      sentiment: newsArticles.sentiment,
      sentimentScore: newsArticles.sentimentScore,
      sentimentReason: newsArticles.sentimentReason,
    })
    .from(newsArticles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return [];

  // Batch-fetch tickers per article.
  const articleIds = rows.map((r) => r.id);
  const tickerRows = await db
    .select({
      articleId: newsArticleTickers.articleId,
      kode: newsArticleTickers.companyKode,
      relevance: newsArticleTickers.relevance,
      namaPerusahaan: companies.namaPerusahaan,
    })
    .from(newsArticleTickers)
    .leftJoin(companies, eq(companies.kode, newsArticleTickers.companyKode))
    .where(inArray(newsArticleTickers.articleId, articleIds));

  const tickerMap = new Map<string, Array<{ kode: string; relevance: number; namaPerusahaan: string | null }>>();
  for (const t of tickerRows) {
    const arr = tickerMap.get(t.articleId) ?? [];
    arr.push({
      kode: t.kode,
      relevance: Number(t.relevance),
      namaPerusahaan: t.namaPerusahaan ?? null,
    });
    tickerMap.set(t.articleId, arr);
  }

  const sourceMap = await getSourceMap();

  return rows.map((r) => {
    const src = sourceMap.get(r.sourceSlug);
    return {
      id: r.id,
      title: r.title,
      summary: r.summary,
      url: r.url,
      imageUrl: r.imageUrl,
      publishedAt: r.publishedAt,
      sourceSlug: r.sourceSlug,
      sourceName: src?.name ?? r.sourceSlug,
      sourceLogo: src?.logo ?? null,
      sentiment: r.sentiment,
      sentimentScore: r.sentimentScore != null ? Number(r.sentimentScore) : null,
      sentimentReason: r.sentimentReason,
      tickers: (tickerMap.get(r.id) ?? []).sort((a, b) => b.relevance - a.relevance),
    };
  });
}

export interface NewsStats {
  totalArticles: number;
  bullish: number;
  neutral: number;
  bearish: number;
  pending: number;
  perSource: Array<{ slug: string; name: string; count: number; lastSuccessAt: Date | null }>;
}

async function getNewsStatsRaw(windowHours = 24): Promise<NewsStats> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);

  const counts = await db
    .select({
      sentiment: newsArticles.sentiment,
      n: sql<number>`count(*)::int`,
    })
    .from(newsArticles)
    .where(gte(newsArticles.publishedAt, since))
    .groupBy(newsArticles.sentiment);

  let bullish = 0, neutral = 0, bearish = 0, pending = 0, totalArticles = 0;
  for (const c of counts) {
    totalArticles += c.n;
    if (c.sentiment === "bullish") bullish = c.n;
    else if (c.sentiment === "neutral") neutral = c.n;
    else if (c.sentiment === "bearish") bearish = c.n;
    else pending = c.n;
  }

  const perSourceRows = await db
    .select({
      slug: newsArticles.sourceSlug,
      count: sql<number>`count(*)::int`,
    })
    .from(newsArticles)
    .where(gte(newsArticles.publishedAt, since))
    .groupBy(newsArticles.sourceSlug);

  const sourceMap = await getSourceMap();
  const sourceMeta = await db.select().from(newsSources);
  const metaMap = new Map(sourceMeta.map((s) => [s.slug, s.lastSuccessAt]));

  const perSource = perSourceRows
    .map((r) => ({
      slug: r.slug,
      name: sourceMap.get(r.slug)?.name ?? r.slug,
      count: r.count,
      lastSuccessAt: metaMap.get(r.slug) ?? null,
    }))
    .sort((a, b) => b.count - a.count);

  return { totalArticles, bullish, neutral, bearish, pending, perSource };
}

async function countNewsRaw(filters: NewsListFilters = {}): Promise<number> {
  const conditions = [] as ReturnType<typeof eq>[];
  if (filters.source) conditions.push(eq(newsArticles.sourceSlug, filters.source));
  if (filters.sentiment) conditions.push(eq(newsArticles.sentiment, filters.sentiment));
  if (filters.search) conditions.push(ilike(newsArticles.title, `%${filters.search}%`));
  if (filters.ticker) {
    const tickerSub = db
      .select({ articleId: newsArticleTickers.articleId })
      .from(newsArticleTickers)
      .where(eq(newsArticleTickers.companyKode, filters.ticker.toUpperCase()));
    conditions.push(inArray(newsArticles.id, tickerSub));
  }
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(newsArticles)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return row?.n ?? 0;
}

export async function listActiveSources(): Promise<Array<{ slug: string; name: string; logoUrl: string | null }>> {
  const rows = await db
    .select({
      slug: newsSources.slug,
      name: newsSources.name,
      logoUrl: newsSources.logoUrl,
    })
    .from(newsSources)
    .where(eq(newsSources.isActive, "true"));
  return rows;
}

// Cached wrappers — News flow ingest tiap 15 menit; cache 60s safe untuk near-real-time.
export const listNews = cached(listNewsRaw, "listNews", {
  revalidate: CACHE_TTL.newsList,
  tags: [CACHE_TAGS.news],
});

export const getNewsStats = cached(getNewsStatsRaw, "getNewsStats", {
  revalidate: CACHE_TTL.newsStats,
  tags: [CACHE_TAGS.news],
});

export const countNews = cached(countNewsRaw, "countNews", {
  revalidate: CACHE_TTL.newsList,
  tags: [CACHE_TAGS.news],
});
