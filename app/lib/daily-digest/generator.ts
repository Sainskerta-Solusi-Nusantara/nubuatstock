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

/**
 * Disclaimer wajib di setiap "Ringkasan Pasar Hari Ini".
 * Ringkasan bersifat informasi/edukasi, BUKAN ajakan jual/beli.
 * Dipakai untuk AI path (memastikan ada walau LLM lupa) maupun fallback rule-based.
 */
export const DIGEST_DISCLAIMER =
  "Ringkasan ini bersifat informasi, bukan ajakan jual/beli — keputusan investasi tetap di tanganmu.";

export interface SummaryPromptInput {
  context: MarketContext;
  sectorMovers: DigestSectorMover[];
  topPicksCount: number;
  topNewsCount: number;
}

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
    ...divs
      .filter((d): d is typeof d & { date: string } => d.date != null)
      .map((d) => ({
        date: d.date,
        ticker: d.ticker,
        type: "dividend",
        detail: `Cum dividen ${d.amount ? "Rp " + Number(d.amount).toLocaleString("id-ID") + "/lembar" : ""}${d.period ? " (" + d.period + ")" : ""}`,
      })),
    ...actions
      .filter((a): a is typeof a & { date: string } => a.date != null)
      .map((a) => ({
        date: a.date,
        ticker: a.ticker,
        type: a.actionType,
        detail: a.description ?? a.actionType,
      })),
  ];
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events.slice(0, 8);
}

/**
 * System prompt untuk "Ringkasan Pasar Hari Ini".
 * Pure constant — di-export agar bisa di-assert di unit test.
 */
export const SUMMARY_SYSTEM_PROMPT =
  "Kamu adalah analis pasar saham Indonesia. Buat 'Ringkasan Pasar Hari Ini' yang concise, " +
  "informatif, dan tidak hype. Sapa pembaca dengan 'kamu' (JANGAN pakai 'Anda'). " +
  "Bahasa semi-formal santai tapi tidak kaku. Ringkasan WAJIB 3-5 kalimat. " +
  "JANGAN memberi ajakan jual/beli atau rekomendasi pasti.";

/**
 * Susun messages untuk LLM dari context pasar. Pure & deterministik → testable
 * tanpa memanggil jaringan. Output langsung dipakai sebagai `messages` ke client.
 */
export function buildSummaryPrompt(
  opts: SummaryPromptInput,
): { role: "system" | "user"; content: string }[] {
  const c = opts.context;
  const userPrompt = `Berdasarkan data pasar IDX hari ini, buat:
1. "headline": headline catchy (max 100 char) yang mencerminkan kondisi pasar.
2. "summary": Ringkasan Pasar Hari Ini, 3-5 kalimat (~80 kata), nada "kamu", merangkum:
   tren IHSG, sektor leader/laggard, highlight Daily Picks baru, dan sentimen news flow.
   JANGAN menulis disclaimer di dalam summary (sistem akan menambahkannya otomatis).

Data:
- IHSG return 1d (proxy weighted by market cap): ${c.ihsgReturn1d != null ? c.ihsgReturn1d.toFixed(2) + "%" : "—"}
- Sektor bullish: ${c.bullishSectors}, bearish: ${c.bearishSectors}
- Top sektor gainer: ${c.topGainerSector ?? "—"}
- Top sektor loser: ${c.topLoserSector ?? "—"}
- News 24h: ${c.bullishNewsCount} bullish, ${c.bearishNewsCount} bearish
- Daily Picks aktif: ${opts.topPicksCount}
- Berita penting terpilih: ${opts.topNewsCount}

Output HANYA JSON valid: { "headline": "...", "summary": "..." }
Tanpa markdown wrapper. Bahasa Indonesia.`;

  return [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

/**
 * Pastikan disclaimer wajib selalu ada di akhir ringkasan (tanpa duplikasi).
 * Dipakai baik di AI path maupun fallback.
 */
export function ensureDisclaimer(summary: string): string {
  const trimmed = summary.trim();
  if (trimmed.includes(DIGEST_DISCLAIMER)) return trimmed;
  const sep = trimmed.length === 0 || /[.!?…]$/.test(trimmed) ? " " : ". ";
  return `${trimmed}${trimmed.length ? sep : ""}${DIGEST_DISCLAIMER}`;
}

/**
 * Ringkasan rule-based (tanpa AI) — fallback saat LLM gagal/tidak dikonfigurasi.
 * Deterministik & selalu menyertakan disclaimer → tidak pernah kosong.
 */
export function ruleBasedSummary(
  opts: SummaryPromptInput,
): { headline: string; summary: string } {
  const c = opts.context;
  const ret = c.ihsgReturn1d;
  const direction = ret != null ? (ret > 0 ? "menguat" : ret < 0 ? "melemah" : "flat") : "bergerak campuran";
  const retStr = ret != null ? `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%` : "";

  const headline = `Pasar IDX ${direction}${retStr ? " " + retStr : ""}`.trim();

  const sectorLine =
    c.topGainerSector || c.topLoserSector
      ? `Sektor ${c.topGainerSector ?? "—"} memimpin, sementara ${c.topLoserSector ?? "—"} tertekan.`
      : "";
  const picksLine =
    opts.topPicksCount > 0
      ? `Ada ${opts.topPicksCount} Daily Picks baru yang bisa kamu pantau.`
      : "Belum ada Daily Picks baru hari ini.";
  const newsLine = `Sentimen berita 24 jam terakhir: ${c.bullishNewsCount} bullish vs ${c.bearishNewsCount} bearish.`;

  const summaryBody = [
    `Hari ini IHSG ${direction}${retStr ? " sekitar " + retStr : ""}, dengan ${c.bullishSectors} sektor positif dan ${c.bearishSectors} sektor negatif.`,
    sectorLine,
    picksLine,
    newsLine,
  ]
    .filter(Boolean)
    .join(" ");

  return { headline, summary: ensureDisclaimer(summaryBody) };
}

/**
 * Generate "Ringkasan Pasar Hari Ini" via LLM, dengan fallback rule-based.
 * Hasil disimpan ke kolom existing `marketOutlook` (lihat persist di generateDailyDigest).
 */
async function generateAINarrative(
  opts: SummaryPromptInput,
): Promise<{ headline: string; outlook: string }> {
  try {
    const { client, config } = await getAiClient();

    const completion = await client.chat.completions.create({
      model: config.defaultModel,
      messages: buildSummaryPrompt(opts),
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message.content ?? "{}";
    const parsed = JSON.parse(content);
    const headlineRaw = String(parsed.headline ?? "").trim();
    const summaryRaw = String(parsed.summary ?? parsed.outlook ?? "").trim();

    // Kalau LLM mengembalikan summary kosong → anggap gagal, jatuh ke fallback.
    if (!summaryRaw) {
      throw new Error("LLM returned empty summary");
    }

    const fallback = ruleBasedSummary(opts);
    return {
      headline: (headlineRaw || fallback.headline).slice(0, 200),
      outlook: ensureDisclaimer(summaryRaw.slice(0, 900)),
    };
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "Daily digest AI summary failed, using rule-based fallback",
    );
    const fb = ruleBasedSummary(opts);
    return { headline: fb.headline, outlook: fb.summary };
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
