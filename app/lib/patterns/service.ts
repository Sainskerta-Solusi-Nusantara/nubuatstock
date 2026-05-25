import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { patternDetections } from "@/db/schema/patterns";
import { PATTERN_META, type PatternType } from "./types";
import type { PatternKeyLevels } from "@/db/schema/patterns";

export interface PatternRowDTO {
  id: string;
  patternType: PatternType;
  patternLabel: string;
  patternEmoji: string;
  patternDescription: string;
  category: string;
  direction: "bullish" | "bearish";
  status: "forming" | "completed" | "invalidated";
  startDate: string;
  endDate: string;
  confidence: number;
  keyLevels: PatternKeyLevels;
  volumeConfirmation: boolean;
  narrative: string | null;
}

export async function getPatternsForTicker(kode: string, minConfidence = 0.5): Promise<PatternRowDTO[]> {
  const rows = await db
    .select()
    .from(patternDetections)
    .where(
      and(
        eq(patternDetections.companyKode, kode.toUpperCase()),
        ne(patternDetections.status, "invalidated"),
      ),
    )
    .orderBy(desc(patternDetections.confidence));

  return rows
    .filter((r) => Number(r.confidence) >= minConfidence)
    .map((r) => {
      const meta = PATTERN_META[r.patternType as PatternType];
      return {
        id: r.id,
        patternType: r.patternType as PatternType,
        patternLabel: meta?.label ?? r.patternType,
        patternEmoji: meta?.emoji ?? "📊",
        patternDescription: meta?.description ?? "",
        category: r.patternCategory,
        direction: r.direction as "bullish" | "bearish",
        status: r.status as "forming" | "completed" | "invalidated",
        startDate: r.startDate,
        endDate: r.endDate,
        confidence: Number(r.confidence),
        keyLevels: r.keyLevels as PatternKeyLevels,
        volumeConfirmation: r.volumeConfirmation,
        narrative: r.narrative,
      };
    });
}
