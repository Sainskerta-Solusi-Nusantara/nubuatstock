/**
 * Tambah/aktifkan sumber berita baru ke `news_sources` (idempotent by slug),
 * lalu jalankan ingest inline & laporkan jumlah artikel per sumber.
 *
 *   npx tsx --env-file=.env worker/add-news-sources.ts
 *
 * IDX Channel, Kontan, Katadata = RSS native. Bisnis & EmitenNews tidak punya
 * RSS publik yang berfungsi → pakai Google News RSS (feed per-situs).
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsSources } from "@/db/schema/news";
import { ingestAllNewsInline } from "@/lib/news/ingest-inline";

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;

const SOURCES = [
  {
    slug: "idxchannel",
    name: "IDX Channel",
    rssUrl: "https://www.idxchannel.com/rss",
    homepageUrl: "https://www.idxchannel.com",
  },
  {
    slug: "kontan",
    name: "Kontan",
    rssUrl: "https://investasi.kontan.co.id/rss",
    homepageUrl: "https://www.kontan.co.id",
  },
  {
    slug: "katadata",
    name: "Katadata",
    rssUrl: "https://katadata.co.id/rss",
    homepageUrl: "https://katadata.co.id",
  },
  {
    slug: "bisnis-market",
    name: "Bisnis.com Market",
    rssUrl: GN("site:market.bisnis.com when:7d"),
    homepageUrl: "https://market.bisnis.com",
  },
  {
    slug: "emitennews",
    name: "EmitenNews",
    rssUrl: GN("site:emitennews.com when:7d"),
    homepageUrl: "https://www.emitennews.com",
  },
] as const;

async function main() {
  for (const s of SOURCES) {
    await db
      .insert(newsSources)
      .values({
        slug: s.slug,
        name: s.name,
        rssUrl: s.rssUrl,
        homepageUrl: s.homepageUrl,
        isActive: "true",
      })
      .onConflictDoUpdate({
        target: newsSources.slug,
        set: { name: s.name, rssUrl: s.rssUrl, homepageUrl: s.homepageUrl, isActive: "true" },
      });
    console.log(`upsert sumber: ${s.slug}`);
  }

  console.log("\n=== Ingest inline (semua sumber aktif) ===");
  const res = await ingestAllNewsInline();
  console.log(JSON.stringify(res, null, 2));

  console.log("\n=== Jumlah artikel per sumber (di DB) ===");
  const counts = await db.execute<{ source_slug: string; n: number; latest: string }>(sql`
    select source_slug, count(*)::int as n, max(published_at) as latest
    from news_articles
    group by source_slug
    order by n desc
  `);
  for (const r of (counts.rows ?? counts) as Array<Record<string, unknown>>) {
    console.log(`${r.source_slug}: ${r.n} artikel (terbaru ${String(r.latest).slice(0, 16)})`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e?.stack ?? e?.message ?? e);
  process.exit(1);
});
