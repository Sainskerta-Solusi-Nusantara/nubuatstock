import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { companies } from "../db/schema/companies";

async function main() {
  const total = await db.select({ c: sql<number>`count(*)::int` }).from(companies);
  const withLogo = await db.select({ c: sql<number>`count(*)::int` }).from(companies).where(sql`logo_url is not null`);
  const sample = await db.select({ kode: companies.kode, logoUrl: companies.logoUrl }).from(companies).where(sql`logo_url is not null`).limit(5);
  console.log({ total: total[0]?.c, withLogo: withLogo[0]?.c });
  console.log("Sample:", sample);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(99); });
