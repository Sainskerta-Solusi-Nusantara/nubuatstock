import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptionTiers, tierEntitlements } from "@/db/schema/billing";
import { PricingManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [tiers, entitlements] = await Promise.all([
    db.select().from(subscriptionTiers).orderBy(asc(subscriptionTiers.sortOrder)),
    db.select().from(tierEntitlements).orderBy(asc(tierEntitlements.entitlementKey)),
  ]);

  const byTier = new Map<string, typeof entitlements>();
  for (const e of entitlements) {
    const list = byTier.get(e.tierKode) ?? [];
    list.push(e);
    byTier.set(e.tierKode, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Pricing & Tiers</h1>
        <p className="text-sm text-neutral-500">
          Atur harga, fitur, dan quota per tier. Perubahan langsung berlaku — diff dikonfirmasi
          sebelum save.
        </p>
      </header>

      <PricingManager
        tiers={tiers.map((t) => ({
          kode: t.kode,
          nama: t.nama,
          tagline: t.tagline,
          priceMonthlyIdr: Number(t.priceMonthlyIdr),
          priceAnnualIdr: Number(t.priceAnnualIdr),
          trialDays: t.trialDays,
          isPublic: t.isPublic,
          isActive: t.isActive,
          sortOrder: t.sortOrder,
          features: t.features,
          badge: t.badge,
          ctaLabel: t.ctaLabel,
          entitlements: (byTier.get(t.kode) ?? []).map((e) => ({
            id: e.id,
            key: e.entitlementKey,
            value: e.entitlementValue,
            description: e.description,
          })),
        }))}
      />
    </div>
  );
}
