import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CancelButton } from "@/components/billing/cancel-button";
import { UsageBar } from "@/components/billing/usage-bar";
import { requireSession } from "@/lib/auth";
import {
  getActiveSubscription,
  getAllEntitlements,
  getAllUsage,
  getDailyWindowKey,
  listUserInvoices,
} from "@/lib/billing";
import { getConfig } from "@/lib/config";
import {
  counterKeys,
  COUNTER_LIMIT_MAP,
  DEFAULT_FREE_TIER_KODE,
  type CounterKey,
  type UsageSummaryItem,
} from "@/lib/types/billing";

/**
 * Manage subscription page (`/subscription/manage`).
 *
 * Server component. Tampilkan:
 *  - Current plan + status + period end + cancel-at-period-end flag
 *  - Usage bars (semua counter)
 *  - Invoice history
 *  - Cancel button (kalau bukan free)
 */
export const dynamic = "force-dynamic";

export default async function ManageSubscriptionPage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect("/login?next=/subscription/manage");
  }
  const userId = session.user.id;

  const [active, entitlements, usage, invoices, disclaimer] = await Promise.all([
    getActiveSubscription(userId),
    getAllEntitlements(userId),
    getAllUsage(userId),
    listUserInvoices(userId, 20),
    getConfig<string>("app.disclaimer_text"),
  ]);

  const windowKey = getDailyWindowKey();
  const usageList: UsageSummaryItem[] = counterKeys.map((key: CounterKey) => {
    const limitKey = COUNTER_LIMIT_MAP[key];
    const limitRaw = limitKey ? entitlements[limitKey] : null;
    const limit =
      typeof limitRaw === "number"
        ? limitRaw
        : typeof limitRaw === "boolean"
          ? limitRaw
            ? Number.MAX_SAFE_INTEGER
            : 0
          : null;
    const used = usage[key] ?? 0;
    const unlimited = limit === null || (typeof limit === "number" && limit >= 999_999);
    return {
      counterKey: key,
      windowKey,
      used,
      limit: unlimited ? null : limit,
      unlimited,
    };
  });

  const tier = active?.tier;
  const subscription = active?.subscription;
  const isFree = !tier || tier.kode === DEFAULT_FREE_TIER_KODE;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Kelola Paket</h1>
        <p className="text-muted-foreground">Status langganan, kuota, dan riwayat tagihan.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {tier?.nama ?? "Free"}
              </CardTitle>
              {tier?.tagline && <CardDescription>{tier.tagline}</CardDescription>}
            </div>
            <StatusBadge status={subscription?.status ?? "active"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status" value={subscription?.status ?? "active"} />
            <Field
              label="Siklus billing"
              value={subscription?.billingCycle === "annual" ? "Tahunan" : "Bulanan"}
            />
            <Field
              label="Periode aktif sejak"
              value={subscription?.startedAt ? formatDate(subscription.startedAt) : "-"}
            />
            <Field
              label="Berakhir pada"
              value={
                subscription?.currentPeriodEnd
                  ? formatDate(subscription.currentPeriodEnd)
                  : isFree
                    ? "Selamanya (gratis)"
                    : "-"
              }
            />
            {subscription?.cancelAtPeriodEnd && (
              <div className="col-span-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                Paket akan dibatalkan di akhir periode billing. Akses tetap berlaku sampai{" "}
                {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "akhir periode"}.
              </div>
            )}
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {!isFree ? (
              <CancelButton disabled={subscription?.cancelAtPeriodEnd === true} />
            ) : null}
            <Link href="/subscription">
              <Button>{isFree ? "Upgrade Paket" : "Lihat Semua Paket"}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penggunaan Hari Ini</CardTitle>
          <CardDescription>Reset setiap tengah malam WIB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageList.map((item) => (
            <UsageBar key={item.counterKey} item={item} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Tagihan</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tagihan.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{inv.invoiceNumber ?? inv.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(inv.issuedAt)} · {inv.tierKode} · {inv.billingCycle}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatIdr(inv.amountIdr)}</span>
                    <Badge variant="secondary">{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="border-t pt-6 text-center">
        <p className="text-xs text-muted-foreground">{disclaimer}</p>
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: "default" | "secondary" | "destructive" | "outline" =
    status === "active"
      ? "default"
      : status === "trialing"
        ? "secondary"
        : status === "past_due"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
