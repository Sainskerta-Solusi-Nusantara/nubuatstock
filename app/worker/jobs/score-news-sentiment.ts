import type { Processor } from "bullmq";
import { scoreSentimentForArticles, scoreUnanalyzed } from "@/lib/news/sentiment";
import { logger } from "@/lib/logger";

/**
 * News sentiment worker.
 *
 * Job names:
 * - `score` — input `{ articleId: string }` → score satu artikel. Di-batch ke 10
 *   dengan job lain di queue yang sama via BullMQ concurrency.
 * - `backfill` — input `{ limit?: number }` → score artikel pending (sentiment_analyzed_at IS NULL).
 *
 * Note: untuk efisiensi token, kita prefer call `score` per artikel tapi underlying
 * `scoreSentimentForArticles` batch internal (size 10). Concurrency=1 di queue ini
 * supaya batch sengaja kecil dan terhindar dari rate-limit DeepSeek.
 */

export const scoreNewsSentimentProcessor: Processor = async (job) => {
  if (job.name === "backfill") {
    const data = (job.data ?? {}) as { limit?: number };
    const res = await scoreUnanalyzed(data.limit ?? 50);
    logger.info({ res }, "Sentiment backfill complete");
    return res;
  }

  const data = (job.data ?? {}) as { articleId?: string };
  if (!data.articleId) {
    return { skipped: true, reason: "no articleId" };
  }
  const res = await scoreSentimentForArticles([data.articleId]);
  return res;
};
