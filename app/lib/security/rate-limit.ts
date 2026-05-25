import { logger } from "@/lib/logger";

/**
 * Token bucket rate limiter — in-memory dengan TTL cleanup.
 *
 * Use case: protect AI endpoints, support submissions, search queries
 * dari abuse (brute force, scraping, expensive resource consumption).
 *
 * Trade-off: in-memory = reset saat server restart, tidak shared across
 * multiple replicas. For production multi-instance, swap ke Redis (Upstash).
 *
 * Usage:
 *   const result = checkRateLimit({ key: `ai:${userId}`, limit: 30, windowMs: 60_000 });
 *   if (!result.allowed) return new Response("Rate limited", { status: 429 });
 */

interface BucketState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketState>();

// Cleanup expired buckets tiap 5 menit (avoid memory leak).
let cleanupInterval: NodeJS.Timeout | null = null;
function ensureCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let removed = 0;
    for (const [key, state] of buckets.entries()) {
      if (state.resetAt < now) {
        buckets.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) logger.debug({ removed, remaining: buckets.size }, "rate-limit cleanup");
  }, 5 * 60_000);
}

export interface RateLimitOptions {
  /** Unique key per actor (mis. `ai:${userId}`, `signup:${ip}`) */
  key: string;
  /** Max requests dalam window */
  limit: number;
  /** Window dalam millisecond */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const state = buckets.get(opts.key);

  if (!state || state.resetAt < now) {
    // New window
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }

  if (state.count >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: state.resetAt,
      retryAfterMs: state.resetAt - now,
    };
  }

  state.count += 1;
  return {
    allowed: true,
    remaining: opts.limit - state.count,
    resetAt: state.resetAt,
  };
}

/** Reset bucket — useful saat user upgrade tier, dll. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Common presets untuk consistent rate limit policy. */
export const RATE_LIMITS = {
  // AI Copilot — expensive, 30 query/min per user
  aiChat: { limit: 30, windowMs: 60_000 },
  // AI tool (backtest, pattern explain) — heavy compute
  aiTool: { limit: 60, windowMs: 60_000 },
  // Login attempts — anti-bruteforce
  login: { limit: 5, windowMs: 5 * 60_000 },
  // Signup — anti-spam
  signup: { limit: 3, windowMs: 60 * 60_000 },
  // Support ticket — anti-spam
  supportSubmit: { limit: 5, windowMs: 60 * 60_000 },
  // Search — moderate, anti-scrape
  search: { limit: 60, windowMs: 60_000 },
  // Generic API
  apiDefault: { limit: 120, windowMs: 60_000 },
} as const;
