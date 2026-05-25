/**
 * Minimal RSS 2.0 parser — pure regex/string ops, no DOM dep.
 *
 * Handle umum:
 * - <item> blocks dengan child <title>, <link>, <description>, <pubDate>, <guid>, <enclosure>.
 * - CDATA-wrapped content.
 * - Media RSS extensions: <media:content url=...>.
 * - Atom-style <entry> dengan <link href=...> & <published>.
 *
 * NOT handled: nested namespaces yang aneh, RDF feeds, kompresi gzip
 * (kalau perlu, set Accept-Encoding: identity).
 */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date | null;
  guid: string;
  imageUrl: string | null;
}

const decode = (s: string): string =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const extractTag = (block: string, tag: string): string => {
  // Prefer namespaced match first if tag contains ':'
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m && m[1] ? decode(m[1]) : "";
};

const extractAttr = (block: string, tag: string, attr: string): string | null => {
  const re = new RegExp(`<${tag}\\s[^>]*${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m && m[1] ? m[1] : null;
};

const extractImage = (block: string): string | null => {
  // media:content / media:thumbnail
  let url =
    extractAttr(block, "media:content", "url") ??
    extractAttr(block, "media:thumbnail", "url") ??
    extractAttr(block, "enclosure", "url");
  if (url) return url;
  // <img src=...> in description
  const m = block.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (m && m[1]) return m[1];
  return null;
};

const parseDate = (s: string): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];

  // RSS 2.0
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link =
      extractTag(block, "link") ||
      extractAttr(block, "link", "href") ||
      "";
    if (!title || !link) continue;
    const description = extractTag(block, "description") || extractTag(block, "content:encoded");
    const guid = extractTag(block, "guid") || link;
    const pubDate = parseDate(extractTag(block, "pubDate") || extractTag(block, "dc:date"));
    items.push({
      title,
      link,
      description,
      pubDate,
      guid,
      imageUrl: extractImage(block),
    });
  }

  // Atom feed
  if (items.length === 0) {
    const entryBlocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
    for (const block of entryBlocks) {
      const title = extractTag(block, "title");
      const link = extractAttr(block, "link", "href") || extractTag(block, "link");
      if (!title || !link) continue;
      const description = extractTag(block, "summary") || extractTag(block, "content");
      const guid = extractTag(block, "id") || link;
      const pubDate = parseDate(
        extractTag(block, "published") || extractTag(block, "updated"),
      );
      items.push({
        title,
        link,
        description,
        pubDate,
        guid,
        imageUrl: extractImage(block),
      });
    }
  }

  return items;
}

export async function fetchRss(url: string, opts: { timeoutMs?: number } = {}): Promise<RssItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NubuatBot/1.0; +https://nubuat.id/bot)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Encoding": "identity",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const xml = await res.text();
    return parseRss(xml);
  } finally {
    clearTimeout(timeout);
  }
}
