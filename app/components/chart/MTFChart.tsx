"use client";

import dynamic from "next/dynamic";

import type {
  ChartOverlay,
  ChartTheme,
  ChartTimeframe,
  IndicatorId,
} from "@/lib/types/ui";
import type { OhlcvBar } from "@/lib/types/market";

export interface MTFChartProps {
  ticker: string;
  data: OhlcvBar[];
  theme?: ChartTheme;
  defaultTimeframe?: ChartTimeframe;
  availableIndicators?: IndicatorId[];
  defaultActive?: IndicatorId[];
  onTimeframeChange?: (tf: ChartTimeframe) => void;
  onIndicatorsChange?: (indicators: IndicatorId[]) => void;
  overlays?: ChartOverlay[];
  chartHeight?: number;
}

/**
 * Lazy-loaded MTFChart wrapper.
 *
 * Mengompose LightweightChart + IndicatorPanel (RSI/MACD). Seluruh sub-tree
 * (termasuk `lightweight-charts`) di-code-split lewat next/dynamic + ssr:false,
 * jadi tidak ikut di bundle awal halaman ticker/workspace. Implementasi asli ada
 * di MTFChartImpl.
 */
export const MTFChart = dynamic<MTFChartProps>(
  () => import("./MTFChartImpl").then((m) => m.MTFChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-md border bg-muted/30" />
    ),
  },
);
