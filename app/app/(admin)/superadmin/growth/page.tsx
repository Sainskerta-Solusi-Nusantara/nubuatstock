import { TrendingUp, TrendingDown, Users, Activity, UserPlus } from "lucide-react";
import {
  getGrowthSnapshot,
  getDailyGrowth,
  getTierBreakdown,
  formatIdr,
} from "@/lib/superadmin/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SuperadminGrowthPage() {
  const [growth, daily, tiers] = await Promise.all([
    getGrowthSnapshot(),
    getDailyGrowth(30),
    getTierBreakdown(),
  ]);

  const retention7d =
    growth.totalUsers > 0 ? (growth.activeLast7d / growth.totalUsers) * 100 : 0;
  const retention30d =
    growth.totalUsers > 0 ? (growth.activeLast30d / growth.totalUsers) * 100 : 0;
  const stickiness =
    growth.activeLast30d > 0 ? (growth.activeToday / growth.activeLast30d) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Growth &amp; Retention</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pertumbuhan user, keaktifan, dan retensi Nubuat.
        </p>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total Users"
          value={growth.totalUsers.toLocaleString("id-ID")}
          delta={`+${growth.signupsLast30d} dalam 30 hari`}
          positive={growth.growthRate7d >= 0}
          icon={Users}
        />
        <Kpi
          label="Signups (7d)"
          value={growth.signupsLast7d.toLocaleString("id-ID")}
          delta={`${(growth.growthRate7d * 100).toFixed(0)}% vs rata-rata`}
          positive={growth.growthRate7d >= 0}
          icon={UserPlus}
        />
        <Kpi
          label="Active (7d)"
          value={growth.activeLast7d.toLocaleString("id-ID")}
          delta={`${growth.activeToday} aktif hari ini`}
          positive={growth.activeToday > 0}
          icon={Activity}
        />
        <Kpi
          label="Retensi 7d"
          value={`${retention7d.toFixed(1)}%`}
          delta={`30d: ${retention30d.toFixed(1)}%`}
          positive={retention7d >= 20}
          icon={TrendingUp}
        />
      </div>

      {/* Daily growth chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-bull" />
            Signup harian — 30 hari terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyChart points={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement / stickiness */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Bar label="Aktif hari ini (DAU)" value={growth.activeToday} max={growth.totalUsers} />
            <Bar label="Aktif 7 hari (WAU)" value={growth.activeLast7d} max={growth.totalUsers} />
            <Bar label="Aktif 30 hari (MAU)" value={growth.activeLast30d} max={growth.totalUsers} />
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Stickiness (DAU/MAU)</span>
              <span className="font-mono font-semibold">{stickiness.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Tier breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown per Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {tiers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Belum ada subscription aktif.
              </p>
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
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ──────────────── components ──────────────── */

function Kpi({
  label, value, delta, positive, icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 font-mono text-2xl font-bold tabular-nums">{value}</div>
        <div className={`mt-1 flex items-center gap-1 text-xs ${positive ? "text-bull" : "text-bear"}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums">{value.toLocaleString("id-ID")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function DailyChart({ points }: { points: { date: string; signups: number }[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Belum ada data signup. Tunggu user pertama mendaftar.
      </div>
    );
  }
  const W = 800;
  const H = 200;
  const PAD = 20;
  const max = Math.max(1, ...points.map((p) => p.signups));
  const dx = (W - PAD * 2) / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + i * dx} ${H - PAD - (p.signups / max) * (H - PAD * 2)}`)
    .join(" ");
  const total = points.reduce((s, p) => s + p.signups, 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" aria-label="Signup harian">
        <g stroke="currentColor" strokeOpacity="0.1" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={PAD} y1={PAD + (H - PAD * 2) * t} x2={W - PAD} y2={PAD + (H - PAD * 2) * t} />
          ))}
        </g>
        <path d={path} fill="none" stroke="oklch(0.72 0.17 160)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Max {max}/hari · total {total} signup dalam 30 hari
      </div>
    </div>
  );
}
