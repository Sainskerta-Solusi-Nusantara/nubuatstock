"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { BillingCycle, TierWithEntitlements } from "@/lib/types/billing";

interface PricingCardProps {
  data: TierWithEntitlements;
  cycle: BillingCycle;
  currentTierKode?: string | null;
  onSubscribe?: (tierKode: string, cycle: BillingCycle) => Promise<void> | void;
}

/**
 * Pricing card untuk satu tier. Receives full tier+entitlements dari API.
 *
 * Tidak ada hardcode harga / fitur — semua dari props.
 */
export function PricingCard({ data, cycle, currentTierKode, onSubscribe }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const { tier, entitlements } = data;
  const price = cycle === "annual" ? tier.priceAnnualIdr : tier.priceMonthlyIdr;
  const isFree = price === 0;
  const isCurrent = currentTierKode === tier.kode;

  const handleClick = async () => {
    if (!onSubscribe || isCurrent || isFree) return;
    setLoading(true);
    try {
      await onSubscribe(tier.kode, cycle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        tier.badge && "border-primary shadow-lg",
      )}
    >
      {tier.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          {tier.badge}
        </Badge>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{tier.nama}</CardTitle>
        {tier.tagline && <CardDescription>{tier.tagline}</CardDescription>}
        <div className="mt-4">
          <span className="text-3xl font-bold">{formatIdr(price)}</span>
          {!isFree && (
            <span className="text-sm text-muted-foreground">
              {cycle === "annual" ? " / tahun" : " / bulan"}
            </span>
          )}
        </div>
        {tier.trialDays > 0 && !isCurrent && !isFree && (
          <p className="text-xs text-muted-foreground">Trial {tier.trialDays} hari gratis</p>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2">
          {tier.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-1 text-xs text-muted-foreground">
          <EntitlementLine entitlements={entitlements} keyName="ai.queries_per_day" label="AI Copilot" suffix=" query/hari" />
          <EntitlementLine entitlements={entitlements} keyName="watchlist.max_items" label="Watchlist" suffix=" ticker" />
          <EntitlementLine entitlements={entitlements} keyName="alerts.max_active" label="Alert aktif" suffix="" />
          <EntitlementLine entitlements={entitlements} keyName="picks.daily_visible" label="Daily Picks" suffix=" per hari" />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={tier.badge ? "default" : "outline"}
          onClick={handleClick}
          disabled={isCurrent || loading || (isFree && !currentTierKode)}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isCurrent ? "Paket Aktif" : tier.ctaLabel ?? "Pilih Paket"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function EntitlementLine({
  entitlements,
  keyName,
  label,
  suffix,
}: {
  entitlements: Record<string, unknown>;
  keyName: string;
  label: string;
  suffix: string;
}) {
  const raw = entitlements[keyName];
  if (raw === undefined || raw === null) return null;
  let display: string;
  if (typeof raw === "number") {
    display = raw >= 999_999 ? "Unlimited" : raw.toLocaleString("id-ID");
  } else if (typeof raw === "boolean") {
    display = raw ? "Ya" : "Tidak";
  } else {
    display = String(raw);
  }
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium text-foreground">
        {display}
        {typeof raw === "number" && raw < 999_999 ? suffix : ""}
      </span>
    </div>
  );
}

function formatIdr(amount: number): string {
  if (amount === 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
