import { Banknote, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCapitalFlowSummary } from "@/lib/capital-flow/service";
import { getSectorFlow } from "@/lib/bandarmology/sector-flow-service";
import { formatCompactIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { SectorFlowHeatmap } from "./SectorFlowHeatmap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Capital Flow — Nubuat",
  description: "Visualisasi flow modal antar bucket market cap (Mega/Large/Mid/Small) untuk deteksi rotasi gaya investor.",
};

const TREND_META = {
  risk_on: { label: "Risk-On Broad Rally", color: "text-bull", bg: "bg-bull-soft", description: "Mega + Small naik bareng — investor confident, broad market participation." },
  risk_off: { label: "Risk-Off Selloff", color: "text-bear", bg: "bg-bear-soft", description: "Semua bucket turun — broad sell-off, defensive mode." },
  rotation_to_small: { label: "Rotation to Small Cap", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/15", description: "Small cap outperform — retail-driven momentum, late-cycle behavior." },
  rotation_to_large: { label: "Rotation to Large Cap", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500/15", description: "Flight to safety — investor pindah ke large cap defensive." },
  mixed: { label: "Mixed / Sideways", color: "text-muted-foreground", bg: "bg-muted", description: "Tidak ada trend rotasi yang jelas — pasar campuran." },
} as const;

const BUCKET_COLORS = {
  Mega: "#2563eb", // blue
  Large: "#16a34a", // green
  Mid: "#f59e0b", // orange
  Small: "#dc2626", // red
} as const;

export default async function CapitalFlowPage() {
  const [summary, sectorFlow] = await Promise.all([
    getCapitalFlowSummary(30),
    getSectorFlow([5, 20]),
  ]);
  const trendMeta = TREND_META[summary.trend];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Capital Flow Heatmap</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Track flow modal antar bucket market cap (Mega / Large / Mid / Small) untuk deteksi rotasi gaya
          investor. Mega cap = &gt; Rp100T, Large = Rp10-100T, Mid = Rp1-10T, Small = &lt; Rp1T.
        </p>
      </header>

      {/* Current trend */}
      <Card className={cn("border", trendMeta.bg.replace("-soft", "/40").replace("/15", "/40"))}>
        <CardHeader className="pb-2">
          <CardTitle className={cn("flex items-center justify-between text-base", trendMeta.color)}>
            <span>Current Trend: {trendMeta.label}</span>
            <span className="text-[10px] font-normal">Leader: {summary.currentLeader} cap</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-sm", trendMeta.color, "opacity-90")}>{trendMeta.description}</p>
        </CardContent>
      </Card>

      {/* Bucket summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["Mega", "Large", "Mid", "Small"] as const).map((b) => {
          const ret = summary.cumulativeReturns[b];
          const tone = ret > 0 ? "text-bull" : ret < 0 ? "text-bear" : "text-muted-foreground";
          return (
            <Card key={b}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{b} Cap</span>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BUCKET_COLORS[b] }} />
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cum return 30d
                </div>
                <div className={cn("font-mono text-2xl font-bold", tone)}>
                  {ret >= 0 ? "+" : ""}
                  {ret.toFixed(2)}%
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <div className="text-muted-foreground">Emiten</div>
                    <div className="font-mono font-semibold">{summary.totalEmitenByBucket[b]}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total MC</div>
                    <div className="font-mono font-semibold">{formatCompactIDR(summary.totalMcByBucket[b])}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sector x Tier heatmap — aliran dana antar sektor & market-cap (NeoBDM Sector Activity) */}
      <SectorFlowHeatmap byWindow={sectorFlow.byWindow} windows={sectorFlow.windows} />

      {/* Stacked area / column chart untuk daily flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Flow Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <BucketFlowChart series={summary.series} />
          </div>
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Cara baca:</strong> Daily flow chart tampilkan weighted return per bucket per hari (weighted
        by transaction value). Positif berarti modal masuk net + harga naik. Bandingkan magnitude antar
        bucket untuk identifikasi rotasi. <strong>Risk-on</strong> = investor confident (semua naik).
        <strong> Rotation to Small</strong> = retail-driven momentum, often late-cycle.
        <strong> Flight to Safety</strong> = Large cap outperform, defensive mode.
      </p>
    </div>
  );
}

interface FlowChartProps {
  series: Awaited<ReturnType<typeof getCapitalFlowSummary>>["series"];
}

function BucketFlowChart({ series }: FlowChartProps) {
  if (series.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">Data flow belum cukup.</p>;
  }

  const WIDTH = 720;
  const HEIGHT = 280;
  const PADDING = 28;
  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;

  // Compute max abs return across all bars to scale Y
  const allReturns = series.flatMap((p) =>
    (["Mega", "Large", "Mid", "Small"] as const).map((b) => p.buckets[b].weightedReturn),
  );
  const maxAbs = Math.max(0.5, ...allReturns.map(Math.abs));
  const colW = innerW / series.length / 5; // 4 bars per day + spacing

  const yScale = (v: number) => PADDING + innerH / 2 - (v / maxAbs) * (innerH / 2);
  const xCenter = (i: number) => PADDING + (i * innerW) / series.length + innerW / series.length / 2;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-3xl mx-auto block">
      {/* Center line at 0 */}
      <line
        x1={PADDING}
        y1={PADDING + innerH / 2}
        x2={WIDTH - PADDING}
        y2={PADDING + innerH / 2}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.3}
      />
      {/* Y-axis labels */}
      <text x={PADDING - 4} y={PADDING + innerH / 2} textAnchor="end" alignmentBaseline="middle" fontSize="9" opacity={0.5} fill="currentColor">0%</text>
      <text x={PADDING - 4} y={PADDING + 8} textAnchor="end" fontSize="9" opacity={0.5} fill="currentColor">+{maxAbs.toFixed(1)}%</text>
      <text x={PADDING - 4} y={PADDING + innerH - 4} textAnchor="end" fontSize="9" opacity={0.5} fill="currentColor">-{maxAbs.toFixed(1)}%</text>

      {/* Bars: 4 buckets per day */}
      {series.map((p, i) => {
        const cx = xCenter(i);
        return (
          <g key={p.date}>
            {(["Mega", "Large", "Mid", "Small"] as const).map((b, j) => {
              const ret = p.buckets[b].weightedReturn;
              const barX = cx - colW * 2 + j * colW;
              const barTop = ret >= 0 ? yScale(ret) : yScale(0);
              const barH = Math.abs(yScale(ret) - yScale(0));
              return (
                <rect
                  key={b}
                  x={barX}
                  y={barTop}
                  width={colW - 0.5}
                  height={Math.max(barH, 0.5)}
                  fill={BUCKET_COLORS[b]}
                  opacity={0.7}
                >
                  <title>{p.date} • {b}: {ret.toFixed(2)}%</title>
                </rect>
              );
            })}
          </g>
        );
      })}

      {/* X-axis labels every 5 days */}
      {series.map((p, i) => {
        if (i % 5 !== 0) return null;
        return (
          <text
            key={p.date}
            x={xCenter(i)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="9"
            opacity={0.6}
            fill="currentColor"
          >
            {p.date.slice(5)}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${WIDTH - 240}, ${PADDING - 14})`}>
        {(["Mega", "Large", "Mid", "Small"] as const).map((b, i) => (
          <g key={b} transform={`translate(${i * 56}, 0)`}>
            <rect x={0} y={0} width={8} height={8} fill={BUCKET_COLORS[b]} />
            <text x={11} y={7} fontSize="9" fill="currentColor">{b}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
