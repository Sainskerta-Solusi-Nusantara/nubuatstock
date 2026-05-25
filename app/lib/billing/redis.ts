import Redis from "ioredis";
import { env } from "../env";
import { logger } from "../logger";

/**
 * Redis client untuk quota counters (atomic INCR + TTL).
 *
 * - Singleton — satu koneksi per process.
 * - Lazy connect untuk efficient cold-start di serverless.
 * - REDIS_URL salah satu dari 3 env var yang diizinkan (lihat lib/env.ts).
 *
 * Note: Agent 10 nanti boleh extend ini menjadi factory dengan multiple
 * connection pool kalau dibutuhkan (queue, pub/sub, dll). Untuk MVP cukup
 * satu koneksi.
 */

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;
  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  client.on("error", (err) => {
    logger.error({ err }, "Redis client error");
  });
  client.on("connect", () => {
    logger.debug("Redis connected");
  });
  return client;
}
