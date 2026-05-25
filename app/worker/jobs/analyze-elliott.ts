import type { Processor } from "bullmq";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { elliottWaveSnapshots } from "@/db/schema/elliott";
import { analyzeElliottWave } from "@/lib/elliott/labeler";
import { aggregateToWeekly } from "@/lib/elliott/weekly";
import { logger } from "@/lib/logger";
import type { OhlcvBar } from "@/lib/types/picks";

const BATCH_SIZE = 50;

async function upsertSnapshot(kode: string, timeframe: string, bars: OhlcvBar[]): Promise<void> {
  const analysis = analyzeElliottWave(bars);
  await db
    .insert(elliottWaveSnapshots)
    .values({
      companyKode: kode,
      timeframe,
      currentWave: analysis.currentWave,
      waveType: analysis.waveType,
      waveDegree: timeframe === "1W" ? "Intermediate" : "Minor",
      sequence: analysis.sequence,
      pivots: analysis.pivots,
      fibonacciLevels: analysis.fibonacciLevels,
      confidence: String(analysis.confidence),
      narrative: analysis.reasoning.join(" • "),
      analyzedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [elliottWaveSnapshots.companyKode, elliottWaveSnapshots.timeframe],
      set: {
        currentWave: analysis.currentWave,
        waveType: analysis.waveType,
        waveDegree: timeframe === "1W" ? "Intermediate" : "Minor",
        sequence: analysis.sequence,
        pivots: analysis.pivots,
        fibonacciLevels: analysis.fibonacciLevels,
        confidence: String(analysis.confidence),
        narrative: analysis.reasoning.join(" • "),
        analyzedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

async function analyzeOne(kode: string): Promise<boolean> {
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

  if (rows.length < 30) return false;

  const dailyBars: OhlcvBar[] = rows.slice().reverse().map((r) => ({
    date: r.date,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume),
  }));

  // 1D analysis
  await upsertSnapshot(kode, "1D", dailyBars);

  // 1W analysis (kalau cukup data, butuh ~30 weeks = ~210 days)
  if (dailyBars.length >= 150) {
    const weeklyBars = aggregateToWeekly(dailyBars);
    if (weeklyBars.length >= 30) {
      await upsertSnapshot(kode, "1W", weeklyBars);
    }
  }

  return true;
}

export const analyzeElliottProcessor: Processor = async (job) => {
  const data = (job.data ?? {}) as { sourceKode?: string };

  if (data.sourceKode) {
    const ok = await analyzeOne(data.sourceKode);
    return { processed: ok ? 1 : 0, mode: "single" };
  }

  const allCompanies = await db
    .select({ kode: companies.kode })
    .from(companies)
    .where(eq(companies.isActive, true));

  let processed = 0;
  let succeeded = 0;
  let identifiedImpulse = 0;

  for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
    const batch = allCompanies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((c) => analyzeOne(c.kode)));
    for (const r of results) {
      processed += 1;
      if (r.status === "fulfilled" && r.value) succeeded += 1;
    }
    if (i % (BATCH_SIZE * 5) === 0) {
      logger.info({ processed, succeeded, total: allCompanies.length }, "elliott-wave progress");
    }
  }

  // Count actual impulse patterns detected
  const impulses = await db
    .select({ companyKode: elliottWaveSnapshots.companyKode })
    .from(elliottWaveSnapshots)
    .where(eq(elliottWaveSnapshots.timeframe, "1D"));
  identifiedImpulse = impulses.length;

  return { processed, succeeded, identifiedImpulse, mode: "bulk" };
};
