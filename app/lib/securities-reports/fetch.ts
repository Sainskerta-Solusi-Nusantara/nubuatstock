/**
 * Fetcher riset sekuritas per-sumber.
 *
 * Tiap sumber = satu fungsi yang mengembalikan baris ternormalisasi. Tambah
 * sumber baru dengan menambah entry di SOURCES. Saat ini: Henan (Strapi publik)
 * + channel Telegram publik.
 */

import { fetchTelegramMessages, htmlToText } from "@/lib/securities/telegram";

export interface ReportRow {
  securities: string;
  externalId: string;
  title: string;
  category: string | null;
  categoryType: string | null;
  publishedAt: Date | null;
  pdfUrl: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string | null;
  isMemberOnly: boolean;
}

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "application/json",
};

const HTML_UA = {
  "User-Agent": UA["User-Agent"],
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
};

/** Cutoff "2 tahun terakhir": baris lebih lama dari ini dibuang. */
export function twoYearsAgo(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - 2);
  return d;
}

/**
 * Buang baris yang publishedAt-nya lebih lama dari 2 tahun. Baris tanpa tanggal
 * DIPERTAHANKAN (tidak bisa dipastikan lama; biarkan upsert + sortir handle).
 */
export function filterRecent(rows: ReportRow[], now: Date = new Date()): ReportRow[] {
  const cutoff = twoYearsAgo(now);
  return rows.filter((r) => !r.publishedAt || r.publishedAt >= cutoff);
}

/** Nama bulan Indonesia + Inggris → index 0-11. */
const MONTHS: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  agu: 7, agustus: 7, agt: 7, aug: 7, august: 7,
  sep: 8, september: 8, sept: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11, december: 11,
};

