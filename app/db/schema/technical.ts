import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";

/**
 * Technical indicator snapshots — di-compute oleh worker setiap hari setelah EoD ingest.
 *
 * Satu row per emiten (UNIQUE on company_kode) — selalu menyimpan computed state TERKINI.
 * Tidak menyimpan history (cukup compute on-demand kalau perlu).
 *
 * Dipakai oleh:
 * - Screener filter teknikal (Mode Swing Santai, Day Trader, Breakout Hunter, dll)
 * - Daily Picks scoring (technical factor)
 * - AI Copilot tool: compute_indicators
 *
 * Worker compute job: `worker/jobs/compute-technical-snapshots.ts` — iterate 980 emiten,
 * fetch 250 EOD bars, compute semua indikator, upsert. Runtime ~5-10 min full pass.
 */
export const technicalSnapshots = pgTable(
  "technical_snapshots",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    tradeDate: date("trade_date", { mode: "string" }).notNull(),

    // ── Price reference ──
    lastClose: numeric("last_close", { precision: 18, scale: 4 }),
    prevClose: numeric("prev_close", { precision: 18, scale: 4 }),
    changePct1d: numeric("change_pct_1d", { precision: 8, scale: 4 }),

    // ── Momentum ──
    rsi14: numeric("rsi_14", { precision: 6, scale: 3 }),
    /** Stochastic 10, 5, 5 (Swing Santai favorite) */
    stochK_10_5_5: numeric("stoch_k_10_5_5", { precision: 6, scale: 3 }),
    stochD_10_5_5: numeric("stoch_d_10_5_5", { precision: 6, scale: 3 }),
    /** Stochastic 14, 3, 3 (Default) */
    stochK_14_3_3: numeric("stoch_k_14_3_3", { precision: 6, scale: 3 }),
    stochD_14_3_3: numeric("stoch_d_14_3_3", { precision: 6, scale: 3 }),
    /** Stochastic 5, 3, 3 (Fast / scalping) */
    stochK_5_3_3: numeric("stoch_k_5_3_3", { precision: 6, scale: 3 }),
    stochD_5_3_3: numeric("stoch_d_5_3_3", { precision: 6, scale: 3 }),

    // MACD 12, 26, 9
    macdLine: numeric("macd_line", { precision: 12, scale: 6 }),
    macdSignal: numeric("macd_signal", { precision: 12, scale: 6 }),
    macdHistogram: numeric("macd_histogram", { precision: 12, scale: 6 }),
    /** True kalau histogram baru cross dari negatif ke positif (last bar) */
    macdHistogramTurningUp: boolean("macd_histogram_turning_up").notNull().default(false),
    /** True kalau histogram baru cross dari positif ke negatif */
    macdHistogramTurningDown: boolean("macd_histogram_turning_down").notNull().default(false),

    // MFI 14 (Money Flow Index — volume-weighted RSI)
    mfi14: numeric("mfi_14", { precision: 6, scale: 3 }),

    // ── Trend ──
    sma20: numeric("sma_20", { precision: 18, scale: 4 }),
    sma50: numeric("sma_50", { precision: 18, scale: 4 }),
    sma200: numeric("sma_200", { precision: 18, scale: 4 }),
    ema9: numeric("ema_9", { precision: 18, scale: 4 }),
    ema21: numeric("ema_21", { precision: 18, scale: 4 }),
    ema55: numeric("ema_55", { precision: 18, scale: 4 }),
    adx14: numeric("adx_14", { precision: 6, scale: 3 }),

    // ── Volatility ──
    bbUpper20: numeric("bb_upper_20", { precision: 18, scale: 4 }),
    bbMiddle20: numeric("bb_middle_20", { precision: 18, scale: 4 }),
    bbLower20: numeric("bb_lower_20", { precision: 18, scale: 4 }),
    /** BB width = (upper - lower) / middle × 100 — current */
    bbWidthCurrent: numeric("bb_width_current", { precision: 8, scale: 4 }),
    /** BB width minimum within last 120 bars (proxy for squeeze detection) */
    bbWidthMin120d: numeric("bb_width_min_120d", { precision: 8, scale: 4 }),
    atr14: numeric("atr_14", { precision: 18, scale: 6 }),

    // ── Volume ──
    volumeSma20: bigint("volume_sma_20", { mode: "bigint" }),
    volumeSma60: bigint("volume_sma_60", { mode: "bigint" }),
    /** Today volume / avg 20d — spike detection */
    volumeRatio5dVs60d: numeric("volume_ratio_5d_vs_60d", { precision: 8, scale: 4 }),

    // ── Computed state flags (untuk fast filtering) ──
    isAboveSma20: boolean("is_above_sma_20").notNull().default(false),
    isAboveSma50: boolean("is_above_sma_50").notNull().default(false),
    isAboveSma200: boolean("is_above_sma_200").notNull().default(false),
    /** SMA20 > SMA50 > SMA200 (full bullish stack) */
    isBullishMaStack: boolean("is_bullish_ma_stack").notNull().default(false),
    /** SMA20 < SMA50 < SMA200 (full bearish stack) */
    isBearishMaStack: boolean("is_bearish_ma_stack").notNull().default(false),
    /** Just crossed up: SMA50 > SMA200 in last 10 bars */
    isGoldenCrossRecent: boolean("is_golden_cross_recent").notNull().default(false),
    /** Just crossed down */
    isDeathCrossRecent: boolean("is_death_cross_recent").notNull().default(false),
    /** BB width currently at or near (within 10%) of 120d min */
    isBbSqueeze: boolean("is_bb_squeeze").notNull().default(false),
    /** Distance from 52-week high (as %), positive = below */
    distFrom52wHighPct: numeric("dist_from_52w_high_pct", { precision: 8, scale: 4 }),
    /** Distance from 52-week low */
    distFrom52wLowPct: numeric("dist_from_52w_low_pct", { precision: 8, scale: 4 }),

    // ── Computed metadata ──
    barsAnalyzed: bigint("bars_analyzed", { mode: "bigint" }).notNull().default(sql`0`),
    computedAt: timestamp("computed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("technical_snapshots_kode_uq").on(t.companyKode),
    index("technical_snapshots_trade_date_idx").on(t.tradeDate),
    // Filter-friendly indexes
    index("technical_snapshots_stoch_k_idx").on(t.stochK_10_5_5),
    index("technical_snapshots_rsi_idx").on(t.rsi14),
    index("technical_snapshots_squeeze_idx").on(t.isBbSqueeze),
    index("technical_snapshots_bullish_stack_idx").on(t.isBullishMaStack),
  ],
);
