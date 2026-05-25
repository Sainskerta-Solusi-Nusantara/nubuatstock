import type { Processor } from "bullmq";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { analysisSnapshots } from "@/db/schema/analysis-snapshots";
import { patternDetections } from "@/db/schema/patterns";
import { elliottWaveSnapshots } from "@/db/schema/elliott";
import { computeVerdict } from "@/lib/verdict/service";
import { analyzeWyckoff } from "@/lib/wyckoff/service";
import { logger } from "@/lib/logger";

/**
 * Compute aggregate analysis snapshot per ticker.
 * Runs daily setelah EoD ingest. Cached output read by ticker page (no recompute on every load).
 *
 * Reads:
 *   - quotes_eod (via computeVerdict, analyzeWyckoff)
 *   - company_fundamentals
 *   - pattern_detections (already pre-computed)
 *   - elliott_wave_snapshots (already pre-computed)
 *
 * Writes ke analysis_snapshots (1 row per emiten).
 */

const BATCH_SIZE = 25;

async function computeOneSnapshot(kode: string): Promise<boolean> {
  try {
    // Verdict (heaviest — fetches bars + fundamentals + sentiment)
    const verdict = await computeVerdict(kode);

    // Wyckoff
    const wyckoff = await analyzeWyckoff(kode);

    // Top 3 patterns by confidence (active, not invalidated)
    const patterns = await db
      .select({
        type: patternDetections.patternType,
        direction: patternDetections.direction,
        confidence: patternDetections.confidence,
        status: patternDetections.status,
      })
      .from(patternDetections)
      .where(
        and(
          eq(patternDetections.companyKode, kode),
          eq(patternDetections.timeframe, "1D"),
        ),
      )
      .orderBy(desc(patternDetections.confidence))
      .limit(3);

    // Elliott 1D + 1W
    const elliottRows = await db
      .select()
      .from(elliottWaveSnapshots)
      .where(eq(elliottWaveSnapshots.companyKode, kode));
    const ew1d = elliottRows.find((r) => r.timeframe === "1D");
    const ew1w = elliottRows.find((r) => r.timeframe === "1W");

    await db
      .insert(analysisSnapshots)
      .values({
        companyKode: kode,
        verdictScore: verdict ? String(verdict.overallScore) : null,
        verdictLabel: verdict?.label,
        verdictFactors: verdict?.factors as unknown[] ?? [],
        wyckoffPhase: wyckoff?.currentPhase ?? null,
        wyckoffConfidence: wyckoff ? String(wyckoff.currentConfidence) : null,
        topPatterns: patterns.map((p) => ({
          type: p.type,
          direction: p.direction,
          confidence: Number(p.confidence),
          status: p.status,
        })),
        patternCount: String(patterns.length),
        elliottWave1d: ew1d && ew1d.waveType !== "unknown" ? ew1d.currentWave : null,
        elliottWave1w: ew1w && ew1w.waveType !== "unknown" ? ew1w.currentWave : null,
        elliottConfidence: ew1d ? String(ew1d.confidence) : null,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: analysisSnapshots.companyKode,
        set: {
          verdictScore: verdict ? String(verdict.overallScore) : null,
          verdictLabel: verdict?.label,
          verdictFactors: verdict?.factors as unknown[] ?? [],
          wyckoffPhase: wyckoff?.currentPhase ?? null,
          wyckoffConfidence: wyckoff ? String(wyckoff.currentConfidence) : null,
          topPatterns: patterns.map((p) => ({
            type: p.type,
            direction: p.direction,
            confidence: Number(p.confidence),
            status: p.status,
          })),
          patternCount: String(patterns.length),
          elliottWave1d: ew1d && ew1d.waveType !== "unknown" ? ew1d.currentWave : null,
          elliottWave1w: ew1w && ew1w.waveType !== "unknown" ? ew1w.currentWave : null,
          elliottConfidence: ew1d ? String(ew1d.confidence) : null,
          computedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (err) {
    logger.warn({ err: (err as Error).message, kode }, "analysis-snapshot compute failed");
    return false;
  }
}

export const computeAnalysisSnapshotsProcessor: Processor = async (job) => {
  const data = (job.data ?? {}) as { sourceKode?: string };

  if (data.sourceKode) {
    const ok = await computeOneSnapshot(data.sourceKode);
    return { processed: ok ? 1 : 0, mode: "single" };
  }

  const allCompanies = await db
    .select({ kode: companies.kode })
    .from(companies)
    .where(eq(companies.isActive, true));

  let processed = 0;
  let succeeded = 0;
  for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
    const batch = allCompanies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((c) => computeOneSnapshot(c.kode)));
    for (const r of results) {
      processed += 1;
      if (r.status === "fulfilled" && r.value) succeeded += 1;
    }
    if (i % (BATCH_SIZE * 4) === 0) {
      logger.info({ processed, succeeded, total: allCompanies.length }, "analysis-snapshot progress");
    }
  }

  return { processed, succeeded, mode: "bulk" };
};
