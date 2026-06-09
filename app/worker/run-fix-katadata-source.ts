import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Ganti sumber Katadata dari RSS umum (berita politik/nasional → noise) ke
 * Google News RSS yang difilter ke konten finansial katadata.
 *   npx tsx --env-file=.env worker/run-fix-katadata-source.ts
 */
const url =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("site:katadata.co.id (saham OR bursa OR emiten OR IHSG OR dividen) when:7d") +
  "&hl=id&gl=ID&ceid=ID:id";

async function main() {
  await db.execute(
    sql`update news_sources set rss_url = ${url}, name = 'Katadata (Finansial)', updated_at = now() where slug = 'katadata'`,
  );
  const r = await db.execute(
    sql.raw("select slug, name, rss_url from news_sources where slug = 'katadata'"),
  );
  for (const x of r as unknown as Array<{ slug: string; name: string; rss_url: string }>) {
    console.log(`${x.slug} | ${x.name} | ${x.rss_url}`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
