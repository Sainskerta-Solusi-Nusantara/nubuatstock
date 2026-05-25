import type { OhlcvBar } from "@/lib/types/picks";
import type { PatternKeyLevels } from "@/db/schema/patterns";

export type PatternType =
  | "bull_flag"
  | "bear_flag"
  | "bull_pennant"
  | "bear_pennant"
  | "cup_handle"
  | "inverse_cup_handle"
  | "rectangle_breakout_up"
  | "rectangle_breakout_down"
  | "double_top"
  | "double_bottom"
  | "head_shoulders"
  | "inverse_head_shoulders"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "rising_wedge"
  | "falling_wedge"
  // Candlestick patterns
  | "hammer"
  | "shooting_star"
  | "bullish_engulfing"
  | "bearish_engulfing"
  | "morning_star"
  | "evening_star"
  | "doji";

export type PatternCategory = "continuation" | "reversal" | "indecision" | "candlestick";

export type PatternDirection = "bullish" | "bearish";

export type PatternStatus = "forming" | "completed" | "invalidated";

export interface PatternMatch {
  patternType: PatternType;
  category: PatternCategory;
  direction: PatternDirection;
  status: PatternStatus;
  startIndex: number;
  endIndex: number;
  confidence: number; // 0-1
  keyLevels: PatternKeyLevels;
  volumeConfirmation: boolean;
  narrative: string;
}

export interface PatternDetector {
  type: PatternType;
  category: PatternCategory;
  detect(bars: OhlcvBar[]): PatternMatch[];
}

export const PATTERN_META: Record<PatternType, { label: string; emoji: string; description: string }> = {
  bull_flag: {
    label: "Bullish Flag",
    emoji: "🚩",
    description: "Konsolidasi sideways/menurun setelah strong rally — breakout up biasanya melanjutkan trend.",
  },
  bear_flag: {
    label: "Bearish Flag",
    emoji: "🚩",
    description: "Konsolidasi sideways/naik setelah strong drop — breakdown ke bawah melanjutkan downtrend.",
  },
  bull_pennant: {
    label: "Bullish Pennant",
    emoji: "🎌",
    description: "Symmetrical triangle kecil setelah strong move up — kontinuasi bullish.",
  },
  bear_pennant: {
    label: "Bearish Pennant",
    emoji: "🎌",
    description: "Symmetrical triangle kecil setelah strong move down — kontinuasi bearish.",
  },
  cup_handle: {
    label: "Cup and Handle",
    emoji: "☕",
    description: "Rounded bottom (cup) diikuti small pullback (handle), lalu breakout — klasik bullish continuation.",
  },
  inverse_cup_handle: {
    label: "Inverse Cup and Handle",
    emoji: "☕",
    description: "Rounded top + small pullback → bearish breakdown.",
  },
  rectangle_breakout_up: {
    label: "Rectangle Breakout Up",
    emoji: "📦",
    description: "Trading range terdefinisi support-resistance, lalu break up.",
  },
  rectangle_breakout_down: {
    label: "Rectangle Breakout Down",
    emoji: "📦",
    description: "Trading range break down.",
  },
  double_top: {
    label: "Double Top",
    emoji: "🔺🔺",
    description: "Dua puncak di level harga yang sama — bearish reversal klasik.",
  },
  double_bottom: {
    label: "Double Bottom",
    emoji: "🔻🔻",
    description: "Dua bottom di level harga yang sama — bullish reversal klasik.",
  },
  head_shoulders: {
    label: "Head and Shoulders",
    emoji: "👤",
    description: "Left shoulder + head + right shoulder — bearish reversal kuat.",
  },
  inverse_head_shoulders: {
    label: "Inverse Head and Shoulders",
    emoji: "👤",
    description: "Mirror — bullish reversal.",
  },
  ascending_triangle: {
    label: "Ascending Triangle",
    emoji: "📐",
    description: "Resistance flat + higher lows — bias bullish breakout.",
  },
  descending_triangle: {
    label: "Descending Triangle",
    emoji: "📐",
    description: "Support flat + lower highs — bias bearish breakdown.",
  },
  symmetrical_triangle: {
    label: "Symmetrical Triangle",
    emoji: "🔻",
    description: "Higher lows + lower highs — indecision, breakout bisa kemana saja tapi cenderung melanjutkan trend sebelumnya.",
  },
  rising_wedge: {
    label: "Rising Wedge",
    emoji: "📈",
    description: "Higher highs + higher lows tapi converging — bearish reversal (paradoxical).",
  },
  falling_wedge: {
    label: "Falling Wedge",
    emoji: "📉",
    description: "Lower lows + lower highs tapi converging — bullish reversal (paradoxical).",
  },
  hammer: {
    label: "Hammer",
    emoji: "🔨",
    description: "Lower wick panjang setelah downtrend — buyers reject lower prices. Bullish reversal 1-bar.",
  },
  shooting_star: {
    label: "Shooting Star",
    emoji: "💫",
    description: "Upper wick panjang setelah uptrend — buyers exhausted. Bearish reversal 1-bar.",
  },
  bullish_engulfing: {
    label: "Bullish Engulfing",
    emoji: "🟢",
    description: "Bar hijau menelan body bar merah sebelumnya. Bullish reversal 2-bar.",
  },
  bearish_engulfing: {
    label: "Bearish Engulfing",
    emoji: "🔴",
    description: "Bar merah menelan body bar hijau sebelumnya. Bearish reversal 2-bar.",
  },
  morning_star: {
    label: "Morning Star",
    emoji: "🌅",
    description: "Long red → small indecision → long green. Bullish reversal 3-bar.",
  },
  evening_star: {
    label: "Evening Star",
    emoji: "🌆",
    description: "Long green → small indecision → long red. Bearish reversal 3-bar.",
  },
  doji: {
    label: "Doji",
    emoji: "✚",
    description: "Body sangat kecil — indecision. Signal reversal di trend extreme.",
  },
};
