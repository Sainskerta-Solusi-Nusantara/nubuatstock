import type { ReactNode } from "react";
import type { OhlcvBar } from "@/lib/types/market";

/**
 * Shared UI types — milik Agent 9.
 * Agent lain boleh import dari sini untuk konsistensi shell/chart/nav.
 */

// =================== Theme ===================

export type ThemeMode = "dark" | "light" | "system";

// =================== Layout / Nav ===================

export interface NavItem {
  href: string;
  label: string;
  /** lucide-react icon name resolved by consumer */
  icon?: ReactNode;
  /** Show "PRO" / "ELITE" / "SOON" badge */
  badge?: string;
  /** Hide unless feature flag matches */
  flag?: string;
  /** Hide unless role matches */
  role?: "user" | "admin" | "support" | "analyst";
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

// =================== Command Palette ===================

export type CommandKind =
  | "navigation"
  | "ticker"
  | "function"
  | "recent"
  | "action";

export interface CommandItemDef {
  id: string;
  kind: CommandKind;
  label: string;
  description?: string;
  keywords?: string[];
  icon?: ReactNode;
  /** Bloomberg-style function code, e.g. "EQS", "BMAP". */
  fn?: string;
  /** Either href or action — one required. */
  href?: string;
  action?: () => void | Promise<void>;
}

export interface CommandSection {
  id: string;
  heading: string;
  items: CommandItemDef[];
}

// =================== Ticker page ===================

export const tickerTabIds = [
  "overview",
  "technical",
  "fundamental",
  "bandarmology",
  "brokermology",
  "news",
  "research",
  "ai",
] as const;

export type TickerTabId = (typeof tickerTabIds)[number];

export interface TickerTabDef {
  id: TickerTabId;
  label: string;
  /** Optional tier gate — null = available to all logged-in users. */
  requiredTier?: "starter" | "pro" | "elite" | "institutional";
}

// =================== Chart ===================

export type ChartTheme = "dark" | "light";

export type ChartTimeframe = "1D" | "5D" | "1M" | "3M" | "1Y" | "5Y" | "MAX";

export type IndicatorId =
  | "sma20"
  | "sma50"
  | "sma200"
  | "ema12"
  | "ema26"
  | "bollinger"
  | "rsi14"
  | "macd";

export interface IndicatorDef {
  id: IndicatorId;
  label: string;
  /** If true, drawn on a separate sub-pane (RSI, MACD). */
  separatePane: boolean;
  /** Render hint for the legend. */
  group: "overlay" | "oscillator";
}

export interface ChartOverlay {
  type: "horizontal-line" | "annotation";
  /** Price level for horizontal-line. */
  price?: number;
  /** Annotation timestamp (ISO date). */
  time?: string;
  label?: string;
  color?: string;
}

export type ChartSeriesType = "candlestick" | "area" | "line";

export interface LightweightChartProps {
  data: OhlcvBar[];
  indicators?: IndicatorId[];
  overlays?: ChartOverlay[];
  seriesType?: ChartSeriesType;
  theme?: ChartTheme;
  height?: number;
  /** Show volume histogram pane. */
  showVolume?: boolean;
  /** Accessible label for screen reader. */
  ariaLabel?: string;
}

// =================== Misc ===================

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional CTA href. */
  ctaHref?: string;
  ctaLabel?: string;
}
