import { logger } from "@/lib/logger";
import type {
  IntradayPoint,
  OhlcvBar,
  OhlcvInterval,
  Quote,
  TickerSearchResult,
} from "@/lib/types/market";
import { MarketDataAdapter, VendorError } from "./base";

/**
 * Yahoo Finance adapter — unofficial public endpoint.
 *
 * - Suffix `.JK` untuk ticker IDX (e.g., BBRI.JK).
 * - Gratis, real data, tidak butuh API key.
 * - Endpoint:
 *   - chart:  https://query1.finance.yahoo.com/v8/finance/chart/{code}.JK?interval=1d&range=2y
 *   - search: https://query2.finance.yahoo.com/v1/finance/search?q=...
 * - Rate limit: ~2000 req/hour per IP (kasar). Service layer apply Redis cache.
 *
 * CATATAN: endpoint unofficial → bisa berubah sewaktu-waktu. Kalau down, admin
 * swap ke vendor lain via /admin/config (market_data.default_vendor).
 */

const BASE_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const BASE_SEARCH = "https://query2.finance.yahoo.com/v1/finance/search";
const VENDOR = "yahoo_finance";
const USER_AGENT =
  "Mozilla/5.0 (compatible; NubuatMarketData/1.0; +https://nubuat.id)";

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
        marketState?: string;
        currency?: string;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators: {
        quote: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchange?: string;
    exchDisp?: string;
  }>;
}

function toYahooSymbol(code: string): string {
  const upper = code.toUpperCase();
  return upper.endsWith(".JK") ? upper : `${upper}.JK`;
}

function fromYahooSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\.JK$/u, "");
}

function mapInterval(interval: OhlcvInterval): string {
  switch (interval) {
    case "1d":
      return "1d";
    case "1wk":
      return "1wk";
    case "1mo":
      return "1mo";
  }
}

