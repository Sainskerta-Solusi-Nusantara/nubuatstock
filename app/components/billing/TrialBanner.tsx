"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Banner trial: "Trial Pro kamu tinggal N hari" + CTA upgrade.
 *
 * Pemanggil (server component) menghitung apakah user sedang trial dan tanggal
 * akhirnya, lalu mengoper ke sini. Kalau bukan trial, jangan render komponen
 * ini sama sekali (props `trialEndsAt` cukup di-cek lebih dulu via helper
 * `getTrialDaysLeft`).
 *
 * Dismissable per hari: setelah ditutup, tidak muncul lagi sampai ganti hari
 * (disimpan di localStorage). Hanya lapisan UI — tidak menyentuh gating.
 */
interface TrialBannerProps {
  /** ISO string akhir trial (currentPeriodEnd / trialEndsAt). */
  trialEndsAt: string;
  /** Nama tier yang sedang di-trial, untuk copy. Default "Pro". */
  tierLabel?: string;
  className?: string;
}

const DISMISS_KEY = "nubuat:trial-banner-dismissed";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Hitung sisa hari trial (dibulatkan ke atas). <= 0 berarti sudah lewat.
 * Util murni — boleh dipakai server untuk memutuskan render banner.
 */
export function getTrialDaysLeft(trialEndsAt: Date | string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const end = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const ms = end.getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export function TrialBanner({ trialEndsAt, tierLabel = "Pro", className }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DISMISS_KEY);
      setDismissed(stored === todayKey());
    } catch {
      setDismissed(false);
    }
  }, []);

  const daysLeft = getTrialDaysLeft(trialEndsAt);
  if (daysLeft <= 0 || dismissed) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, todayKey());
    } catch {
      /* localStorage unavailable — abaikan, banner cukup hilang sesi ini */
    }
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3",
        className,
      )}
    >
      <Sparkles className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">Trial {tierLabel} kamu tinggal {daysLeft} hari.</span>{" "}
        <span className="text-muted-foreground">
          Lanjutkan sekarang biar fitur premium tetap aktif tanpa terputus.
        </span>
      </p>
      <Button asChild size="sm" className="shrink-0">
        <Link href="/subscription">Upgrade sekarang</Link>
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup banner trial"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
