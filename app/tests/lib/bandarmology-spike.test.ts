import { describe, expect, it } from "vitest";
import {
  analyzeSpike,
  SPIKE_LABEL_TEXT,
  type BrokerSummaryRow,
} from "@/lib/bandarmology/spike";

/**
 * Unit tests — Spike Detection / Frequency Analyzer (IMPROVEMENT_PLAN §3.C.4).
 *
 * Engine murni: deteksi konsentrasi transaksi (1 bandar vs retail merata).
 * Data sintetis: tidak menyentuh DB.
 */

function buyRow(broker: string, value: number, volume = value): BrokerSummaryRow {
  return { brokerCode: broker, side: "buy", valueIdr: value, volume };
}
function sellRow(broker: string, value: number, volume = value): BrokerSummaryRow {
  return { brokerCode: broker, side: "sell", valueIdr: value, volume };
}

describe("analyzeSpike", () => {
  it("returns tidak_ada_data for empty input", () => {
    const r = analyzeSpike([]);
    expect(r.label).toBe("tidak_ada_data");
    expect(r.isSpike).toBe(false);
    expect(r.score).toBe(0);
    expect(r.dominantSide).toBeNull();
  });

  it("detects 1-broker accumulation spike (1 broker 80% of buy)", () => {
    const rows: BrokerSummaryRow[] = [
      buyRow("YP", 800),
      buyRow("PD", 50),
      buyRow("CC", 50),
      buyRow("MG", 50),
      buyRow("ZP", 50),
    ];
    const r = analyzeSpike(rows);

    expect(r.isSpike).toBe(true);
    expect(r.dominantSide).toBe("buy");
    expect(r.label).toBe("akumulasi_1_bandar");
    expect(r.buy.top1Share).toBeCloseTo(0.8, 5);
    expect(r.buy.topBrokers[0]?.brokerCode).toBe("YP");
    // HHI for 80/5/5/5/5: 6400 + 4*25 = 6500.
    expect(r.buy.hhi).toBeCloseTo(6500, 2);
    expect(r.score).toBe(65); // hhiNormalized 0.65 -> 65
    // Effective brokers ~ 1/0.65 ~ 1.54 (very concentrated).
    expect(r.buy.effectiveBrokers).toBeLessThan(2);
  });

  it("classifies evenly distributed buying as retail merata (no spike)", () => {
    // 20 brokers, each 5% -> HHI = 20 * 25 = 500 (0.05 normalized).
    const rows: BrokerSummaryRow[] = Array.from({ length: 20 }, (_, i) =>
      buyRow(`B${i}`, 100),
    );
    const r = analyzeSpike(rows);

    expect(r.isSpike).toBe(false);
    expect(r.label).toBe("distribusi_retail_merata");
    expect(r.buy.hhi).toBeCloseTo(500, 2);
    expect(r.buy.top1Share).toBeCloseTo(0.05, 5);
    expect(r.buy.effectiveBrokers).toBeCloseTo(20, 5);
    expect(r.score).toBe(5);
  });

  it("detects concentrated (but not single-broker) accumulation", () => {
    // 3 brokers ~33% each on buy -> HHI ~ 3333, top1 0.33 (< 0.40 dominant threshold).
    const rows: BrokerSummaryRow[] = [buyRow("A", 100), buyRow("B", 100), buyRow("C", 100)];
    const r = analyzeSpike(rows);
    expect(r.isSpike).toBe(true);
    expect(r.label).toBe("akumulasi_terkonsentrasi");
    expect(r.dominantSide).toBe("buy");
  });

  it("detects 1-broker distribution spike on sell side", () => {
    const rows: BrokerSummaryRow[] = [
      sellRow("XX", 900),
      sellRow("PD", 30),
      sellRow("CC", 30),
      sellRow("MG", 40),
      // buy side spread out (retail) so sell dominates the signal
      buyRow("a", 100),
      buyRow("b", 100),
      buyRow("c", 100),
      buyRow("d", 100),
      buyRow("e", 100),
      buyRow("f", 100),
      buyRow("g", 100),
      buyRow("h", 100),
      buyRow("i", 100),
      buyRow("j", 100),
    ];
    const r = analyzeSpike(rows);
    expect(r.dominantSide).toBe("sell");
    expect(r.label).toBe("distribusi_1_bandar");
    expect(r.sell.top1Share).toBeCloseTo(0.9, 5);
  });

  it("supports volume basis", () => {
    const rows: BrokerSummaryRow[] = [
      { brokerCode: "YP", side: "buy", valueIdr: 10, volume: 1000 },
      { brokerCode: "PD", side: "buy", valueIdr: 1000, volume: 10 },
    ];
    const valueR = analyzeSpike(rows, { basis: "value" });
    const volR = analyzeSpike(rows, { basis: "volume" });
    expect(valueR.buy.topBrokers[0]?.brokerCode).toBe("PD"); // by value
    expect(volR.buy.topBrokers[0]?.brokerCode).toBe("YP"); // by volume
  });

  it("handles side 'both' using net value sign", () => {
    const rows: BrokerSummaryRow[] = [
      { brokerCode: "YP", side: "both", valueIdr: 900, volume: 900, netValueIdr: 900 },
      { brokerCode: "PD", side: "both", valueIdr: 100, volume: 100, netValueIdr: -100 },
      { brokerCode: "CC", side: "both", valueIdr: 50, volume: 50, netValueIdr: 50 },
    ];
    const r = analyzeSpike(rows);
    // YP (+900) and CC (+50) -> buy bucket; PD (-100) -> sell bucket.
    expect(r.buy.brokerCount).toBe(2);
    expect(r.sell.brokerCount).toBe(1);
    expect(r.buy.topBrokers[0]?.brokerCode).toBe("YP");
    expect(r.sell.topBrokers[0]?.brokerCode).toBe("PD");
    // Sell bucket has a single broker -> trivially 100% concentrated (HHI 10000),
    // so it wins the "most concentrated side" comparison.
    expect(r.sell.top1Share).toBe(1);
    expect(r.dominantSide).toBe("sell");
  });

  it("ignores zero-amount rows", () => {
    const rows: BrokerSummaryRow[] = [
      buyRow("YP", 1000),
      { brokerCode: "PD", side: "buy", valueIdr: 0, volume: 0 },
    ];
    const r = analyzeSpike(rows);
    expect(r.buy.brokerCount).toBe(1);
    expect(r.buy.top1Share).toBe(1);
    expect(r.label).toBe("akumulasi_1_bandar");
  });

  it("exposes human-readable label text for every label", () => {
    const labels = Object.keys(SPIKE_LABEL_TEXT) as Array<keyof typeof SPIKE_LABEL_TEXT>;
    for (const l of labels) {
      expect(SPIKE_LABEL_TEXT[l].length).toBeGreaterThan(0);
    }
  });
});
