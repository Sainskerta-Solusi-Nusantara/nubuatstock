import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { analysisSnapshots } from "../db/schema/analysis-snapshots";

async function main() {
  const ticker = process.argv[2]?.toUpperCase() ?? "BBRI";
  const [row] = await db.select().from(analysisSnapshots).where(eq(analysisSnapshots.companyKode, ticker)).limit(1);
  if (!row) { console.log(`No snapshot for ${ticker}`); process.exit(0); }
  console.log("Score:", row.verdictScore, "Label:", row.verdictLabel);
  const factors = row.verdictFactors as Array<{ name: string; score: number }> | null;
  console.log("Factors type:", typeof factors, "isArray:", Array.isArray(factors), "len:", factors?.length ?? 0);
  if (factors && factors.length) console.log("First 2:", JSON.stringify(factors.slice(0, 2), null, 2));
  console.log("computedAt:", row.computedAt);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(99); });
