"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

/**
 * Link sidebar superadmin yang sadar route aktif (highlight menu terpilih).
 * Dipakai menggantikan helper SidebarLink lama yang statis.
 *
 * `exact` untuk item yang href-nya prefix item lain (mis. /superadmin Overview
 * jangan ikut aktif saat di /superadmin/users).
 */
export function SuperadminNavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-md px-3 py-2 text-foreground/80 transition hover:bg-accent hover:text-foreground",
        active && "bg-primary/10 font-semibold text-primary",
      )}
    >
      {children}
    </Link>
  );
}
