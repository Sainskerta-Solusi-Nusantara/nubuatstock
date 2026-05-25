import { getConfig } from "@/lib/config";
import { ConfigurationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { vendorNameSchema, type VendorName } from "@/lib/types/market";
import { InvezgoAdapter } from "./invezgo";
import { OhlcDevAdapter } from "./ohlc-dev";
import { YahooFinanceAdapter } from "./yahoo-finance";
import type { MarketDataAdapter } from "./base";

/**
 * Factory: pilih adapter berdasarkan `market_data.default_vendor` di app_config.
 *
 * Default fallback: `yahoo_finance` (gratis, tidak butuh key).
 * Adapter instance di-cache per-process (stateless, aman).
 */

const adapterCache = new Map<VendorName, MarketDataAdapter>();

function createAdapter(vendor: VendorName): MarketDataAdapter {
  switch (vendor) {
    case "yahoo_finance":
      return new YahooFinanceAdapter();
    case "invezgo":
      return new InvezgoAdapter();
    case "ohlc_dev":
      return new OhlcDevAdapter();
    case "itick":
    case "idx_direct":
      throw new ConfigurationError(
        `market_data.${vendor} — vendor adapter belum diimplementasikan`,
      );
  }
}

function getOrCreate(vendor: VendorName): MarketDataAdapter {
  const cached = adapterCache.get(vendor);
  if (cached) return cached;
  const a = createAdapter(vendor);
  adapterCache.set(vendor, a);
  return a;
}

/**
 * Resolve adapter aktif. Throw ConfigurationError kalau key config tidak ada.
 */
export async function getActiveAdapter(): Promise<MarketDataAdapter> {
  const rawVendor = await getConfig<string>("market_data.default_vendor", {
    defaultValue: "yahoo_finance",
  });
  const parsed = vendorNameSchema.safeParse(rawVendor);
  if (!parsed.success) {
    logger.warn(
      { rawVendor },
      "market_data.default_vendor invalid; falling back to yahoo_finance",
    );
    return getOrCreate("yahoo_finance");
  }
  return getOrCreate(parsed.data);
}

/**
 * Resolve adapter by explicit name (worker job / admin override).
 */
export function getAdapterByName(name: VendorName): MarketDataAdapter {
  return getOrCreate(name);
}

/**
 * Clear cache — dipakai admin saat config berubah.
 */
export function resetAdapterCache(): void {
  adapterCache.clear();
}
