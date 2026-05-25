import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { featureFlags, userFlagOverrides } from "@/db/schema/feature-flags";
import { logger } from "@/lib/logger";
import type { RolloutStrategy } from "@/db/schema/feature-flags";

/**
 * Feature flag evaluator.
 *
 * - User override (un-expired) → menang.
 * - Kalau flag.isActive=false → kembalikan defaultValue (gating fully off, mis. fitur belum siap).
 * - Else → evaluate rolloutStrategy untuk decide on/off; return defaultValue saat on, fallback "off" semantic kalau bertipe boolean.
 *
 * In-memory cache 60 detik (clear via `invalidateFeatureFlagCache(key?)`).
 *
 * Catatan: untuk flag bertipe non-boolean (variant/object), evaluator hanya menentukan
 * "include" atau "exclude". Saat exclude, value yang dikembalikan adalah:
 *  - `false` jika defaultValue bertipe boolean
 *  - `null` jika type lain
 */

export interface FlagContext {
  userId?: string;
  tier?: string;
  role?: "user" | "admin";
  locale?: string;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const flagCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000;

function cacheKey(flagKey: string, ctx: FlagContext): string {
  return `${flagKey}::u=${ctx.userId ?? "-"}|t=${ctx.tier ?? "-"}|r=${ctx.role ?? "-"}`;
}

export function invalidateFeatureFlagCache(flagKey?: string): void {
  if (!flagKey) {
    flagCache.clear();
    return;
  }
  for (const k of flagCache.keys()) {
    if (k === flagKey || k.startsWith(`${flagKey}::`)) flagCache.delete(k);
  }
}

const TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  elite: 3,
  institutional: 4,
};

function tierMeetsMin(currentTier: string | undefined, minTier: string): boolean {
  if (!currentTier) return false;
  const cur = TIER_ORDER[currentTier];
  const min = TIER_ORDER[minTier];
  if (cur === undefined || min === undefined) return false;
  return cur >= min;
}

function hashPercent(userId: string, flagKey: string): number {
  const h = createHash("sha1").update(`${flagKey}:${userId}`).digest();
  // gunakan 4 byte pertama → integer 0..2^32-1 → modulo 10000 untuk presisi 0.01%
  const n = h.readUInt32BE(0);
  return (n % 10_000) / 100; // 0.00 .. 99.99
}

function evaluateStrategy(
  strategy: RolloutStrategy,
  ctx: FlagContext,
  flagKey: string,
): boolean {
  switch (strategy.type) {
    case "all":
      return true;
    case "off":
      return false;
    case "percentage":
      if (!ctx.userId) return false;
      return hashPercent(ctx.userId, flagKey) < strategy.value;
    case "tier_min":
      return tierMeetsMin(ctx.tier, strategy.value);
    case "user_list":
      return !!ctx.userId && strategy.value.includes(ctx.userId);
    case "role":
      return ctx.role === strategy.value;
    default:
      return false;
  }
}

async function loadFlag(
  flagKey: string,
  ctx: FlagContext,
): Promise<unknown> {
  // 1. user override
  if (ctx.userId) {
    const ovRows = await db
      .select()
      .from(userFlagOverrides)
      .where(
        and(
          eq(userFlagOverrides.userId, ctx.userId),
          eq(userFlagOverrides.flagKey, flagKey),
        ),
      )
      .limit(1);
    const ov = ovRows[0];
    if (ov) {
      const notExpired = !ov.expiresAt || ov.expiresAt.getTime() > Date.now();
      if (notExpired) {
        return ov.value;
      }
    }
  }

  // 2. flag definition
  const rows = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, flagKey))
    .limit(1);
  const flag = rows[0];
  if (!flag) {
    logger.warn({ flagKey }, "Feature flag not found, defaulting to false");
    return false;
  }

  if (!flag.isActive) {
    // fitur fully off
    return typeof flag.defaultValue === "boolean" ? false : null;
  }

  const included = evaluateStrategy(flag.rolloutStrategy, ctx, flag.key);
  if (included) {
    return flag.defaultValue;
  }
  return typeof flag.defaultValue === "boolean" ? false : null;
}

export async function getFlagValue<T = unknown>(
  flagKey: string,
  ctx: FlagContext = {},
): Promise<T> {
  const ck = cacheKey(flagKey, ctx);
  const cached = flagCache.get(ck);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  try {
    const value = await loadFlag(flagKey, ctx);
    flagCache.set(ck, { value, expiresAt: now + DEFAULT_TTL_MS });
    return value as T;
  } catch (err) {
    logger.error({ err, flagKey }, "Failed to evaluate feature flag");
    return false as T;
  }
}

export async function isEnabled(
  flagKey: string,
  ctx: FlagContext = {},
): Promise<boolean> {
  const v = await getFlagValue<unknown>(flagKey, ctx);
  return v === true;
}
