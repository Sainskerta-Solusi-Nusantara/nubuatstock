import { getAnalysisSnapshot } from "../lib/analysis/snapshot-service";

async function main() {
  const s = await getAnalysisSnapshot("BBRI");
  if (!s) { console.log("null"); process.exit(2); }
  console.log("score:", s.verdictScore, "label:", s.verdictLabel);
  console.log("factor count:", s.verdictFactors.length);
  console.log("factor names:", s.verdictFactors.map(f => `${f.name}(${f.score}/10)`).join(", "));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(99); });
