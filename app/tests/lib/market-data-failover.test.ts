import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OhlcvBar, Quote } from "@/lib/types/market";
import { VendorError } from "@/lib/market-data/adapters/base";
import {
  FailoverMarketDataAdapter,
  __resetFailoverGuard,
  __setFailoverAdapters,
} from "@/lib/market-data/failover";
import type { MarketDataAdapter } from "@/lib/market-data/adapters/base";
import type { AlphaVantageAdapter } from "@/lib/market-data/adapters/alpha-vantage";

/**
 * Test logika failover Yahoo → Alpha Vantage.
 * Tidak ada panggilan jaringan nyata: kedua adapter di-mock & di-inject.
 */

function fakeQuote(vendor: string, code = "BBRI"): Quote {
  return {
    code,
    price: "5000",
    change: "10",
    changePct: "0.2000",
    open: "4990",
    high: "5010",
    low: "4980",
    prevClose: "4990",
    volume: "1000000",
    valueIdr: null,
    marketTime: new Date().toISOString(),
    marketState: "CLOSED",
    currency: "IDR",
    vendor,
  };
}

function fakeBars(): OhlcvBar[] {
  return [
    { date: "2026-05-01", open: "1", high: "2", low: "1", close: "2", volume: "100" },
  ];
}

interface MockPrimary extends MarketDataAdapter {
  fetchQuote: ReturnType<typeof vi.fn>;
  fetchOhlcv: ReturnType<typeof vi.fn>;
}
interface MockFallback {
  fetchQuote: ReturnType<typeof vi.fn>;
  fetchOhlcv: ReturnType<typeof vi.fn>;
}

let primary: MockPrimary;
let fallback: MockFallback;
let adapter: FailoverMarketDataAdapter;

beforeEach(() => {
  __resetFailoverGuard();
  primary = {
    name: "yahoo_finance",
    fetchQuote: vi.fn(),
    fetchOhlcv: vi.fn(),
  } as unknown as MockPrimary;
  fallback = {
    fetchQuote: vi.fn(),
    fetchOhlcv: vi.fn(),
  };
  __setFailoverAdapters({
    primary,
    fallback: fallback as unknown as AlphaVantageAdapter,
  });
  adapter = new FailoverMarketDataAdapter();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Lepas mock supaya tidak bocor ke test lain.
  __setFailoverAdapters({});
});

describe("FailoverMarketDataAdapter.fetchQuote", () => {
  it("returns primary result and does NOT call Alpha Vantage when Yahoo succeeds", async () => {
    primary.fetchQuote.mockResolvedValue(fakeQuote("yahoo_finance"));

    const q = await adapter.fetchQuote("BBRI");

    expect(q.vendor).toBe("yahoo_finance");
    expect(primary.fetchQuote).toHaveBeenCalledTimes(1);
    expect(fallback.fetchQuote).not.toHaveBeenCalled();
  });

  it("falls back to Alpha Vantage when Yahoo throws a vendor-down error", async () => {
    primary.fetchQuote.mockRejectedValue(
      new VendorError("Yahoo HTTP 503", "yahoo_finance", undefined, 503),
    );
    fallback.fetchQuote.mockResolvedValue(fakeQuote("alpha_vantage"));

    const q = await adapter.fetchQuote("BBRI");

    expect(q.vendor).toBe("alpha_vantage");
    expect(primary.fetchQuote).toHaveBeenCalledTimes(1);
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(1);
  });

  it("falls back on network error (non-VendorError)", async () => {
    primary.fetchQuote.mockRejectedValue(new Error("ECONNRESET"));
    fallback.fetchQuote.mockResolvedValue(fakeQuote("alpha_vantage"));

    const q = await adapter.fetchQuote("BBRI");
    expect(q.vendor).toBe("alpha_vantage");
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(1);
  });

  it("does NOT fall back when Yahoo reports ticker-not-found (404)", async () => {
    const notFound = new VendorError("Unknown symbol", "yahoo_finance", undefined, 404);
    primary.fetchQuote.mockRejectedValue(notFound);

    await expect(adapter.fetchQuote("XXXX")).rejects.toBe(notFound);
    expect(fallback.fetchQuote).not.toHaveBeenCalled();
  });

  it("rethrows a clean error when BOTH vendors fail", async () => {
    primary.fetchQuote.mockRejectedValue(
      new VendorError("Yahoo HTTP 503", "yahoo_finance", undefined, 503),
    );
    fallback.fetchQuote.mockRejectedValue(
      new VendorError("AV rate-limited", "alpha_vantage", undefined, 429),
    );

    await expect(adapter.fetchQuote("BBRI")).rejects.toMatchObject({
      name: "VendorError",
      vendor: "failover",
    });
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(1);
  });

  it("rethrows the PRIMARY error (not breaker failure) when AV is not configured", async () => {
    const primErr = new VendorError("Yahoo HTTP 503", "yahoo_finance", undefined, 503);
    primary.fetchQuote.mockRejectedValue(primErr);
    const { AdapterNotConfiguredError } = await import("@/lib/market-data/adapters/base");
    fallback.fetchQuote.mockRejectedValue(
      new AdapterNotConfiguredError("alpha_vantage", "process.env.ALPHA_VANTAGE_API_KEY"),
    );

    await expect(adapter.fetchQuote("BBRI")).rejects.toBe(primErr);
  });
});

