import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../logger";
import { ForbiddenError, TierRequiredError } from "../errors";
import {
  subscriptionTiers,
  tierEntitlements,
  userSubscriptions,
} from "@/db/schema/billing";
import {
  DEFAULT_FREE_TIER_KODE,
  TIER_RANK,
  type EntitlementKey,
  type TierKode,
  type TierWithEntitlements,
} from "../types/billing";

/**
 * Entitlement & tier resolution.
 *
 * - `getUserTier(userId)` — kode tier aktif. Fallback ke "free" kalau user
 *   tidak punya subscription (defensive — Agent 3 callback harus selalu buat
 *   free subscription saat signup).
 * - `getEntitlement(userId, key)` — single value entitlement aktif.
 * - `getAllEntitlements(userId)` — semua entitlement aktif (untuk caching).
 * - `requireTier(userId, minTier)` — throw TierRequiredError.
 * - `requireEntitlement(userId, key, predicate?)` — generic check.
 *
 * Sumber satu-satunya: DB. JANGAN return literal value tanpa lookup ke DB.
 */

const UNLIMITED_SENTINEL = 999_999;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory cache untuk entitlement per user. TTL singkat (60s) supaya admin
 * change ter-propagate dengan cepat. Invalidate manual via `invalidateUserCache`
 * dari event handler `subscription.changed` (Agent 4 emit).
 */
const userTierCache = new Map<string, CacheEntry<TierKode>>();
const userEntitlementsCache = new Map<string, CacheEntry<Record<string, unknown>>>();
const CACHE_TTL_MS = 60_000;

export function invalidateUserCache(userId: string): void {
  userTierCache.delete(userId);
  userEntitlementsCache.delete(userId);
}

export function invalidateAllEntitlementsCache(): void {
  userTierCache.clear();
  userEntitlementsCache.clear();
}

export async function getUserTier(userId: string): Promise<TierKode> {
  const cached = userTierCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const rows = await db
    .select({ tierKode: userSubscriptions.tierKode, status: userSubscriptions.status })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        inArray(userSubscriptions.status, ["active", "trialing"]),
      ),
    )
    .limit(1);

  const tierKode = (rows[0]?.tierKode ?? DEFAULT_FREE_TIER_KODE) as TierKode;
  userTierCache.set(userId, { value: tierKode, expiresAt: now + CACHE_TTL_MS });
  return tierKode;
}

export async function getAllEntitlements(
  userId: string,
): Promise<Record<string, unknown>> {
  const cached = userEntitlementsCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const tierKode = await getUserTier(userId);
  const rows = await db
    .select({
      key: tierEntitlements.entitlementKey,
      value: tierEntitlements.entitlementValue,
    })
    .from(tierEntitlements)
    .where(eq(tierEntitlements.tierKode, tierKode));

  const map: Record<string, unknown> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  userEntitlementsCache.set(userId, { value: map, expiresAt: now + CACHE_TTL_MS });
  return map;
}

export async function getEntitlement<T = unknown>(
  userId: string,
  key: EntitlementKey | string,
): Promise<T | null> {
  const all = await getAllEntitlements(userId);
  if (!(key in all)) return null;
  return all[key] as T;
}

export async function getTierEntitlements(
  tierKode: TierKode,
): Promise<TierWithEntitlements | null> {
  const tierRows = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.kode, tierKode))
    .limit(1);
  if (tierRows.length === 0) return null;

  const entRows = await db
    .select({
      key: tierEntitlements.entitlementKey,
      value: tierEntitlements.entitlementValue,
    })
    .from(tierEntitlements)
    .where(eq(tierEntitlements.tierKode, tierKode));

  const entitlements: Record<string, unknown> = {};
  for (const row of entRows) entitlements[row.key] = row.value;

  return { tier: tierRows[0]!, entitlements };
}

export async function listPublicTiers(): Promise<TierWithEntitlements[]> {
  const tiers = await db
    .select()
    .from(subscriptionTiers)
    .where(and(eq(subscriptionTiers.isActive, true), eq(subscriptionTiers.isPublic, true)))
    .orderBy(subscriptionTiers.sortOrder);

  const tierKodes = tiers.map((t) => t.kode);
  if (tierKodes.length === 0) return [];

  const allEnts = await db
    .select({
      tierKode: tierEntitlements.tierKode,
      key: tierEntitlements.entitlementKey,
      value: tierEntitlements.entitlementValue,
    })
    .from(tierEntitlements)
    .where(inArray(tierEntitlements.tierKode, tierKodes));

  const byTier: Record<string, Record<string, unknown>> = {};
  for (const row of allEnts) {
    (byTier[row.tierKode] ??= {})[row.key] = row.value;
  }
  return tiers.map((tier) => ({ tier, entitlements: byTier[tier.kode] ?? {} }));
}

export async function requireTier(userId: string, minTier: TierKode): Promise<void> {
  const current = await getUserTier(userId);
  const currentRank = TIER_RANK[current] ?? 0;
  const requiredRank = TIER_RANK[minTier] ?? 0;
  if (currentRank < requiredRank) {
    throw new TierRequiredError(minTier, current);
  }
}

export async function requireEntitlement<T = unknown>(
  userId: string,
  key: EntitlementKey | string,
  predicate?: (value: T) => boolean,
): Promise<T> {
  const value = await getEntitlement<T>(userId, key);
  if (value === null || value === undefined) {
    throw new ForbiddenError(
      `Entitlement ${key} not granted`,
      "Fitur ini tidak tersedia di paket Anda. Upgrade untuk mengaktifkan.",
    );
  }
  if (typeof value === "boolean" && value === false) {
    throw new ForbiddenError(
      `Entitlement ${key} disabled`,
      "Fitur ini tidak tersedia di paket Anda. Upgrade untuk mengaktifkan.",
    );
  }
  if (predicate && !predicate(value)) {
    throw new ForbiddenError(
      `Entitlement ${key} predicate failed`,
      "Batas fitur Anda terlampaui untuk paket ini.",
    );
  }
  return value;
}

export function isUnlimited(limit: number): boolean {
  return limit >= UNLIMITED_SENTINEL;
}

/**
 * Helper untuk admin / observability. Tidak dipakai dari path user-facing.
 */
export async function summarizeTierSeed(): Promise<{ tiers: number; entitlements: number }> {
  const tierCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptionTiers);
  const entCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tierEntitlements);
  return {
    tiers: tierCount[0]?.count ?? 0,
    entitlements: entCount[0]?.count ?? 0,
  };
}

logger.debug("billing/entitlements module loaded");
