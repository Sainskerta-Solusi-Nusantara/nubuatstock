import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../logger";
import { QuotaExceededError } from "../errors";
import { usageCounters } from "@/db/schema/billing";
import { COUNTER_LIMIT_MAP, type CounterKey } from "../types/billing";
import { getRedis } from "./redis";
import { getAllEntitlements, getUserTier, isUnlimited } from "./entitlements";

/**
 * Quota enforcement — atomic INCR di Redis + persist ke Postgres (best-effort).
 *
 * Pattern:
 *   key = `quota:{userId}:{counterKey}:{window}`
 *   window = "YYYY-MM-DD" (timezone Asia/Jakarta) untuk daily counter.
 *
 * Reset harian: TTL Redis = 36 jam dari first increment (buffer untuk timezone
 * boundary). Window berbeda → key berbeda → otomatis reset.
 *
 * Flow consumeQuota:
 *  1. Resolve limit dari tier_entitlements via COUNTER_LIMIT_MAP.
 *  2. Kalau unlimited → INCR tanpa check (untuk usage analytics).
 *  3. INCR + EXPIRE atomic via Lua script.
 *  4. Kalau hasil > limit → DECR & throw QuotaExceededError.
 *  5. Best-effort write ke usage_counters Postgres (UPSERT). Kegagalan tidak block flow.
 *
 * Penting: Redis adalah source of truth saat runtime. Postgres untuk audit
 * & survival kalau Redis cold-start. Worker (Agent 10) bisa add flush job
 * untuk reconcile Redis → Postgres setiap 5 menit.
 */

interface ConsumeQuotaOptions {
  amount?: number;
  /** Override window (e.g., "monthly", custom date). Default: daily WIB. */
  windowKey?: string;
  /** Override limit (e.g., explicit cap bypass entitlement). Use sparingly. */
  limitOverride?: number;
  /** Skip Postgres persistence (untuk hot path yang tidak butuh audit). */
  skipPersist?: boolean;
}

interface QuotaResult {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  windowKey: string;
}

const JAKARTA_TZ = "Asia/Jakarta";
const KEY_TTL_SECONDS = 36 * 3600; // 36 jam — buffer timezone boundary

/**
 * Compute window key untuk daily quota dengan timezone WIB.
 * Output format YYYY-MM-DD.
 */
export function getDailyWindowKey(now: Date = new Date()): string {
  // Pakai Intl.DateTimeFormat agar konsisten cross-platform.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // "YYYY-MM-DD"
}

export function getMonthlyWindowKey(now: Date = new Date()): string {
  return getDailyWindowKey(now).slice(0, 7); // "YYYY-MM"
}

function redisKey(userId: string, counterKey: CounterKey | string, windowKey: string): string {
  return `quota:${userId}:${counterKey}:${windowKey}`;
}

async function resolveLimit(
  userId: string,
  counterKey: CounterKey | string,
  override?: number,
): Promise<number> {
  if (override !== undefined) return override;
  const limitKey = COUNTER_LIMIT_MAP[counterKey as CounterKey];
  if (!limitKey) {
    // Counter tanpa entitlement mapping → treat as unlimited (caller bisa override).
    return Number.MAX_SAFE_INTEGER;
  }
  const entitlements = await getAllEntitlements(userId);
  const raw = entitlements[limitKey];
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? Number.MAX_SAFE_INTEGER : 0;
  // Default conservative — 0 berarti deny. Caller harus pastikan entitlement ada.
  return 0;
}

/**
 * Lua script: INCRBY + check + (optional) DECR atomic.
 * Return: { newValue, exceeded(0|1) }
 *
 * Pakai DECR kalau exceeded supaya counter tidak terus naik di luar limit.
 * Kalau unlimited, dipanggil tanpa limit check — limit = -1 sentinel.
 */
const INCR_AND_CHECK_LUA = `
local current = redis.call('INCRBY', KEYS[1], tonumber(ARGV[1]))
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
local limit = tonumber(ARGV[2])
if limit >= 0 and current > limit then
  redis.call('DECRBY', KEYS[1], tonumber(ARGV[1]))
  return {current - tonumber(ARGV[1]), 1}
end
return {current, 0}
`;

