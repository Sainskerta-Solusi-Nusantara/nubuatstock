import { describe, expect, it } from "vitest";
import {
  analyzeBrokerStalker,
  BROKER_TAG_TEXT,
  SMART_MONEY_BIAS_TEXT,
  isSmartMoney,
  tagFromKategori,
  type StalkerBrokerRow,
} from "@/lib/bandarmology/broker-stalker";

/**
 * Unit tests — Broker Stalker (IMPROVEMENT_PLAN §3.C.2).
 *
 * Engine murni: lacak akumulasi/distribusi per-broker + bias smart money.
 * Data sintetis: tidak menyentuh DB.
 */

function row(
  broker: string,
  side: "buy" | "sell" | "both",
  value: number,
  kategori: string | null = null,
  opts: { volume?: number; netValueIdr?: number } = {},
): StalkerBrokerRow {
  return {
    brokerCode: broker,
    side,
    valueIdr: value,
    volume: opts.volume ?? value,
    netValueIdr: opts.netValueIdr ?? null,
    brokerKategori: kategori,
  };
}

describe("tagFromKategori", () => {
  it("maps categories to tags", () => {
    expect(tagFromKategori("foreign")).toBe("foreign");
    expect(tagFromKategori("FOREIGN")).toBe("foreign");
    expect(tagFromKategori("domestic")).toBe("institusi");
    expect(tagFromKategori("local")).toBe("retail");
    expect(tagFromKategori(null)).toBe("retail");
    expect(tagFromKategori(undefined)).toBe("retail");
    expect(tagFromKategori("weird")).toBe("retail");
  });

  it("flags smart money correctly", () => {
    expect(isSmartMoney("foreign")).toBe(true);
    expect(isSmartMoney("institusi")).toBe(true);
    expect(isSmartMoney("retail")).toBe(false);
  });
});

