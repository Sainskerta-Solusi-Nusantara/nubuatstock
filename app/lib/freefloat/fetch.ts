/**
 * Fetcher status Free Float BEI dari ff.klinikpenyesalan.com.
 *
 * Berbeda dari 1pct: ini HTML statis biasa, data tertanam sebagai JSON di
 * `<script id="rawData" type="application/json">`. Cukup ambil isinya & parse.
 */

export const FF_SOURCE_URL = "https://ff.klinikpenyesalan.com/";

/** Satu baris mentah dari rawData ff. */
interface FfRaw {
  n?: number; // rank
  k?: string; // kode
  c?: string; // nama emiten
  p?: string; // papan
  m?: number; // market cap
  j?: number; // jumlah pemegang saham
  f?: number; // free float % aktual
  w?: number; // ambang wajib %
  b?: string; // status pemenuhan
}

export interface FfRow {
  rank: number;
  kode: string;
  name: string;
  board: string | null;
  marketCap: number;
  shareholders: number;
  freeFloatPct: number;
  requiredPct: number;
  status: string | null;
}

const ID_MONTHS: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
  juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12",
};

/** "31 Maret 2026" → "2026-03-31". */
export function parseIdDate(raw: string): string | null {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(raw.trim());
  if (!m) return null;
  const mm = ID_MONTHS[m[2]!.toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1]!.padStart(2, "0")}`;
}

/** Ekstrak snapshotDate (dari <title>) + baris dari HTML ff. */
export function extractFreeFloat(html: string): { snapshotDate: string | null; rows: FfRow[] } {
  const scriptMatch = html.match(/<script id="rawData" type="application\/json">([\s\S]*?)<\/script>/);
  if (!scriptMatch) return { snapshotDate: null, rows: [] };
  let raw: FfRaw[];
  try {
    const parsed = JSON.parse(scriptMatch[1]!);
    raw = Array.isArray(parsed) ? (parsed as FfRaw[]) : [];
  } catch {
    return { snapshotDate: null, rows: [] };
  }

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const snapshotDate = titleMatch ? parseIdDate(titleMatch[1]!) : null;

  const rows: FfRow[] = raw
    .filter((r) => r.k)
    .map((r) => ({
      rank: r.n ?? 0,
      kode: (r.k ?? "").trim().toUpperCase(),
      name: r.c ?? "",
      board: r.p ?? null,
      marketCap: r.m ?? 0,
      shareholders: r.j ?? 0,
      freeFloatPct: r.f ?? 0,
      requiredPct: r.w ?? 0,
      status: r.b ?? null,
    }));

  return { snapshotDate, rows };
}

export async function fetchFreeFloat(): Promise<{ snapshotDate: string | null; rows: FfRow[] }> {
  const res = await fetch(FF_SOURCE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gagal fetch sumber Free Float (HTTP ${res.status})`);
  const html = await res.text();
  const result = extractFreeFloat(html);
  if (result.rows.length === 0) throw new Error("Tidak menemukan data Free Float (format mungkin berubah).");
  return result;
}
