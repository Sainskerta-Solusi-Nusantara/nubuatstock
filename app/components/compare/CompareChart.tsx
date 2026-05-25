"use client";

import * as React from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { CompareTickerData } from "@/lib/compare/service";

interface CompareChartProps {
  data: CompareTickerData[];
}

const PALETTE = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#ea580c", // orange
];

/**
 * Normalize prices: each ticker's series starts at 100 (% performance from period start).
 * Memungkinkan apple-to-apple comparison meski harga absolut beda.
 */
function normalize(series: Array<{ date: string; close: number }>): Array<{ time: number; value: number }> {
  if (series.length === 0) return [];
  const base = series[0]!.close;
  if (base === 0) return [];
  return series.map((p) => ({
    time: Math.floor(new Date(p.date).getTime() / 1000),
    value: (p.close / base) * 100,
  }));
}

export function CompareChart({ data }: CompareChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 360,
      layout: {
        background: { color: "transparent" },
        textColor: "rgb(148, 163, 184)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.1)" },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
      },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const seriesList: ISeriesApi<"Line">[] = [];
    data.forEach((d, idx) => {
      if (!d.found || d.priceSeries.length === 0) return;
      const series = chart.addLineSeries({
        color: PALETTE[idx % PALETTE.length],
        lineWidth: 2,
        title: d.kode,
      });
      series.setData(normalize(d.priceSeries) as never);
      seriesList.push(series);
    });

    const onResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);
    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div>
      <div ref={containerRef} className="h-[360px] w-full" />
      <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
        {data
          .filter((d) => d.found)
          .map((d, idx) => (
            <span key={d.kode} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-3 rounded-sm"
                style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
              />
              <span className="font-mono font-semibold">{d.kode}</span>
              <span className="text-muted-foreground">
                {d.changePct30d != null ? `(${d.changePct30d >= 0 ? "+" : ""}${d.changePct30d.toFixed(1)}% 30d)` : ""}
              </span>
            </span>
          ))}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground italic">
        Harga di-normalisasi ke 100 di awal periode untuk perbandingan % performance.
      </p>
    </div>
  );
}
