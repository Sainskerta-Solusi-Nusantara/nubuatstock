import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { getPerformanceSnapshot } from "@/lib/picks/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PicksPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; eval?: string }>;
}) {
  const sp = await searchParams;
  const windowDays = Math.min(365, Math.max(7, Number(sp.window ?? 90)));
  const evaluation = (sp.eval ?? "T+5") as "T+1" | "T+5" | "T+20";

  const perf = await getPerformanceSnapshot({ windowDays, evaluation });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Track Record Daily Picks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hit rate, return realized, dan breakdown per setup type — dievaluasi otomatis di T+1, T+5, dan T+20 trading day setelah publish.
        </p>
      </div>

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
            <div className="text-xs uppercase tracking-wider text-muted-foreground">TP1 Hit Rate</div>
            <div className="mt-2 font-mono tabular text-3xl font-bold">
              {(perf.tp1HitRate * 100).toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {perf.hitTp1Count} dari {perf.evaluatedPicks} pick evaluated
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
            <table className="w-full text-sm">
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
          )}
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Catatan metodologi:</strong> Return dihitung dari entry zone low (asumsi konservatif).
        Hit TP/SL berdasarkan high/low EoD di window — tidak akurat untuk intraday wick.
        Untuk MVP: approximation OK; akan migrate ke evaluasi intraday-tick saat data L1 tersedia.
      </p>
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
