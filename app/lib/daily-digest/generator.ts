import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dailyDigests,
  type DigestCalendarEvent,
  type DigestNews,
  type DigestSectorMover,
  type DigestTopPick,
} from "@/db/schema/daily-digest";
import { dailyPicks } from "@/db/schema/picks";
import { companies } from "@/db/schema/companies";
import { newsArticleTickers, newsArticles } from "@/db/schema/news";
import { quotesEod } from "@/db/schema/market";
import { dividends, corporateActions } from "@/db/schema/companies";
import { getAiClient } from "@/lib/ai/client";
import { getSectorMetrics } from "@/lib/sectors/service";
import { logger } from "@/lib/logger";

/**
 * AI-generated daily digest.
 *
 * Algorithm:
 *   1. Aggregate market outlook data: IHSG return, sector heatmap top movers, news flow sentiment
 *   2. Pull top 5 daily picks
 *   3. Pull top 5 news 24h (sorted by ticker mention count + sentiment magnitude)
 *   4. Pull upcoming corporate actions 7d
 *   5. Generate AI narrative: 1-paragraph market outlook + catchy headline
 *   6. Persist to daily_digests
 *
 * Token economy: ~800 input tokens, ~300 output tokens per digest. Run sekali per hari pagi.
 */

const MAX_TOP_PICKS = 5;
const MAX_TOP_NEWS = 5;
const MAX_SECTOR_MOVERS = 6;
const UPCOMING_CALENDAR_DAYS = 7;

interface MarketContext {
  ihsgReturn1d: number | null;
  bullishSectors: number;
  bearishSectors: number;
  topGainerSector: string | null;
  topLoserSector: string | null;
  bullishNewsCount: number;
  bearishNewsCount: number;
}

async function gatherMarketContext(): Promise<{ context: MarketContext; sectorMovers: DigestSectorMover[] }> {
  const sectors = await getSectorMetrics();

  const sorted = [...sectors]
    .filter((s) => s.avgReturn1d != null)
    .sort((a, b) => (b.avgReturn1d ?? 0) - (a.avgReturn1d ?? 0));

  const bullishSectors = sorted.filter((s) => (s.avgReturn1d ?? 0) > 0).length;
  const bearishSectors = sorted.filter((s) => (s.avgReturn1d ?? 0) < 0).length;
  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];

  // News 24h sentiment count
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const newsAgg = await db
    .select({
      sentiment: newsArticles.sentiment,
      n: sql<number>`count(*)::int`,
    })
    .from(newsArticles)
    .where(gte(newsArticles.publishedAt, since24h))
    .groupBy(newsArticles.sentiment);

  let bullishNews = 0;
  let bearishNews = 0;
  for (const r of newsAgg) {
    if (r.sentiment === "bullish") bullishNews = r.n;
    else if (r.sentiment === "bearish") bearishNews = r.n;
  }

  // Use IHSG proxy: average return of large-cap (Finance + Industrials weighted)
  const ihsgReturn = sectors.length > 0
    ? sectors.reduce((acc, s) => acc + (s.avgReturn1d ?? 0) * s.totalMarketCapIdr, 0) /
      sectors.reduce((acc, s) => acc + s.totalMarketCapIdr, 0)
    : null;

  const sectorMovers: DigestSectorMover[] = sorted
    .slice(0, MAX_SECTOR_MOVERS)
    .map((s) => ({
      sectorKode: s.kode,
      sectorName: s.nama,
      returnPct: s.avgReturn1d ?? 0,
      topGainerKode: s.topGainerKode,
    }));

  return {
    context: {
      ihsgReturn1d: ihsgReturn,
      bullishSectors,
      bearishSectors,
      topGainerSector: topGainer?.nama ?? null,
      topLoserSector: topLoser?.nama ?? null,
      bullishNewsCount: bullishNews,
      bearishNewsCount: bearishNews,
    },
    sectorMovers,
  };
}

