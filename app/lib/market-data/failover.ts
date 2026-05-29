import { logger } from "@/lib/logger";
import type {
  IntradayPoint,
  OhlcvBar,
  OhlcvInterval,
  Quote,
  TickerSearchResult,
} from "@/lib/types/market";
import { AlphaVantageAdapter } from "./adapters/alpha-vantage";
import { AdapterNotConfiguredError, MarketDataAdapter, VendorError } from "./adapters/base";
import { YahooFinanceAdapter } from "./adapters/yahoo-finance";

/**
 * Vendor failover wrapper (IMPROVEMENT_PLAN §8.5 #37).
 *
 * Yahoo Finance adalah single point of failure: kalau down, semua ticker page
 * rusak. Wrapper ini mencoba vendor PRIMER (Yahoo) lebih dulu; kalau gagal
 * karena vendor-down/network/timeout (BUKAN "ticker tidak ada"), fallback ke
 * Alpha Vantage (emergency, free tier 25 calls/hari).
 *
 * Prinsip:
 *  - Primer sukses → fallback TIDAK dipanggil (hemat kuota AV).
 *  - Error "ticker tidak ada" (404 / not-found) → JANGAN failover, rethrow.
 *    Failover ke AV cuma menghabiskan kuota tanpa hasil.
 *  - Timeout wajar di primer supaya tidak menggantung saat Yahoo lambat.
 *  - Guard rate-limit + circuit-breaker sederhana melindungi kuota AV.
 *
 * Catatan env: Alpha Vantage butuh `process.env.ALPHA_VANTAGE_API_KEY`. Tanpa
 * key, AV adapter throw AdapterNotConfiguredError → failover di-skip dan error
 * Yahoo asli yang di-rethrow (tidak menutupi root cause).
 */

const PRIMARY_TIMEOUT_MS = 8_000;

/**
 * Guard kuota Alpha Vantage. Free tier = 25 req/hari & ~5 req/menit. Kita pakai
 * margin aman: max 20 panggilan/hari. Counter in-memory per-process (cukup untuk
 * proteksi runaway; bukan akurasi lintas instance). Reset harian otomatis.
 *
 * Circuit-breaker: setelah N kegagalan AV beruntun, buka circuit selama cooldown
 * supaya tidak spam vendor yang sedang bermasalah.
 */
const AV_DAILY_BUDGET = 20;
const AV_BREAKER_THRESHOLD = 3;
const AV_BREAKER_COOLDOWN_MS = 5 * 60_000;

interface AvGuardState {
  dayKey: string;
  callsToday: number;
  consecutiveFailures: number;
  openUntil: number;
}

const avGuard: AvGuardState = {
  dayKey: currentDayKey(),
  callsToday: 0,
  consecutiveFailures: 0,
  openUntil: 0,
};

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDayIfNeeded(): void {
  const today = currentDayKey();
  if (avGuard.dayKey !== today) {
    avGuard.dayKey = today;
    avGuard.callsToday = 0;
    // Breaker state tidak ikut di-reset by day; cooldown berbasis waktu.
  }
}

/** Apakah AV boleh dipanggil sekarang (kuota & breaker)? */
function avAllowed(now = Date.now()): { ok: boolean; reason?: string } {
  rollDayIfNeeded();
  if (avGuard.callsToday >= AV_DAILY_BUDGET) {
    return { ok: false, reason: "daily-budget-exhausted" };
  }
  if (avGuard.openUntil > now) {
    return { ok: false, reason: "circuit-open" };
  }
  return { ok: true };
}

function avRecordSuccess(): void {
  avGuard.callsToday += 1;
  avGuard.consecutiveFailures = 0;
}

function avRecordFailure(now = Date.now()): void {
  avGuard.callsToday += 1;
  avGuard.consecutiveFailures += 1;
  if (avGuard.consecutiveFailures >= AV_BREAKER_THRESHOLD) {
    avGuard.openUntil = now + AV_BREAKER_COOLDOWN_MS;
    avGuard.consecutiveFailures = 0;
    logger.warn(
      { cooldownMs: AV_BREAKER_COOLDOWN_MS },
      "Alpha Vantage circuit-breaker OPENED after consecutive failures",
    );
  }
}

/** Test-only: reset guard state. */
export function __resetFailoverGuard(): void {
  avGuard.dayKey = currentDayKey();
  avGuard.callsToday = 0;
  avGuard.consecutiveFailures = 0;
  avGuard.openUntil = 0;
}

/**
 * Apakah error ini berarti "ticker tidak ada" (jangan failover)?
 *
 * VendorError dengan status 404 = symbol tidak dikenal vendor. Semua error lain
 * (network, timeout, 5xx, 429 rate-limit, parse) dianggap vendor-down → failover.
 */
function isTickerNotFound(err: unknown): boolean {
  return err instanceof VendorError && err.status === 404;
}

/**
 * Race `fn` melawan timeout. Yahoo adapter tidak mengekspos AbortSignal ke
 * fetch internalnya, jadi timeout di sini me-reject promise (vendor-down-ish →
 * memicu failover); request yang menggantung akan settle di background tanpa
 * memblok. Timeout di-classify sebagai VendorError non-404 supaya failover aktif.
 */
