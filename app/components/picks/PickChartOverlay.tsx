"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * PickChartOverlay — lightweight-charts integration.
 *
 * Render candlestick chart untuk OHLCV terakhir, overlay rectangle untuk entry
 * zone (low..high), garis horizontal untuk SL, TP1, TP2, TP3.
 *
 * Lightweight-charts di-load dinamis untuk hindari SSR penalty + supaya tetap
 * client-only. Empty state: kalau OHLCV kosong, render placeholder.
 *
 * NOTE: caller bertanggung jawab fetch OHLCV dari Agent 5 API. Kalau prop
 * `ohlcv` empty → render empty state. JANGAN buat dummy bar.
 */

export interface ChartBar {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PickChartOverlayProps {
  ohlcv: ChartBar[];
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  className?: string;
}

export function PickChartOverlay(props: PickChartOverlayProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let disposed = false;
    if (!ref.current || props.ohlcv.length === 0) return;
    const el = ref.current;

    (async () => {
      // Dynamic import — package dependency `lightweight-charts` ada di scaffold.
      const mod = await import("lightweight-charts").catch(() => null);
      if (!mod || disposed) return;
      const { createChart, CandlestickSeries, LineSeries } = mod as unknown as {
        createChart: (
          container: HTMLElement,
          options?: Record<string, unknown>,
        ) => {
          addSeries: (series: unknown, options?: Record<string, unknown>) => {
            setData: (d: unknown[]) => void;
            createPriceLine?: (opts: Record<string, unknown>) => unknown;
          };
          remove: () => void;
          timeScale: () => { fitContent: () => void };
        };
        CandlestickSeries: unknown;
        LineSeries: unknown;
      };

      const chart = createChart(el, {
        autoSize: true,
        layout: { background: { color: "transparent" }, textColor: "#888" },
        grid: { vertLines: { visible: false }, horzLines: { color: "rgba(128,128,128,0.1)" } },
        timeScale: { timeVisible: false, borderVisible: false },
        rightPriceScale: { borderVisible: false },
      });

      const candles = chart.addSeries(CandlestickSeries, {
        upColor: "#16a34a",
        downColor: "#dc2626",
        borderUpColor: "#16a34a",
        borderDownColor: "#dc2626",
        wickUpColor: "#16a34a",
        wickDownColor: "#dc2626",
      });
      candles.setData(props.ohlcv);

      const lines: { label: string; value: number; color: string }[] = [
        { label: "Entry Hi", value: props.entryZoneHigh, color: "#3b82f6" },
        { label: "Entry Lo", value: props.entryZoneLow, color: "#3b82f6" },
        { label: "SL", value: props.stopLoss, color: "#dc2626" },
        { label: "TP1", value: props.tp1, color: "#16a34a" },
      ];
      if (props.tp2 !== null) lines.push({ label: "TP2", value: props.tp2, color: "#16a34a" });
      if (props.tp3 !== null) lines.push({ label: "TP3", value: props.tp3, color: "#16a34a" });

      for (const ln of lines) {
        if (candles.createPriceLine) {
          candles.createPriceLine({
            price: ln.value,
            color: ln.color,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: ln.label,
          });
        } else {
          // Fallback: gunakan LineSeries dua titik
          const series = chart.addSeries(LineSeries, { color: ln.color, lineWidth: 1 });
          const first = props.ohlcv[0]!.time;
          const last = props.ohlcv.at(-1)!.time;
          series.setData([
            { time: first, value: ln.value },
            { time: last, value: ln.value },
          ]);
        }
      }

      chart.timeScale().fitContent();
      cleanupRef.current = () => {
        try {
          chart.remove();
        } catch {
          /* ignore */
        }
      };
    })();

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [
    props.ohlcv,
    props.entryZoneHigh,
    props.entryZoneLow,
    props.stopLoss,
    props.tp1,
    props.tp2,
    props.tp3,
  ]);

  if (props.ohlcv.length === 0) {
    return (
      <div
        className={cn(
          "flex h-64 w-full items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground",
          props.className,
        )}
      >
        Data harga belum tersedia. Worker EOD perlu run untuk emiten ini.
      </div>
    );
  }

  return <div ref={ref} className={cn("h-72 w-full", props.className)} />;
}
