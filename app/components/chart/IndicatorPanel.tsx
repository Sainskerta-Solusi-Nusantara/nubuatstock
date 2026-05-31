"use client";

import dynamic from "next/dynamic";

import type { ChartTheme } from "@/lib/types/ui";
import type { OhlcvBar } from "@/lib/types/market";

interface IndicatorPanelProps {
  data: OhlcvBar[];
  kind: "rsi" | "macd";
  theme?: ChartTheme;
  height?: number;
  ariaLabel?: string;
}

/**
 * Lazy-loaded IndicatorPanel wrapper.
 *
 * Sama seperti LightweightChart: `lightweight-charts` di-code-split via
 * next/dynamic + ssr:false. Implementasi asli ada di IndicatorPanelImpl.
 */
export const IndicatorPanel = dynamic<IndicatorPanelProps>(
  () => import("./IndicatorPanelImpl").then((m) => m.IndicatorPanel),
  {
    ssr: false,
    loading: () => (
      <div
        role="img"
        aria-label="Memuat indikator"
        className="w-full animate-pulse rounded-md border bg-muted/30"
        style={{ height: 140 }}
      />
    ),
  },
);
