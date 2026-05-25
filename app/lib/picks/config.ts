import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { picksScoringWeights } from "@/db/schema/picks";
import { getConfig } from "@/lib/config";
import { ConfigurationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { scoringWeightsSchema, type ScoringWeights } from "@/lib/types/picks";

/**
 * Picks-domain runtime config readers.
 *
 * SEMUA nilai datang dari `app_config` / `picks_scoring_weights` table — JANGAN
 * hardcode nilai di module-level. Default value di getConfig() opsi hanya sebagai
 * defensive fallback yang TIDAK menggantikan kebutuhan seed via `db/seed/config.ts`.
 */

const PICKS_CONFIG_KEYS = {
  universeMinAvgValueIdr: "picks.universe_min_avg_value_idr",
  minRrRatio: "picks.min_rr_ratio",
  maxPerDay: "picks.max_per_day",
  generationCron: "picks.generation_cron",
  scoringWeights: "picks.scoring_weights",
} as const;

export interface PicksRuntimeConfig {
  universeMinAvgValueIdr: number;
  minRrRatio: number;
  maxPerDay: number;
  generationCron: string;
}

export async function getPicksRuntimeConfig(): Promise<PicksRuntimeConfig> {
  const [universeMinAvgValueIdr, minRrRatio, maxPerDay, generationCron] = await Promise.all([
    getConfig<number>(PICKS_CONFIG_KEYS.universeMinAvgValueIdr, { defaultValue: 1_000_000_000 }),
    getConfig<number>(PICKS_CONFIG_KEYS.minRrRatio, { defaultValue: 1.5 }),
    getConfig<number>(PICKS_CONFIG_KEYS.maxPerDay, { defaultValue: 10 }),
    getConfig<string>(PICKS_CONFIG_KEYS.generationCron, { defaultValue: "30 7 * * 1-5" }),
  ]);
  return { universeMinAvgValueIdr, minRrRatio, maxPerDay, generationCron };
}

export interface ActiveWeights {
  version: string;
  weights: ScoringWeights;
  fromTable: boolean;
}

/**
 * Resolve bobot scoring aktif. Prefer baris `is_active=true` di
 * `picks_scoring_weights`. Kalau tabel belum di-seed, fallback ke
 * `app_config.picks.scoring_weights`. Caller WAJIB simpan version+weights
 * ke `picks_scoring_runs.scoring_weights` snapshot.
 */
export async function getActiveScoringWeights(): Promise<ActiveWeights> {
  const rows = await db
    .select()
    .from(picksScoringWeights)
    .where(eq(picksScoringWeights.isActive, true))
    .orderBy(desc(picksScoringWeights.activatedAt))
    .limit(1);

  if (rows.length > 0) {
    const row = rows[0]!;
    const parsed = scoringWeightsSchema.safeParse(row.weights);
    if (parsed.success) {
      return { version: row.version, weights: parsed.data, fromTable: true };
    }
    logger.warn(
      { version: row.version, errors: parsed.error.flatten() },
      "Active picks_scoring_weights row failed validation; falling back to app_config",
    );
  }

  const fromConfig = await getConfig<Record<string, number>>(
    PICKS_CONFIG_KEYS.scoringWeights,
  ).catch(() => null);

  if (!fromConfig) {
    throw new ConfigurationError("picks.scoring_weights");
  }
  const parsed = scoringWeightsSchema.safeParse(fromConfig);
  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten() }, "app_config picks.scoring_weights invalid");
    throw new ConfigurationError("picks.scoring_weights");
  }
  return { version: "config", weights: parsed.data, fromTable: false };
}

/**
 * Idempotent seed: pastikan baris `version=v1` di `picks_scoring_weights` exists
 * & is_active=true, dengan bobot di-sync dari `app_config.picks.scoring_weights`.
 * Dipanggil sekali saat startup atau dari `db/seed/index.ts` runner.
 */
export async function ensureDefaultScoringWeights(): Promise<void> {
  const fromConfig = await getConfig<Record<string, number>>(
    PICKS_CONFIG_KEYS.scoringWeights,
  ).catch(() => null);
  if (!fromConfig) {
    logger.warn("Cannot ensure default scoring_weights: app_config picks.scoring_weights missing");
    return;
  }
  const parsed = scoringWeightsSchema.safeParse(fromConfig);
  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten() }, "Cannot seed v1 weights: invalid config");
    return;
  }
  const existing = await db
    .select()
    .from(picksScoringWeights)
    .where(eq(picksScoringWeights.version, "v1"))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(picksScoringWeights).values({
      version: "v1",
      weights: parsed.data,
      isActive: true,
      notes: "Initial weights synced from app_config.picks.scoring_weights",
      activatedAt: new Date(),
    });
    logger.info("Seeded picks_scoring_weights v1");
  } else if (!existing[0]!.isActive) {
    await db
      .update(picksScoringWeights)
      .set({ isActive: true, activatedAt: new Date() })
      .where(eq(picksScoringWeights.version, "v1"));
  }
  // SAFETY: hanya satu row is_active=true. Kalau ada baris lain yang active dengan
  // version berbeda, biarkan — admin yang mengelola activation via /admin.
}
