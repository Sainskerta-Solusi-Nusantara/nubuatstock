"use client";

import * as React from "react";

import { LightweightChart } from "./LightweightChart";
import { IndicatorPanel } from "./IndicatorPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type {
  ChartOverlay,
  ChartTheme,
  ChartTimeframe,
  IndicatorId,
} from "@/lib/types/ui";
import type { OhlcvBar } from "@/lib/types/market";

interface MTFChartProps {
  ticker: string;
  data: OhlcvBar[];
  theme?: ChartTheme;
  /** Timeframe sebagai tombol; nilai default. */
  defaultTimeframe?: ChartTimeframe;
  /** Indicator yang tersedia di toggle bar. */
  availableIndicators?: IndicatorId[];
  /** Indicator default ON. */
  defaultActive?: IndicatorId[];
  /** Optional callback ketika user mengubah timeframe (parent fetch ulang). */
  onTimeframeChange?: (tf: ChartTimeframe) => void;
  /** Optional callback ketika user toggle indikator (untuk persist state, mis. workspace URL). */
  onIndicatorsChange?: (indicators: IndicatorId[]) => void;
  /** Overlays: horizontal price lines untuk pattern breakout/target/stop levels. */
  overlays?: ChartOverlay[];
  /** Override tinggi price chart (default 400). Untuk grid multi-pane yang padat. */
  chartHeight?: number;
}

const TIMEFRAMES: ChartTimeframe[] = ["1D", "5D", "1M", "3M", "1Y", "5Y"];

const INDICATOR_LABELS: Record<IndicatorId, string> = {
  sma20: "SMA 20",
  sma50: "SMA 50",
  sma200: "SMA 200",
  ema12: "EMA 12",
  ema26: "EMA 26",
  bollinger: "Bollinger",
  rsi14: "RSI 14",
  macd: "MACD",
};

/**
 * Multi-timeframe chart for ticker page. Composes price chart + optional RSI/MACD panes.
 *
 * Timeframe filter dilakukan client-side terhadap `data` (parent fetch range
 * besar; client trim). Untuk MVP cukup; nanti bisa diubah ke server-driven.
 */
export function MTFChart({
  ticker,
  data,
  theme = "dark",
  defaultTimeframe = "1Y",
  availableIndicators = ["sma20", "sma50", "sma200", "bollinger", "rsi14", "macd"],
  defaultActive = ["sma20", "sma50"],
  onTimeframeChange,
  onIndicatorsChange,
  overlays = [],
  chartHeight = 400,
}: MTFChartProps) {
  const [tf, setTf] = React.useState<ChartTimeframe>(defaultTimeframe);
  const [active, setActive] = React.useState<Set<IndicatorId>>(
    new Set(defaultActive),
  );

  const filtered = React.useMemo(() => filterByTimeframe(data, tf), [data, tf]);

  const overlayIndicators = React.useMemo(
    () =>
      [...active].filter((id) =>
        ["sma20", "sma50", "sma200", "ema12", "ema26", "bollinger"].includes(id),
      ),
    [active],
  );

  const showRsi = active.has("rsi14");
  const showMacd = active.has("macd");

  const toggleIndicator = (id: IndicatorId) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onIndicatorsChange?.([...next]);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTf(t);
                onTimeframeChange?.(t);
              }}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tf === t && "bg-background text-foreground shadow",
              )}
              aria-pressed={tf === t}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {availableIndicators.map((id) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={active.has(id) ? "secondary" : "outline"}
              onClick={() => toggleIndicator(id)}
              aria-pressed={active.has(id)}
              className="h-7 px-2 text-xs"
            >
              {INDICATOR_LABELS[id]}
            </Button>
          ))}
        </div>
      </div>

      <LightweightChart
        data={filtered}
        indicators={overlayIndicators}
        overlays={overlays}
        theme={theme}
        height={chartHeight}
        ariaLabel={`Grafik harga ${ticker} timeframe ${tf}`}
      />

      {showRsi && (
        <IndicatorPanel
          data={filtered}
          kind="rsi"
          theme={theme}
          height={120}
          ariaLabel={`RSI 14 ${ticker}`}
        />
      )}
      {showMacd && (
        <IndicatorPanel
          data={filtered}
          kind="macd"
          theme={theme}
          height={140}
          ariaLabel={`MACD ${ticker}`}
        />
      )}
    </div>
  );
}

function filterByTimeframe(data: OhlcvBar[], tf: ChartTimeframe): OhlcvBar[] {
  if (data.length === 0) return data;
  if (tf === "MAX") return data;
  const last = data[data.length - 1]!;
  const lastTs = new Date(last.date).getTime();
  const days = tfToDays(tf);
  if (days == null) return data;
  const cutoff = lastTs - days * 24 * 60 * 60 * 1000;
  return data.filter((b) => new Date(b.date).getTime() >= cutoff);
}

function tfToDays(tf: ChartTimeframe): number | null {
  switch (tf) {
    case "1D":
      return 7; // 1 trading day not available in EoD; show 1 week.
    case "5D":
      return 7;
    case "1M":
      return 31;
    case "3M":
      return 93;
    case "1Y":
      return 365;
    case "5Y":
      return 365 * 5;
    default:
      return null;
  }
}
