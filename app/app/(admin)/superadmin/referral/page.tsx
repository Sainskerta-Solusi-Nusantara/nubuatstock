import { Gift, Users, Coins, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getReferralAdminOverview,
  listTopReferrers,
  listRecentReferralActivity,
} from "@/lib/referral";

export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtDate = (d: Date) =>
  new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  qualified: "bg-amber-500/15 text-amber-600",
  rewarded: "bg-bull/15 text-bull",
};

export default async function SuperadminReferralPage() {
  const [overview, referrers, activity] = await Promise.all([
    getReferralAdminOverview(),
    listTopReferrers(100),
    listRecentReferralActivity(100),
  ]);

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Gift className="h-7 w-7 text-primary" />
          Program Referral
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau seluruh aktivitas referral: siapa mengajak siapa, Coin yang diberikan, dan
          yang sudah ditukar jadi langganan. Coin = Rp 1:1, hanya bisa ditukar langganan
          (tidak bisa dicairkan tunai).
        </p>
      </div>

      {/* Overview KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Total diundang" value={fmt(overview.totalReferred)} sub={`${fmt(overview.qualified)} qualified`} />
        <KpiCard icon={TrendingUp} label="Sudah di-reward" value={fmt(overview.rewarded)} sub={`${fmt(overview.totalCodes)} kode aktif`} />
        <KpiCard icon={Coins} label="Coin diberikan" value={fmt(overview.coinGranted)} sub="total sepanjang waktu" />
        <KpiCard icon={Coins} label="Coin beredar" value={fmt(overview.coinOutstanding)} sub={`${fmt(overview.coinRedeemed)} sudah ditukar`} />
      </div>

      {/* Leaderboard pengajak */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Leaderboard Pengajak</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2 text-right">Diundang</th>
                    <th className="px-3 py-2 text-right">Qualified</th>
                    <th className="px-3 py-2 text-right">Coin didapat</th>
                    <th className="px-3 py-2 text-right">Coin tersedia</th>
                  </tr>
                </thead>
                <tbody>
                  {referrers.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada pengajak.</td></tr>
                  ) : (
                    referrers.map((r) => (
                      <tr key={r.userId} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.code ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(r.totalReferred)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(r.qualified)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(r.coinEarned)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-amber-600">{fmt(r.coinAvailable)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Aktivitas terbaru */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Aktivitas Terbaru</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Pengajak</th>
                    <th className="px-3 py-2">Diundang</th>
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada aktivitas.</td></tr>
                  ) : (
                    activity.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-xs">{a.referrerEmail}</td>
                        <td className="px-3 py-2 text-xs">{a.referredEmail}</td>
                        <td className="px-3 py-2 font-mono text-xs">{a.code}</td>
                        <td className="px-3 py-2">
                          <Badge className={STATUS_BADGE[a.status] ?? "bg-muted text-muted-foreground"}>{a.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(a.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-bold">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