function mapMarketState(s?: string): Quote["marketState"] {
  switch (s) {
    case "PRE":
      return "PRE";
    case "REGULAR":
      return "REGULAR";
    case "POST":
    case "POSTPOST":
      return "POST";
    case "CLOSED":
    case "PREPRE":
      return "CLOSED";
    default:
      return "UNKNOWN";
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    signal,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new VendorError(
      `Yahoo Finance HTTP ${res.status}`,
      VENDOR,
      undefined,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export class YahooFinanceAdapter implements MarketDataAdapter {
  readonly name = VENDOR;

  async fetchQuote(code: string): Promise<Quote> {
    const symbol = toYahooSymbol(code);
    const url = `${BASE_CHART}/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
    let resp: YahooChartResponse;
    try {
      resp = await fetchJson<YahooChartResponse>(url);
    } catch (err) {
      if (err instanceof VendorError) throw err;
      throw new VendorError(`Yahoo quote fetch failed for ${symbol}`, VENDOR, err);
    }

    if (resp.chart.error) {
      throw new VendorError(
        `Yahoo error: ${resp.chart.error.description}`,
        VENDOR,
        resp.chart.error,
      );
    }

    const result = resp.chart.result?.[0];
    if (!result) {
      throw new VendorError(`No quote data for ${symbol}`, VENDOR);
    }

    const meta = result.meta;
    const quote = result.indicators.quote[0];
    const timestamps = result.timestamp ?? [];
    const lastIdx = timestamps.length - 1;

    const price =
      typeof meta.regularMarketPrice === "number"
        ? meta.regularMarketPrice
        : lastIdx >= 0
          ? quote?.close?.[lastIdx] ?? null
          : null;
    const prevClose =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
          ? meta.previousClose
          : null;

    if (price === null || price === undefined) {
      throw new VendorError(`Price unavailable for ${symbol}`, VENDOR);
    }

    const change = prevClose !== null ? price - prevClose : 0;
    const changePct = prevClose && prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const open = lastIdx >= 0 ? quote?.open?.[lastIdx] ?? null : null;
    const high = lastIdx >= 0 ? quote?.high?.[lastIdx] ?? null : null;
    const low = lastIdx >= 0 ? quote?.low?.[lastIdx] ?? null : null;
    const volume = lastIdx >= 0 ? quote?.volume?.[lastIdx] ?? null : null;

    const marketTime =
      typeof meta.regularMarketTime === "number"
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString();

    return {
      code: fromYahooSymbol(meta.symbol),
      price: price.toString(),
      change: change.toString(),
      changePct: changePct.toFixed(4),
      open: open !== null && open !== undefined ? open.toString() : null,
      high: high !== null && high !== undefined ? high.toString() : null,
      low: low !== null && low !== undefined ? low.toString() : null,
      prevClose: prevClose !== null && prevClose !== undefined ? prevClose.toString() : null,
      volume: volume !== null && volume !== undefined ? Math.trunc(volume).toString() : null,
      valueIdr: null,
      marketTime,
      marketState: mapMarketState(meta.marketState),
      currency: meta.currency ?? "IDR",
      vendor: VENDOR,
    };
  }

  async fetchOhlcv(
    code: string,
    from: Date,
    to: Date,
    interval: OhlcvInterval,
  ): Promise<OhlcvBar[]> {
    const symbol = toYahooSymbol(code);
    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(to.getTime() / 1000);
    const url =
      `${BASE_CHART}/${encodeURIComponent(symbol)}` +
      `?interval=${mapInterval(interval)}&period1=${period1}&period2=${period2}&includePrePost=false&events=div%2Csplit`;

    let resp: YahooChartResponse;
    try {
      resp = await fetchJson<YahooChartResponse>(url);
    } catch (err) {
      if (err instanceof VendorError) throw err;
      throw new VendorError(`Yahoo OHLCV fetch failed for ${symbol}`, VENDOR, err);
    }

    if (resp.chart.error) {
      throw new VendorError(
        `Yahoo error: ${resp.chart.error.description}`,
        VENDOR,
        resp.chart.error,
      );
    }

    const result = resp.chart.result?.[0];
    if (!result || !result.timestamp || !result.indicators.quote[0]) {
      return [];
    }

    const ts = result.timestamp;
    const q = result.indicators.quote[0];
    const bars: OhlcvBar[] = [];
    for (let i = 0; i < ts.length; i += 1) {
      const o = q.open?.[i];
      const h = q.high?.[i];
      const l = q.low?.[i];
      const c = q.close?.[i];
      const v = q.volume?.[i];
      if (
        o === null || o === undefined ||
        h === null || h === undefined ||
        l === null || l === undefined ||
        c === null || c === undefined
      ) {
        continue;
      }
      const date = new Date(ts[i]! * 1000).toISOString().slice(0, 10);
      const volume = typeof v === "number" ? Math.trunc(v) : 0;
      bars.push({
        date,
        open: o.toString(),
        high: h.toString(),
        low: l.toString(),
        close: c.toString(),
        volume: volume.toString(),
      });
    }
    return bars;
  }

  async fetchIntraday(code: string, range: string): Promise<IntradayPoint[]> {
    const symbol = toYahooSymbol(code);
    const url =
      `${BASE_CHART}/${encodeURIComponent(symbol)}?interval=5m&range=${encodeURIComponent(range)}&includePrePost=false`;
    let resp: YahooChartResponse;
    try {
      resp = await fetchJson<YahooChartResponse>(url);
    } catch (err) {
      if (err instanceof VendorError) throw err;
      throw new VendorError(`Yahoo intraday fetch failed for ${symbol}`, VENDOR, err);
    }
    const result = resp.chart.result?.[0];
    if (!result || !result.timestamp || !result.indicators.quote[0]) return [];

    const ts = result.timestamp;
    const q = result.indicators.quote[0];
    const out: IntradayPoint[] = [];
    for (let i = 0; i < ts.length; i += 1) {
      const close = q.close?.[i];
      const volume = q.volume?.[i];
      if (close === null || close === undefined) continue;
      out.push({
        ts: new Date(ts[i]! * 1000).toISOString(),
        price: close.toString(),
        volume: typeof volume === "number" ? Math.trunc(volume).toString() : "0",
      });
    }
    return out;
  }

  async fetchSearch(query: string): Promise<TickerSearchResult[]> {
    const url = `${BASE_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
    let resp: YahooSearchResponse;
    try {
      resp = await fetchJson<YahooSearchResponse>(url);
    } catch (err) {
      logger.warn({ err, query }, "Yahoo search failed");
      return [];
    }
    const quotes = resp.quotes ?? [];
    return quotes
      .filter((q) => q.symbol?.endsWith(".JK"))
      .map((q): TickerSearchResult => {
        const type = (q.quoteType ?? "").toUpperCase();
        return {
          code: fromYahooSymbol(q.symbol),
          name: q.longname ?? q.shortname ?? q.symbol,
          exchange: q.exchDisp ?? q.exchange ?? "JKT",
          type:
            type === "EQUITY"
              ? "EQUITY"
              : type === "ETF"
                ? "ETF"
                : type === "INDEX"
                  ? "INDEX"
                  : "OTHER",
        };
      });
  }
}
