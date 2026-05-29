"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CycleToggle } from "./cycle-toggle";
import { PricingCard } from "./pricing-card";
import type { BillingCycle, TierWithEntitlements } from "@/lib/types/billing";

interface PricingGridProps {
  tiers: TierWithEntitlements[];
  currentTierKode: string | null;
}

export function PricingGrid({ tiers, currentTierKode }: PricingGridProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const router = useRouter();

  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.tier.sortOrder - b.tier.sortOrder),
    [tiers],
  );

  const handleSubscribe = async (tierKode: string, c: BillingCycle) => {
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Xendit = gateway aktif (Invoice API live). Midtrans masih stub.
        body: JSON.stringify({ tierKode, billingCycle: c, provider: "xendit" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const message = json?.error?.message ?? "Gagal memproses upgrade.";
        toast.error(message);
        return;
      }
      const data = json.data as { redirectUrl: string | null; invoiceId: string };
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.success("Invoice dibuat. Selesaikan pembayaran dari halaman billing.");
        router.push("/subscription/manage");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan. Coba lagi.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <CycleToggle value={cycle} onChange={setCycle} />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {sortedTiers.map((t) => (
          <PricingCard
            key={t.tier.kode}
            data={t}
            cycle={cycle}
            currentTierKode={currentTierKode}
            onSubscribe={handleSubscribe}
          />
        ))}
      </div>
    </div>
  );
}
