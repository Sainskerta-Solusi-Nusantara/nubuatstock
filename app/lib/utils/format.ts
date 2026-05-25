/**
 * Pure formatting helpers untuk UI.
 * NUMERIC: input bisa string atau number. Locale default Indonesia.
 */

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const numNoDec = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const pctFmt = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatIDR(v: string | number | null | undefined): string {
  const n = toNumber(v);
  if (n == null) return "—";
  return idr.format(n);
}

export function formatNumber(
  v: string | number | null | undefined,
  decimals = 2,
): string {
  const n = toNumber(v);
  if (n == null) return "—";
  return decimals === 0 ? numNoDec.format(n) : num.format(n);
}

export function formatPercent(
  v: string | number | null | undefined,
  withSign = true,
): string {
  const n = toNumber(v);
  if (n == null) return "—";
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${pctFmt.format(n)}%`;
}

export function formatCompactIDR(v: string | number | null | undefined): string {
  const n = toNumber(v);
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)} T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)} Jt`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)} Rb`;
  return numNoDec.format(n);
}

export function changeTone(v: string | number | null | undefined): "bull" | "bear" | "neutral" {
  const n = toNumber(v);
  if (n == null || n === 0) return "neutral";
  return n > 0 ? "bull" : "bear";
}

export function changeSign(v: string | number | null | undefined): "+" | "-" | "" {
  const n = toNumber(v);
  if (n == null || n === 0) return "";
  return n > 0 ? "+" : "-";
}
