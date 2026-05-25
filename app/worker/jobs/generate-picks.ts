import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks, picksScoringRuns } from "@/db/schema/picks";
import { logger } from "@/lib/logger";
import { getActiveScoringWeights, getPicksRuntimeConfig } from "@/lib/picks/config";
import { scoreCandidate } from "@/lib/picks/scoring";
import { buildCandidate, loadSectorContext, loadUniverse } from "@/lib/picks/universe";
import { generateAndStoreNarrative } from "@/lib/picks/narrative";
import { publishEvent } from "@/lib/picks/cross-deps";
import { PICKS_EVENTS, type ScoringResult } from "@/lib/types/picks";

/**
 * Worker job: generate Daily Picks untuk satu trade date.
 *
 * Steps:
 *  1. Buat row di `picks_scoring_runs` (status=running).
 *  2. Universe filter (likuiditas, active).
 *  3. Untuk tiap candidate: load OHLCV/foreign flow, score, classify, compute levels.
 *  4. Filter R/R ratio, urutkan by score, ambil top `maxPerDay`.
 *  5. Insert ke `daily_picks` status='published'.
 *  6. Trigger narrative generation per pick (async-but-sequential di MVP).
 *  7. Update run status='completed', emit event `picks.generated`.
 *
 * Idempotency: kalau row `daily_picks` (trade_date, company_kode) sudah ada,
 * skip insert (unique index akan reject).
 */

export interface GeneratePicksArgs {
  tradeDate: string; // YYYY-MM-DD
  generateNarrative?: boolean;
}

export interface GeneratePicksResult {
  runId: string;
  picksGenerated: number;
  universeSize: number;
  durationMs: number;
  status: "completed" | "failed";
  errorMessage?: string;
}

export async function generatePicksJob(args: GeneratePicksArgs): Promise<GeneratePicksResult> {
  const startTime = Date.now();
  const tradeDate = args.tradeDate;

  const [runtimeConfig, activeWeights] = await Promise.all([
    getPicksRuntimeConfig(),
    getActiveScoringWeights(),
  ]);

  const configSnapshot: Record<string, unknown> = {
    universe_min_avg_value_idr: runtimeConfig.universeMinAvgValueIdr,
    min_rr_ratio: runtimeConfig.minRrRatio,
    max_per_day: runtimeConfig.maxPerDay,
    weights_version: activeWeights.version,
  };

  // Step 1: create run row
  const insertedRuns = await db
    .insert(picksScoringRuns)
    .values({
      runDate: tradeDate,
      status: "running",
      scoringWeights: activeWeights.weights as unknown as Record<string, number>,
      configSnapshot,
    })
    .returning({ id: picksScoringRuns.id });
  const runId = insertedRuns[0]!.id;

  logger.info({ runId, tradeDate }, "picks: generation run started");

  try {
    const universe = await loadUniverse({
      asOfDate: tradeDate,
      minAvgValueIdr: runtimeConfig.universeMinAvgValueIdr,
    });
    const universeSize = universe.length;
    if (universeSize === 0) {
      await db
        .update(picksScoringRuns)
        .set({
          status: "completed",
          finishedAt: new Date(),
          universeSize: 0,
          picksGenerated: 0,
          errorMessage: "Empty universe (no companies meet liquidity threshold or no EOD data ingested)",
        })
        .where(eq(picksScoringRuns.id, runId));
      logger.warn({ runId }, "picks: empty universe");
      return {
        runId,
        picksGenerated: 0,
        universeSize: 0,
        durationMs: Date.now() - startTime,
        status: "completed",
      };
    }

    const sectorCtx = await loadSectorContext(tradeDate);

    const results: ScoringResult[] = [];
    for (const row of universe) {
      try {
        const candidate = await buildCandidate(row, sectorCtx);
        if (!candidate) continue;
        const r = scoreCandidate({
          candidate,
          weights: activeWeights.weights,
          weightsVersion: activeWeights.version,
          minRrRatio: runtimeConfig.minRrRatio,
        });
        if (!r.rejected) results.push(r);
      } catch (err) {
        logger.warn({ err, companyKode: row.companyKode }, "picks: candidate scoring failed");
      }
    }

    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, runtimeConfig.maxPerDay);

    let picksGenerated = 0;
    const insertedIds: { id: string; result: ScoringResult }[] = [];
    for (const r of top) {
      try {
        const inserted = await db
          .insert(dailyPicks)
          .values({
            runId,
            tradeDate,
            companyKode: r.companyKode,
            setupType: r.setup.setupType,
            score: r.score.toString(),
            confidence: r.setup.confidence,
            entryZoneLow: r.levels.entryZoneLow.toString(),
            entryZoneHigh: r.levels.entryZoneHigh.toString(),
            stopLoss: r.levels.stopLoss.toString(),
            tp1: r.levels.tp1.toString(),
            tp2: r.levels.tp2 === null ? null : r.levels.tp2.toString(),
            tp3: r.levels.tp3 === null ? null : r.levels.tp3.toString(),
            atr14: r.levels.atr14.toString(),
            rewardRiskRatio: r.levels.rewardRiskRatio.toString(),
            timeHorizon: r.setup.timeHorizon,
            factorBreakdown: r.breakdown as unknown as Record<string, number>,
            status: "published",
          })
          .onConflictDoNothing({ target: [dailyPicks.tradeDate, dailyPicks.companyKode] })
          .returning({ id: dailyPicks.id });
        if (inserted.length > 0) {
          picksGenerated += 1;
          insertedIds.push({ id: inserted[0]!.id, result: r });
        }
      } catch (err) {
        logger.warn({ err, companyKode: r.companyKode }, "picks: failed to insert daily_pick");
      }
    }

    // Optional narrative generation (best-effort, jangan blok run).
    if (args.generateNarrative !== false) {
      for (const { id, result } of insertedIds) {
        try {
          await generateAndStoreNarrative({
            pickId: id,
            companyKode: result.companyKode,
            setupType: result.setup.setupType,
            score: result.score,
            entryZoneLow: result.levels.entryZoneLow,
            entryZoneHigh: result.levels.entryZoneHigh,
            stopLoss: result.levels.stopLoss,
            tp1: result.levels.tp1,
            tp2: result.levels.tp2,
            tp3: result.levels.tp3,
            rewardRiskRatio: result.levels.rewardRiskRatio,
            factorBreakdown: result.breakdown,
          });
        } catch (err) {
          logger.warn({ err, pickId: id }, "picks: narrative generation failed");
        }
      }
    }

    const durationMs = Date.now() - startTime;
    await db
      .update(picksScoringRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        universeSize,
        picksGenerated,
      })
      .where(eq(picksScoringRuns.id, runId));

    await publishEvent(PICKS_EVENTS.GENERATED, {
      type: PICKS_EVENTS.GENERATED,
      runId,
      tradeDate,
      picksGenerated,
      universeSize,
      durationMs,
    });

    logger.info({ runId, picksGenerated, universeSize, durationMs }, "picks: generation completed");
    return { runId, picksGenerated, universeSize, durationMs, status: "completed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(picksScoringRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message.slice(0, 1000),
      })
      .where(eq(picksScoringRuns.id, runId));
    logger.error({ err, runId }, "picks: generation failed");
    return {
      runId,
      picksGenerated: 0,
      universeSize: 0,
      durationMs: Date.now() - startTime,
      status: "failed",
      errorMessage: message,
    };
  }
}
