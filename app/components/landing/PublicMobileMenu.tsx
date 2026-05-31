"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard } from "lucide-react";

import { useSession } from "@/lib/auth/client";

const LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/#features", label: "Fitur" },
  { href: "/#academy", label: "Academy" },
  { href: "/glossary", label: "Glossary" },
  { href: "/research", label: "Riset" },
  { href: "/pricing", label: "Harga" },
];

/**
 * Menu navigasi mobile untuk navbar publik (sm:hidden). Sebelumnya link
 * About/Fitur/Academy dll cuma muncul di `sm:flex` → hilang di mobile.
 * Hamburger ini menampilkan semua link + aksi auth (login-aware).
 */
export function PublicMobileMenu({ ctaText = "Coba Gratis" }: { ctaText?: string }) {
  const [open, setOpen] = React.useState(false);
  const { data: session } = useSession();
  const loggedIn = !!session?.user;

  // Cegah scroll body saat panel terbuka.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-accent"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={close}
            className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-sm"
          />
          {/* Panel */}
          <nav className="fixed inset-x-0 top-14 z-50 border-b border-border bg-background p-4 shadow-lg">
            <ul className="flex flex-col">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="block rounded-md px-3 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={close}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={close}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition hover:bg-accent"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup?trial=pro"
                    onClick={close}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                  >
                    {ctaText}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
