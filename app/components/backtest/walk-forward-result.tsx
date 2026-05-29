"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type WalkForwardResultDTO, type AdvEquityPoint, fmtPct, fmtIdr } from "./types";

const VERDICT_META: Record<WalkForwardResultDTO["robustness"]["verdict"], { label: string; cls: string; desc: string }> = {
  robust: { label: "Robust", cls: "border-bull/40 bg-bull-soft text-bull", desc: "Konsisten profit di mayoritas window out-of-sample." },
  mixed: { label: "Mixed", cls: "border-amber-500/40 bg-amber-500/10 text-amber-500", desc: "Hasil campur — beberapa periode rugi. Hati-hati." },
  fragile: { label: "Fragile", cls: "border-bear/40 bg-bear-soft text-bear", desc: "Mayoritas window OOS rugi — indikasi overfit / tidak robust." },
};

export function WalkForwardResult({ result }: { result: WalkForwardResultDTO }) {
  const v = VERDICT_META[result.robustness.verdict];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="OOS Total Return" value={fmtPct(result.combinedOos.totalReturnPct)} positive={result.combinedOos.totalReturnPct >= 0} />
        <Kpi label="OOS Sharpe" value={result.combinedOos.sharpeRatio.toFixed(2)} positive={result.combinedOos.sharpeRatio >= 1} />
        <Kpi label="OOS Max DD" value={fmtPct(result.combinedOos.maxDrawdownPct)} positive={false} forceBear />
        <Kpi label="Konsistensi" value={`${result.robustness.profitableWindows}/${result.windows}`} positive={result.robustness.consistencyPct >= 0.5} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Verdict Robustness</CardTitle>
          <Badge variant="outline" className={v.cls}>{v.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">{v.desc}</p>
          <p className="text-xs text-muted-foreground">
            {result.windows} window · train ratio {(result.trainRatio * 100).toFixed(0)}% · avg degradasi test-vs-train{" "}
            <span className={result.robustness.avgDegradationPct >= 0 ? "text-bull" : "text-bear"}>{fmtPct(result.robustness.avgDegradationPct)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Combined Out-of-Sample Equity</CardTitle></CardHeader>
        <CardContent>
          <MiniEquity curve={result.combinedOos.equityCurve} initialCapital={result.combinedOos.initialCapital} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-Window Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="sticky top-0 border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5">#</th>
                  <th className="px-3 py-1.5">Train range</th>
                  <th className="px-3 py-1.5">Test range (OOS)</th>
                  <th className="px-3 py-1.5 text-right">Train ret</th>
                  <th className="px-3 py-1.5 text-right">OOS ret</th>
                  <th className="px-3 py-1.5 text-right">OOS Sharpe</th>
                  <th className="px-3 py-1.5 text-right">OOS MaxDD</th>
                  <th className="px-3 py-1.5 text-right">OOS trades</th>
                </tr>
              </thead>
              <tbody>
                {result.perWindow.map((w) => (
                  <tr key={w.index} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-mono">{w.index}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{w.trainStart} → {w.trainEnd}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{w.testStart} → {w.testEnd}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${w.train.totalReturnPct >= 0 ? "text-bull" : "text-bear"}`}>{fmtPct(w.train.totalReturnPct)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${w.test.totalReturnPct >= 0 ? "text-bull" : "text-bear"}`}>{fmtPct(w.test.totalReturnPct)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{w.test.sharpeRatio.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-bear">{fmtPct(w.test.maxDrawdownPct)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{w.test.totalTrades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Walk-Forward</strong> menguji apakah strategi tahan di berbagai fase market, bukan cuma cocok di satu periode (overfit). Fokus ke kolom <strong>OOS</strong> (out-of-sample): kalau OOS return positif konsisten antar window, strategi lebih bisa dipercaya. Tetap bukan jaminan kinerja masa depan.
      </p>
    </div>
  );
}

function Kpi({ label, value, positive, forceBear }: { label: string; value: string; positive: boolean; forceBear?: boolean }) {
  const color = forceBear ? "text-bear" : positive ? "text-bull" : "text-bear";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function MiniEquity({ curve, initialCapital }: { curve: AdvEquityPoint[]; initialCapital: number }) {
  if (curve.length < 2) return <div className="text-sm text-muted-foreground">Data OOS tidak cukup untuk plot.</div>;
  const W = 800, H = 220, PAD = 24;
  const max = Math.max(...curve.map((p) => p.equity), initialCapital);
  const min = Math.min(...curve.map((p) => p.equity), initialCapital);
  const range = max - min || 1;
  const dx = (W - PAD * 2) / Math.max(1, curve.length - 1);
  const path = curve.map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + i * dx} ${H - PAD - ((p.equity - min) / range) * (H - PAD * 2)}`).join(" ");
  const baseY = H - PAD - ((initialCapital - min) / range) * (H - PAD * 2);
  const last = curve[curve.length - 1]!;
  const isUp = last.equity >= initialCapital;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full">
        <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke={isUp ? "oklch(0.72 0.17 160)" : "oklch(0.7 0.22 22)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{curve[0]!.date}</span>
        <span>Baseline: {fmtIdr(initialCapital)}</span>
        <span>{curve[curve.length - 1]!.date}</span>
      </div>
    </div>
  );
}
