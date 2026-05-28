"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { readConsent, writeConsent } from "@/components/consent/cookie-consent";

/**
 * Cookie Consent Banner — IMPROVEMENT_PLAN.md §8.7 item #47.
 *
 * Banner muncul di bawah layar pada kunjungan pertama (sebelum user memilih).
 * Pilihan disimpan di localStorage (`nubuat_cookie_consent`) sehingga banner
 * tidak muncul lagi setelah diputuskan.
 *
 * - "Terima semua"      → consent analitik (PostHog/GA/Sentry boleh init).
 * - "Hanya yang perlu"  → hanya cookie esensial; analitik non-esensial digate.
 *
 * Gating analytics: `hasAnalyticsConsent()` dari `cookie-consent.ts` dapat
 * dibaca sebelum `initClientObservability()` dipanggil. Saat ini observability
 * client belum di-wire ke provider mana pun (lihat laporan), jadi banner ini
 * sudah menyiapkan sinyal consent untuk di-konsumsi nanti.
 *
 * Di-render sekali dari root `app/layout.tsx`.
 */
export function CookieConsentBanner() {
  // null = belum tahu (hindari flash); false = sudah decide; true = tampilkan.
  const [visible, setVisible] = React.useState<boolean>(false);
  const [mounted, setMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
    if (readConsent() === null) {
      setVisible(true);
    }
  }, []);

  const decide = React.useCallback((choice: "accepted" | "rejected") => {
    writeConsent(choice);
    setVisible(false);
  }, []);

  // Hindari hydration mismatch: hanya render setelah mount + kalau belum decide.
  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Persetujuan penggunaan cookie"
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="pointer-events-auto w-full max-w-3xl rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kami menggunakan cookie untuk analitik dan peningkatan layanan agar
            pengalaman kamu lebih baik. Cookie esensial selalu aktif untuk
            menjaga fungsi situs.{" "}
            <Link
              href="/privacy"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Kebijakan Privasi
            </Link>
            .
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => decide("rejected")}
            >
              Hanya yang perlu
            </Button>
            <Button size="sm" onClick={() => decide("accepted")}>
              Terima semua
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
