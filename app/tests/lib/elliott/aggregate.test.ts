import { describe, expect, it } from "vitest";
import { aggregateToWeekly, aggregateToMonthly } from "@/lib/elliott/weekly";
import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Tests untuk multi-timeframe aggregation (lib/elliott/weekly.ts) — P1.
 * Memastikan agregasi daily → weekly dan daily → monthly memakai rule OHLCV
 * yang benar (open=first, high=max, low=min, close=last, volume/value=sum).
 */

function bar(date: string, o: number, h: number, l: number, c: number, vol = 1000): OhlcvBar {
  return { date, open: o, high: h, low: l, close: c, volume: vol, valueIdr: c * vol };
}

describe("lib/elliott/weekly — aggregateToWeekly", () => {
  it("mengembalikan kosong untuk input kosong", () => {
    expect(aggregateToWeekly([])).toEqual([]);
  });

  it("menggabungkan satu minggu kalender (Senin–Jumat) jadi 1 bar", () => {
    // 2024-01-01 = Senin .. 2024-01-05 = Jumat (minggu sama).
    const daily = [
      bar("2024-01-01", 100, 105, 99, 102, 10),
      bar("2024-01-02", 102, 108, 101, 107, 20),
      bar("2024-01-03", 107, 110, 104, 105, 30),
      bar("2024-01-04", 105, 106, 100, 101, 40),
      bar("2024-01-05", 101, 112, 100, 111, 50),
    ];
    const weekly = aggregateToWeekly(daily);
    expect(weekly).toHaveLength(1);
    const w = weekly[0]!;
    expect(w.date).toBe("2024-01-01"); // Monday
    expect(w.open).toBe(100); // first
    expect(w.high).toBe(112); // max
    expect(w.low).toBe(99); // min
    expect(w.close).toBe(111); // last
    expect(w.volume).toBe(150); // sum
  });

  it("memisahkan bar ke minggu berbeda", () => {
    const daily = [
      bar("2024-01-04", 100, 105, 99, 102), // Thu (minggu 1)
      bar("2024-01-08", 102, 108, 101, 107), // Mon (minggu 2)
    ];
    const weekly = aggregateToWeekly(daily);
    expect(weekly).toHaveLength(2);
    expect(weekly[0]!.date).toBe("2024-01-01"); // Monday of week 1
    expect(weekly[1]!.date).toBe("2024-01-08");
  });
});

describe("lib/elliott/weekly — aggregateToMonthly", () => {
  it("mengembalikan kosong untuk input kosong", () => {
    expect(aggregateToMonthly([])).toEqual([]);
  });

  it("menggabungkan satu bulan kalender jadi 1 bar dengan rule OHLCV benar", () => {
    const daily = [
      bar("2024-03-01", 200, 210, 195, 205, 10),
      bar("2024-03-15", 205, 230, 200, 220, 20),
      bar("2024-03-29", 220, 225, 190, 215, 30),
    ];
    const monthly = aggregateToMonthly(daily);
    expect(monthly).toHaveLength(1);
    const m = monthly[0]!;
    expect(m.date).toBe("2024-03-01");
    expect(m.open).toBe(200);
    expect(m.high).toBe(230);
    expect(m.low).toBe(190);
    expect(m.close).toBe(215);
    expect(m.volume).toBe(60);
    expect(m.valueIdr).toBe(205 * 10 + 220 * 20 + 215 * 30);
  });

  it("memisahkan bar ke bulan berbeda dan menjaga urutan kronologis", () => {
    const daily = [
      bar("2024-02-20", 100, 105, 99, 102),
      bar("2024-01-10", 90, 95, 88, 92),
      bar("2024-03-05", 110, 115, 108, 112),
    ];
    const monthly = aggregateToMonthly(daily);
    expect(monthly.map((m) => m.date)).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);
  });

  it("close bulan = close bar terakhir bulan tsb meski input tidak terurut", () => {
    const daily = [
      bar("2024-05-31", 50, 55, 48, 53),
      bar("2024-05-01", 40, 45, 38, 42),
      bar("2024-05-15", 42, 60, 41, 58),
    ];
    const monthly = aggregateToMonthly(daily);
    expect(monthly).toHaveLength(1);
    expect(monthly[0]!.open).toBe(40); // first chronological
    expect(monthly[0]!.close).toBe(53); // last chronological
    expect(monthly[0]!.high).toBe(60);
  });
});
