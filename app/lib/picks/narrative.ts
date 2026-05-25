import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPicks } from "@/db/schema/picks";
import { logger } from "@/lib/logger";
import { generatePickNarrative } from "./cross-deps";
import type { FactorBreakdown } from "@/lib/types/picks";

/**
 * Narrative generator. JANGAN dummy.
 *
 * Memanggil Agent 7 (`@/lib/ai`) via cross-deps. Kalau AI provider belum di-set
 * di admin (key kosong) atau modul belum live, fungsi return tanpa update DB —
 * narrative_text tetap NULL & UI render empty state "Narasi belum tersedia".
 */

export interface GenerateAndStoreArgs {
  pickId: string;
  companyKode: string;
  setupType: string;
  score: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  rewardRiskRatio: number;
  factorBreakdown: FactorBreakdown;
}

export async function generateAndStoreNarrative(args: GenerateAndStoreArgs): Promise<boolean> {
  const result = await generatePickNarrative({
    companyKode: args.companyKode,
    setupType: args.setupType,
    score: args.score,
    entryZoneLow: args.entryZoneLow,
    entryZoneHigh: args.entryZoneHigh,
    stopLoss: args.stopLoss,
    tp1: args.tp1,
    tp2: args.tp2,
    tp3: args.tp3,
    rewardRiskRatio: args.rewardRiskRatio,
    factorBreakdown: { ...args.factorBreakdown } as Record<string, number>,
  });
  if (!result || !result.text || result.text.trim().length === 0) {
    logger.info({ pickId: args.pickId }, "Narrative not generated (AI provider unavailable)");
    return false;
  }
  await db
    .update(dailyPicks)
    .set({
      narrativeText: result.text,
      narrativeGeneratedBy: result.generatedBy,
      narrativeAt: new Date(),
    })
    .where(eq(dailyPicks.id, args.pickId));
  return true;
}
