import { hasSecret } from "@/lib/config";
import type {
  OhlcvBar,
  OhlcvInterval,
  Quote,
  TickerSearchResult,
} from "@/lib/types/market";
import { AdapterNotConfiguredError, MarketDataAdapter } from "./base";

/**
 * Invezgo adapter — STUB.
 *
 * Vendor data IDX berbayar. Aktif ketika secret `vendor.invezgo.api_key` di-set
 * via /admin/config. Implementasi konkret menunggu credential resmi.
 *
 * Method tetap throw AdapterNotConfiguredError selama key belum di-set, supaya
 * factory bisa graceful fallback ke vendor default (yahoo_finance).
 */

const VENDOR = "invezgo";
const SECRET_KEY = "vendor.invezgo.api_key";

export class InvezgoAdapter implements MarketDataAdapter {
  readonly name = VENDOR;

  private async ensureConfigured(): Promise<void> {
    const has = await hasSecret(SECRET_KEY);
    if (!has) {
      throw new AdapterNotConfiguredError(VENDOR, SECRET_KEY);
    }
    throw new AdapterNotConfiguredError(
      VENDOR,
      "implementation pending — set vendor.invezgo.api_key & wait for adapter impl",
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
