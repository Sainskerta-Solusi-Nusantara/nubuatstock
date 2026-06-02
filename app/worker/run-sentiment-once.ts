import { scoreUnanalyzed } from "@/lib/news/sentiment";
(async () => {
  let total = 0, failed = 0;
  for (let i = 0; i < 4; i++) {
    const r = await scoreUnanalyzed(50);
    total += r.scored; failed += r.failed;
    console.log(`batch ${i+1}: scored=${r.scored} failed=${r.failed}`);
    if (r.scored === 0 && r.failed === 0) break;
  }
  console.log(`RESULT: totalScored=${total} failed=${failed}`);
  process.exit(0);
})().catch((e) => { console.error("ERR:", e.message || e); process.exit(1); });
