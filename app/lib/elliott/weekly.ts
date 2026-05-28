import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Aggregate daily bars ke weekly bars.
 *
 * Week start = Monday. Aggregation rule:
 *   - date: monday's date (start of week)
 *   - open: first day's open
 *   - high: max high
 *   - low: min low
 *   - close: last day's close
 *   - volume: sum
 */
export function aggregateToWeekly(daily: OhlcvBar[]): OhlcvBar[] {
  if (daily.length === 0) return [];

  const weeks = new Map<string, OhlcvBar[]>();

  for (const bar of daily) {
    const d = new Date(bar.date);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
    // Calculate Monday of this week
    const monday = new Date(d);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(d.getDate() + daysToMonday);
    const weekKey = monday.toISOString().slice(0, 10);

    const arr = weeks.get(weekKey) ?? [];
    arr.push(bar);
    weeks.set(weekKey, arr);
  }

  const sorted = Array.from(weeks.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([weekKey, bars]) => {
    bars.sort((a, b) => a.date.localeCompare(b.date));
    return {
      date: weekKey,
      open: bars[0]!.open,
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      close: bars[bars.length - 1]!.close,
      volume: bars.reduce((acc, b) => acc + b.volume, 0),
      valueIdr: bars.reduce((acc, b) => acc + b.valueIdr, 0),
    };
  });
}

/**
 * Aggregate daily bars ke monthly bars.
 *
 * Bucket key = "YYYY-MM" (kalender), date = hari pertama bulan tsb (YYYY-MM-01).
 * Aggregation rule sama dengan weekly:
 *   - open: first day's open
 *   - high: max high
 *   - low: min low
 *   - close: last day's close
 *   - volume / valueIdr: sum
 */
export function aggregateToMonthly(daily: OhlcvBar[]): OhlcvBar[] {
  if (daily.length === 0) return [];

  const months = new Map<string, OhlcvBar[]>();

  for (const bar of daily) {
    // bar.date diasumsikan "YYYY-MM-DD"; ambil prefix bulan secara langsung
    // agar tidak terpengaruh timezone offset Date.
    const monthKey = bar.date.slice(0, 7); // "YYYY-MM"
    const arr = months.get(monthKey) ?? [];
    arr.push(bar);
    months.set(monthKey, arr);
  }

  const sorted = Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([monthKey, bars]) => {
    bars.sort((a, b) => a.date.localeCompare(b.date));
    return {
      date: `${monthKey}-01`,
      open: bars[0]!.open,
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      close: bars[bars.length - 1]!.close,
      volume: bars.reduce((acc, b) => acc + b.volume, 0),
      valueIdr: bars.reduce((acc, b) => acc + b.valueIdr, 0),
    };
  });
}
