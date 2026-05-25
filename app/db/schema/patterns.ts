import { sql } from "drizzle-orm";
import {
  boolean,
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
 * Pattern Detections — auto-detected chart patterns per emiten per timeframe.
 *
 * Status:
 *   - forming: pattern terdeteksi tapi belum break-out (key event belum terjadi)
 *   - completed: pattern complete + breakout confirmed
 *   - invalidated: pattern gagal (mis. broke support sebelum target)
 *
 * Pattern_type categories:
 *   - continuation: bull_flag, bear_flag, bull_pennant, bear_pennant, cup_handle, inverse_cup_handle, rectangle
 *   - reversal: double_top, double_bottom, head_shoulders, inverse_head_shoulders, rounding_top, rounding_bottom
 *   - indecision: symmetrical_triangle, ascending_triangle, descending_triangle, rising_wedge, falling_wedge
 *   - candlestick: hammer, engulfing_bull, engulfing_bear, morning_star, evening_star, doji, dll
 *
 * Direction: bullish | bearish (pattern bias setelah breakout)
 *
 * key_levels JSON shape:
 *   { breakout: number, target: number, stop: number, neckline?: number }
 *
 * Worker compute: cron daily post-EoD. Run all detectors per emiten × timeframe.
 */

export interface PatternKeyLevels {
  breakout: number;
  target: number;
  stop: number;
  neckline?: number;
  support?: number;
  resistance?: number;
}

export const patternDetections = pgTable(
  "pattern_detections",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    timeframe: text("timeframe").notNull().default("1D"), // '1D' | '1W' | '1M'
    patternType: text("pattern_type").notNull(),
    patternCategory: text("pattern_category").notNull(), // 'continuation' | 'reversal' | 'indecision' | 'candlestick'
    direction: text("direction").notNull(), // 'bullish' | 'bearish'
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(), // 0-1
    status: text("status").notNull().default("forming"), // 'forming' | 'completed' | 'invalidated'
    keyLevels: jsonbT<PatternKeyLevels>("key_levels").notNull(),
    volumeConfirmation: boolean("volume_confirmation").notNull().default(false),
    narrative: text("narrative"), // AI-generated atau template
    detectedAt: timestamp("detected_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("pattern_detections_uq").on(t.companyKode, t.timeframe, t.patternType, t.startDate),
    index("pattern_detections_kode_idx").on(t.companyKode),
    index("pattern_detections_status_idx").on(t.status),
    index("pattern_detections_pattern_type_idx").on(t.patternType),
    index("pattern_detections_recent_idx").on(t.detectedAt),
  ],
);
