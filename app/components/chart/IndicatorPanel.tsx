"use client";

import * as React from "react";
import {
  ColorType,
  createChart,
  LineStyle,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { cn } from "@/lib/utils/cn";
import type { ChartTheme } from "@/lib/types/ui";
import type { OhlcvBar } from "@/lib/types/market";
import { macd, rsi } from "@/lib/utils/indicators";

interface IndicatorPanelProps {
  data: OhlcvBar[];
  kind: "rsi" | "macd";
  theme?: ChartTheme;
  height?: number;
  ariaLabel?: string;
}

function toTime(dateStr: string): UTCTimestamp {
  const [y, m, d] = dateStr.split("-").map(Number);
  return (Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 1000) as UTCTimestamp;
}

export function IndicatorPanel({
  data,
  kind,
  theme = "dark",
  height = 140,
  ariaLabel,
}: IndicatorPanelProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const isLight = theme === "light";
    const chart = createChart(ref.current, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "rgba(0,0,0,0)" },
        textColor: isLight ? "#3f3f46" : "#d4d4d8",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)" },
        horzLines: { color: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderColor: "transparent" },
      timeScale: { visible: false, borderColor: "transparent" },
    });
    chartRef.current = chart;

    if (kind === "rsi") {
      const rsiSeries = chart.addLineSeries({ color: "#a855f7", lineWidth: 2 });
      rsiSeries.setData(
        rsi(data).map((p) => ({ time: toTime(p.time), value: p.value })),
      );
      // Overbought / oversold reference lines.
      rsiSeries.createPriceLine({
        price: 70,
        color: "#94a3b8",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "70",
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: "#94a3b8",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "30",
      });
    } else if (kind === "macd") {
      const series = macd(data);
      const macdLine = chart.addLineSeries({ color: "#3b82f6", lineWidth: 2 });
      const signalLine = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1 });
      const histo = chart.addHistogramSeries({ priceFormat: { type: "price" } });

      macdLine.setData(
        series.map((p) => ({ time: toTime(p.time), value: p.value })),
      );
      signalLine.setData(
        series.map((p) => ({ time: toTime(p.time), value: p.signal })),
      );
      histo.setData(
        series.map((p) => ({
          time: toTime(p.time),
          value: p.histogram,
          color: p.histogram >= 0 ? "#22c55e" : "#ef4444",
        })),
      );
    }

    if (data.length > 0) chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, kind, theme, height]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel ?? `${kind.toUpperCase()} indicator chart`}
      className={cn("w-full overflow-hidden rounded-md border bg-card")}
      style={{ height }}
    />
  );
}
