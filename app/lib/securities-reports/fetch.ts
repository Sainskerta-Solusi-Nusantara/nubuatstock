/**
 * Fetcher riset sekuritas per-sumber.
 *
 * Tiap sumber = satu fungsi yang mengembalikan baris ternormalisasi. Tambah
 * sumber baru dengan menambah entry di SOURCES. Saat ini: Henan (Strapi publik)
 * + channel Telegram publik.
 */

import { fetchTelegramMessages } from "@/lib/securities/telegram";

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
  return { rows, errors };
}
