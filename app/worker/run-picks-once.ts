import { generatePicksJob } from "@/worker/jobs/generate-picks";
(async () => {
  const r = await generatePicksJob({ tradeDate: "2026-06-02", generateNarrative: false });
  console.log("RESULT:", JSON.stringify(r));
  process.exit(0);
})().catch((e) => { console.error("ERR:", e.stack || e.message || e); process.exit(1); });
