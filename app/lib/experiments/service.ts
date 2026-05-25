import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { experimentAssignments, experiments } from "@/db/schema/experiments";
import { logger } from "@/lib/logger";

/**
 * A/B Testing service — sticky variant assignment.
 *
 * Algorithm:
 *   1. Cek apakah user sudah ter-assign (experiment_assignments)
 *   2. Kalau belum: deterministic hash(userId + experimentKey) → bucket 0-99
 *   3. Cek apakah bucket masuk traffic allocation (< trafficAllocationPct)
 *   4. Kalau masuk: pick variant berdasarkan weighted random (seeded oleh hash)
 *   5. Persist assignment
 *
 * Caller pakai `getVariant(experimentKey, userId)` di server component
 * atau `useExperiment(experimentKey)` di client component (via API).
 */

export interface ExperimentVariant {
  key: string;
  weight: number;
  payload?: Record<string, unknown>;
}

/**
 * Hash-based deterministic bucket 0-99.
 * Pakai DJB2 sederhana — cukup untuk distribusi seragam.
 */
function bucket(userId: string, experimentKey: string): number {
  const input = `${userId}::${experimentKey}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

/**
 * Get variant assignment untuk user. Sticky (persist).
 * Returns null kalau user di luar traffic allocation atau experiment off.
 */
export async function getVariant(
  experimentKey: string,
  userId: string,
): Promise<string | null> {
  // 1. Check existing assignment
  const [existing] = await db
    .select({ variantKey: experimentAssignments.variantKey })
    .from(experimentAssignments)
    .where(
      and(
        eq(experimentAssignments.experimentKey, experimentKey),
        eq(experimentAssignments.userId, userId),
      ),
    )
    .limit(1);
  if (existing) return existing.variantKey;

  // 2. Fetch experiment
  const [exp] = await db
    .select()
    .from(experiments)
    .where(eq(experiments.key, experimentKey))
    .limit(1);

  if (!exp || exp.status !== "running") return null;

  const variants = exp.variants as ExperimentVariant[];
  if (!Array.isArray(variants) || variants.length === 0) return null;

  // 3. Traffic gate
  const b = bucket(userId, experimentKey);
  if (b >= exp.trafficAllocationPct) return null;

  // 4. Pick variant by weight (seeded oleh second hash)
  const variantSeed = bucket(userId + ":variant", experimentKey);
  const totalWeight = variants.reduce((acc, v) => acc + v.weight, 0);
  if (totalWeight <= 0) return null;
  let cumulative = 0;
  let pickedKey = variants[0]!.key;
  const threshold = (variantSeed / 100) * totalWeight;
  for (const v of variants) {
    cumulative += v.weight;
    if (cumulative >= threshold) {
      pickedKey = v.key;
      break;
    }
  }

  // 5. Persist
  try {
    await db.insert(experimentAssignments).values({
      experimentKey,
      userId,
      variantKey: pickedKey,
      assignedAt: new Date(),
    }).onConflictDoNothing();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Failed to persist experiment assignment");
  }

  return pickedKey;
}

/**
 * Server-component helper. Returns variant payload.
 */
export async function useExperimentServer(
  experimentKey: string,
  userId: string,
): Promise<{ variant: string | null; payload: Record<string, unknown> | undefined }> {
  const variant = await getVariant(experimentKey, userId);
  if (!variant) return { variant: null, payload: undefined };

  const [exp] = await db
    .select({ variants: experiments.variants })
    .from(experiments)
    .where(eq(experiments.key, experimentKey))
    .limit(1);
  if (!exp) return { variant, payload: undefined };

  const v = (exp.variants as ExperimentVariant[]).find((x) => x.key === variant);
  return { variant, payload: v?.payload };
}
