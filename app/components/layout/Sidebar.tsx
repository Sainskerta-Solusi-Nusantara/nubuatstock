"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  CreditCard,
  GitCompareArrows,
  GraduationCap,
  Home,
  Layers,
  LineChart,
  ListChecks,
  Newspaper,
  Presentation,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  isAdmin: boolean;
  isSuperadmin?: boolean;
  /** Tier slug (e.g. "free", "starter", "pro"). Null saat belum di-resolve. */
  tier?: string | null;
}

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  match?: (p: string) => boolean;
}

const PRIMARY: SidebarItem[] = [
  { href: "/", label: "Dashboard", icon: Home, match: (p) => p === "/" },
  { href: "/picks", label: "Daily Picks", icon: ListChecks },
  { href: "/portfolio", label: "Paper Trade", icon: Wallet, badge: "NEW" },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

const SECONDARY: SidebarItem[] = [
  { href: "/screener", label: "Screener", icon: Search, badge: "NEW" },
  { href: "/compare", label: "Compare", icon: GitCompareArrows, badge: "NEW" },
  { href: "/sectors", label: "Sectors", icon: Layers },
  { href: "/rotation", label: "Rotation (RRG)", icon: LineChart, badge: "NEW" },
  { href: "/copilot", label: "AI Buddy", icon: Bot },
  { href: "/academy", label: "Academy", icon: GraduationCap, badge: "NEW" },
  { href: "/guidance", label: "Guidance", icon: BookOpen },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
];

const STORAGE_KEY = "nubuat-sidebar-collapsed";

export function Sidebar({ isAdmin, isSuperadmin = false, tier }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setCollapsed(stored === "1");
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const renderItem = (item: SidebarItem) => {
    const active = item.match
      ? item.match(pathname)
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active && "bg-accent text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge variant="neutral" className="text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "hidden h-[100dvh] shrink-0 flex-col border-r bg-background/95 backdrop-blur transition-[width] duration-200 md:flex",
        collapsed ? "w-14" : "w-60",
      )}
      aria-label="Navigasi utama"
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 font-bold tracking-tight",
            collapsed && "justify-center",
          )}
        >
          <LineChart className="size-5 text-primary" aria-hidden />
          {!collapsed && <span>Nubuat</span>}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={toggle}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "rotate-180",
            )}
            aria-hidden
          />
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">{PRIMARY.map(renderItem)}</ul>
        <Separator className="my-3" />
        <ul className="space-y-1">{SECONDARY.map(renderItem)}</ul>

        {isAdmin && (
          <>
            <Separator className="my-3" />
            <ul className="space-y-1">
              {renderItem({
                href: "/admin",
                label: "Admin Console",
                icon: Shield,
              })}
              {isSuperadmin && (
                <>
                  {renderItem({
                    href: "/superadmin",
                    label: "Super Admin",
                    icon: ShieldCheck,
                  })}
                  {renderItem({
                    href: "/superadmin/pitchdeck",
                    label: "Pitchdeck",
                    icon: Presentation,
                    badge: "NEW",
                  })}
                </>
              )}
            </ul>
          </>
        )}
      </nav>

      {!collapsed && (
        <div className="border-t p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Paket
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-sm font-medium">
            <Badge variant="secondary" className="uppercase">
              {tier ?? "free"}
            </Badge>
            <Link
              href="/subscription"
              className="text-xs text-primary hover:underline"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
