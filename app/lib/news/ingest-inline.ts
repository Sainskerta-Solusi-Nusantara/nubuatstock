import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles, newsArticleTickers, newsSources } from "@/db/schema/news";
import { fetchRss } from "./rss-parser";
import { detectTickersForArticle } from "./ticker-detect";
import { logger } from "@/lib/logger";

/**
 * Ingest berita INLINE (tanpa worker/Redis) — dipakai untuk refresh manual
 * (endpoint superadmin) & saat worker belum di-deploy. Sama dengan job
 * `worker/jobs/ingest-news.ts` tapi TANPA enqueue sentiment (skip; sentiment
 * tetap null sampai worker aktif).
 */

const stripHtml = (s: string): string =>
  s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

export interface InlineIngestResult {
  sources: number;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

export async function ingestAllNewsInline(): Promise<InlineIngestResult> {
  const out: InlineIngestResult = { sources: 0, fetched: 0, inserted: 0, skipped: 0, errors: [] };

  const sources = await db.select().from(newsSources).where(eq(newsSources.isActive, "true"));
  out.sources = sources.length;

  for (const source of sources) {
    let items;
    try {
      items = await fetchRss(source.rssUrl, { timeoutMs: 20_000 });
    } catch (err) {
      const msg = (err as Error).message;
      out.errors.push(`${source.slug}: ${msg}`);
      await db.update(newsSources).set({ lastFetchedAt: new Date(), lastErrorMessage: msg.slice(0, 500) }).where(eq(newsSources.slug, source.slug));
      continue;
    }
    out.fetched += items.length;

    for (const item of items) {
      try {
        const title = stripHtml(item.title).slice(0, 500);
        const summary = stripHtml(item.description).slice(0, 2000);
        const publishedAt = item.pubDate ?? new Date();
        const externalId = (item.guid || item.link).slice(0, 500);

        const inserted = await db
          .insert(newsArticles)
          .values({
            sourceSlug: source.slug,
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
          .returning({ id: newsArticles.id });

        if (inserted.length === 0) { out.skipped += 1; continue; }

        const articleId = inserted[0]!.id;
        const tickers = await detectTickersForArticle(title, summary);
        if (tickers.length > 0) {
          await db.insert(newsArticleTickers).values(
            tickers.map((t) => ({ articleId, companyKode: t.kode, relevance: String(t.relevance) })),
          ).onConflictDoNothing();
        }
        out.inserted += 1;
      } catch (err) {
        out.errors.push((err as Error).message.slice(0, 150));
      }
    }

    await db.update(newsSources).set({ lastFetchedAt: new Date(), lastSuccessAt: new Date() }).where(eq(newsSources.slug, source.slug));
  }

  logger.info(out, "news inline ingest done");
  return out;
}