export async function consumeQuota(
  userId: string,
  counterKey: CounterKey | string,
  opts: ConsumeQuotaOptions = {},
): Promise<QuotaResult> {
  const amount = opts.amount ?? 1;
  const windowKey = opts.windowKey ?? getDailyWindowKey();
  const limit = await resolveLimit(userId, counterKey, opts.limitOverride);
  const unlimited = isUnlimited(limit) || limit === Number.MAX_SAFE_INTEGER;

  const redis = getRedis();
  const key = redisKey(userId, counterKey, windowKey);

  const luaLimit = unlimited ? -1 : limit;
  const result = (await redis.eval(
    INCR_AND_CHECK_LUA,
    1,
    key,
    String(amount),
    String(luaLimit),
    String(KEY_TTL_SECONDS),
  )) as [number, number];

  const newValue = Number(result[0]);
  const exceeded = Number(result[1]) === 1;

  if (exceeded) {
    throw new QuotaExceededError(counterKey, limit);
  }

  // Best-effort persist ke Postgres. Kegagalan tidak block.
  if (!opts.skipPersist) {
    try {
      const tierKode = await getUserTier(userId);
      await db
        .insert(usageCounters)
        .values({
          userId,
          counterKey,
          periodWindow: windowKey,
          count: newValue,
          limitSnapshot: unlimited ? null : limit,
          tierKodeSnapshot: tierKode,
          lastIncrementedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [usageCounters.userId, usageCounters.counterKey, usageCounters.periodWindow],
          set: {
            count: newValue,
            limitSnapshot: unlimited ? null : limit,
            tierKodeSnapshot: tierKode,
            lastIncrementedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      logger.warn({ err, userId, counterKey }, "Failed to persist usage_counter (Redis is SoT)");
    }
  }

  return {
    used: newValue,
    limit: unlimited ? Number.MAX_SAFE_INTEGER : limit,
    remaining: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - newValue),
    unlimited,
    windowKey,
  };
}

export async function getRemainingQuota(
  userId: string,
  counterKey: CounterKey | string,
  opts: { windowKey?: string } = {},
): Promise<QuotaResult> {
  const windowKey = opts.windowKey ?? getDailyWindowKey();
  const limit = await resolveLimit(userId, counterKey);
  const unlimited = isUnlimited(limit) || limit === Number.MAX_SAFE_INTEGER;

  const redis = getRedis();
  const key = redisKey(userId, counterKey, windowKey);
  const raw = await redis.get(key);
  const used = raw ? Number.parseInt(raw, 10) : 0;

  return {
    used,
    limit: unlimited ? Number.MAX_SAFE_INTEGER : limit,
    remaining: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - used),
    unlimited,
    windowKey,
  };
}

/**
 * Reset (clear) counter — admin only. Audit log oleh caller.
 */
export async function resetQuota(
  userId: string,
  counterKey: CounterKey | string,
  windowKey: string = getDailyWindowKey(),
): Promise<void> {
  const redis = getRedis();
  await redis.del(redisKey(userId, counterKey, windowKey));
  await db
    .delete(usageCounters)
    .where(
      and(
        eq(usageCounters.userId, userId),
        eq(usageCounters.counterKey, counterKey),
        eq(usageCounters.periodWindow, windowKey),
      ),
    );
}

/**
 * Helper untuk admin/observability — total Redis usage user (best-effort).
 */
export async function getAllUsage(
  userId: string,
  windowKey: string = getDailyWindowKey(),
): Promise<Record<string, number>> {
  const redis = getRedis();
  const pattern = `quota:${userId}:*:${windowKey}`;
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return {};
  const values = await redis.mget(...keys);
  const result: Record<string, number> = {};
  keys.forEach((k, i) => {
    const parts = k.split(":");
    // quota:{userId}:{counterKey...}:{windowKey}
    // counterKey may contain ":" since some are dot-separated. Reconstruct by
    // stripping prefix `quota:{userId}:` and suffix `:{windowKey}`.
    const counterKey = parts.slice(2, parts.length - 1).join(":");
    const value = values[i];
    result[counterKey] = value ? Number.parseInt(value, 10) : 0;
  });
  return result;
}

