import { db } from "@/lib/db";
import { newsArticles, newsArticleTickers } from "@/db/schema/news";
import { detectTickersForArticle } from "@/lib/news/ticker-detect";

(async () => {
  const arts = await db.select({ id: newsArticles.id, title: newsArticles.title, summary: newsArticles.summary }).from(newsArticles);
  let tagged = 0, rows = 0;
  for (const a of arts) {
    const tickers = await detectTickersForArticle(a.title, a.summary ?? "");
    if (tickers.length === 0) continue;
    await db.insert(newsArticleTickers).values(
      tickers.map((t) => ({ articleId: a.id, companyKode: t.kode, relevance: String(t.relevance) })),
    ).onConflictDoNothing();
    tagged += 1; rows += tickers.length;
  }
  console.log(`RESULT: articles=${arts.length} tagged=${tagged} tickerRows=${rows}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
