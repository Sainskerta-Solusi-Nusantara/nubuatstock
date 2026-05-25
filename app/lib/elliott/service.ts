import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { elliottWaveSnapshots, type FibonacciLevels, type WavePivot, type WaveSegment } from "@/db/schema/elliott";

export interface ElliottAnalysisDTO {
  kode: string;
  timeframe: string;
  currentWave: string;
  waveType: "impulse_up" | "impulse_down" | "corrective" | "unknown";
  waveDegree: string | null;
  sequence: WaveSegment[];
  pivots: WavePivot[];
  fibonacciLevels: FibonacciLevels | null;
  confidence: number;
  narrative: string | null;
  analyzedAt: Date;
}

export async function getElliottWaveForTicker(
  kode: string,
  timeframe = "1D",
): Promise<ElliottAnalysisDTO | null> {
  const [row] = await db
    .select()
    .from(elliottWaveSnapshots)
    .where(
      and(
        eq(elliottWaveSnapshots.companyKode, kode.toUpperCase()),
        eq(elliottWaveSnapshots.timeframe, timeframe),
      ),
    )
    .limit(1);

  if (!row) return null;
  return mapRow(row);
}

/** Get all available timeframes untuk kode tertentu (1D, 1W, dll). */
export async function getElliottWavesForTicker(
  kode: string,
): Promise<ElliottAnalysisDTO[]> {
  const rows = await db
    .select()
    .from(elliottWaveSnapshots)
    .where(eq(elliottWaveSnapshots.companyKode, kode.toUpperCase()))
    .orderBy(asc(elliottWaveSnapshots.timeframe));
  return rows.map(mapRow);
}

function mapRow(row: typeof elliottWaveSnapshots.$inferSelect): ElliottAnalysisDTO {
  return {
    kode: row.companyKode,
    timeframe: row.timeframe,
    currentWave: row.currentWave,
    waveType: row.waveType as ElliottAnalysisDTO["waveType"],
    waveDegree: row.waveDegree,
    sequence: row.sequence as WaveSegment[],
    pivots: row.pivots as WavePivot[],
    fibonacciLevels: row.fibonacciLevels as FibonacciLevels | null,
    confidence: Number(row.confidence),
    narrative: row.narrative,
    analyzedAt: row.analyzedAt,
  };
}
