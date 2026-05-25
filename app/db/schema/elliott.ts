import { sql } from "drizzle-orm";
import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * Elliott Wave snapshots — auto-detected wave count per emiten per timeframe.
 *
 * Berdasarkan spec di ANALISIS_APLIKASI_SAHAM.md §4.1.A.
 *
 * Status P0:
 *   - Impulse 5-wave labeling (1, 2, 3, 4, 5) from pivot detection
 *   - Single timeframe 1D
 *   - Skip corrective ABC (P1), wave degree hierarchy (P3), AI narrative (P2), chart render (P2)
 *
 * `sequence` JSON shape:
 *   [
 *     { label: "1"|"2"|"3"|"4"|"5"|"A"|"B"|"C", startDate, endDate, startPrice, endPrice }
 *   ]
 *
 * `pivots` JSON shape:
 *   [ { date, price, type: "high"|"low" } ]
 *
 * `fibonacci_levels` JSON shape:
 *   {
 *     retracement: { 0.382: number, 0.500: number, 0.618: number, 0.786: number },
 *     extension: { 1.618: number, 2.618: number }
 *   }
 */

export interface WaveSegment {
  label: "1" | "2" | "3" | "4" | "5" | "A" | "B" | "C";
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
}

export interface WavePivot {
  date: string;
  price: number;
  type: "high" | "low";
}

export interface FibonacciLevels {
  retracement?: Record<string, number>;
  extension?: Record<string, number>;
}

export const elliottWaveSnapshots = pgTable(
  "elliott_wave_snapshots",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    timeframe: text("timeframe").notNull().default("1D"), // '1D' | '1W' | '1M'
    currentWave: text("current_wave").notNull(), // 'Wave 3 of 5 (Impulse Up)', 'A of ABC (Corrective)'
    waveType: text("wave_type").notNull(), // 'impulse_up' | 'impulse_down' | 'corrective' | 'unknown'
    waveDegree: text("wave_degree"), // 'Primary' | 'Intermediate' | 'Minor' (P3, default Minor)
    sequence: jsonbT<WaveSegment[]>("sequence").notNull(),
    pivots: jsonbT<WavePivot[]>("pivots").notNull(),
    fibonacciLevels: jsonbT<FibonacciLevels>("fibonacci_levels"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(), // 0-1
    narrative: text("narrative"), // AI-generated (P2, nullable for P0)
    chartImageUrl: text("chart_image_url"), // Pre-rendered chart PNG (P2, nullable)
    analyzedAt: timestamp("analyzed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("elliott_wave_snapshots_uq").on(t.companyKode, t.timeframe),
    index("elliott_wave_snapshots_kode_idx").on(t.companyKode),
    index("elliott_wave_snapshots_wave_type_idx").on(t.waveType),
  ],
);
