import { PricingGrid } from "@/components/billing/pricing-grid";
import { getConfig } from "@/lib/config";
import { getActiveSubscription, listPublicTiers } from "@/lib/billing";
import { getSession } from "@/lib/auth";

/**
 * Pricing page (`/subscription`).
 *
 * Server component: fetch tier list + entitlements + disclaimer dari DB.
 * Client subkomponen `PricingGrid` handle cycle toggle & checkout.
 */
export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const [tiers, disclaimer, session] = await Promise.all([
    listPublicTiers(),
    getConfig<string>("app.disclaimer_text"),
    getSession(),
  ]);

  let currentTierKode: string | null = null;
  if (session) {
    const active = await getActiveSubscription(session.user.id);
    currentTierKode = active?.subscription.tierKode ?? null;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center sm:mb-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Pilih Paket Nubuat</h1>
        <p className="mt-4 text-muted-foreground">
          Mulai gratis, upgrade kapan saja. Semua paket dapat dibatalkan kapan saja.
        </p>
      </header>

      {tiers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Belum ada paket yang dikonfigurasi. Admin perlu menjalankan seed atau
            menambah paket di{" "}
            <a className="font-medium text-primary underline" href="/admin/billing">
              /admin/billing
            </a>
            .
          </p>
        </div>
      ) : (
        <PricingGrid tiers={tiers} currentTierKode={currentTierKode} />
      )}

      <footer className="mx-auto mt-16 max-w-3xl border-t pt-8 text-center">
        <p className="text-xs text-muted-foreground">{disclaimer}</p>
      </footer>
    </div>
  );
}
