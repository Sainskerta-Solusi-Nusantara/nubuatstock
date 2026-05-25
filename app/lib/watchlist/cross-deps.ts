/**
 * Cross-agent dependency adapter (Agent 6 perspective).
 *
 * Mengisolasi import dari domain milik agent lain agar build tidak gagal
 * selama mereka belum publish module. Saat agent terkait sudah landing, file
 * ini tetap dipakai sebagai single point of indirection. JANGAN duplikasi
 * logic di sini — semua hanya tipis re-export / fallback empty-state aware.
 *
 * Kontrak yang diharapkan:
 *   - Agent 3 (`@/lib/auth`)        → requireSession(): Promise<AppSession>
 *   - Agent 4 (`@/lib/billing`)     → requireEntitlement<T>(userId, key, predicate?)
 *   - Agent 5 (`@/lib/market-data`) → getQuote(code): Promise<Quote> (string-decimal)
 *                                     getEvaluationContext (TBD; fallback ke quote-only)
 *   - Agent 10 (`@/lib/queue/events`)→ publishEvent(channel, payload)
 *
 * Bila module belum ada / channel tidak terdaftar, fungsi-fungsi di sini
 * graceful degrade (return null / no-op) dengan tetap throw ConfigurationError
 * di operasi auth & billing yang strict.
 */

import { ConfigurationError, UnauthorizedError } from "@/lib/errors";
import type { WatchlistQuoteSnapshot } from "@/lib/types/watchlist";
import type {
  AlertChannel,
  AlertCondition,
  AlertEvaluationContext,
} from "@/lib/types/alerts";

export interface AuthContext {
  userId: string;
  role: string;
  tier?: string | null;
}

/**
 * Normalisasi session dari Agent 3 ke shape minimal yang Agent 6 butuhkan.
 * Mendukung dua bentuk:
 *   1. `{ user: { id, role }, session: {...} }` — bentuk AppSession dari Agent 3.
 *   2. `{ userId, role }` — bentuk lama (untuk testing / fallback).
 */
export async function requireSession(): Promise<AuthContext> {
  try {
    const mod: unknown = await import("@/lib/auth");
    const fn = (mod as { requireSession?: () => Promise<unknown> }).requireSession;
    if (typeof fn !== "function") {
      throw new ConfigurationError("auth.requireSession");
    }
    const raw = await fn();
    return normalizeSession(raw);
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof ConfigurationError) throw err;
    throw new UnauthorizedError();
  }
}

function normalizeSession(raw: unknown): AuthContext {
  if (!raw || typeof raw !== "object") throw new UnauthorizedError();
  const obj = raw as Record<string, unknown>;
  // Pattern AppSession dari Agent 3
  if (
    obj.user &&
    typeof obj.user === "object" &&
    typeof (obj.user as Record<string, unknown>).id === "string"
  ) {
    const u = obj.user as Record<string, unknown>;
    return {
      userId: u.id as string,
      role: (u.role as string) ?? "user",
      tier: typeof u.tier === "string" ? (u.tier as string) : null,
    };
  }
  // Pattern flat { userId, role }
  if (typeof obj.userId === "string") {
    return {
      userId: obj.userId,
      role: (obj.role as string) ?? "user",
      tier: typeof obj.tier === "string" ? (obj.tier as string) : null,
    };
  }
  throw new UnauthorizedError();
}

/**
 * Tier-based entitlement gating.
 *
 * `predicate(value)` should return `true` ketika user MASIH boleh melanjutkan.
 * Untuk boolean entitlement, billing module akan resolve ke boolean dan
 * predicate diabaikan (default semantik: must be `true`).
 *
 * Signature aligned dengan Agent 4 `lib/billing.requireEntitlement<T>`.
 */
export async function requireEntitlement<T = number>(
  userId: string,
  key: string,
  predicate?: (value: T) => boolean,
): Promise<void> {
  const mod: unknown = await import("@/lib/billing").catch(() => null);
  if (!mod) throw new ConfigurationError(`billing.entitlement.${key}`);
  const fn = (mod as {
    requireEntitlement?: <V>(
      uid: string,
      k: string,
      pred?: (value: V) => boolean,
    ) => Promise<V>;
  }).requireEntitlement;
  if (typeof fn !== "function") {
    throw new ConfigurationError(`billing.entitlement.${key}`);
  }
  await fn<T>(userId, key, predicate);
}

