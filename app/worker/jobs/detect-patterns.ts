import type { Processor } from "bullmq";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { patternDetections } from "@/db/schema/patterns";
import { detectAllPatterns } from "@/lib/patterns/detectors";
import { logger } from "@/lib/logger";
import type { OhlcvBar } from "@/lib/types/picks";

const BATCH_SIZE = 50;

async function detectOne(kode: string): Promise<number> {
  const rows = await db
    .select({
      date: quotesEod.tradeDate,
      open: quotesEod.open,
      high: quotesEod.high,
      low: quotesEod.low,
      close: quotesEod.close,
      volume: quotesEod.volume,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, kode))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(250);

  if (rows.length < 30) return 0;

  const bars: OhlcvBar[] = rows.slice().reverse().map((r) => ({
    date: r.date,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume),
  }));

  const matches = detectAllPatterns(bars);
  if (matches.length === 0) return 0;

  // Hapus pattern lama untuk emiten ini (full refresh) — alternatif: smart update
  await db.delete(patternDetections).where(eq(patternDetections.companyKode, kode));

  // Insert new
  for (const m of matches) {
    if (m.confidence < 0.5) continue; // Skip low-confidence
    await db
      .insert(patternDetections)
      .values({
        companyKode: kode,
        timeframe: "1D",
        patternType: m.patternType,
        patternCategory: m.category,
        direction: m.direction,
        startDate: bars[m.startIndex]!.date,
        endDate: bars[m.endIndex]!.date,
        confidence: String(m.confidence),
        status: m.status,
        keyLevels: m.keyLevels,
        volumeConfirmation: m.volumeConfirmation,
        narrative: m.narrative,
      })
      .onConflictDoNothing();
  }

  return matches.length;
}

export const detectPatternsProcessor: Processor = async (job) => {
  const data = (job.data ?? {}) as { sourceKode?: string };

  if (data.sourceKode) {
    const n = await detectOne(data.sourceKode);
    return { processed: 1, patternsFound: n, mode: "single" };
  }

  const allCompanies = await db
    .select({ kode: companies.kode })
    .from(companies)
    .where(eq(companies.isActive, true));

  let processed = 0;
  let totalPatterns = 0;

  for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
    const batch = allCompanies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((c) => detectOne(c.kode)));
    for (const r of results) {
      processed += 1;
      if (r.status === "fulfilled") totalPatterns += r.value;
    }
    if (i % (BATCH_SIZE * 5) === 0) {
      logger.info({ processed, totalPatterns, total: allCompanies.length }, "pattern-detect progress");
    }
  }

  return { processed, totalPatterns, mode: "bulk" };
};
