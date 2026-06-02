import { db } from "@/lib/db";
import { dailyPicks } from "@/db/schema/picks";
import { and, eq, isNull } from "drizzle-orm";
import { generateAndStoreNarrative } from "@/lib/picks/narrative";
(async () => {
  const picks = await db.select().from(dailyPicks).where(and(eq(dailyPicks.tradeDate, "2026-06-02"), isNull(dailyPicks.narrativeText)));
  let ok = 0;
  for (const p of picks) {
    const done = await generateAndStoreNarrative({
      pickId: p.id, companyKode: p.companyKode, setupType: p.setupType, score: Number(p.score),
      entryZoneLow: Number(p.entryZoneLow), entryZoneHigh: Number(p.entryZoneHigh), stopLoss: Number(p.stopLoss),
      tp1: Number(p.tp1), tp2: p.tp2 != null ? Number(p.tp2) : null, tp3: p.tp3 != null ? Number(p.tp3) : null,
      rewardRiskRatio: Number(p.rewardRiskRatio), factorBreakdown: p.factorBreakdown as any,
    });
    if (done) ok++;
    console.log(`${p.companyKode}: ${done ? "OK" : "skip"}`);
  }
  console.log(`RESULT: ${ok}/${picks.length} narrative generated`);
  process.exit(0);
})().catch((e) => { console.error("ERR:", e.message || e); process.exit(1); });
