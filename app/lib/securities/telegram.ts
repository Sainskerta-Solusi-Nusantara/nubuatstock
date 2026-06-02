/**
 * Util Telegram channel PUBLIK via halaman preview web (https://t.me/s/<username>).
 *
 * Tanpa token/API key. Parsing HTML sederhana (tanpa library tambahan). Dipakai
 * bersama oleh modul securities-reports (judul = baris pertama) dan
 * securities-picks (ekstraksi rekomendasi dari teks penuh).
 */

export interface TelegramMessage {
  /** ID pesan numerik (mis. 13204). */
  messageId: string;
  /** Teks pesan lengkap (sudah didecode & di-strip dari HTML). */
  text: string;
  /** Permalink ke pesan (https://t.me/<user>/<id>). */
  link: string | null;
  /** Waktu publish dari atribut <time datetime>, atau null bila gagal. */
  publishedAt: Date | null;
}

const HTML_UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

/** Decode entitas HTML umum & numeric, lalu strip tag. <br> jadi newline. */
export function htmlToText(raw: string): string {
  let s = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)));
  return s.replace(/ /g, " ");
}

/**
 * Ambil pesan terbaru dari channel publik. Throw bila gagal/channel privat
 * supaya caller bisa menangani per-sumber. Pesan tanpa teks (media saja) dilewati.
 * Hasil terurut sesuai DOM (lama → baru); caller boleh reverse bila perlu.
 */
export async function fetchTelegramMessages(username: string, limit = 20): Promise<TelegramMessage[]> {
  const res = await fetch(`https://t.me/s/${encodeURIComponent(username)}`, {
    headers: HTML_UA,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Telegram @${username} HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("tgme_widget_message_text")) {
    throw new Error(`Telegram @${username}: tidak ada pesan (channel privat/invalid?)`);
  }

  const blocks = html.split('<div class="tgme_widget_message ').slice(1);
  const out: TelegramMessage[] = [];
  for (const block of blocks) {
    const dateHref = block.match(/tgme_widget_message_date"\s+href="([^"]+)"/);
    const link = dateHref?.[1] ?? null;
    const messageId = link?.match(/\/(\d+)(?:\?|#|$)/)?.[1];
    if (!messageId) continue;

    const textMatch = block.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
    if (!textMatch?.[1]) continue; // lewati pesan tanpa teks (media saja)
    const text = htmlToText(textMatch[1]).replace(/ /g, " ").trim();
    if (!text) continue;

    const dt = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const publishedAt = dt ? new Date(dt) : null;

    out.push({
      messageId,
      text,
      link,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