async function gatherTopPicks(): Promise<DigestTopPick[]> {
  const today = new Date().toISOString().slice(0, 10);
  // Get latest tradeDate kalau today belum ada picks
  const [latestRun] = await db
    .select({ tradeDate: dailyPicks.tradeDate })
    .from(dailyPicks)
    .orderBy(desc(dailyPicks.tradeDate))
    .limit(1);
  const useDate = latestRun?.tradeDate ?? today;

  const rows = await db
    .select({
      kode: dailyPicks.companyKode,
      nama: companies.namaPerusahaan,
      entryLow: dailyPicks.entryZoneLow,
      entryHigh: dailyPicks.entryZoneHigh,
      stopLoss: dailyPicks.stopLoss,
      tp1: dailyPicks.tp1,
      score: dailyPicks.score,
      narrative: dailyPicks.narrativeText,
    })
    .from(dailyPicks)
    .leftJoin(companies, eq(companies.kode, dailyPicks.companyKode))
    .where(eq(dailyPicks.tradeDate, useDate))
    .orderBy(desc(dailyPicks.score))
    .limit(MAX_TOP_PICKS);

  return rows.map((r) => ({
    kode: r.kode,
    namaPerusahaan: r.nama ?? r.kode,
    entryPrice: r.entryLow ? (Number(r.entryLow) + Number(r.entryHigh)) / 2 : 0,
    stopLoss: r.stopLoss ? Number(r.stopLoss) : 0,
    targetPrice: r.tp1 ? Number(r.tp1) : 0,
    confidence: r.score ? Number(r.score) : 0,
    reasoning: r.narrative ? r.narrative.slice(0, 200) : "—",
  }));
}

async function gatherTopNews(): Promise<DigestNews[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const rows = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      url: newsArticles.url,
      source: newsArticles.sourceSlug,
      sentiment: newsArticles.sentiment,
      sentimentScore: newsArticles.sentimentScore,
    })
    .from(newsArticles)
    .where(gte(newsArticles.publishedAt, since))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(50);

  // Score by sentiment magnitude (prefer strong signals) + ticker mention bonus
  const scored = await Promise.all(
    rows.map(async (r) => {
      const tickers = await db
        .select({ kode: newsArticleTickers.companyKode })
        .from(newsArticleTickers)
        .where(eq(newsArticleTickers.articleId, r.id));
      const sentMag = r.sentimentScore ? Math.abs(Number(r.sentimentScore)) : 0;
      const tickerBoost = tickers.length * 0.1;
      return {
        ...r,
        tickers: tickers.map((t) => t.kode),
        score: sentMag + tickerBoost,
      };
    }),
  );

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_TOP_NEWS).map((r) => ({
    title: r.title,
    source: r.source,
    url: r.url,
    sentiment: r.sentiment as "bullish" | "neutral" | "bearish" | null,
    tickers: r.tickers,
  }));
}

async function gatherUpcomingCalendar(): Promise<DigestCalendarEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const futureDate = new Date(Date.now() + UPCOMING_CALENDAR_DAYS * 86400000).toISOString().slice(0, 10);

  const divs = await db
    .select({
      date: dividends.exDate,
      ticker: dividends.companyKode,
      amount: dividends.dividendPerShareIdr,
      period: dividends.period,
    })
    .from(dividends)
    .where(and(gte(dividends.exDate, today), sql`${dividends.exDate} <= ${futureDate}`))
    .orderBy(dividends.exDate)
    .limit(10);

  const actions = await db
    .select({
      date: corporateActions.exDate,
      ticker: corporateActions.companyKode,
      actionType: corporateActions.actionType,
      description: corporateActions.description,
    })
    .from(corporateActions)
    .where(and(gte(corporateActions.exDate, today), sql`${corporateActions.exDate} <= ${futureDate}`))
    .orderBy(corporateActions.exDate)
    .limit(10);

  const events: DigestCalendarEvent[] = [
    ...divs.map((d) => ({
      date: typeof d.date === "string" ? d.date : d.date.toISOString().slice(0, 10),
      ticker: d.ticker,
      type: "dividend",
      detail: `Cum dividen ${d.amount ? "Rp " + Number(d.amount).toLocaleString("id-ID") + "/lembar" : ""}${d.period ? " (" + d.period + ")" : ""}`,
    })),
    ...actions.map((a) => ({
      date: typeof a.date === "string" ? a.date : a.date?.toISOString().slice(0, 10) ?? today,
      ticker: a.ticker,
      type: a.actionType,
      detail: a.description ?? a.actionType,
    })),
  ];
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events.slice(0, 8);
}

