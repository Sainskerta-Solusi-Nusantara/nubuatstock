import type {
  IntradayPoint,
  OhlcvBar,
  OhlcvInterval,
  Quote,
  TickerSearchResult,
} from "@/lib/types/market";

/**
 * Adapter interface untuk market data vendor.
 *
 * Implementor wajib pakai `code` IDX (e.g., "BBRI") tanpa suffix vendor;
 * konversi suffix vendor (e.g., ".JK" untuk Yahoo) dilakukan internal di adapter.
 *
 * Optional methods (`fetchIntraday`, `fetchSearch`): adapter boleh skip kalau
 * vendor tidak menyediakan; service layer fallback ke DB / adapter lain.
 */
export interface MarketDataAdapter {
  readonly name: string;

  fetchQuote(code: string): Promise<Quote>;

  fetchOhlcv(
    code: string,
    from: Date,
    to: Date,
    interval: OhlcvInterval,
  ): Promise<OhlcvBar[]>;

  fetchIntraday?(code: string, range: string): Promise<IntradayPoint[]>;

  fetchSearch?(query: string): Promise<TickerSearchResult[]>;
}

/**
 * Vendor-side error untuk request gagal (network, 4xx, 5xx, rate limit).
 * Service layer akan map ke ConfigurationError / 503 untuk client.
 */
export class VendorError extends Error {
  override readonly name = "VendorError";
  constructor(
    message: string,
    readonly vendor: string,
    readonly cause?: unknown,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * Adapter belum di-setup (mis. API key kosong). Service layer return 503
 * dengan pesan "Admin perlu konfigurasi vendor di /admin/config".
 */
export class AdapterNotConfiguredError extends Error {
  override readonly name = "AdapterNotConfiguredError";
  constructor(readonly vendor: string, readonly setting: string) {
    super(`Adapter ${vendor} not configured: ${setting} missing or empty`);
  }
}
