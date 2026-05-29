import { describe, expect, it } from "vitest";
import {
  classifyActors,
  ACTOR_CLASSES,
  ACTOR_LABEL_TEXT,
  ACTOR_DESC_TEXT,
  type ActorBrokerRow,
  type ActorClass,
} from "@/lib/bandarmology/four-actor";

/**
 * Unit tests — 4-Pelaku Classification Engine (IMPROVEMENT_PLAN §3.C.3).
 *
 * Engine murni: klasifikasi aktivitas broker/flow ke 4 pelaku + retail.
 * Data sintetis: tidak menyentuh DB.
 */

function row(
  broker: string,
  side: "buy" | "sell" | "both",
  value: number,
  extra: Partial<ActorBrokerRow> = {},
): ActorBrokerRow {
  return { brokerCode: broker, side, valueIdr: value, volume: value, ...extra };
}

function byActor(result: ReturnType<typeof classifyActors>, actor: ActorClass) {
  return result.actors.find((a) => a.actor === actor)!;
}

describe("classifyActors", () => {
  it("returns hasData=false for empty input", () => {
    const r = classifyActors([]);
    expect(r.hasData).toBe(false);
    expect(r.dominantActor).toBeNull();
    expect(r.topAccumulator).toBeNull();
    expect(r.topDistributor).toBeNull();
    expect(r.totalGross).toBe(0);
    expect(r.actors).toHaveLength(ACTOR_CLASSES.length);
  });

  it("classifies foreign-category broker as foreign", () => {
    const rows = [
      row("RX", "buy", 1000, { brokerKategori: "foreign" }),
      row("PD", "buy", 200, { brokerKategori: "local" }),
    ];
    const r = classifyActors(rows);
    expect(byActor(r, "foreign").buyAmount).toBe(1000);
    expect(byActor(r, "foreign").brokerCount).toBe(1);
  });

  it("uses foreign_flow_daily as authoritative source for foreign actor", () => {
    const rows = [row("PD", "buy", 500, { brokerKategori: "local" })];
    const r = classifyActors(rows, {
      foreignBuyValue: 3000,
      foreignSellValue: 1000,
      netValue: 2000,
    });
    const f = byActor(r, "foreign");
    expect(f.buyAmount).toBe(3000);
    expect(f.sellAmount).toBe(1000);
    expect(f.netAmount).toBe(2000);
    expect(f.grossAmount).toBe(4000);
    // Foreign dominates activity (4000 vs PD 500).
    expect(r.dominantActor).toBe("foreign");
  });

  it("classifies domestic-category broker as non_retail", () => {
    const rows = [row("MS", "buy", 2000, { brokerKategori: "domestic" })];
    const r = classifyActors(rows);
    expect(byActor(r, "non_retail").buyAmount).toBe(2000);
    expect(byActor(r, "non_retail").brokerCount).toBe(1);
  });

  it("promotes large concentrated local broker to sultan (ritel kakap)", () => {
    // Local broker with huge value & >15% share -> Sultanmologi.
    const rows = [
      row("SULTAN", "buy", 10_000_000_000, { brokerKategori: "local" }),
      // small retail spread so SULTAN crosses the share threshold
      row("r1", "buy", 100_000_000, { brokerKategori: "local" }),
      row("r2", "sell", 100_000_000, { brokerKategori: "local" }),
    ];
    const r = classifyActors(rows);
    expect(byActor(r, "sultan").buyAmount).toBe(10_000_000_000);
    expect(byActor(r, "sultan").brokerCount).toBe(1);
    expect(byActor(r, "retail").brokerCount).toBe(2);
    expect(r.dominantActor).toBe("sultan");
  });

  it("does NOT promote large local broker to sultan if share too small", () => {
    // Big absolute value but diluted: many equally-large peers -> share < threshold.
    const rows: ActorBrokerRow[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push(row(`L${i}`, "buy", 6_000_000_000, { brokerKategori: "local" }));
    }
    const r = classifyActors(rows);
    // Each is 1/20 = 5% share < 15% -> all retail.
    expect(byActor(r, "sultan").brokerCount).toBe(0);
    expect(byActor(r, "retail").brokerCount).toBe(20);
  });

  it("classifies underwriter-flagged broker as zombi (Zombimologi)", () => {
    const rows = [
      row("UW", "sell", 5000, { brokerKategori: "local", isUnderwriter: true }),
      row("PD", "buy", 1000, { brokerKategori: "local" }),
    ];
    const r = classifyActors(rows);
    expect(byActor(r, "zombi").sellAmount).toBe(5000);
    expect(byActor(r, "zombi").brokerCount).toBe(1);
    // Underwriter flag wins even if value would qualify for sultan.
  });

  it("underwriter flag takes priority over foreign category", () => {
    // Priority order: foreign first, but underwriter is checked after foreign.
    // A foreign+underwriter broker should stay foreign (foreign has top priority).
    const rows = [row("FX", "buy", 1000, { brokerKategori: "foreign", isUnderwriter: true })];
    const r = classifyActors(rows);
    expect(byActor(r, "foreign").brokerCount).toBe(1);
    expect(byActor(r, "zombi").brokerCount).toBe(0);
  });

  it("aggregates net buy/sell correctly and identifies accumulator/distributor", () => {
    const rows = [
      // foreign net +900
      row("FX", "buy", 1000, { brokerKategori: "foreign" }),
      row("FX", "sell", 100, { brokerKategori: "foreign" }),
      // non-retail net -800
      row("MS", "buy", 100, { brokerKategori: "domestic" }),
      row("MS", "sell", 900, { brokerKategori: "domestic" }),
    ];
    const r = classifyActors(rows);
    expect(byActor(r, "foreign").netAmount).toBe(900);
    expect(byActor(r, "non_retail").netAmount).toBe(-800);
    expect(r.topAccumulator).toBe("foreign");
    expect(r.topDistributor).toBe("non_retail");
  });

  it("handles side 'both' using net value sign", () => {
    const rows = [
      row("FX", "both", 900, { brokerKategori: "foreign", netValueIdr: 900 }),
      row("FX", "both", 100, { brokerKategori: "foreign", netValueIdr: -100 }),
    ];
    const r = classifyActors(rows);
    const f = byActor(r, "foreign");
    expect(f.buyAmount).toBe(900);
    expect(f.sellAmount).toBe(100);
    expect(f.netAmount).toBe(800);
  });

  it("computes shares that sum to ~1 across actors", () => {
    const rows = [
      row("FX", "buy", 400, { brokerKategori: "foreign" }),
      row("MS", "buy", 300, { brokerKategori: "domestic" }),
      row("r1", "buy", 300, { brokerKategori: "local" }),
    ];
    const r = classifyActors(rows);
    const sum = r.actors.reduce((a, x) => a + x.share, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("supports volume basis and ignores foreign flow (value-only) under volume basis", () => {
    const rows = [
      { brokerCode: "FX", side: "buy" as const, valueIdr: 10, volume: 1000, brokerKategori: "foreign" },
    ];
    const r = classifyActors(rows, { foreignBuyValue: 999, foreignSellValue: 0, netValue: 999 }, {
      basis: "volume",
    });
    // Under volume basis, foreign flow override is skipped; uses broker volume.
    expect(byActor(r, "foreign").buyAmount).toBe(1000);
  });

  it("ignores zero-amount rows", () => {
    const rows = [
      row("FX", "buy", 1000, { brokerKategori: "foreign" }),
      row("ZZ", "buy", 0, { brokerKategori: "domestic" }),
    ];
    const r = classifyActors(rows);
    expect(byActor(r, "non_retail").brokerCount).toBe(0);
    expect(byActor(r, "foreign").brokerCount).toBe(1);
  });

  it("works with foreign flow only (no broker rows)", () => {
    const r = classifyActors([], { foreignBuyValue: 500, foreignSellValue: 200, netValue: 300 });
    expect(r.hasData).toBe(true);
    expect(byActor(r, "foreign").netAmount).toBe(300);
    expect(r.dominantActor).toBe("foreign");
  });

  it("exposes human-readable label & description text for every actor", () => {
    for (const c of ACTOR_CLASSES) {
      expect(ACTOR_LABEL_TEXT[c].length).toBeGreaterThan(0);
      expect(ACTOR_DESC_TEXT[c].length).toBeGreaterThan(0);
    }
  });
});
