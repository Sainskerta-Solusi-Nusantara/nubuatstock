"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Bot,
  Check,
  ChevronRight,
  Rocket,
  Search,
  Star,
  Wallet,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * FirstRunChecklist — kartu "Langkah pertama di Nubuat" untuk user baru.
 *
 * Tujuan: menaikkan AKTIVASI & retensi (D1/D7). Setelah onboarding tour
 * (OnboardingTour.tsx) yang sifatnya read-only, checklist ini mendorong user
 * benar-benar MELAKUKAN core action pertama: cari emiten → watchlist → AI Buddy
 * → paper trade → alert.
 *
 * Persistensi (client-only, localStorage):
 * - Tiap item disimpan terpisah di key `nubuat_firstrun_<id>` = "1" saat selesai.
 * - Card di-dismiss permanen via `nubuat_firstrun_dismissed` = "1".
 *
 * Deteksi "done" 2 jalur:
 * 1. AUTO — saat user mengunjungi rute terkait (href item) kita anggap step itu
 *    "tercoba" dan tandai selesai lewat localStorage saat halaman ini di-mount
 *    setelah navigasi balik. Karena komponen ini hanya hidup di dashboard, kita
 *    pakai pendekatan ringan: item ditandai saat user klik link-nya (intent jelas).
 * 2. MANUAL — user bisa centang/uncheck sendiri lewat tombol checkbox.
 *
 * Tidak ada dependency baru; dark-mode aware; pakai design tokens & Empty/Card UI.
 * Render null kalau sudah di-dismiss ATAU semua item selesai (biar dashboard bersih
 * untuk user yang sudah aktif).
 */

const DISMISS_KEY = "nubuat_firstrun_dismissed";
const itemKey = (id: string) => `nubuat_firstrun_${id}`;

interface ChecklistItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  href: string;
  cta: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: "search",
    icon: <Search className="size-4" aria-hidden />,
    label: "Cari & buka 1 emiten",
    hint: "Tekan ⌘K / Ctrl+K atau pakai Screener — buka satu saham (mis. BBRI) dan lihat Nubuat Verdict.",
    href: "/screener",
    cta: "Cari saham",
  },
  {
    id: "watchlist",
    icon: <Star className="size-4" aria-hidden />,
    label: "Tambah ke Watchlist",
    hint: "Simpan minimal satu emiten supaya harga & perubahannya selalu di radar kamu.",
    href: "/watchlist",
    cta: "Buka Watchlist",
  },
  {
    id: "ai",
    icon: <Bot className="size-4" aria-hidden />,
    label: "Coba AI Buddy",
    hint: "Tanya apa saja soal saham — analisis cepat berbasis data IDX sebagai teman riset.",
    href: "/copilot",
    cta: "Tanya AI Buddy",
  },
  {
    id: "paper",
    icon: <Wallet className="size-4" aria-hidden />,
    label: "Mulai Paper Trading",
    hint: "GRATIS. Latih strategi pakai modal virtual Rp 100 juta tanpa risiko uang asli.",
    href: "/portfolio",
    cta: "Mulai latihan",
  },
  {
    id: "alert",
    icon: <Bell className="size-4" aria-hidden />,
    label: "Pasang 1 alert",
    hint: "Dapat notifikasi otomatis saat harga atau sinyal yang kamu incar tercapai.",
    href: "/alerts",
    cta: "Atur alert",
  },
];

export function FirstRunChecklist() {
  // `ready` mencegah hydration mismatch: jangan render apa pun sampai localStorage dibaca.
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      const next: Record<string, boolean> = {};
      for (const it of ITEMS) {
        next[it.id] = localStorage.getItem(itemKey(it.id)) === "1";
      }
      setDone(next);
    } catch {
      // localStorage diblokir (private mode) — tampilkan checklist tanpa persist.
    }
    setReady(true);
  }, []);

  function setItem(id: string, value: boolean) {
    setDone((prev) => ({ ...prev, [id]: value }));
    try {
      if (value) localStorage.setItem(itemKey(id), "1");
      else localStorage.removeItem(itemKey(id));
    } catch {
      // ignore — state in-memory tetap update.
    }
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!ready || dismissed) return null;

  const completed = ITEMS.filter((it) => done[it.id]).length;
  const total = ITEMS.length;
  // Sembunyikan kalau user sudah menuntaskan semua — dashboard tetap bersih.
  if (completed === total) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" aria-hidden />
            Langkah pertama di Nubuat
          </CardTitle>
          <CardDescription>
            Tuntaskan langkah ini biar kamu cepat paham fitur inti & dapat
            manfaat maksimal.
          </CardDescription>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Sembunyikan checklist langkah pertama"
          className="-mr-1 -mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {completed}/{total} selesai
            </span>
            <span className="text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`Progres onboarding: ${completed} dari ${total} selesai`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <ul className="space-y-1.5">
          {ITEMS.map((it) => {
            const isDone = !!done[it.id];
            return (
              <li
                key={it.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  isDone
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => setItem(it.id, !isDone)}
                  aria-pressed={isDone}
                  aria-label={
                    isDone
                      ? `Tandai "${it.label}" belum selesai`
                      : `Tandai "${it.label}" selesai`
                  }
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 text-transparent hover:border-primary",
                  )}
                >
                  <Check className="size-3" aria-hidden />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium",
                      isDone
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0",
                        isDone ? "text-muted-foreground" : "text-primary",
                      )}
                    >
                      {it.icon}
                    </span>
                    {it.label}
                  </p>
                  {!isDone && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {it.hint}
                    </p>
                  )}
                </div>

                {!isDone && (
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                  >
                    {/* Klik CTA = intent jelas → tandai selesai lalu navigasi.
                        Pakai onClick (bukan hanya href) supaya progres persist
                        meski user balik ke dashboard tanpa aksi eksplisit lain. */}
                    <Link
                      href={it.href}
                      onClick={() => setItem(it.id, true)}
                    >
                      {it.cta}
                      <ChevronRight className="ml-0.5 size-3.5" aria-hidden />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