async function generateAINarrative(opts: {
  context: MarketContext;
  sectorMovers: DigestSectorMover[];
  topPicksCount: number;
  topNewsCount: number;
}): Promise<{ headline: string; outlook: string }> {
  try {
    const { client, config } = await getAiClient();

    const userPrompt = `Berdasarkan context pasar IDX hari ini, buat:
1. Headline catchy (max 100 char) yang mencerminkan kondisi pasar
2. Market outlook 1 paragraf (~80 kata) yang merangkum: trend IHSG, sektor leader/laggard, sentimen news flow

Context:
- IHSG return 1d (proxy weighted by market cap): ${opts.context.ihsgReturn1d != null ? opts.context.ihsgReturn1d.toFixed(2) + "%" : "—"}
- Sektor bullish: ${opts.context.bullishSectors}, bearish: ${opts.context.bearishSectors}
- Top sektor gainer: ${opts.context.topGainerSector ?? "—"}
- Top sektor loser: ${opts.context.topLoserSector ?? "—"}
- News 24h: ${opts.context.bullishNewsCount} bullish, ${opts.context.bearishNewsCount} bearish
- Daily Picks aktif: ${opts.topPicksCount}
- Major news terpilih: ${opts.topNewsCount}

Output JSON: { "headline": "...", "outlook": "..." }
HANYA JSON, tanpa markdown wrapper. Bahasa Indonesia.`;

    const completion = await client.chat.completions.create({
      model: config.defaultModel,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah analis pasar saham Indonesia. Buat morning brief yang concise, informatif, dan tidak hype. Bahasa profesional tapi tidak kaku.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      headline: String(parsed.headline ?? "Market Update").slice(0, 200),
      outlook: String(parsed.outlook ?? "—").slice(0, 1000),
    };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Daily digest AI narrative failed, using fallback");
    // Fallback template
    const ret = opts.context.ihsgReturn1d;
    const direction = ret != null ? (ret > 0 ? "menguat" : "melemah") : "campuran";
    const headline = `Pasar IDX ${direction} ${ret != null ? ret.toFixed(2) + "%" : ""}`.trim();
    const outlook = `Pasar saham Indonesia hari ini bergerak ${direction}, dengan ${opts.context.bullishSectors} sektor positif dan ${opts.context.bearishSectors} negatif. Sektor terdepan: ${opts.context.topGainerSector ?? "—"}, tertekan: ${opts.context.topLoserSector ?? "—"}. Sentimen berita 24 jam: ${opts.context.bullishNewsCount} bullish vs ${opts.context.bearishNewsCount} bearish.`;
    return { headline, outlook };
  }
}

export async function generateDailyDigest(): Promise<{ digestDate: string; cached: boolean }> {
  const today = new Date().toISOString().slice(0, 10);

  // Check existing
  const [existing] = await db
    .select()
    .from(dailyDigests)
    .where(eq(dailyDigests.digestDate, today))
    .limit(1);
  if (existing) {
    return { digestDate: today, cached: true };
  }

  // Gather all components in parallel
  const [marketResult, topPicks, topNews, upcomingCalendar] = await Promise.all([
    gatherMarketContext(),
    gatherTopPicks(),
    gatherTopNews(),
    gatherUpcomingCalendar(),
  ]);

  // Generate AI narrative
  const ai = await generateAINarrative({
    context: marketResult.context,
    sectorMovers: marketResult.sectorMovers,
    topPicksCount: topPicks.length,
    topNewsCount: topNews.length,
  });

  // Persist
  await db
    .insert(dailyDigests)
    .values({
      digestDate: today,
      headline: ai.headline,
      marketOutlook: ai.outlook,
      topPicks,
      topNews,
      sectorMovers: marketResult.sectorMovers,
      upcomingCalendar,
    })
    .onConflictDoUpdate({
      target: dailyDigests.digestDate,
      set: {
        headline: ai.headline,
        marketOutlook: ai.outlook,
        topPicks,
        topNews,
        sectorMovers: marketResult.sectorMovers,
        upcomingCalendar,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  logger.info({ digestDate: today }, "Daily digest generated");
  return { digestDate: today, cached: false };
}

export async function getLatestDigest() {
  const [row] = await db
    .select()
    .from(dailyDigests)
    .orderBy(desc(dailyDigests.digestDate))
    .limit(1);
  return row ?? null;
}
