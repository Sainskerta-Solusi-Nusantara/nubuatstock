"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type MonteCarloResultDTO, type Distribution, fmtPct, fmtIdr } from "./types";

export function MonteCarloResult({ result }: { result: MonteCarloResultDTO }) {
  const popPositive = result.probabilityOfProfit >= 0.5;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Prob. Profit" value={`${(result.probabilityOfProfit * 100).toFixed(0)}%`} positive={popPositive} />
        <Kpi label="Median Return" value={fmtPct(result.finalReturnPct.p50)} positive={result.finalReturnPct.p50 >= 0} />
        <Kpi label="Median Max DD" value={fmtPct(result.maxDrawdownPct.p50)} positive={false} forceBear />
        <Kpi label="Risk DD > 20%" value={`${(result.probabilityDrawdownOver20 * 100).toFixed(0)}%`} positive={result.probabilityDrawdownOver20 < 0.2} invert />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Percentile Equity Bands</CardTitle></CardHeader>
        <CardContent>
          <PercentileBands result={result} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribusi Final Return</CardTitle></CardHeader>
          <CardContent>
            <DistTable dist={result.finalReturnPct} fmt={fmtPct} observed={result.observed.totalReturnPct} observedFmt={fmtPct} pct />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Distribusi Max Drawdown</CardTitle></CardHeader>
          <CardContent>
            <DistTable dist={result.maxDrawdownPct} fmt={fmtPct} observed={result.observed.maxDrawdownPct} observedFmt={fmtPct} pct />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Distribusi Final Equity</CardTitle></CardHeader>
        <CardContent>
          <DistTable dist={result.finalEquity} fmt={fmtIdr} observed={result.observed.finalEquity} observedFmt={fmtIdr} />
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Monte Carlo</strong> me-resample urutan {result.tradesPerIteration} trade dari backtest sebanyak {result.iterations.toLocaleString("id-ID")} kali untuk lihat seberapa besar hasil tergantung keberuntungan urutan trade. Spread lebar p5–p95 = hasil sangat sensitif ke urutan (kurang stabil). Bukan jaminan kinerja masa depan.
      </p>
    </div>
  );
}

function Kpi({ label, value, positive, forceBear, invert }: { label: string; value: string; positive: boolean; forceBear?: boolean; invert?: boolean }) {
  const good = invert ? positive : positive;
  const color = forceBear ? "text-bear" : good ? "text-bull" : "text-bear";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DistTable({
  dist,
  fmt,
  observed,
  observedFmt,
  pct,
}: {
  dist: Distribution;
  fmt: (n: number) => string;
  observed: number;
  observedFmt: (n: number) => string;
  pct?: boolean;
}) {
  const rows: { label: string; value: number; emph?: boolean }[] = [
    { label: "Worst (min)", value: dist.min },
    { label: "p5", value: dist.p5 },
    { label: "p25", value: dist.p25 },
    { label: "Median (p50)", value: dist.p50, emph: true },
    { label: "p75", value: dist.p75 },
    { label: "p95", value: dist.p95 },
    { label: "Best (max)", value: dist.max },
    { label: "Mean", value: dist.mean },
  ];
  return (
    <div className="space-y-2 text-sm">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border/60 last:border-0">
              <td className={`py-1.5 ${r.emph ? "font-semibold" : "text-muted-foreground"}`}>{r.label}</td>
              <td className={`py-1.5 text-right font-mono ${r.emph ? "font-semibold" : ""} ${pct ? (r.value >= 0 ? "text-bull" : "text-bear") : ""}`}>{fmt(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between rounded-md bg-secondary/40 px-2 py-1.5 text-[11px]">
        <span className="text-muted-foreground">Observed (backtest asli)</span>
        <span className={`font-mono font-semibold ${pct ? (observed >= 0 ? "text-bull" : "text-bear") : ""}`}>{observedFmt(observed)}</span>
      </div>
    </div>
  );
}

function PercentileBands({ result }: { result: MonteCarloResultDTO }) {
  const bands = result.percentileBands;
  if (bands.length < 2) return <div className="text-sm text-muted-foreground">Data tidak cukup untuk plot.</div>;
  const W = 800, H = 240, PAD = 28;
  const xs = bands.map((b) => b.tradeIndex);
  const maxX = Math.max(...xs) || 1;
  const allVals = bands.flatMap((b) => [b.p5, b.p50, b.p95]).concat([result.initialCapital]);
  const max = Math.max(...allVals);
  const min = Math.min(...allVals);
  const range = max - min || 1;
  const x = (i: number) => PAD + (xs[i]! / maxX) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const lineP = (key: "p5" | "p50" | "p95") =>
    bands.map((b, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(b[key])}`).join(" ");
  // Area antara p5 & p95.
  const areaTop = bands.map((b, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(b.p95)}`).join(" ");
  const areaBottom = bands
    .slice()
    .reverse()
    .map((b, i) => `${i === 0 ? "L" : "L"} ${x(bands.length - 1 - i)} ${y(b.p5)}`)
    .join(" ");
  const area = `${areaTop} ${areaBottom} Z`;
  const baseY = y(result.initialCapital);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full">
        <path d={area} fill="oklch(0.62 0.19 250)" fillOpacity="0.12" stroke="none" />
        <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
        <path d={lineP("p95")} fill="none" stroke="oklch(0.72 0.17 160)" strokeOpacity="0.7" strokeWidth="1.25" strokeDasharray="4 3" />
        <path d={lineP("p50")} fill="none" stroke="oklch(0.62 0.19 250)" strokeWidth="2" />
        <path d={lineP("p5")} fill="none" stroke="oklch(0.7 0.22 22)" strokeOpacity="0.7" strokeWidth="1.25" strokeDasharray="4 3" />
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>trade 0</span>
        <div className="flex items-center gap-3">
          <Legend color="oklch(0.72 0.17 160)" label="p95" />
          <Legend color="oklch(0.62 0.19 250)" label="median" />
          <Legend color="oklch(0.7 0.22 22)" label="p5" />
        </div>
        <span>trade {maxX}</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
