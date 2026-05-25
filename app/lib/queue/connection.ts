import IORedis, { type Redis, type RedisOptions } from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Singleton Redis connections (BullMQ needs ≥3 distinct clients per worker:
 * one for client, one for subscriber, one for blocking commands).
 *
 * Kita expose:
 * - `getRedis()` — connection umum (autoMerge command, set/get cache, dll).
 * - `getQueueConnection()` — connection khusus BullMQ producer.
 * - `getWorkerConnection()` — connection khusus BullMQ worker (maxRetriesPerRequest = null).
 * - `getSubscriberConnection()` — pub/sub subscriber (tidak boleh dipakai untuk command lain).
 *
 * BullMQ requirement: `maxRetriesPerRequest: null` & `enableReadyCheck: false` untuk worker.
 */

const COMMON_OPTS: RedisOptions = {
  lazyConnect: true,
  enableAutoPipelining: true,
};

const BLOCKING_OPTS: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  enableAutoPipelining: false,
};

let _general: Redis | null = null;
let _queue: Redis | null = null;
let _worker: Redis | null = null;
let _subscriber: Redis | null = null;
let _publisher: Redis | null = null;

function attachListeners(name: string, client: Redis): Redis {
  client.on("error", (err) => {
    logger.warn({ err: err.message, client: name }, "Redis client error");
  });
  client.on("end", () => {
    logger.debug({ client: name }, "Redis connection ended");
  });
  client.on("reconnecting", () => {
    logger.debug({ client: name }, "Redis reconnecting");
  });
  return client;
}

export function getRedis(): Redis {
  if (!_general) {
    _general = attachListeners("general", new IORedis(env.REDIS_URL, COMMON_OPTS));
  }
  return _general;
}

export function getQueueConnection(): Redis {
  if (!_queue) {
    _queue = attachListeners("queue", new IORedis(env.REDIS_URL, COMMON_OPTS));
  }
  return _queue;
}

export function getWorkerConnection(): Redis {
  if (!_worker) {
    _worker = attachListeners("worker", new IORedis(env.REDIS_URL, BLOCKING_OPTS));
  }
  return _worker;
}

export function getSubscriberConnection(): Redis {
  if (!_subscriber) {
    _subscriber = attachListeners("subscriber", new IORedis(env.REDIS_URL, COMMON_OPTS));
  }
  return _subscriber;
}

export function getPublisherConnection(): Redis {
  if (!_publisher) {
    _publisher = attachListeners("publisher", new IORedis(env.REDIS_URL, COMMON_OPTS));
  }
  return _publisher;
}

export async function pingRedis(timeoutMs = 1500): Promise<boolean> {
  try {
    const r = getRedis();
    const result = await Promise.race([
      r.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redis ping timeout")), timeoutMs),
      ),
    ]);
    return result === "PONG";
  } catch (err) {
    logger.warn({ err }, "Redis ping failed");
    return false;
  }
}

export async function closeAllRedis(): Promise<void> {
  const clients: Array<[string, Redis | null]> = [
    ["general", _general],
    ["queue", _queue],
    ["worker", _worker],
    ["subscriber", _subscriber],
    ["publisher", _publisher],
  ];
  await Promise.allSettled(
    clients
      .filter((c): c is [string, Redis] => !!c[1])
      .map(async ([name, c]) => {
        try {
          await c.quit();
        } catch (err) {
          logger.warn({ err, client: name }, "Failed to quit redis cleanly, forcing disconnect");
          c.disconnect();
        }
      }),
  );
  _general = null;
  _queue = null;
  _worker = null;
  _subscriber = null;
  _publisher = null;
}
