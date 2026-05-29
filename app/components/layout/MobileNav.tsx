"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, ListChecks, MoreHorizontal, Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/picks", label: "Picks", icon: ListChecks },
  { href: "/watchlist", label: "Watch", icon: Star },
  { href: "/copilot", label: "Buddy", icon: Bot },
  { href: "/account", label: "More", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="Navigasi seluler"
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t bg-background/95 backdrop-blur md:hidden"
    >
      {ITEMS.map((item) => {
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
            <Icon
              className={cn("size-5", active && "text-primary")}
              aria-hidden
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
