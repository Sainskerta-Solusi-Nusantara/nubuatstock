"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useSession } from "@/lib/auth/client";

/**
 * Tombol auth di navbar publik — login-aware via client session.
 * Sengaja client-side (bukan SSR) supaya halaman marketing tetap static/ISR
 * (getSession server-side akan memaksa seluruh halaman jadi dynamic).
 *
 * Saat sudah login: tampilkan tombol "Dashboard" (balik ke app).
 * Saat belum: Login + CTA daftar (desktop) / "Daftar" (mobile).
 */
export function NavAuthButtons({
  ctaText = "Coba Gratis",
  mobile = false,
}: {
  ctaText?: string;
  mobile?: boolean;
}) {
  const { data: session, isPending } = useSession();
  const loggedIn = !!session?.user;

  if (mobile) {
    return (
      <Link
        href={loggedIn ? "/dashboard" : "/signup?trial=pro"}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground sm:hidden"
      >
        {loggedIn ? (
          <>
            <LayoutDashboard className="size-3.5" />
            Dashboard
          </>
        ) : (
          "Daftar"
        )}
      </Link>
    );
  }

  if (loggedIn) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
      >
        <LayoutDashboard className="size-4" />
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="text-muted-foreground transition hover:text-foreground">
        Login
      </Link>
      <Link
        href="/signup?trial=pro"
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        // Saat masih loading session, tetap tampilkan CTA (tidak ada flash kosong).
        aria-busy={isPending || undefined}
      >
        {ctaText}
      </Link>
    </>
  );
}
