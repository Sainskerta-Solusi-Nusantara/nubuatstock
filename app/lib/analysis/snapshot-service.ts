import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analysisSnapshots } from "@/db/schema/analysis-snapshots";

/**
 * Fast read path untuk ticker page — single query to cached snapshot.
 *
 * Returns ringkasan untuk render initial. Detail (factor breakdown, pivot data)
 * masih panggil service spesifik on-demand kalau user expand section tertentu.
 *
 * Cache invalidation: worker daily job re-populate semua. Untuk emiten dengan
 * fresh data (mis. quote intraday update), trigger manual via API.
 */

export interface SnapshotVerdictFactor {
  name: string;
  score: number;
  weight: number;
  signals: Array<{ label: string; value: string; positive: boolean | null }>;
}

export interface SnapshotSummary {
  kode: string;
  verdictScore: number | null;
  verdictLabel: string | null;
  /** Factor breakdown (6 faktor: Technical/Momentum/Value/Quality/Growth/Sentiment) untuk render VerdictCard. */
  verdictFactors: SnapshotVerdictFactor[];
  wyckoffPhase: string | null;
  wyckoffConfidence: number | null;
  topPatterns: Array<{ type: string; direction: string; confidence: number; status: string }>;
  patternCount: number;
  elliottWave1d: string | null;
  elliottWave1w: string | null;
  elliottConfidence: number | null;
  computedAt: Date;
}

export async function getAnalysisSnapshot(kode: string): Promise<SnapshotSummary | null> {
  const [row] = await db
    .select()
    .from(analysisSnapshots)
    .where(eq(analysisSnapshots.companyKode, kode.toUpperCase()))
    .limit(1);
  if (!row) return null;

  return {
    kode: row.companyKode,
    verdictScore: row.verdictScore != null ? Number(row.verdictScore) : null,
    verdictLabel: row.verdictLabel,
    verdictFactors: (row.verdictFactors as SnapshotVerdictFactor[] | null) ?? [],
    wyckoffPhase: row.wyckoffPhase,
    wyckoffConfidence: row.wyckoffConfidence != null ? Number(row.wyckoffConfidence) : null,
    topPatterns: (row.topPatterns as SnapshotSummary["topPatterns"]) ?? [],
    patternCount: row.patternCount != null ? Number(row.patternCount) : 0,
    elliottWave1d: row.elliottWave1d,
    elliottWave1w: row.elliottWave1w,
    elliottConfidence: row.elliottConfidence != null ? Number(row.elliottConfidence) : null,
    computedAt: row.computedAt,
  };
}
