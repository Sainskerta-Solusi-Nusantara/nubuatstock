/**
 * Fetcher data kepemilikan ≥1% dari 1pct.klinikpenyesalan.com.
 *
 * Situs Next.js (App Router) menanam data lengkap sebagai RSC flight payload
 * inline (`self.__next_f.push([n,"...json..."])`). Kita ambil HTML, gabung semua
 * payload string, lalu ekstrak array emiten + pemegang saham.
 */

const SOURCE_URL = "https://1pct.klinikpenyesalan.com/";

export interface Pct1Holder {
  investor_name: string;
  investor_type?: string;
  local_foreign?: string;
  nationality?: string;
  domicile?: string;
  holdings_scripless?: number;
  holdings_scrip?: number;
  total_holding_shares?: number;
  percentage?: number;
}
export interface Pct1Emiten {
  share_code: string;
  issuer_name?: string;
  sector?: string;
  industry?: string;
  holderCount?: number;
  pctSum?: number;
  freeFloat?: number;
  cr1?: number;
  cr3?: number;
  hhi?: number;
  ccs?: number;
  ownershipType?: string;
  hasScripData?: boolean;
  records?: Pct1Holder[];
}

/** Ekstrak array emiten dari HTML klinikpenyesalan. */
export function extractFromHtml(html: string): Pct1Emiten[] {
  const token = "self.__next_f.push([";
  const parts: string[] = [];
  let idx = 0;
  while (true) {
    const p = html.indexOf(token, idx);
    if (p < 0) break;
    let i = p + token.length;
    while (i < html.length && html[i] !== ",") i++;
    i++; // skip number + comma
    if (html[i] !== '"') { idx = p + token.length; continue; }
    let j = i + 1;
    let raw = "";
    while (j < html.length) {
      const c = html[j];
      if (c === "\\") { raw += c + html[j + 1]; j += 2; continue; }
      if (c === '"') break;
      raw += c;
      j++;
    }
    try { parts.push(JSON.parse('"' + raw + '"') as string); } catch { /* skip */ }
    idx = j + 1;
  }
  const all = parts.join("");
  const start = all.indexOf('[{"share_code"');
  if (start < 0) return [];
  // bracket-match (JSON-aware) untuk ambil array
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let k = start; k < all.length; k++) {
    const c = all[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  if (end < 0) return [];
  try {
    const data = JSON.parse(all.slice(start, end));
    return Array.isArray(data) ? (data as Pct1Emiten[]) : [];
  } catch {
    return [];
  }
}

/** Gabung semua payload RSC string jadi satu (helper). */
function joinPayload(html: string): string {
  const token = "self.__next_f.push([";
  const parts: string[] = [];
  let idx = 0;
  while (true) {
    const p = html.indexOf(token, idx);
    if (p < 0) break;
    let i = p + token.length;
    while (i < html.length && html[i] !== ",") i++;
    i++;
    if (html[i] !== '"') { idx = p + token.length; continue; }
    let j = i + 1;
    let raw = "";
    while (j < html.length) {
      const c = html[j];
      if (c === "\\") { raw += c + html[j + 1]; j += 2; continue; }
      if (c === '"') break;
      raw += c;
      j++;
    }
    try { parts.push(JSON.parse('"' + raw + '"') as string); } catch { /* skip */ }
    idx = j + 1;
  }
  return parts.join("");
}
function arrayAt(all: string, start: number): string {
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let k = start; k < all.length; k++) {
    const c = all[k];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  return end < 0 ? "" : all.slice(start, end);
}

export interface ChangelogData {
  currentDate: string;
  prevDate?: string;
  [k: string]: unknown;
}

/** Ekstrak data perubahan (changelog) dari HTML. */
export function extractChangelog(html: string): ChangelogData | null {
  const all = joinPayload(html);
  const s = all.indexOf('[{"currentDate"');
  if (s < 0) return null;
  try {
    const arr = JSON.parse(arrayAt(all, s));
    return Array.isArray(arr) && arr[0] ? (arr[0] as ChangelogData) : null;
  } catch {
    return null;
  }
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "text/html",
};

/** Fetch + ekstrak emiten DAN changelog sekaligus. */
export async function fetchOwnership1pctAll(): Promise<{ emiten: Pct1Emiten[]; changelog: ChangelogData | null }> {
  const res = await fetch(SOURCE_URL, { headers: FETCH_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Gagal fetch sumber (HTTP ${res.status})`);
  const html = await res.text();
  const emiten = extractFromHtml(html);
  const changelog = extractChangelog(html);
  if (emiten.length === 0) throw new Error("Tidak menemukan data terstruktur di sumber (format mungkin berubah).");
  return { emiten, changelog };
}

export async function fetchOwnership1pct(): Promise<Pct1Emiten[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gagal fetch sumber (HTTP ${res.status})`);
  const html = await res.text();
  const data = extractFromHtml(html);
  if (data.length === 0) throw new Error("Tidak menemukan data terstruktur di sumber (format mungkin berubah).");
  return data;
}
