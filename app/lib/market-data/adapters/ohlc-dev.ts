import { hasSecret } from "@/lib/config";
import type {
  OhlcvBar,
  OhlcvInterval,
  Quote,
  TickerSearchResult,
} from "@/lib/types/market";
import { AdapterNotConfiguredError, MarketDataAdapter } from "./base";

/**
 * OHLC.dev adapter — STUB.
 *
 * Vendor data IDX. Aktif ketika secret `vendor.ohlc_dev.api_key` di-set.
 * Struktur sama dengan Invezgo — di-stub sampai credential & spec API tersedia.
 */

const VENDOR = "ohlc_dev";
const SECRET_KEY = "vendor.ohlc_dev.api_key";

export class OhlcDevAdapter implements MarketDataAdapter {
  readonly name = VENDOR;

  private async ensureConfigured(): Promise<void> {
    const has = await hasSecret(SECRET_KEY);
    if (!has) {
      throw new AdapterNotConfiguredError(VENDOR, SECRET_KEY);
    }
    throw new AdapterNotConfiguredError(
      VENDOR,
      "implementation pending — set vendor.ohlc_dev.api_key & wait for adapter impl",
    );
  }

  async fetchQuote(_code: string): Promise<Quote> {
    await this.ensureConfigured();
    throw new AdapterNotConfiguredError(VENDOR, SECRET_KEY);
  }

  async fetchOhlcv(
    _code: string,
    _from: Date,
    _to: Date,
    _interval: OhlcvInterval,
  ): Promise<OhlcvBar[]> {
    await this.ensureConfigured();
    throw new AdapterNotConfiguredError(VENDOR, SECRET_KEY);
  }

  async fetchSearch(_query: string): Promise<TickerSearchResult[]> {
    await this.ensureConfigured();
    return [];
  }
}
