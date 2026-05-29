"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, ListChecks, Search, Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useCommandPalette } from "@/components/navigation/CommandPaletteProvider";

// Bottom nav mobile. Analisis ticker = fitur utama → tombol "Cari" dibikin
// menonjol di tengah (raised) yang membuka CommandPalette (ticker search).
// Akun/Profil/Subscription tetap terjangkau via avatar dropdown di Header.
type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  match?: (p: string) => boolean;
};

const LEFT: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, match: (p: string) => p === "/dashboard" || p === "/" },
  { href: "/picks", label: "Picks", icon: ListChecks },
];

const RIGHT: NavItem[] = [
  { href: "/watchlist", label: "Watch", icon: Star },
  { href: "/copilot", label: "Buddy", icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname() ?? "/";
  const { setOpen } = useCommandPalette();

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.match
      ? item.match(pathname)
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        <Icon className={cn("size-5", active && "text-primary")} aria-hidden />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigasi seluler"
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t bg-background/95 backdrop-blur md:hidden"
    >
      {LEFT.map(renderLink)}

      {/* Tombol Cari menonjol di tengah — fitur analisis utama (ticker search). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cari saham / ticker"
        className="flex flex-1 flex-col items-center justify-end gap-0.5 self-stretch"
      >
        <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95">
          <Search className="size-5" aria-hidden />
        </span>
        <span className="text-[11px] font-semibold text-foreground">Cari</span>
      </button>

      {RIGHT.map(renderLink)}
    </nav>
  );
}
