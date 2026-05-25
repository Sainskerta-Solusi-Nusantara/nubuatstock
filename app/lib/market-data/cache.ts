import Redis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Shared Redis client untuk caching market data.
 *
 * - Singleton per-process (lazy init).
 * - Failure tolerant: kalau Redis down, cache helper return `null` & log warning;
 *   service layer fallback ke DB / adapter.
 *
 * CATATAN: scaffold belum punya lib/redis.ts shared; kalau Agent 10 nanti
 * mengangkat ini ke shared util, modul ini cukup re-export.
 */

let client: Redis | null = null;

function getRedis(): Redis {
  if (client) return client;
  client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  client.on("error", (err) => {
    logger.warn({ err: err.message }, "Redis error (market-data cache)");
  });
  return client;
}

const KEY_PREFIX = "nubuat:market:";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    const raw = await r.get(`${KEY_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ err, key }, "cacheGet failed; bypassing cache");
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const r = getRedis();
    await r.set(`${KEY_PREFIX}${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "cacheSet failed; cache miss next time");
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const r = getRedis();
    await r.del(`${KEY_PREFIX}${key}`);
  } catch (err) {
    logger.warn({ err, key }, "cacheDel failed");
  }
}
