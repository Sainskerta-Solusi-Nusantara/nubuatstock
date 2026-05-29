import { logger } from "@/lib/logger";
import type { OhlcvBar, OhlcvInterval, Quote } from "@/lib/types/market";
import { AdapterNotConfiguredError, MarketDataAdapter, VendorError } from "./base";

/**
 * Alpha Vantage adapter — vendor FALLBACK darurat untuk failover.
 *
 * - Free tier: 25 request / hari, 5 request / menit. JANGAN dipakai sebagai
 *   sumber utama; hanya saat vendor primer (Yahoo) benar-benar down. Lihat
 *   `lib/market-data/failover.ts` untuk guard rate-limit / circuit-breaker.
 * - Suffix `.JKT` untuk ticker IDX (e.g., BBRI.JKT).
 * - API key dibaca dari `process.env.ALPHA_VANTAGE_API_KEY` (BUKAN lib/env.ts —
 *   kontrak 3-var). Tanpa key → throw AdapterNotConfiguredError supaya failover
 *   bisa skip dengan rapi.
 * - Endpoint:
 *   - quote:  GLOBAL_QUOTE
 *   - daily:  TIME_SERIES_DAILY (compact = 100 bar terakhir, full = 20+ tahun)
 *
 * CATATAN: AV tidak punya konsep `marketState` real-time → di-set "UNKNOWN".
 *   Interval selain `1d` tidak didukung free tier (weekly/monthly endpoint
 *   terpisah) → kita derive on read di service layer, jadi adapter hanya
 *   menyediakan daily; `1wk`/`1mo` di-resample ke daily request.
 */

const VENDOR = "alpha_vantage";
const BASE_URL = "https://www.alphavantage.co/query";
const ENV_KEY = "ALPHA_VANTAGE_API_KEY";

function apiKey(): string {
  const key = process.env[ENV_KEY];
  if (!key || key.trim().length === 0) {
    throw new AdapterNotConfiguredError(VENDOR, `process.env.${ENV_KEY}`);
  }
  return key.trim();
}

function toAvSymbol(code: string): string {
  const upper = code.toUpperCase();
  return upper.endsWith(".JKT") ? upper : `${upper}.JKT`;
}

function fromAvSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\.JKT$/u, "");
}

interface AvGlobalQuoteResponse {
  "Global Quote"?: {
    "01. symbol"?: string;
    "02. open"?: string;
    "03. high"?: string;
    "04. low"?: string;
    "05. price"?: string;
    "06. volume"?: string;
    "08. previous close"?: string;
    "09. change"?: string;
    "10. change percent"?: string;
  };
  // AV signals problems via these keys instead of HTTP status.
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

interface AvDailyResponse {
  "Time Series (Daily)"?: Record<
    string,
    {
      "1. open": string;
      "2. high": string;
      "3. low": string;
      "4. close": string;
      "5. volume": string;
    }
  >;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

/**
 * AV mengembalikan HTTP 200 bahkan saat rate-limited / error. Deteksi via
 * payload keys. `Note`/`Information` = rate limit (retryable, vendor-down-ish);
 * `Error Message` = invalid symbol (NON-retryable — jangan failover loop).
 */
function detectAvError(
  payload: { Note?: string; Information?: string; "Error Message"?: string },
): void {
  if (payload["Error Message"]) {
    // Invalid API call / unknown symbol — treat like "ticker not found".
    throw new VendorError(
      `Alpha Vantage: ${payload["Error Message"]}`,
      VENDOR,
      undefined,
      404,
    );
  }
  if (payload.Note || payload.Information) {
    // Rate limit / throttle — vendor-down-ish, retryable.
    throw new VendorError(
      `Alpha Vantage rate-limited: ${payload.Note ?? payload.Information}`,
      VENDOR,
      undefined,
      429,
    );
  }
}

async function fetchJson<T extends object>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new VendorError(
      `Alpha Vantage HTTP ${res.status}`,
      VENDOR,
      undefined,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export class AlphaVantageAdapter implements MarketDataAdapter {
  readonly name = VENDOR;

  async fetchQuote(code: string): Promise<Quote> {
    const key = apiKey();
    const symbol = toAvSymbol(code);
    const url =
      `${BASE_URL}?function=GLOBAL_QUOTE` +
      `&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;

    let resp: AvGlobalQuoteResponse;
    try {
      resp = await fetchJson<AvGlobalQuoteResponse>(url);
    } catch (err) {
      if (err instanceof VendorError) throw err;
      throw new VendorError(`Alpha Vantage quote fetch failed for ${symbol}`, VENDOR, err);
    }
    detectAvError(resp);

    const gq = resp["Global Quote"];
    // AV returns an empty `{}` object for unknown symbols.
    if (!gq || !gq["05. price"]) {
      throw new VendorError(`No quote data for ${symbol}`, VENDOR, undefined, 404);
    }

    const price = gq["05. price"];
    const prevClose = gq["08. previous close"] ?? null;
    const change = gq["09. change"] ?? null;
    const rawPct = gq["10. change percent"]; // e.g. "1.2345%"
    const changePct =
      rawPct != null
        ? Number.parseFloat(rawPct.replace("%", "")).toFixed(4)
        : prevClose && Number(prevClose) !== 0
          ? (((Number(price) - Number(prevClose)) / Number(prevClose)) * 100).toFixed(4)
          : "0.0000";

    return {
      code: gq["01. symbol"] ? fromAvSymbol(gq["01. symbol"]) : code.toUpperCase(),
      price,
      change: change ?? "0",
      changePct,
      open: gq["02. open"] ?? null,
      high: gq["03. high"] ?? null,
      low: gq["04. low"] ?? null,
      prevClose,
      volume: gq["06. volume"] ?? null,
      valueIdr: null,
      marketTime: new Date().toISOString(),
      marketState: "UNKNOWN",
      currency: "IDR",
      vendor: VENDOR,
    };
  }

  async fetchOhlcv(
    code: string,
    from: Date,
    to: Date,
    _interval: OhlcvInterval,
  ): Promise<OhlcvBar[]> {
    const key = apiKey();
    const symbol = toAvSymbol(code);
    // `full` supaya bisa cover rentang panjang; service layer resample 1wk/1mo.
    const url =
      `${BASE_URL}?function=TIME_SERIES_DAILY` +
      `&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${encodeURIComponent(key)}`;

    let resp: AvDailyResponse;
    try {
      resp = await fetchJson<AvDailyResponse>(url);
    } catch (err) {
      if (err instanceof VendorError) throw err;
      throw new VendorError(`Alpha Vantage OHLCV fetch failed for ${symbol}`, VENDOR, err);
    }
    detectAvError(resp);

    const series = resp["Time Series (Daily)"];
    if (!series) {
      throw new VendorError(`No OHLCV data for ${symbol}`, VENDOR, undefined, 404);
    }

    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);

    const bars: OhlcvBar[] = [];
    for (const [date, row] of Object.entries(series)) {
      if (date < fromIso || date > toIso) continue;
      bars.push({
        date,
        open: row["1. open"],
        high: row["2. high"],
        low: row["3. low"],
        close: row["4. close"],
        volume: Math.trunc(Number(row["5. volume"]) || 0).toString(),
      });
    }
    // AV returns newest-first; sort ascending to match Yahoo adapter contract.
    bars.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (bars.length === 0) {
      logger.warn({ code, fromIso, toIso }, "Alpha Vantage returned no bars in range");
    }
    return bars;
  }
}