/** Parse tanggal teks "2 Juni 2026" / "2 June 2026" / "Jun 2, 2026". */
function parseTextDate(raw: string): Date | null {
  const s = raw.trim().toLowerCase();
  // "2 juni 2026" atau "02 june 2026"
  const m1 = s.match(/(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})/);
  if (m1) {
    const mon = MONTHS[m1[2] ?? ""];
    if (mon !== undefined) return new Date(Date.UTC(Number(m1[3]), mon, Number(m1[1])));
  }
  // "jun 2, 2026"
  const m2 = s.match(/([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m2) {
    const mon = MONTHS[m2[1] ?? ""];
    if (mon !== undefined) return new Date(Date.UTC(Number(m2[3]), mon, Number(m2[2])));
  }
  return null;
}

/** Henan Putihrai Sekuritas — Strapi CMS publik (hpsekuritas.id/insight). */
async function fetchHenan(limit = 60): Promise<ReportRow[]> {
  const url =
    `https://reactor.hpsekuritas.id/hps-strapi/api/insights` +
    `?sort=createdAt:desc&pagination%5BpageSize%5D=${limit}&populate=*`;
  const res = await fetch(url, { headers: UA, cache: "no-store" });
  if (!res.ok) throw new Error(`Henan HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { id: number; attributes: Record<string, unknown> }[] };
  const rows: ReportRow[] = [];
  for (const item of json.data ?? []) {
    const a = item.attributes as Record<string, unknown> & {
      title?: string;
      createdAt?: string;
      publishedAt?: string;
      is_member_only?: boolean;
      pdf_url?: { data?: { attributes?: { url?: string } } };
      thumbnail_url?: { data?: { attributes?: { url?: string } } };
      categories?: { data?: { attributes?: { title?: string; type?: string } }[] };
    };
    const cat = a.categories?.data?.[0]?.attributes;
    const dateStr = a.publishedAt || a.createdAt;
    rows.push({
      securities: "Henan Putihrai Sekuritas",
      externalId: `henan:${item.id}`,
      title: String(a.title ?? "Tanpa judul"),
      category: cat?.title ?? null,
      categoryType: cat?.type ?? null,
      publishedAt: dateStr ? new Date(dateStr) : null,
      pdfUrl: a.pdf_url?.data?.attributes?.url ?? null,
      thumbnailUrl: a.thumbnail_url?.data?.attributes?.url ?? null,
      sourceUrl: "https://hpsekuritas.id/insight",
      isMemberOnly: Boolean(a.is_member_only),
    });
  }
  return rows;
}

/**
 * Samuel Sekuritas Indonesia — WordPress, custom post type "research-reports"
 * punya RSS publik di /research-reports/feed/ (judul + link + pubDate bersih).
 * Tidak butuh headless browser (WP REST diblok, tapi feed terbuka).
 */
async function fetchSamuel(limit = 30): Promise<ReportRow[]> {
  const res = await fetch("https://samuel.co.id/research-reports/feed/", {
    headers: HTML_UA,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Samuel HTTP ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit);
  const rows: ReportRow[] = [];
  for (const item of items) {
    const body = item[1] ?? "";
    const pick = (tag: string) => {
      const m = body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      if (!m || m[1] === undefined) return null;
      return htmlToText(m[1].replace(/<!\[CDATA\[|\]\]>/g, "")).trim();
    };
    const link = pick("link");
    const rawTitle = pick("title");
    if (!link || !rawTitle) continue;
    // Bersihkan kurung siku judul: "[Samuel Economic Update: X] 2 June 2026".
    const title = rawTitle.replace(/[[\]]/g, "").trim();
    const pubStr = pick("pubDate");
    const cats = [...body.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g)]
      .map((m) => htmlToText(m[1] ?? "").trim())
      .filter(Boolean);
    const slug = link.replace(/\/+$/, "").split("/").pop() ?? link;
    rows.push({
      securities: "Samuel Sekuritas",
      externalId: `samuel:${slug}`,
      title: title.length > 200 ? `${title.slice(0, 197)}...` : title,
      category: cats[0] ?? null,
      categoryType: "Riset",
      publishedAt: pubStr ? new Date(pubStr) : null,
      pdfUrl: null,
      thumbnailUrl: null,
      sourceUrl: link,
      isMemberOnly: false,
    });
  }
  return rows;
}

/**
 * NH Korindo Securities (NHIS) — WordPress, halaman /id/research/ di-render
 * server-side dengan kartu riset: <p class="date">…</p> + <h3><a href>Judul</a>.
 * Parsing HTML langsung (tanpa browser).
 */
async function fetchNhis(limit = 40): Promise<ReportRow[]> {
  const res = await fetch("https://www.nhis.co.id/id/research/", {
    headers: HTML_UA,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NHIS HTTP ${res.status}`);
  const html = await res.text();
  const rows: ReportRow[] = [];
  const seen = new Set<string>();
  // Tiap kartu: <p class="date">TANGGAL …</p> … <h3><a href="URL">JUDUL</a></h3>
  const cardRe =
    /<p class="date">([\s\S]*?)<\/p>[\s\S]*?<h3>\s*<a href="(https:\/\/www\.nhis\.co\.id\/id\/[^"]+)">([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(cardRe)) {
    const url = m[2];
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const dateText = htmlToText(m[1] ?? "").replace(/new!?/i, "").trim();
    const title = htmlToText(m[3] ?? "").trim();
    if (!title) continue;
    const slug = url.replace(/\/+$/, "").split("/").pop() ?? url;
    rows.push({
      securities: "NH Korindo Sekuritas",
      externalId: `nhis:${slug}`,
      title: title.length > 200 ? `${title.slice(0, 197)}...` : title,
      category: null,
      categoryType: "Riset",
      publishedAt: parseTextDate(dateText),
      pdfUrl: null,
      thumbnailUrl: null,
      sourceUrl: url,
      isMemberOnly: false,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

/**
 * KB Valbury Sekuritas — tiap kategori riset (morning-chatter, daily-economic-
 * research, daily-technical-analysis) di /riset-in/<slug> me-render laporan
 * TERBARU server-side: <h3 class="news-detail__title">Judul</h3>,
 * <div class="flex-share"><b>TANGGAL</b>, + link PDF /cfind/source/files/….
 * Hanya laporan terkini per kategori (situs tidak expose arsip via HTML).
 */
const KBV_CATEGORIES = ["morning-chatter", "daily-economic-research", "daily-technical-analysis"];

async function fetchKbValbury(): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  for (const slug of KBV_CATEGORIES) {
    const url = `https://www.kbvalbury.com/riset-in/${slug}`;
    const res = await fetch(url, { headers: HTML_UA, cache: "no-store" });
    if (!res.ok) throw new Error(`KB Valbury ${slug} HTTP ${res.status}`);
    const html = await res.text();
    const titleM = html.match(/<h3 class="news-detail__title">([\s\S]*?)<\/h3>/i);
    const dateM = html.match(/<div class="flex-share">\s*<b>([\s\S]*?)<\/b>/i);
    const pdfM = html.match(/https:\/\/www\.kbvalbury\.com\/cfind\/source\/files\/[^"'\s]+\.pdf/i);
    const title = titleM?.[1] ? htmlToText(titleM[1]).trim() : null;
    if (!title) continue;
    const dateText = dateM?.[1] ? htmlToText(dateM[1]).trim() : "";
    const publishedAt = parseTextDate(dateText);
    const pdfUrl = pdfM?.[0] ?? null;
    // externalId per kategori+tanggal supaya laporan baru tiap hari = baris baru.
    const dateKey = publishedAt ? publishedAt.toISOString().slice(0, 10) : (pdfUrl ?? title).slice(-24);
    rows.push({
      securities: "KB Valbury Sekuritas",
      externalId: `kbv:${slug}:${dateKey}`,
      title,
      category: title, // "Morning Chatter" / "Daily Economic Research" / …
      categoryType: "Riset",
      publishedAt,
      pdfUrl,
      thumbnailUrl: null,
      sourceUrl: url,
      isMemberOnly: false,
    });
  }
  return rows;
}

/**
 * Channel Telegram PUBLIK via halaman preview web (https://t.me/s/<username>).
 * Tidak butuh token/API key. Judul = baris pertama pesan. Throw kalau gagal
 * supaya fetchAllReports bisa menangkap per-sumber.
 */
export async function fetchTelegramChannel(
  username: string,
  displayName: string,
  limit = 20,
): Promise<ReportRow[]> {
  const messages = await fetchTelegramMessages(username, limit);
  return messages.map((m) => {
    const firstLine = m.text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? m.text;
    const title = firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine;
    return {
      securities: displayName,
      externalId: `tg:${username}:${m.messageId}`,
      title,
      category: "Telegram",
      categoryType: "Telegram",
      publishedAt: m.publishedAt,
      pdfUrl: null,
      thumbnailUrl: null,
      sourceUrl: m.link,
      isMemberOnly: false,
    } satisfies ReportRow;
  });
}

export interface ReportSource {
  key: string;
  securities: string;
  fetch: (limit?: number) => Promise<ReportRow[]>;
}

export const REPORT_SOURCES: ReportSource[] = [
  { key: "henan", securities: "Henan Putihrai Sekuritas", fetch: fetchHenan },
  // Sumber web publik (RSS / HTML server-rendered, tanpa headless browser).
  { key: "samuel", securities: "Samuel Sekuritas", fetch: fetchSamuel },
  { key: "nhis", securities: "NH Korindo Sekuritas", fetch: fetchNhis },
  { key: "kbvalbury", securities: "KB Valbury Sekuritas", fetch: () => fetchKbValbury() },
  // Channel Telegram publik sekuritas/riset saham IDX (preview web, tanpa token).
  {
    key: "tg-samuelsekuritas",
    securities: "Samuel Sekuritas",
    fetch: (limit) => fetchTelegramChannel("samuelsekuritas", "Samuel Sekuritas", limit),
  },
  {
    key: "tg-dapursaham",
    securities: "Dapur Saham",
    fetch: (limit) => fetchTelegramChannel("dapursaham", "Dapur Saham", limit),
  },
  {
    key: "tg-creativetrader",
    securities: "Creative Trader",
    fetch: (limit) => fetchTelegramChannel("creativetrader", "Creative Trader", limit),
  },
  {
    key: "tg-sahampemenang",
    securities: "Saham Pemenang",
    fetch: (limit) => fetchTelegramChannel("sahampemenang", "Saham Pemenang", limit),
  },
];

/** Fetch semua sumber; sumber yang error tidak menggagalkan yang lain. */
export async function fetchAllReports(limit = 60): Promise<{ rows: ReportRow[]; errors: string[] }> {
  const rows: ReportRow[] = [];
  const errors: string[] = [];
  for (const src of REPORT_SOURCES) {
    try {
      rows.push(...(await src.fetch(limit)));
    } catch (err) {
      errors.push(`${src.key}: ${(err as Error).message}`);
    }
  }
  // Batas 2 tahun: buang riset yang lebih lama dari cutoff.
  return { rows: filterRecent(rows), errors };
}
