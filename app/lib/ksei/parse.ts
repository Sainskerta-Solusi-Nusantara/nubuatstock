import type { KseiBreakdown } from "@/db/schema/ksei";

/**
 * Parser file KSEI "BalancePos" (pipe-delimited).
 *
 * Header:
 *   Date|Code|Type|Sec. Num|Price|Local IS|Local CP|Local PF|Local IB|Local ID|
 *   Local MF|Local SC|Local FD|Local OT|Total|Foreign IS|...|Foreign OT|Total
 *
 * Sumber: web.ksei.co.id/archive_download/holding_composition
 */

export interface ParsedKseiRow {
  posDate: string; // YYYY-MM-DD
  kode: string;
  secType: string;
  secNum: number;
  priceIdr: number;
  local: KseiBreakdown;
  localTotal: number;
  foreign: KseiBreakdown;
  foreignTotal: number;
}

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** "29-MAY-2026" → "2026-05-29". Return null kalau format tak dikenal. */
export function parseKseiDate(raw: string): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const mm = MONTHS[m[2]!.toUpperCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1]!.padStart(2, "0")}`;
}

const num = (s: string | undefined): number => {
  const n = Number(String(s ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

export interface ParseResult {
  posDate: string | null;
  rows: ParsedKseiRow[];
  skipped: number;
}

export function parseBalancePos(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const rows: ParsedKseiRow[] = [];
  let posDate: string | null = null;
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const c = line.split("|");
    // Header atau baris pendek → lewati.
    if (c.length < 25 || c[0]?.trim().toLowerCase() === "date") continue;

    const iso = parseKseiDate(c[0] ?? "");
    if (!iso) { skipped++; continue; }
    if (!posDate) posDate = iso;

    const kode = (c[1] ?? "").trim().toUpperCase();
    if (!kode) { skipped++; continue; }

    const local: KseiBreakdown = {
      IS: num(c[5]), CP: num(c[6]), PF: num(c[7]), IB: num(c[8]), ID: num(c[9]),
      MF: num(c[10]), SC: num(c[11]), FD: num(c[12]), OT: num(c[13]),
    };
    const foreign: KseiBreakdown = {
      IS: num(c[15]), CP: num(c[16]), PF: num(c[17]), IB: num(c[18]), ID: num(c[19]),
      MF: num(c[20]), SC: num(c[21]), FD: num(c[22]), OT: num(c[23]),
    };

    rows.push({
      posDate: iso,
      kode,
      secType: (c[2] ?? "EQUITY").trim() || "EQUITY",
      secNum: num(c[3]),
      priceIdr: num(c[4]),
      local,
      localTotal: num(c[14]),
      foreign,
      foreignTotal: num(c[24]),
    });
  }

  return { posDate, rows, skipped };
}

/** Label ramah Bahasa Indonesia untuk kode tipe investor KSEI. */
export const KSEI_TYPE_LABELS: Record<keyof KseiBreakdown, string> = {
  ID: "Individu",
  CP: "Korporasi",
  MF: "Reksa Dana",
  IB: "Bank / Inst. Keuangan",
  IS: "Asuransi",
  PF: "Dana Pensiun",
  SC: "Sekuritas",
  FD: "Yayasan",
  OT: "Lainnya",
};