/**
 * Quote raw shape dari Agent 5 (`lib/market-data`) — string-decimal.
 * Adapter di sini convert ke `WatchlistQuoteSnapshot` (numeric) untuk UI.
 */
interface RawQuote {
  code: string;
  price: string;
  change?: string | null;
  changePct?: string | null;
  prevClose?: string | null;
  volume?: string | null;
  valueIdr?: string | null;
  marketTime?: string | null;
}

function safeNum(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function adaptQuote(code: string, raw: RawQuote): WatchlistQuoteSnapshot {
  return {
    companyKode: code,
    last: safeNum(raw.price),
    prevClose: safeNum(raw.prevClose),
    changeAbs: safeNum(raw.change),
    changePct: safeNum(raw.changePct),
    volume: safeNum(raw.volume),
    value: safeNum(raw.valueIdr),
    asOf: raw.marketTime ?? null,
  };
}

export async function getQuote(code: string): Promise<WatchlistQuoteSnapshot | null> {
  const mod: unknown = await import("@/lib/market-data").catch(() => null);
  if (!mod) return null;
  const fn = (mod as { getQuote?: (c: string) => Promise<RawQuote> }).getQuote;
  if (typeof fn !== "function") return null;
  try {
    const raw = await fn(code);
    return adaptQuote(code, raw);
  } catch {
    return null;
  }
}

export async function getQuotesBatch(
  codes: string[],
): Promise<Record<string, WatchlistQuoteSnapshot | null>> {
  if (codes.length === 0) return {};
  const mod: unknown = await import("@/lib/market-data").catch(() => null);
  if (!mod) return Object.fromEntries(codes.map((c) => [c, null]));
  const single = (mod as { getQuote?: (c: string) => Promise<RawQuote> }).getQuote;
  if (typeof single !== "function") {
    return Object.fromEntries(codes.map((c) => [c, null]));
  }
  // Promise.all in parallel; Agent 5 sudah cache 30s di Redis sehingga aman dipanggil per-code.
  const entries = await Promise.all(
    codes.map(async (c) => {
      try {
        const raw = await single(c);
        return [c, adaptQuote(c, raw)] as const;
      } catch {
        return [c, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export async function getEvaluationContext(
  code: string,
): Promise<AlertEvaluationContext | null> {
  const mod: unknown = await import("@/lib/market-data").catch(() => null);
  if (!mod) return null;
  const fn = (mod as {
    getEvaluationContext?: (c: string) => Promise<AlertEvaluationContext | null>;
  }).getEvaluationContext;
  if (typeof fn !== "function") {
    // Fallback: build minimal context dari getQuote (tanpa MA/RSI) — pure data.
    const quote = await getQuote(code);
    if (!quote) return null;
    return {
      companyKode: code,
      last: quote.last,
      prevClose: quote.prevClose,
      changePctDay: quote.changePct,
      changePctWeek: null,
      changePctMonth: null,
      volume: quote.volume,
      volumeAvg: null,
      ma: {},
      maPrev: {},
      rsi: {},
      asOf: quote.asOf ?? new Date().toISOString(),
    };
  }
  try {
    return await fn(code);
  } catch {
    return null;
  }
}

/**
 * Daftar channel yang TERDAFTAR di Agent 10 (`lib/queue/events.ts`).
 * Hanya channel di sini yang akan benar-benar di-publish lewat Redis pub/sub.
 * Sisanya hanya di-log untuk observability tanpa memanggil queue.publishEvent
 * (yang akan throw `Refusing to publish invalid event payload`).
 */
const REGISTERED_EVENT_CHANNELS = new Set<string>([
  "user.created",
  "user.deleted",
  "subscription.changed",
  "market.eod.ingested",
  "picks.generated",
  "alert.triggered",
  "secret.rotated",
]);

export async function publishEvent(
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!REGISTERED_EVENT_CHANNELS.has(topic)) {
    return; // Soft no-op untuk channel internal Agent 6 (watchlist.*).
  }
  const mod: unknown = await import("@/lib/queue/events").catch(() => null);
  if (!mod) return;
  const fn = (mod as {
    publishEvent?: (t: string, p: Record<string, unknown>) => Promise<void>;
  }).publishEvent;
  if (typeof fn === "function") {
    try {
      await fn(topic, payload);
    } catch {
      /* swallow — observability handled di Agent 10 */
    }
  }
}

export type AlertChannelExternal = AlertChannel;
export type AlertConditionExternal = AlertCondition;
