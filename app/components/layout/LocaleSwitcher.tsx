"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config";
import type { LocaleSwitcherProps } from "@/lib/types/i18n";

/**
 * LocaleSwitcher — dropdown ID / EN.
 *
 * Persists ke `users.locale` via PATCH `/api/users/me` kalau user logged in.
 * Fallback: cookie `NEXT_LOCALE` (di-set oleh server response). Setelah update,
 * page di-refresh agar server messages reload sesuai locale baru.
 *
 * Catatan: kalau API `/api/users/me` belum tersedia (Agent 3 belum implementasi
 * endpoint), fallback ke cookie-only — request gagal silent, cookie tetap di-set.
 */
const LOCALE_LABELS: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

const LOCALE_SHORT: Record<Locale, string> = {
  id: "ID",
  en: "EN",
};

export function LocaleSwitcher({ currentLocale, onChange }: LocaleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: Locale) => {
    if (next === currentLocale) return;
    onChange?.(next);

    startTransition(async () => {
      // Cookie: 1 tahun, SameSite=Lax.
      document.cookie = `NEXT_LOCALE=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;

      // Best-effort sync ke server profile.
      try {
        await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
          credentials: "same-origin",
        });
      } catch {
        // Silent fail — cookie sudah cukup untuk persist locale.
      }

      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Pilih bahasa"
          disabled={isPending}
        >
          <Globe className="size-4" />
          <span className="ml-1">{LOCALE_SHORT[currentLocale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSelect(loc)}
            data-active={loc === currentLocale}
          >
            <span className="font-mono text-xs mr-2">{LOCALE_SHORT[loc]}</span>
            {LOCALE_LABELS[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
