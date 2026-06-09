import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function main() {
  const r = await db.execute<{ slug: string; name: string; rss_url: string; is_active: string }>(
    sql`select slug, name, rss_url, is_active from news_sources order by slug`,
  );
  const rows = r as unknown as Array<Record<string, unknown>>;
  console.log("=== news_sources saat ini ===");
  for (const s of rows) console.log(`${s.is_active === "true" ? "✓" : "✗"} ${s.slug} | ${s.name} | ${s.rss_url}`);
  process.exit(0);
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
