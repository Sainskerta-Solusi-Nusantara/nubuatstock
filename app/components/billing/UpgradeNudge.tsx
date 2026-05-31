import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { TIER_LABEL } from "@/lib/billing/nudge";
import type { TierKode } from "@/lib/types/billing";

/**
 * Upgrade nudge kontekstual (bukan paywall keras). Mengajak user pindah ke
 * tier yang lebih tinggi untuk membuka/melonggarkan sebuah fitur.
 *
 * Dua variant:
 * - `inline` (default): baris kecil, cocok di samping/di bawah kontrol fitur.
 * - `card`: kartu lebih menonjol untuk area kosong (mirip ProUpsell backtest).
 *
 * Komponen ini server-safe (tanpa "use client") — hanya render + Link.
 * Lapisan UI saja; tidak mengubah gating apa pun.
 */
interface UpgradeNudgeProps {
  /** Nama fitur yang sedang di-nudge, mis. "Backtest lanjutan". */
  feature: string;
  /** Tier minimum yang dibutuhkan fitur ini. */
  requiredTier: TierKode;
  /** Pesan kustom; kalau kosong dipakai kalimat default. */
  message?: string;
  variant?: "inline" | "card";
  className?: string;
}

export function UpgradeNudge({
  feature,
  requiredTier,
  message,
  variant = "inline",
  className,
}: UpgradeNudgeProps) {
  const tierLabel = TIER_LABEL[requiredTier] ?? requiredTier;
  const body = message ?? `Fitur ini lebih lengkap di tier ${tierLabel}.`;

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center",
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">{feature}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/subscription">Upgrade ke {tierLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{feature}</span> — {body}
      </p>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/subscription">
          Upgrade ke {tierLabel}
          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
