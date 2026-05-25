import type { Processor } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles, newsArticleTickers, newsSources } from "@/db/schema/news";
import { fetchRss } from "@/lib/news/rss-parser";
import { detectTickersForArticle } from "@/lib/news/ticker-detect";
import { logger } from "@/lib/logger";
import { getQueue } from "@/lib/queue";

/**
 * News ingest worker.
 *
 * Job names:
 * - `scheduled.all` — iterate semua source aktif, fetch RSS, upsert artikel.
 * - `single` — fetch satu source berdasarkan `data.sourceSlug`.
 *
 * Per artikel: detect tickers → insert article + tickers row. Sentiment di-enqueue
 * ke `news.sentiment` (separate worker) supaya RSS fetch tidak terblock LLM latency.
 */

interface IngestResult {
  source: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

const stripHtml = (s: string): string =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function ingestSource(slug: string): Promise<IngestResult> {
  const result: IngestResult = { source: slug, fetched: 0, inserted: 0, skipped: 0, errors: [] };

  const [source] = await db
    .select()
    .from(newsSources)
    .where(and(eq(newsSources.slug, slug), eq(newsSources.isActive, "true")))
    .limit(1);

  if (!source) {
    result.errors.push("source_not_found_or_inactive");
    return result;
  }

  let items;
  try {
    items = await fetchRss(source.rssUrl, { timeoutMs: 20_000 });
  } catch (err) {
    const msg = (err as Error).message;
    logger.warn({ slug, err: msg }, "RSS fetch failed");
    result.errors.push(msg);
    await db
      .update(newsSources)
      .set({
        lastFetchedAt: new Date(),
        fetchErrorCount: sql`${newsSources.fetchErrorCount} + 1`,
        lastErrorMessage: msg.slice(0, 500),
      })
      .where(eq(newsSources.slug, slug));
    return result;
  }

  result.fetched = items.length;

  for (const item of items) {
    try {
      const title = stripHtml(item.title).slice(0, 500);
      const summary = stripHtml(item.description).slice(0, 2000);
      const publishedAt = item.pubDate ?? new Date();
      const externalId = (item.guid || item.link).slice(0, 500);

      // Upsert article — returning id supaya kita bisa attach tickers.
      const inserted = await db
        .insert(newsArticles)
        .values({
          sourceSlug: slug,
          externalId,
          title,
          summary: summary || null,
          url: item.link,
          imageUrl: item.imageUrl,
          publishedAt,
          fetchedAt: new Date(),
          language: "id",
        })
        .onConflictDoNothing({ target: [newsArticles.sourceSlug, newsArticles.externalId] })
        .returning({ id: newsArticles.id, title: newsArticles.title });

      if (inserted.length === 0) {
        result.skipped += 1;
        continue;
      }

      const articleId = inserted[0]!.id;

      // Detect tickers.
      const tickers = await detectTickersForArticle(title, summary);
      if (tickers.length > 0) {
        await db
          .insert(newsArticleTickers)
          .values(
            tickers.map((t) => ({
              articleId,
              companyKode: t.kode,
              relevance: String(t.relevance),
            })),
          )
          .onConflictDoNothing();
      }

      // Enqueue sentiment scoring (separate queue for latency isolation).
      try {
        await getQueue("news.sentiment").add(
          "score",
          { articleId },
          { attempts: 3, backoff: { type: "exponential", delay: 10_000 } },
        );
      } catch (err) {
        logger.warn({ articleId, err: (err as Error).message }, "Failed to enqueue sentiment job");
      }

      result.inserted += 1;
    } catch (err) {
      const msg = (err as Error).message;
      result.errors.push(msg.slice(0, 200));
      logger.warn({ slug, err: msg, title: item.title.slice(0, 60) }, "Article insert failed");
    }
  }

  // Mark source success.
  await db
    .update(newsSources)
    .set({
      lastFetchedAt: new Date(),
      lastSuccessAt: new Date(),
      fetchErrorCount: 0,
      lastErrorMessage: null,
    })
    .where(eq(newsSources.slug, slug));

  return result;
}

export const ingestNewsProcessor: Processor = async (job) => {
  const data = (job.data ?? {}) as { sourceSlug?: string };

  if (data.sourceSlug) {
    const r = await ingestSource(data.sourceSlug);
    logger.info({ result: r }, "News ingest single source done");
    return r;
  }

  // Default: all active sources.
  const sources = await db
    .select({ slug: newsSources.slug })
    .from(newsSources)
    .where(eq(newsSources.isActive, "true"));

  const results: IngestResult[] = [];
  for (const s of sources) {
    const r = await ingestSource(s.slug);
    results.push(r);
  }

  const summary = {
    sources: results.length,
    totalFetched: results.reduce((a, b) => a + b.fetched, 0),
    totalInserted: results.reduce((a, b) => a + b.inserted, 0),
    totalSkipped: results.reduce((a, b) => a + b.skipped, 0),
    perSource: results,
  };
  logger.info({ summary }, "News ingest cycle complete");
  return summary;
};