async function withTimeout<T>(fn: () => Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new VendorError(`${label} timed out after ${ms}ms`, "primary")),
      ms,
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Adapter instances di-cache per-process (stateless, aman).
let primaryAdapter: MarketDataAdapter | null = null;
let fallbackAdapter: AlphaVantageAdapter | null = null;

function getPrimary(): MarketDataAdapter {
  primaryAdapter ??= new YahooFinanceAdapter();
  return primaryAdapter;
}

function getFallback(): AlphaVantageAdapter {
  fallbackAdapter ??= new AlphaVantageAdapter();
  return fallbackAdapter;
}

/** Test-only: inject adapter pengganti. */
export function __setFailoverAdapters(opts: {
  primary?: MarketDataAdapter;
  fallback?: AlphaVantageAdapter;
}): void {
  if (opts.primary !== undefined) primaryAdapter = opts.primary;
  if (opts.fallback !== undefined) fallbackAdapter = opts.fallback;
}

/**
 * Core failover runner.
 *
 * @param op       label operasi untuk logging.
 * @param primary  jalankan operasi di vendor primer (Yahoo).
 * @param fallback jalankan operasi di Alpha Vantage.
 */
async function runWithFailover<T>(
  op: string,
  code: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  let primaryErr: unknown;
  try {
    return await primary();
  } catch (err) {
    primaryErr = err;
    // "Ticker tidak ada" bukan kondisi vendor-down → jangan boros kuota AV.
    if (isTickerNotFound(err)) {
      throw err;
    }
    logger.warn({ err, op, code }, "Primary vendor failed; evaluating Alpha Vantage failover");
  }

  const gate = avAllowed();
  if (!gate.ok) {
    logger.warn(
      { op, code, reason: gate.reason },
      "Alpha Vantage failover skipped (guard); rethrowing primary error",
    );
    throw primaryErr;
  }

  try {
    const result = await fallback();
    avRecordSuccess();
    logger.warn({ op, code, vendor: "alpha_vantage" }, "Failover to Alpha Vantage SUCCEEDED");
    return result;
  } catch (fbErr) {
    // Key belum di-set → AV tidak benar-benar dicoba; jangan hitung sebagai failure
    // breaker, dan rethrow error primer (root cause sebenarnya).
    if (fbErr instanceof AdapterNotConfiguredError) {
      logger.warn(
        { op, code },
        "Alpha Vantage not configured (ALPHA_VANTAGE_API_KEY missing); rethrowing primary error",
      );
      throw primaryErr;
    }
    avRecordFailure();
    // "Ticker tidak ada" di AV juga → surface error AV (informatif).
    if (isTickerNotFound(fbErr)) {
      logger.warn({ op, code }, "Both vendors report ticker not found");
      throw fbErr;
    }
    logger.error({ primaryErr, fbErr, op, code }, "Both vendors failed (Yahoo + Alpha Vantage)");
    throw new VendorError(
      `All vendors failed for ${op} ${code}: primary=${errMsg(primaryErr)}; fallback=${errMsg(fbErr)}`,
      "failover",
      fbErr,
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ============================== Public API ==============================

/**
 * Adapter dengan failover Yahoo → Alpha Vantage. Drop-in untuk MarketDataAdapter
 * (subset: fetchQuote / fetchOhlcv). Optional methods (intraday/search) tetap
 * delegate ke primer tanpa failover — AV free tier tidak menyediakannya.
 */
export class FailoverMarketDataAdapter implements MarketDataAdapter {
  readonly name = "failover(yahoo_finance→alpha_vantage)";

  fetchQuote(code: string): Promise<Quote> {
    return runWithFailover(
      "quote",
      code,
      () => withTimeout(() => getPrimary().fetchQuote(code), PRIMARY_TIMEOUT_MS, "Yahoo quote"),
      () => getFallback().fetchQuote(code),
    );
  }

  fetchOhlcv(
    code: string,
    from: Date,
    to: Date,
    interval: OhlcvInterval,
  ): Promise<OhlcvBar[]> {
    return runWithFailover(
      "ohlcv",
      code,
      () =>
        withTimeout(
          () => getPrimary().fetchOhlcv(code, from, to, interval),
          PRIMARY_TIMEOUT_MS,
          "Yahoo ohlcv",
        ),
      () => getFallback().fetchOhlcv(code, from, to, interval),
    );
  }

  // Optional methods: delegate ke Yahoo tanpa failover (AV free tier tidak
  // menyediakan intraday/search; service layer sudah punya fallback DB-only).
  fetchIntraday(code: string, range: string): Promise<IntradayPoint[]> {
    const p = getPrimary();
    return p.fetchIntraday ? p.fetchIntraday(code, range) : Promise.resolve([]);
  }

  fetchSearch(query: string): Promise<TickerSearchResult[]> {
    const p = getPrimary();
    return p.fetchSearch ? p.fetchSearch(query) : Promise.resolve([]);
  }
}

/** Singleton untuk dipakai service layer. */
export const failoverAdapter = new FailoverMarketDataAdapter();
