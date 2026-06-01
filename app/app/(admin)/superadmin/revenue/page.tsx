import { DollarSign, TrendingUp, TrendingDown, Sparkles, Users } from "lucide-react";
import {
  getRevenueSnapshot,
  getTierBreakdown,
  formatIdr,
} from "@/lib/superadmin/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [revenue, tiers] = await Promise.all([
    getRevenueSnapshot(),
    getTierBreakdown(),
  ]);

  const netMrr = revenue.newMrrLast30d - revenue.churnedMrrLast30d;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue &amp; MRR</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pendapatan berulang (MRR/ARR), kesehatan revenue, dan kontribusi per tier.
        </p>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="MRR" value={formatIdr(revenue.mrrIdr)} delta={`ARR ${formatIdr(revenue.arrIdr)}`} positive icon={DollarSign} />
        <Kpi label="Paying Users" value={revenue.payingUsers.toLocaleString("id-ID")} delta={`${revenue.trialingUsers} trial · ${revenue.freeUsers} free`} positive icon={Sparkles} />
        <Kpi label="New MRR (30d)" value={formatIdr(revenue.newMrrLast30d)} delta={`Churn ${formatIdr(revenue.churnedMrrLast30d)}`} positive={netMrr >= 0} icon={Users} />
        <Kpi label="Net MRR Δ (30d)" value={formatIdr(netMrr)} delta={netMrr >= 0 ? "tumbuh" : "menyusut"} positive={netMrr >= 0} icon={netMrr >= 0 ? TrendingUp : TrendingDown} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tier breakdown */}
        <Card>
          <CardHeader><CardTitle>Kontribusi per Tier</CardTitle></CardHeader>
          <CardContent>
            {tiers.length === 0 ? (
              <Empty>Belum ada subscription aktif.</Empty>
            ) : (
              <div className="space-y-3">
                {tiers.map((t) => {
                  const totalMrr = tiers.reduce((s, x) => s + x.mrrContribution, 0) || 1;
                  const pct = (t.mrrContribution / totalMrr) * 100;
                  return (
                    <div key={t.tierKode}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{t.tierKode}</span>
                        <span className="text-muted-foreground">{t.userCount} user · {formatIdr(t.mrrContribution)}</span>
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

        {/* Revenue health */}
        <Card>
          <CardHeader><CardTitle>Kesehatan Revenue 30 hari</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Row label="New MRR" value={formatIdr(revenue.newMrrLast30d)} positive />
            <Row label="Churned MRR" value={formatIdr(revenue.churnedMrrLast30d)} positive={false} />
            <Row label="Net MRR Δ" value={formatIdr(netMrr)} positive={netMrr >= 0} />
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoices paid MTD</span>
                <span className="font-mono font-medium tabular-nums">
                  {revenue.invoicesPaidMtd} · {formatIdr(revenue.invoicesPaidMtdAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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

function Row({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${positive ? "text-bull" : "text-bear"}`}>{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
