import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { userSubscriptions, invoices, subscriptionTiers } from "@/db/schema/billing";
import { aiUsageLog } from "@/db/schema/ai";
import { dailyPicks } from "@/db/schema/picks";
import { auditLog } from "@/db/schema/audit";
import type { AdminOverview } from "@/lib/types/admin";

export const dynamic = "force-dynamic";

async function loadOverview(): Promise<AdminOverview> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayDateStr = startOfToday.toISOString().slice(0, 10);

  const [
    totalUsersRow,
    byTier,
    signupsTodayRow,
    paidInvoicesToday,
    paidAmountToday,
    activeSubsAgg,
    aiToday,
    picksTodayRow,
    recentAuditRows,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(users)
      .then((r) => r[0]),
    db
      .select({
        tierKode: userSubscriptions.tierKode,
        n: count(),
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, "active"))
      .groupBy(userSubscriptions.tierKode),
    db
      .select({ n: count() })
      .from(users)
      .where(gte(users.createdAt, startOfToday))
      .then((r) => r[0]),
    db
      .select({ n: count() })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, startOfToday)))
      .then((r) => r[0]),
    db
      .select({ s: sum(invoices.amountIdr) })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, startOfToday)))
      .then((r) => r[0]),
    db
      .select({
        tier: userSubscriptions.tierKode,
        cycle: userSubscriptions.billingCycle,
        n: count(),
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, "active"))
      .groupBy(userSubscriptions.tierKode, userSubscriptions.billingCycle),
    db
      .select({
        requests: sql<number>`coalesce(sum(${aiUsageLog.requestsCount}), 0)::int`,
        tIn: sql<number>`coalesce(sum(${aiUsageLog.tokensInputTotal}), 0)::int`,
        tOut: sql<number>`coalesce(sum(${aiUsageLog.tokensOutputTotal}), 0)::int`,
      })
      .from(aiUsageLog)
      .where(eq(aiUsageLog.date, todayDateStr))
      .then((r) => r[0]),
    db
      .select({ n: count() })
      .from(dailyPicks)
      .where(eq(dailyPicks.tradeDate, todayDateStr))
      .then((r) => r[0])
      .catch(() => ({ n: 0 })),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(10),
  ]);

  // MRR estimate: harga tier dari DB (subscription_tiers) × jumlah subscription aktif.
  const tierPrices = await db
    .select({
      kode: subscriptionTiers.kode,
      priceMonthlyIdr: subscriptionTiers.priceMonthlyIdr,
      priceAnnualIdr: subscriptionTiers.priceAnnualIdr,
    })
    .from(subscriptionTiers);
  const priceByTier = new Map<string, { monthly: number; annual: number }>();
  for (const row of tierPrices) {
    priceByTier.set(row.kode, {
      monthly: Number(row.priceMonthlyIdr ?? 0),
      annual: Number(row.priceAnnualIdr ?? 0),
    });
  }
  let mrr = 0;
  for (const r of activeSubsAgg) {
    const p = priceByTier.get(r.tier);
    if (!p) continue;
    const perMonth = r.cycle === "annual" ? p.annual / 12 : p.monthly;
    mrr += perMonth * Number(r.n);
  }

  return {
    users: {
      total: Number(totalUsersRow?.n ?? 0),
      byTier: byTier.map((r) => ({ tierKode: r.tierKode, count: Number(r.n) })),
      signupsToday: Number(signupsTodayRow?.n ?? 0),
    },
    revenue: {
      mrrEstimateIdr: Math.round(mrr),
      paidInvoicesToday: Number(paidInvoicesToday?.n ?? 0),
      paidAmountTodayIdr: Number(paidAmountToday?.s ?? 0),
    },
    ai: {
      requestsToday: Number(aiToday?.requests ?? 0),
      tokensInputToday: Number(aiToday?.tIn ?? 0),
      tokensOutputToday: Number(aiToday?.tOut ?? 0),
    },
    picks: {
      generatedToday: Number(picksTodayRow?.n ?? 0),
    },
    recentAudit: recentAuditRows.map((r) => ({
      id: r.id,
      actorUserId: r.actorUserId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

function fmtIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-neutral-500 mt-1">{hint}</div> : null}
    </div>
  );
}

export default async function AdminOverviewPage() {
  let overview: AdminOverview | null = null;
  let loadError: string | null = null;
  try {
    overview = await loadOverview();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Gagal memuat overview";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-neutral-500">Ringkasan metrik kunci untuk hari ini.</p>
      </header>

      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}

      {overview ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total User"
              value={overview.users.total.toLocaleString("id-ID")}
              hint={`+${overview.users.signupsToday} hari ini`}
            />
            <StatCard
              label="MRR Estimate"
              value={fmtIdr(overview.revenue.mrrEstimateIdr)}
              hint={`${overview.revenue.paidInvoicesToday} invoice paid hari ini`}
            />
            <StatCard
              label="AI Requests Hari Ini"
              value={overview.ai.requestsToday.toLocaleString("id-ID")}
              hint={`${(overview.ai.tokensInputToday + overview.ai.tokensOutputToday).toLocaleString("id-ID")} token total`}
            />
            <StatCard
              label="Picks Hari Ini"
              value={overview.picks.generatedToday.toLocaleString("id-ID")}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="font-semibold mb-3">Distribusi Tier</h2>
              <ul className="text-sm divide-y divide-neutral-100">
                {overview.users.byTier.length === 0 ? (
                  <li className="py-2 text-neutral-500">Belum ada subscription aktif.</li>
                ) : (
                  overview.users.byTier.map((row) => (
                    <li key={row.tierKode} className="py-2 flex justify-between">
                      <span className="capitalize">{row.tierKode}</span>
                      <span className="font-medium">{row.count.toLocaleString("id-ID")}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="font-semibold mb-3 flex items-center justify-between">
                Recent Audit Events
                <Link href="/admin/audit" className="text-xs text-neutral-500 hover:underline">
                  Lihat semua →
                </Link>
              </h2>
              <ul className="text-sm divide-y divide-neutral-100">
                {overview.recentAudit.length === 0 ? (
                  <li className="py-2 text-neutral-500">Belum ada event.</li>
                ) : (
                  overview.recentAudit.map((row) => (
                    <li key={row.id} className="py-2 flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{row.action}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {row.targetType ?? "-"} {row.targetId ? `· ${row.targetId}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("id-ID")}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