describe("FailoverMarketDataAdapter.fetchOhlcv", () => {
  const from = new Date("2026-04-01");
  const to = new Date("2026-05-01");

  it("returns Yahoo bars without calling Alpha Vantage on success", async () => {
    primary.fetchOhlcv.mockResolvedValue(fakeBars());

    const bars = await adapter.fetchOhlcv("BBRI", from, to, "1d");
    expect(bars).toHaveLength(1);
    expect(primary.fetchOhlcv).toHaveBeenCalledTimes(1);
    expect(fallback.fetchOhlcv).not.toHaveBeenCalled();
  });

  it("falls back to Alpha Vantage when Yahoo fails", async () => {
    primary.fetchOhlcv.mockRejectedValue(new Error("network down"));
    fallback.fetchOhlcv.mockResolvedValue(fakeBars());

    const bars = await adapter.fetchOhlcv("BBRI", from, to, "1d");
    expect(bars).toHaveLength(1);
    expect(fallback.fetchOhlcv).toHaveBeenCalledTimes(1);
  });
});

describe("Alpha Vantage rate-limit guard / circuit-breaker", () => {
  it("opens the circuit after consecutive AV failures and skips further AV calls", async () => {
    primary.fetchQuote.mockRejectedValue(
      new VendorError("Yahoo down", "yahoo_finance", undefined, 503),
    );
    fallback.fetchQuote.mockRejectedValue(
      new VendorError("AV 500", "alpha_vantage", undefined, 500),
    );

    // 3 kegagalan beruntun → breaker open (AV_BREAKER_THRESHOLD = 3).
    for (let i = 0; i < 3; i += 1) {
      await expect(adapter.fetchQuote("BBRI")).rejects.toBeInstanceOf(VendorError);
    }
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(3);

    // Panggilan ke-4: breaker open → AV TIDAK dipanggil lagi, primary error di-rethrow.
    await expect(adapter.fetchQuote("BBRI")).rejects.toMatchObject({ status: 503 });
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(3);
  });

  it("stops calling AV once the daily budget is exhausted", async () => {
    primary.fetchQuote.mockRejectedValue(
      new VendorError("Yahoo down", "yahoo_finance", undefined, 503),
    );
    // AV always succeeds → success increments budget without tripping breaker.
    fallback.fetchQuote.mockImplementation(async () => fakeQuote("alpha_vantage"));

    // Budget = 20 successful AV calls.
    for (let i = 0; i < 20; i += 1) {
      const q = await adapter.fetchQuote("BBRI");
      expect(q.vendor).toBe("alpha_vantage");
    }
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(20);

    // 21st: budget exhausted → AV skipped, primary error rethrown.
    await expect(adapter.fetchQuote("BBRI")).rejects.toMatchObject({ status: 503 });
    expect(fallback.fetchQuote).toHaveBeenCalledTimes(20);
  });
});
