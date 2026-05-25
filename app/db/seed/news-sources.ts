import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsSources } from "@/db/schema/news";
import { logger } from "@/lib/logger";

/**
 * Default RSS feeds untuk financial news Indonesia.
 *
 * Catatan:
 * - URL RSS bisa berubah; superadmin dapat update via /superadmin/news-sources (future).
 * - Kalau salah satu source error berulang, worker akan tandai `last_error_message` &
 *   `fetch_error_count`; superadmin bisa investigate via dashboard.
 */
const DEFAULT_SOURCES: Array<{
  slug: string;
  name: string;
  rssUrl: string;
  homepageUrl: string;
  logoUrl: string | null;
}> = [
  {
    slug: "cnbc-id",
    name: "CNBC Indonesia",
    rssUrl: "https://www.cnbcindonesia.com/market/rss",
    homepageUrl: "https://www.cnbcindonesia.com",
    logoUrl: "https://cdn.brandfetch.io/cnbcindonesia.com/w/200/h/200",
  },
  {
    slug: "detik-finance",
    name: "Detik Finance",
    rssUrl: "https://finance.detik.com/rss",
    homepageUrl: "https://finance.detik.com",
    logoUrl: "https://cdn.brandfetch.io/detik.com/w/200/h/200",
  },
  {
    slug: "antara-ekonomi",
    name: "Antara Ekonomi",
    rssUrl: "https://www.antaranews.com/rss/ekonomi-bisnis",
    homepageUrl: "https://www.antaranews.com",
    logoUrl: "https://cdn.brandfetch.io/antaranews.com/w/200/h/200",
  },
  {
    slug: "investing-id",
    name: "Investing.com",
    rssUrl: "https://id.investing.com/rss/news.rss",
    homepageUrl: "https://id.investing.com",
    logoUrl: "https://cdn.brandfetch.io/investing.com/w/200/h/200",
  },
];

export async function seedNewsSources(): Promise<void> {
  for (const s of DEFAULT_SOURCES) {
    await db
      .insert(newsSources)
      .values({
        slug: s.slug,
        name: s.name,
        rssUrl: s.rssUrl,
        homepageUrl: s.homepageUrl,
        logoUrl: s.logoUrl,
        isActive: "true",
        fetchIntervalMin: 15,
      })
      .onConflictDoUpdate({
        target: newsSources.slug,
        set: {
          name: s.name,
          rssUrl: s.rssUrl,
          homepageUrl: s.homepageUrl,
          logoUrl: s.logoUrl,
          updatedAt: sql`now()`,
        },
      });
  }
  logger.info({ count: DEFAULT_SOURCES.length }, "News sources seeded");
}

async function main() {
  await seedNewsSources();
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logger.error({ err }, "seed news sources failed");
    process.exit(1);
  });
}
