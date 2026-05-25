"use client";

import * as React from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { cn } from "@/lib/utils/cn";
import type {
  ChartOverlay,
  ChartSeriesType,
  ChartTheme,
  IndicatorId,
  LightweightChartProps,
} from "@/lib/types/ui";
import type { OhlcvBar } from "@/lib/types/market";
import { bollinger, ema, sma } from "@/lib/utils/indicators";

function toTime(dateStr: string): UTCTimestamp {
  // dateStr "YYYY-MM-DD" → UNIX seconds in UTC midnight.
  const [y, m, d] = dateStr.split("-").map(Number);
  return (Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 1000) as UTCTimestamp;
}

function themeTokens(theme: ChartTheme) {
  if (theme === "light") {
    return {
      bg: "rgba(0,0,0,0)",
      text: "#3f3f46",
      grid: "rgba(0,0,0,0.06)",
      border: "rgba(0,0,0,0.12)",
      bull: "#16a34a",
      bear: "#dc2626",
      volume: "rgba(120,120,120,0.4)",
    };
  }
  return {
    bg: "rgba(0,0,0,0)",
    text: "#d4d4d8",
    grid: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    bull: "#22c55e",
    bear: "#ef4444",
    volume: "rgba(180,180,180,0.35)",
  };
}

function indicatorPalette() {
  return {
    sma20: "#f59e0b",
    sma50: "#3b82f6",
    sma200: "#a855f7",
    ema12: "#06b6d4",
    ema26: "#ec4899",
    bollUpper: "#94a3b8",
    bollMid: "#64748b",
    bollLower: "#94a3b8",
  };
}

interface InternalRefs {
  chart: IChartApi;
  main: ISeriesApi<"Candlestick" | "Area" | "Line">;
  volume: ISeriesApi<"Histogram"> | null;
  indicators: Map<string, ISeriesApi<"Line">>;
}

/**
 * Thin wrapper for TradingView lightweight-charts. RSC-safe (client only).
 * - Auto-resize via ResizeObserver.
 * - Indicator overlays computed client-side (warm-up handled by helpers).
 * - Cleanup pada unmount via useEffect return.
 */
export function LightweightChart({
  data,
  indicators = [],
  overlays = [],
  seriesType = "candlestick",
  theme = "dark",
  height = 360,
  showVolume = true,
  ariaLabel = "Stock price chart",
}: LightweightChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const refs = React.useRef<InternalRefs | null>(null);

  // Init chart once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const tokens = themeTokens(theme);

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: tokens.bg },
        textColor: tokens.text,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: tokens.grid },
        horzLines: { color: tokens.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: tokens.border },
      timeScale: { borderColor: tokens.border, rightOffset: 6 },
    });

    const main = buildMainSeries(chart, seriesType, tokens);
    let volume: ISeriesApi<"Histogram"> | null = null;
    if (showVolume) {
      volume = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        color: tokens.volume,
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    }

    refs.current = { chart, main, volume, indicators: new Map() };

    return () => {
      chart.remove();
      refs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesType, showVolume, theme]);

  // Push data + indicators reactively.
  React.useEffect(() => {
    const r = refs.current;
    if (!r) return;
    const tokens = themeTokens(theme);
    const pal = indicatorPalette();

    if (seriesType === "candlestick") {
      (r.main as ISeriesApi<"Candlestick">).setData(
        data.map((b) => ({
          time: toTime(b.date),
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
        })),
      );
    } else if (seriesType === "area") {
      (r.main as ISeriesApi<"Area">).setData(
        data.map((b) => ({ time: toTime(b.date), value: Number(b.close) })),
      );
    } else {
      (r.main as ISeriesApi<"Line">).setData(
        data.map((b) => ({ time: toTime(b.date), value: Number(b.close) })),
      );
    }

    if (r.volume) {
      r.volume.setData(
        data.map((b) => ({
          time: toTime(b.date),
          value: Number(b.volume),
          color:
            Number(b.close) >= Number(b.open) ? tokens.bull : tokens.bear,
        })),
      );
    }

    // Reset indicator series.
    for (const s of r.indicators.values()) r.chart.removeSeries(s);
    r.indicators.clear();

    const addLine = (
      id: string,
      points: { time: string; value: number }[],
      color: string,
    ) => {
      if (points.length === 0) return;
      const s = r.chart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        points.map((p) => ({ time: toTime(p.time), value: p.value })),
      );
      r.indicators.set(id, s);
    };

    for (const id of indicators) {
      const cfg = INDICATOR_CONFIG[id];
      if (!cfg) continue;
      if (cfg.kind === "sma") {
        addLine(id, sma(data, cfg.period), pal[id as keyof typeof pal] ?? "#888");
      } else if (cfg.kind === "ema") {
        addLine(id, ema(data, cfg.period), pal[id as keyof typeof pal] ?? "#888");
      } else if (cfg.kind === "bollinger") {
        const bands = bollinger(data, 20, 2);
        addLine(
          "boll-mid",
          bands.map((b) => ({ time: b.time, value: b.middle })),
          pal.bollMid,
        );
        addLine(
          "boll-upper",
          bands.map((b) => ({ time: b.time, value: b.upper })),
          pal.bollUpper,
        );
        addLine(
          "boll-lower",
          bands.map((b) => ({ time: b.time, value: b.lower })),
          pal.bollLower,
        );
      }
    }

    // Overlays (horizontal price lines & vertical annotations).
    for (const ov of overlays) applyOverlay(r, ov);

    if (data.length > 0) {
      r.chart.timeScale().fitContent();
    }
  }, [data, indicators, overlays, seriesType, theme]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-md border bg-card",
      )}
      style={{ height }}
    />
  );
}

const INDICATOR_CONFIG: Record<
  IndicatorId,
  { kind: "sma" | "ema" | "bollinger"; period: number } | null
> = {
  sma20: { kind: "sma", period: 20 },
  sma50: { kind: "sma", period: 50 },
  sma200: { kind: "sma", period: 200 },
  ema12: { kind: "ema", period: 12 },
  ema26: { kind: "ema", period: 26 },
  bollinger: { kind: "bollinger", period: 20 },
  rsi14: null, // RSI ditampilkan di IndicatorPanel terpisah.
  macd: null, // MACD ditampilkan di IndicatorPanel terpisah.
};

function buildMainSeries(
  chart: IChartApi,
  seriesType: ChartSeriesType,
  tokens: ReturnType<typeof themeTokens>,
) {
  switch (seriesType) {
    case "area":
      return chart.addAreaSeries({
        lineColor: tokens.bull,
        topColor: `${tokens.bull}55`,
        bottomColor: `${tokens.bull}00`,
        lineWidth: 2,
      });
    case "line":
      return chart.addLineSeries({ color: tokens.bull, lineWidth: 2 });
    default:
      return chart.addCandlestickSeries({
        upColor: tokens.bull,
        downColor: tokens.bear,
        borderUpColor: tokens.bull,
        borderDownColor: tokens.bear,
        wickUpColor: tokens.bull,
        wickDownColor: tokens.bear,
      });
  }
}

function applyOverlay(refs: InternalRefs, ov: ChartOverlay) {
  if (ov.type === "horizontal-line" && typeof ov.price === "number") {
    refs.main.createPriceLine({
      price: ov.price,
      color: ov.color ?? "#94a3b8",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: ov.label ?? "",
    });
  }
  // Annotation hooks (vertical line at timestamp) intentionally omitted —
  // requires markers API; future iteration.
}
