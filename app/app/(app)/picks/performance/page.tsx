import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { getPerformanceSnapshot } from "@/lib/picks/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PickDisclaimer } from "@/components/picks/PickDisclaimer";

export const dynamic = "force-dynamic";

export default async function PicksPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; eval?: string }>;
}) {
  const sp = await searchParams;
  const windowDays = Math.min(365, Math.max(7, Number(sp.window ?? 90)));
  const evaluation = (sp.eval ?? "T+5") as "T+1" | "T+5" | "T+20";

  const [perf, allTime] = await Promise.all([
    getPerformanceSnapshot({ windowDays, evaluation }),
    getPerformanceSnapshot({ windowDays: 3650, evaluation }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Track Record Daily Picks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hit rate, return realized, dan breakdown per setup type — dievaluasi otomatis di T+1, T+5, dan T+20 trading day setelah publish.
        </p>
      </div>

      {/* Hero: winrate total all-time (TP sebelum SL) */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Winrate Total ({evaluation}) — all-time
            </div>
            <div className="mt-1 font-mono tabular text-5xl font-bold text-primary">
              {(allTime.winRate * 100).toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              TP1 tercapai sebelum SL · {allTime.winCount}W / {allTime.lossCount}L
              {allTime.ambiguousCount > 0 ? ` · ${allTime.ambiguousCount} ambigu (dikecualikan)` : ""}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{allTime.decidedCount} pick decided</div>
            <div>{allTime.totalPicks} total published</div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <form className="flex flex-wrap gap-2 text-sm" method="get">
        <select name="window" defaultValue={String(windowDays)} className="h-9 rounded-md border border-input bg-background px-3">
          <option value="30">30 hari</option>
          <option value="90">90 hari</option>
          <option value="180">180 hari</option>
          <option value="365">1 tahun</option>
        </select>
        <select name="eval" defaultValue={evaluation} className="h-9 rounded-md border border-input bg-background px-3">
          <option value="T+1">Evaluasi T+1</option>
          <option value="T+5">Evaluasi T+5</option>
          <option value="T+20">Evaluasi T+20</option>
        </select>
        <button className="rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-110">
          Apply
        </button>
      </form>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Winrate ({windowDays}h)</div>
            <div className="mt-2 font-mono tabular text-3xl font-bold">
              {(perf.winRate * 100).toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {perf.winCount}W / {perf.lossCount}L · TP1 hit kasar {(perf.tp1HitRate * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg Return</div>
            <div className={`mt-2 font-mono tabular text-3xl font-bold ${perf.avgReturnPct >= 0 ? "text-bull" : "text-bear"}`}>
              {perf.avgReturnPct >= 0 ? "+" : ""}
              {(perf.avgReturnPct * 100).toFixed(2)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{evaluation} dari entry zone low</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg R/R Realized</div>
            <div className="mt-2 font-mono tabular text-3xl font-bold">
              {perf.avgRRRealized.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {perf.hitTp1Count} TP / {perf.hitSlCount} SL
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Picks</div>
            <div className="mt-2 font-mono tabular text-3xl font-bold">{perf.totalPicks}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              published dalam {windowDays} hari
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribusi Outcome ({evaluation})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <DistRow label="TP3 Hit" count={perf.hitTp3Count} total={perf.evaluatedPicks} color="text-bull" icon={Target} />
            <DistRow label="TP2 Hit" count={perf.hitTp2Count} total={perf.evaluatedPicks} color="text-bull" icon={Target} />
            <DistRow label="TP1 Hit" count={perf.hitTp1Count} total={perf.evaluatedPicks} color="text-bull" icon={TrendingUp} />
            <DistRow label="SL Hit" count={perf.hitSlCount} total={perf.evaluatedPicks} color="text-bear" icon={TrendingDown} />
            <DistRow label="Ambigu (TP & SL, urutan tak tentu)" count={perf.ambiguousCount} total={perf.evaluatedPicks} color="text-amber-500" icon={AlertTriangle} />
            <DistRow label="Expired (no resolution)" count={perf.expiredCount} total={perf.evaluatedPicks} color="text-muted-foreground" icon={AlertTriangle} />
          </div>
        </CardContent>
      </Card>

      {/* Breakdown per setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown per Setup Type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {perf.bySetup.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum cukup data untuk breakdown. Tunggu picks pertama selesai evaluasi.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Setup</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">TP1 Hit Rate</th>
                  <th className="px-4 py-2 text-right">Avg Return</th>
                </tr>
              </thead>
              <tbody>
                {perf.bySetup.map((s) => (
                  <tr key={s.setup} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 capitalize">{s.setup.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2 text-right font-mono">{s.total}</td>
                    <td className="px-4 py-2 text-right font-mono">{(s.tp1HitRate * 100).toFixed(1)}%</td>
                    <td className={`px-4 py-2 text-right font-mono ${s.avgReturnPct >= 0 ? "text-bull" : "text-bear"}`}>
                      {s.avgReturnPct >= 0 ? "+" : ""}{(s.avgReturnPct * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Catatan metodologi:</strong> <strong>Winrate</strong> = TP1 tercapai <em>sebelum</em> SL,
        dihitung atas pick yang <em>decided</em> (menang + kalah); kasus <em>ambigu</em> (TP1 &amp; SL
        dua-duanya tersentuh di window) dikecualikan dari winrate. Urutan TP vs SL di-resolve pakai
        seri intraday 5-menit; jika tak tersedia, pick ditandai ambigu (bukan otomatis menang).
        &ldquo;TP1 Hit Rate kasar&rdquo; menghitung semua sentuhan TP1 termasuk yang juga kena SL — sengaja
        ditampilkan agar selisihnya transparan. Return dihitung dari entry zone low (konservatif).
      </p>

      <footer className="border-t pt-4">
        <PickDisclaimer variant="footer" withLink />
      </footer>
    </div>
  );
}

function DistRow({
  label, count, total, color, icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {label}
        </span>
        <span className={`font-mono font-semibold ${color}`}>
          {count} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full ${color.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
