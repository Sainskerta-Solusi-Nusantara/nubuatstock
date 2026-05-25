import type { OhlcvRange } from "@/lib/types/market";

/**
 * Konversi `range` keyword (Yahoo-style) ke window date.
 */
export function rangeToDates(range: OhlcvRange, now: Date = new Date()): { from: Date; to: Date } {
  const to = new Date(now);
  const from = new Date(now);
  switch (range) {
    case "5d":
      from.setDate(from.getDate() - 5);
      break;
    case "1mo":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3mo":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6mo":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    case "2y":
      from.setFullYear(from.getFullYear() - 2);
      break;
    case "5y":
      from.setFullYear(from.getFullYear() - 5);
      break;
    case "10y":
      from.setFullYear(from.getFullYear() - 10);
      break;
    case "ytd":
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "max":
      from.setFullYear(1990, 0, 1);
      break;
  }
  return { from, to };
}

export function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(s: string): Date {
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${s}`);
  }
  return d;
}
