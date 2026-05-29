"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  CreditCard,
  LineChart,
  ListChecks,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Onboarding tour ringan untuk first-time user (IMPROVEMENT_PLAN §8.4 #24).
 *
 * Tujuan: walkthrough singkat 5 langkah saat pertama masuk app → memandu user
 * ke fitur inti (Watchlist → Ticker Detail → AI Copilot → Daily Picks →
 * Subscription/Trial) untuk menaikkan konversi trial.
 *
 * Desain sengaja TANPA dependency baru (no intro.js dll) — modal multi-step
 * yang ringan, dark-mode aware, mobile-friendly, pakai design tokens.
 *
 * "Tampil sekali": status disimpan di localStorage key `nubuat_onboarding_done`.
 * Setelah Skip atau Selesai, key di-set "1" sehingga tour tidak muncul lagi.
 *
 * Mount: di app/(app)/layout.tsx, hanya saat tidak ada gate legal aktif
 * (disclaimer gate diprioritaskan). Komponen ini render null kalau sudah dilihat.
 */

const LS_KEY = "nubuat_onboarding_done";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    icon: <Star className="h-6 w-6" />,
    title: "Watchlist Anda",
    body: "Pantau ticker favorit dengan harga & perubahan real-time. Tambahkan saham yang sedang Anda amati supaya tetap di radar setiap hari.",
  },
  {
    icon: <LineChart className="h-6 w-6" />,
    title: "Detail Ticker",
    body: "Klik ticker mana pun untuk membuka halaman analisa: harga, indikator teknikal, fundamental, dan ringkasan terstruktur per emiten.",
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "AI Copilot",
    body: "Tanya apa saja soal saham Anda. Copilot memberi analisa cepat berbasis data pasar IDX — tetap sebagai edukasi, bukan ajakan jual/beli.",
  },
  {
    icon: <ListChecks className="h-6 w-6" />,
    title: "Daily Picks",
    body: "Top rekomendasi harian berbasis skor multi-faktor lengkap dengan setup, time horizon, dan reward/risk ratio untuk mempercepat riset Anda.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Trial & Langganan",
    body: "Selama trial Anda bisa mencoba fitur premium. Cek halaman Langganan untuk membuka akses penuh ke seluruh alat analisa Nubuat.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Cek localStorage di mount (client only) — kalau belum pernah dilihat, tampilkan.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(LS_KEY) !== "1") {
        setOpen(true);
      }
    } catch {
      // localStorage bisa di-block (private mode) — fail silently, jangan paksa tour.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {
      // ignore — tetap tutup walau gagal persist.
    }
    setOpen(false);
  }

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
      className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="my-auto w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {current.icon}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Selamat datang di Nubuat
              </p>
              <h2
                id="onboarding-title"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {current.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Lewati tur perkenalan"
            className="-mr-1 -mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p
          id="onboarding-body"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {current.body}
        </p>

        {/* Progress dots */}
        <div
          className="flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Langkah tur"
        >
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`Langkah ${i + 1}: ${s.title}`}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-border hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            aria-label="Lewati seluruh tur perkenalan"
          >
            Lewati
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Kembali
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={dismiss}>
                Selesai
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Lanjut
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