describe("analyzeBrokerStalker", () => {
  it("returns tidak_ada_data for empty input", () => {
    const r = analyzeBrokerStalker([]);
    expect(r.hasData).toBe(false);
    expect(r.smartMoney.bias).toBe("tidak_ada_data");
    expect(r.smartMoney.score).toBe(0);
    expect(r.topAccumulators).toHaveLength(0);
    expect(r.topDistributors).toHaveLength(0);
  });

  it("ignores zero-amount rows -> no data", () => {
    const r = analyzeBrokerStalker([row("YP", "buy", 0)]);
    expect(r.hasData).toBe(false);
    expect(r.smartMoney.bias).toBe("tidak_ada_data");
  });

  it("smart money bullish + contrarian: foreign accumulates while retail sells", () => {
    const rows: StalkerBrokerRow[] = [
      // Foreign broker net-buy big
      row("BK", "buy", 1000, "foreign"),
      // Institusi net-buy
      row("DB", "buy", 500, "domestic"),
      // Retail sells (contrarian)
      row("YP", "sell", 900, "local"),
      row("PD", "sell", 300, "local"),
    ];
    const r = analyzeBrokerStalker(rows);

    expect(r.hasData).toBe(true);
    expect(r.smartMoney.foreignNet).toBe(1000);
    expect(r.smartMoney.institusiNet).toBe(500);
    expect(r.smartMoney.smartNet).toBe(1500);
    expect(r.smartMoney.retailNet).toBe(-1200);
    expect(r.smartMoney.bias).toBe("bullish");
    expect(r.smartMoney.contrarian).toBe(true);

    // Top accumulator is the foreign broker.
    expect(r.topAccumulators[0]?.brokerCode).toBe("BK");
    expect(r.topAccumulators[0]?.tag).toBe("foreign");
    // Top distributor is the largest retail seller.
    expect(r.topDistributors[0]?.brokerCode).toBe("YP");
    expect(r.topDistributors[0]?.tag).toBe("retail");
  });

  it("smart money bearish: foreign/institusi distribute while retail buys (exit liquidity)", () => {
    const rows: StalkerBrokerRow[] = [
      row("BK", "sell", 1200, "foreign"),
      row("DB", "sell", 400, "domestic"),
      row("YP", "buy", 1000, "local"),
      row("PD", "buy", 400, "local"),
    ];
    const r = analyzeBrokerStalker(rows);

    expect(r.smartMoney.smartNet).toBe(-1600);
    expect(r.smartMoney.retailNet).toBe(1400);
    expect(r.smartMoney.bias).toBe("bearish");
    expect(r.smartMoney.contrarian).toBe(true);
    expect(r.topDistributors[0]?.brokerCode).toBe("BK");
    expect(r.topDistributors[0]?.tag).toBe("foreign");
    expect(r.topAccumulators[0]?.brokerCode).toBe("YP");
  });

  it("netral when smart money net is below threshold", () => {
    // Foreign buys 100, foreign sells 95 -> tiny net relative to gross.
    const rows: StalkerBrokerRow[] = [
      row("BK", "buy", 1000, "foreign"),
      row("BK", "sell", 980, "foreign"),
      row("YP", "buy", 2000, "local"),
      row("YP", "sell", 2000, "local"),
    ];
    const r = analyzeBrokerStalker(rows);
    expect(r.smartMoney.smartNet).toBe(20);
    // gross ~ 5980, magnitude 20/5980 << 0.05 -> netral
    expect(r.smartMoney.bias).toBe("netral");
  });

  it("aggregates a multi-day window per broker", () => {
    // BK buys across 3 days -> single rolled-up activity with days=3.
    const rows: StalkerBrokerRow[] = [
      row("BK", "buy", 300, "foreign"),
      row("BK", "buy", 200, "foreign"),
      row("BK", "buy", 100, "foreign"),
      row("YP", "sell", 50, "local"),
    ];
    const r = analyzeBrokerStalker(rows);
    expect(r.brokerCount).toBe(2);
    const bk = r.topAccumulators.find((b) => b.brokerCode === "BK");
    expect(bk?.netAmount).toBe(600);
    expect(bk?.buyAmount).toBe(600);
    expect(bk?.days).toBe(3);
  });

  it("respects topN option", () => {
    const rows: StalkerBrokerRow[] = Array.from({ length: 8 }, (_, i) =>
      row(`B${i}`, "buy", 100 + i, "local"),
    );
    const r = analyzeBrokerStalker(rows, { topN: 3 });
    expect(r.topAccumulators).toHaveLength(3);
    // Sorted desc by net.
    expect(r.topAccumulators[0]?.brokerCode).toBe("B7");
  });

  it("handles side 'both' using net value sign", () => {
    const rows: StalkerBrokerRow[] = [
      row("BK", "both", 900, "foreign", { netValueIdr: 900 }),
      row("YP", "both", 400, "local", { netValueIdr: -400 }),
    ];
    const r = analyzeBrokerStalker(rows);
    expect(r.smartMoney.foreignNet).toBe(900);
    expect(r.smartMoney.retailNet).toBe(-400);
    expect(r.topAccumulators[0]?.brokerCode).toBe("BK");
    expect(r.topDistributors[0]?.brokerCode).toBe("YP");
  });

  it("supports volume basis", () => {
    const rows: StalkerBrokerRow[] = [
      row("BK", "buy", 10, "foreign", { volume: 1000 }),
      row("YP", "sell", 1000, "local", { volume: 10 }),
    ];
    const r = analyzeBrokerStalker(rows, { basis: "volume" });
    expect(r.basis).toBe("volume");
    // By volume, BK net +1000 dominates.
    expect(r.topAccumulators[0]?.brokerCode).toBe("BK");
    expect(r.topAccumulators[0]?.netAmount).toBe(1000);
    expect(r.topDistributors[0]?.brokerCode).toBe("YP");
    expect(r.topDistributors[0]?.netAmount).toBe(-10);
  });

  it("exposes human-readable text for every tag and bias", () => {
    for (const k of Object.keys(BROKER_TAG_TEXT)) {
      expect(BROKER_TAG_TEXT[k as keyof typeof BROKER_TAG_TEXT].length).toBeGreaterThan(0);
    }
    for (const k of Object.keys(SMART_MONEY_BIAS_TEXT)) {
      expect(SMART_MONEY_BIAS_TEXT[k as keyof typeof SMART_MONEY_BIAS_TEXT].length).toBeGreaterThan(0);
    }
  });
});
