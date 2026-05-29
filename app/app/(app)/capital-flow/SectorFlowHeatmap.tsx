"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Grid3x3, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCompactIDR } from "@/lib/utils/format";
import {
  TIERS,
  type SectorFlowResult,
  type Tier,
} from "@/lib/bandarmology/sector-flow";

/**
 * Sector Capital Flow Heatmap (sektor x tier market-cap).
 *
 * Visual: grid berwarna — hijau = inflow (uang masuk, harga naik), merah = outflow.
 * Intensitas warna mengikuti `cell.intensity` (-1..+1). Hover tooltip native (title).
 * Window switcher (5d / 20d) di header. Empty-state bila data kurang.
 */

interface Props {
  byWindow: Record<number, SectorFlowResult>;
  windows: number[];
}

const ROTATION_META: Record<
  SectorFlowResult["rotation"],
  { label: string; tone: string }
> = {
  to_small: { label: "Rotasi ke Small/Mid Cap", tone: "text-blue-700 dark:text-blue-300" },
  to_large: { label: "Flight to Safety (Large Cap)", tone: "text-orange-700 dark:text-orange-300" },
  broad_inflow: { label: "Broad Inflow", tone: "text-bull" },
  broad_outflow: { label: "Broad Outflow", tone: "text-bear" },
  mixed: { label: "Mixed / Sideways", tone: "text-muted-foreground" },
};

/**
 * Warna sel berdasarkan intensitas -1..+1.
 * Inflow (positif) -> bull green, outflow (negatif) -> bear red. Pakai inline style
 * dengan oklch + alpha agar gradasi halus & konsisten light/dark (token CSS).
 */
function cellStyle(intensity: number): React.CSSProperties {
  const mag = Math.min(1, Math.abs(intensity));
  // Alpha 0.08..0.85 supaya sel lemah tetap terlihat tapi tidak menyilaukan.
  const alpha = 0.08 + mag * 0.77;
  if (intensity > 0) {
    return { backgroundColor: `oklch(0.7 0.19 155 / ${alpha.toFixed(3)})` };
  }
  if (intensity < 0) {
    return { backgroundColor: `oklch(0.66 0.22 22 / ${alpha.toFixed(3)})` };
  }
  return { backgroundColor: "var(--color-muted)" };
}

function FlowIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight className="h-3 w-3" />;
  if (value < 0) return <ArrowDownRight className="h-3 w-3" />;
  return <Minus className="h-3 w-3 opacity-50" />;
}

export function SectorFlowHeatmap({ byWindow, windows }: Props) {
  const sortedWindows = [...windows].sort((a, b) => a - b);
  const [active, setActive] = useState<number>(sortedWindows[0] ?? 5);
  const result = byWindow[active];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3x3 className="h-4 w-4 text-primary" />
            Sector Activity Heatmap
          </CardTitle>
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
            {sortedWindows.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setActive(w)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  active === w
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {w}d
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!result || !result.hasData ? (
          <EmptyState />
        ) : (
          <HeatmapBody result={result} />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
      <Grid3x3 className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm font-medium">Data EOD belum cukup</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Heatmap aliran dana per sektor &times; tier market-cap akan muncul setelah data
        End-of-Day (harga &amp; nilai transaksi) ter-ingest untuk cukup banyak emiten.
      </p>
    </div>
  );
}

function HeatmapBody({ result }: { result: SectorFlowResult }) {
  const rotation = ROTATION_META[result.rotation];
  return (
    <div className="space-y-4">
      {/* Ringkasan rotasi */}
      <div className="rounded-md border border-border bg-card/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-sm font-semibold", rotation.tone)}>{rotation.label}</span>
          <span className="text-[10px] text-muted-foreground">
            {result.emitenCount} emiten
            {result.dateFrom && result.dateTo
              ? ` • ${result.dateFrom.slice(5)} → ${result.dateTo.slice(5)}`
              : ""}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{result.summary}</p>
      </div>

      {/* Net flow per tier */}
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((tier) => {
          const net = result.netFlowByTier[tier];
          const tone = net > 0 ? "text-bull" : net < 0 ? "text-bear" : "text-muted-foreground";
          return (
            <div key={tier} className="rounded-md border border-border p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {tier} Cap
              </div>
              <div className={cn("mt-1 flex items-center justify-center gap-1 font-mono text-sm font-bold", tone)}>
                <FlowIcon value={net} />
                {net >= 0 ? "+" : "-"}
                {formatCompactIDR(Math.abs(net))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap grid: sektor (rows) x tier (cols) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-40 px-2 py-1 text-left font-medium text-muted-foreground">Sektor</th>
              {TIERS.map((tier) => (
                <th key={tier} className="px-2 py-1 text-center font-medium text-muted-foreground">
                  {tier}
                </th>
              ))}
              <th className="px-2 py-1 text-right font-medium text-muted-foreground">Net</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.sectorKode}>
                <td className="max-w-40 truncate px-2 py-1 font-medium" title={row.sectorName}>
                  {row.sectorName}
                </td>
                {TIERS.map((tier) => {
                  const cell = row.cells[tier];
                  const tooltip = `${row.sectorName} • ${tier}: net ${cell.netFlowIdr >= 0 ? "+" : "-"}${formatCompactIDR(Math.abs(cell.netFlowIdr))} (${cell.count} emiten, turnover ${formatCompactIDR(cell.turnoverIdr)})`;
                  return (
                    <td key={tier} className="p-0">
                      <div
                        className="flex h-9 items-center justify-center rounded font-mono text-[10px] font-semibold tabular-nums text-foreground/90"
                        style={cellStyle(cell.intensity)}
                        title={tooltip}
                      >
                        {cell.count === 0
                          ? "—"
                          : `${cell.netFlowIdr >= 0 ? "+" : "-"}${formatCompactIDR(Math.abs(cell.netFlowIdr))}`}
                      </div>
                    </td>
                  );
                })}
                <td
                  className={cn(
                    "px-2 py-1 text-right font-mono font-bold tabular-nums",
                    row.sectorNetFlowIdr > 0
                      ? "text-bull"
                      : row.sectorNetFlowIdr < 0
                        ? "text-bear"
                        : "text-muted-foreground",
                  )}
                >
                  {row.sectorNetFlowIdr >= 0 ? "+" : "-"}
                  {formatCompactIDR(Math.abs(row.sectorNetFlowIdr))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Outflow</span>
          <div className="flex h-3 w-32 overflow-hidden rounded-sm">
            <div className="flex-1" style={{ backgroundColor: "oklch(0.66 0.22 22 / 0.85)" }} />
            <div className="flex-1" style={{ backgroundColor: "oklch(0.66 0.22 22 / 0.4)" }} />
            <div className="flex-1" style={{ backgroundColor: "var(--color-muted)" }} />
            <div className="flex-1" style={{ backgroundColor: "oklch(0.7 0.19 155 / 0.4)" }} />
            <div className="flex-1" style={{ backgroundColor: "oklch(0.7 0.19 155 / 0.85)" }} />
          </div>
          <span>Inflow</span>
        </div>
        {result.sparse ? (
          <span className="text-amber-600 dark:text-amber-400">Data tipis — indikatif</span>
        ) : null}
      </div>
    </div>
  );
}
