import { eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles } from "@/db/schema/news";
import { getAiClient } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

/**
 * Sentiment scorer untuk artikel financial news Indonesia.
 *
 * Strategi:
 * - Batch 10 artikel per call ke DeepSeek (cheap & fast).
 * - Output strict JSON dengan id-score-label-reason per artikel.
 * - Score [-1, 1]; label: bullish (>0.2) / neutral (-0.2..0.2) / bearish (<-0.2).
 * - Hemat token: cuma kirim title + first 200 char summary, bukan full body.
 *
 * Idempotent: hanya score artikel dengan `sentiment_analyzed_at IS NULL`.
 */

interface ArticleForScoring {
  id: string;
  title: string;
  summary: string | null;
}

interface SentimentResult {
  id: string;
  score: number;
  label: "bullish" | "neutral" | "bearish";
  reason: string;
}

const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `Anda adalah analis financial news Indonesia yang menilai sentimen artikel terhadap pasar saham IDX.

Untuk setiap artikel, output JSON object dengan:
- id: string (artikel id yang diberikan, copy persis)
- score: number antara -1.0 (sangat bearish) sampai 1.0 (sangat bullish)
- label: "bullish" | "neutral" | "bearish"
- reason: maks 80 char alasan singkat dalam Bahasa Indonesia

Aturan label:
- score > 0.2  → "bullish"
- -0.2 ≤ score ≤ 0.2 → "neutral"
- score < -0.2 → "bearish"

Output HANYA JSON array, tanpa markdown wrapper, tanpa penjelasan lain.`;

function buildUserPrompt(articles: ArticleForScoring[]): string {
  const lines = articles.map((a) => {
    const summary = (a.summary ?? "").slice(0, 200);
    return JSON.stringify({ id: a.id, title: a.title, summary });
  });
  return `Artikel yang perlu di-score:\n${lines.join("\n")}\n\nOutput JSON array sentimen untuk ${articles.length} artikel di atas.`;
}

function parseModelResponse(content: string, expectedIds: Set<string>): SentimentResult[] {
  // Coba parse langsung; kalau gagal, strip markdown fence.
  let txt = content.trim();
  if (txt.startsWith("```")) {
    txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  // Cari array bracket pertama dan terakhir.
  const start = txt.indexOf("[");
  const end = txt.lastIndexOf("]");
  if (start < 0 || end < 0) {
    throw new Error("No JSON array in model response");
  }
  const arr = JSON.parse(txt.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("Model response not an array");

  const out: SentimentResult[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const id = String(item.id ?? "");
    if (!expectedIds.has(id)) continue;
    const rawScore = Number(item.score);
    if (Number.isNaN(rawScore)) continue;
    const score = Math.max(-1, Math.min(1, rawScore));
    const label = score > 0.2 ? "bullish" : score < -0.2 ? "bearish" : "neutral";
    out.push({
      id,
      score,
      label,
      reason: String(item.reason ?? "").slice(0, 200),
    });
  }
  return out;
}

async function scoreBatch(articles: ArticleForScoring[]): Promise<SentimentResult[]> {
  const { client, config } = await getAiClient();
  const completion = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(articles) },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message.content ?? "";
  if (!content) throw new Error("Empty completion content");

  // Walaupun response_format=json_object, model bisa wrap dalam {"results":[...]}.
  let parsed: SentimentResult[];
  try {
    parsed = parseModelResponse(content, new Set(articles.map((a) => a.id)));
  } catch (err) {
    // Fallback: coba parse sebagai object dengan field array.
    const obj = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
    const arr = Array.isArray(obj) ? obj : Array.isArray(obj.results) ? obj.results : Array.isArray(obj.articles) ? obj.articles : null;
    if (!arr) throw err;
    parsed = parseModelResponse(JSON.stringify(arr), new Set(articles.map((a) => a.id)));
  }
  return parsed;
}

export async function scoreSentimentForArticles(articleIds: string[]): Promise<{ scored: number; failed: number }> {
  if (articleIds.length === 0) return { scored: 0, failed: 0 };

  const rows = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      summary: newsArticles.summary,
    })
    .from(newsArticles)
    .where(inArray(newsArticles.id, articleIds));

  if (rows.length === 0) return { scored: 0, failed: 0 };

  let scored = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      const results = await scoreBatch(batch);
      for (const r of results) {
        await db
          .update(newsArticles)
          .set({
            sentiment: r.label,
            sentimentScore: String(r.score),
            sentimentReason: r.reason,
            sentimentAnalyzedAt: new Date(),
          })
          .where(eq(newsArticles.id, r.id));
        scored += 1;
      }
      // Mark articles yang tidak ada di response (model skipped) sebagai analyzed neutral
      const scoredSet = new Set(results.map((r) => r.id));
      for (const a of batch) {
        if (!scoredSet.has(a.id)) {
          await db
            .update(newsArticles)
            .set({
              sentiment: "neutral",
              sentimentScore: "0",
              sentimentReason: "model_skipped",
              sentimentAnalyzedAt: new Date(),
            })
            .where(eq(newsArticles.id, a.id));
        }
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, batchSize: batch.length }, "Sentiment batch failed");
      failed += batch.length;
    }
  }

  return { scored, failed };
}

/**
 * Backfill — score semua artikel yang belum di-analyze.
 * Dipanggil oleh worker cron untuk catch-up kalau queue sentiment sempat di-pause.
 */
export async function scoreUnanalyzed(limit = 50): Promise<{ scored: number; failed: number }> {
  const rows = await db
    .select({ id: newsArticles.id })
    .from(newsArticles)
    .where(isNull(newsArticles.sentimentAnalyzedAt))
    .orderBy(sql`${newsArticles.publishedAt} DESC`)
    .limit(limit);

  if (rows.length === 0) return { scored: 0, failed: 0 };
  return scoreSentimentForArticles(rows.map((r) => r.id));
}
