import Link from "next/link";
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, AlertCircle, Sparkles, Target, Bell, FileText, Presentation, ArrowRight } from "lucide-react";
import {
  getGrowthSnapshot,
  getRevenueSnapshot,
  getTierBreakdown,
  getDailyGrowth,
  getSystemHealth,
  formatIdr,
} from "@/lib/superadmin/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrowthChart } from "@/components/superadmin/GrowthChart";

export const dynamic = "force-dynamic";

export default async function SuperadminOverviewPage() {
  const [growth, revenue, tiers, daily, system] = await Promise.all([
    getGrowthSnapshot(),
    getRevenueSnapshot(),
    getTierBreakdown(),
    getDailyGrowth(90),
    getSystemHealth(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin — Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot pertumbuhan, pendapatan, dan kesehatan sistem Nubuat.
        </p>
      </div>

      {/* ───── Featured: Pitchdeck (highlighted akses cepat) ───── */}
      <Link
        href="/superadmin/pitchdeck"
        className="group block overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-6 transition hover:border-primary/60 hover:shadow-md"
      >
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Presentation className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">Pitchdeck Internal</h2>
              <Badge className="bg-bull text-primary-foreground text-[10px]">NEW</Badge>
              <Badge variant="outline" className="text-[10px]">19 sections</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Arsitektur · Unique Value · Market TAM/SAM/SOM · OPEX 1K-1M user · Revenue Projection · Funding Strategy · Team Plan · Risk Register
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded bg-secondary px-2 py-0.5">Problem · Solution</span>
              <span className="rounded bg-secondary px-2 py-0.5">Why Now</span>
              <span className="rounded bg-secondary px-2 py-0.5">5 Personas</span>
              <span className="rounded bg-secondary px-2 py-0.5">Competitive Matrix</span>
              <span className="rounded bg-secondary px-2 py-0.5">Unit Economics</span>
              <span className="rounded bg-secondary px-2 py-0.5">Roadmap M0-M24</span>
            </div>
          </div>
          <div className="shrink-0 self-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-primary/20 pt-3 text-[11px] text-muted-foreground">
          <span><strong className="text-primary">Internal & investor only</strong> — jangan distribusi ke publik tanpa persetujuan.</span>
          <span className="ml-auto">Klik untuk buka · Print/Save PDF tersedia →</span>
        </div>
      </Link>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Users"
          value={growth.totalUsers.toLocaleString("id-ID")}
          delta={`+${growth.signupsLast7d} dalam 7 hari`}
          deltaPositive={growth.growthRate7d >= 0}
          icon={Users}
        />
        <KpiCard
          label="MRR"
          value={formatIdr(revenue.mrrIdr)}
          delta={`ARR ${formatIdr(revenue.arrIdr)}`}
          deltaPositive={revenue.newMrrLast30d >= revenue.churnedMrrLast30d}
          icon={DollarSign}
        />
        <KpiCard
          label="Paying Users"
          value={revenue.payingUsers.toLocaleString("id-ID")}
          delta={`${revenue.trialingUsers} trialing · ${revenue.freeUsers} free`}
          deltaPositive
          icon={Sparkles}
        />
        <KpiCard
          label="Active (7d)"
          value={growth.activeLast7d.toLocaleString("id-ID")}
          delta={`${growth.activeToday} hari ini`}
          deltaPositive={growth.activeToday > 0}
          icon={Activity}
        />
      </div>

      {/* Growth chart - simple SVG inline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-bull" />
            Pertumbuhan harian — 30 hari terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthChart points={daily} />
        </CardContent>
      </Card>

      {/* Tier breakdown + Revenue health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Breakdown per Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {tiers.length === 0 ? (
              <EmptyState>Belum ada subscription aktif.</EmptyState>
            ) : (
              <div className="space-y-3">
                {tiers.map((t) => {
                  const total = tiers.reduce((s, x) => s + x.userCount, 0) || 1;
                  const pct = (t.userCount / total) * 100;
                  return (
                    <div key={t.tierKode}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{t.tierKode}</span>
                        <span className="text-muted-foreground">
                          {t.userCount} user · {formatIdr(t.mrrContribution)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, pct)}%` }}
                          aria-valuenow={pct}
                          role="progressbar"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kesehatan Revenue 30 hari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RevenueStat label="New MRR" value={formatIdr(revenue.newMrrLast30d)} positive />
            <RevenueStat label="Churned MRR" value={formatIdr(revenue.churnedMrrLast30d)} positive={false} />
            <RevenueStat
              label="Net MRR Δ"
              value={formatIdr(revenue.newMrrLast30d - revenue.churnedMrrLast30d)}
              positive={revenue.newMrrLast30d >= revenue.churnedMrrLast30d}
            />
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoices paid MTD</span>
                <span className="font-mono tabular font-medium">
                  {revenue.invoicesPaidMtd} · {formatIdr(revenue.invoicesPaidMtdAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Kesehatan Sistem (24 jam)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SystemStat icon={Sparkles} label="AI Queries" value={system.aiQueriesLast24h.toLocaleString("id-ID")} sub={`Cost ${formatIdr(system.aiCostBurnLast24hIdr)}`} />
            <SystemStat icon={Target} label="Picks (7d)" value={system.picksGeneratedLast7d.toLocaleString("id-ID")} sub="dipublikasikan" />
            <SystemStat icon={Bell} label="Alerts Triggered" value={system.alertsTriggeredLast24h.toLocaleString("id-ID")} sub="24 jam" />
            <SystemStat icon={AlertCircle} label="Failed Logins" value={system.failedSignupsLast24h.toLocaleString("id-ID")} sub="24 jam" tone={system.failedSignupsLast24h > 50 ? "bear" : undefined} />
            <SystemStat icon={FileText} label="Conversion" value={`${revenue.payingUsers > 0 && growth.totalUsers > 0 ? ((revenue.payingUsers / growth.totalUsers) * 100).toFixed(1) : "0"}%`} sub="paying / total" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────── components ──────────────────── */

function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 font-mono tabular text-2xl font-bold">{value}</div>
        <div className={`mt-1 flex items-center gap-1 text-xs ${deltaPositive ? "text-bull" : "text-bear"}`}>
          {deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueStat({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular font-semibold ${positive ? "text-bull" : "text-bear"}`}>{value}</span>
    </div>
  );
}

function SystemStat({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: "bull" | "bear";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`mt-2 font-mono tabular text-xl font-bold ${tone === "bear" ? "text-bear" : tone === "bull" ? "text-bull" : ""}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Simple inline SVG chart untuk daily growth (no recharts dep). */
function DailyGrowthChart({ points }: { points: { date: string; signups: number; activated: number }[] }) {
  if (points.length === 0) {
    return <EmptyState>Belum ada data signup. Tunggu user pertama mendaftar.</EmptyState>;
  }

  const W = 800;
  const H = 200;
  const PAD = 20;
  const maxSignups = Math.max(1, ...points.map((p) => p.signups));
  const maxActive = Math.max(1, ...points.map((p) => p.activated));
  const max = Math.max(maxSignups, maxActive);
  const dx = (W - PAD * 2) / Math.max(1, points.length - 1);

  const signupsPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + i * dx} ${H - PAD - (p.signups / max) * (H - PAD * 2)}`)
    .join(" ");

  const activatedPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + i * dx} ${H - PAD - (p.activated / max) * (H - PAD * 2)}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" aria-label="Daily growth chart">
        <g stroke="currentColor" strokeOpacity="0.1" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={PAD} y1={PAD + (H - PAD * 2) * t} x2={W - PAD} y2={PAD + (H - PAD * 2) * t} />
          ))}
        </g>
        <path d={signupsPath} fill="none" stroke="oklch(0.72 0.17 160)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={activatedPath} fill="none" stroke="oklch(0.65 0.18 245)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
      </svg>
      <div className="flex justify-end gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-primary" /> Signups</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-b border-dashed border-blue-400" /> Active</span>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Max {max} per hari — total {points.reduce((s, p) => s + p.signups, 0)} signups dalam window
      </div>
    </div>
  );
}
