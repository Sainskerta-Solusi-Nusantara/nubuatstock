import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * Cached aggregate snapshot per ticker — Verdict + Wyckoff + Patterns + Elliott summary.
 *
 * Computed by worker daily (post-EoD ingest). Service reads from this table instead of
 * recomputing on every page load.
 *
 * Performance: ticker page TTFB 1500ms → 200ms.
 */
export const analysisSnapshots = pgTable(
  "analysis_snapshots",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    // Verdict summary
    verdictScore: numeric("verdict_score", { precision: 4, scale: 2 }),
    verdictLabel: text("verdict_label"), // STRONG BUY | BUY | HOLD | SELL | STRONG SELL
    verdictFactors: jsonbT<unknown[]>("verdict_factors"),
    // Wyckoff summary
    wyckoffPhase: text("wyckoff_phase"), // accumulation | markup | distribution | markdown | unknown
    wyckoffConfidence: numeric("wyckoff_confidence", { precision: 4, scale: 3 }),
    // Pattern summary — best 3 patterns with confidence
    topPatterns: jsonbT<Array<{ type: string; direction: string; confidence: number; status: string }>>("top_patterns"),
    patternCount: numeric("pattern_count"),
    // Elliott summary
    elliottWave1d: text("elliott_wave_1d"),
    elliottWave1w: text("elliott_wave_1w"),
    elliottConfidence: numeric("elliott_confidence", { precision: 4, scale: 3 }),
    // Metadata
    computedAt: timestamp("computed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("analysis_snapshots_kode_uq").on(t.companyKode),
    index("analysis_snapshots_verdict_idx").on(t.verdictLabel),
    index("analysis_snapshots_wyckoff_idx").on(t.wyckoffPhase),
  ],
);
