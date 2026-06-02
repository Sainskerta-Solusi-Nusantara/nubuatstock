/**
 * Normalisasi kategori riset sekuritas ke set kategori yang jelas & konsisten
 * lintas-sumber. Sumber memberi `category`/`categoryType` yang beragam (atau
 * kosong), jadi kita pakai heuristik dari kategori mentah + judul.
 *
 * Dipakai di UI (badge + filter/grup) dan bisa juga di pipeline kalau perlu.
 */

export const REPORT_CATEGORIES = [
  "Daily",
  "Weekly",
  "Monthly",
  "Company Update",
  "Economic/Strategy",
  "Technical",
  "Telegram",
  "Lainnya",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** Cek kata-utuh (word-boundary) supaya "weekly" tidak match di tengah kata. */
function has(text: string, ...words: string[]): boolean {
  return words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, "i").test(text));
}

/**
 * Petakan kategori mentah + judul ke salah satu REPORT_CATEGORIES.
 *
 * Urutan cek penting: yang lebih spesifik (Monthly/Weekly/Company) didahulukan
 * sebelum Daily/Technical/Economic supaya tidak salah klasifikasi.
 */
export function normalizeCategory(
  rawCategory: string | null | undefined,
  title: string | null | undefined,
  categoryType?: string | null,
): ReportCategory {
  const cat = (rawCategory ?? "").toLowerCase();
  const ttl = (title ?? "").toLowerCase();
  const typ = (categoryType ?? "").toLowerCase();
  const hay = `${cat} ${ttl}`;

  // Sumber Telegram menandai categoryType "Telegram".
  if (typ === "telegram" || cat === "telegram") return "Telegram";

  // Monthly sebelum Weekly/Daily (kata "monthly" jelas).
  if (has(hay, "monthly", "bulanan")) return "Monthly";
  if (has(hay, "weekly", "mingguan", "week ahead")) return "Weekly";

  // Company/earnings update — laporan per-emiten.
  if (
    has(hay, "company", "update report", "earnings", "result", "initiation", "coverage", "company update") ||
    has(cat, "riset-perusahaan", "company") ||
    /\b[A-Z]{4}\b/.test(title ?? "") && has(hay, "tbk", "fy2", "1q", "2q", "3q", "4q", "9m")
  ) {
    return "Company Update";
  }

  // Technical / trading ideas.
  if (has(hay, "technical", "teknikal", "trading idea", "chart", "key call", "keycall", "trading ideas")) {
    return "Technical";
  }

  // Economic / strategy / macro.
  if (has(hay, "economic", "ekonomi", "macro", "makro", "strategy", "strategi", "market update", "outlook", "inflation", "inflasi", "pmi", "trade balance", "fixed income", "obligasi", "bond")) {
    return "Economic/Strategy";
  }

  // Daily / morning notes (termasuk call harian IHSG/JCI).
  if (
    has(hay, "daily", "harian", "morning", "pagi", "chatter", "keycalls", "premarket", "pre-market") ||
    (has(hay, "jci", "ihsg") && has(hay, "today", "expected", "hari ini"))
  ) {
    return "Daily";
  }

  return "Lainnya";
}
