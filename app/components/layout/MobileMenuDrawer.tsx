"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CreditCard,
  Gift,
  GitCompareArrows,
  GraduationCap,
  History,
  Home,
  Layers,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  ListChecks,
  Menu,
  MessageCircleQuestion,
  Newspaper,
  PieChart,
  Search,
  Shield,
  Star,
  Trophy,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Drawer menu lengkap untuk mobile. Bottom-bar (MobileNav) hanya muat 5 item,
 * jadi banyak menu (Academy, Screener, Compare, Sectors, Rotation, dll) tak
 * terjangkau di HP. Hamburger ini membuka panel berisi SEMUA menu sidebar.
 *
 * Daftar menu sengaja mirror Sidebar.tsx (desktop) supaya konsisten.
 */
type Item = { href: string; label: string; icon: LucideIcon; badge?: string };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/picks", label: "Daily Picks", icon: ListChecks },
      { href: "/news", label: "News", icon: Newspaper },
    ],
  },
  {
    label: "Analisis",
    items: [
      { href: "/copilot", label: "AI Buddy", icon: Bot },
      { href: "/watchlist", label: "Watchlist", icon: Star },
      { href: "/screener", label: "Screener", icon: Search },
      { href: "/compare", label: "Compare", icon: GitCompareArrows },
      { href: "/workspace", label: "Terminal Pro", icon: LayoutGrid },
      { href: "/sectors", label: "Sectors", icon: Layers },
      { href: "/rotation", label: "Rotation (RRG)", icon: LineChart },
      { href: "/capital-flow", label: "Capital Flow", icon: Activity },
      { href: "/ownership", label: "Kepemilikan KSEI", icon: PieChart },
    ],
  },
  {
    label: "Trading",
    items: [
      { href: "/portfolio", label: "Paper Trade", icon: Wallet },
      { href: "/leaderboard", label: "Hall of Fame", icon: Trophy },
      { href: "/backtest", label: "Backtest", icon: History },
      { href: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    label: "AI & Belajar",
    items: [
      { href: "/academy", label: "Academy", icon: GraduationCap },
      { href: "/guidance", label: "Guidance", icon: BookOpen },
      { href: "/help", label: "Help Center", icon: LifeBuoy },
      { href: "/support", label: "Tiket & Feedback", icon: MessageCircleQuestion },
    ],
  },
  {
    label: "Akun",
    items: [
      { href: "/referral", label: "Ajak Teman", icon: Gift },
      { href: "/subscription", label: "Subscription", icon: CreditCard },
    ],
  },
];

export function MobileMenuDrawer({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Tutup drawer setiap kali pindah halaman.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition hover:bg-accent"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          {/* Panel kiri */}
          <nav className="relative flex h-full w-72 max-w-[80vw] flex-col overflow-y-auto border-r border-border bg-background shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2 font-bold tracking-tight">
                <LineChart className="size-5 text-primary" />
                Nubuat
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 px-2 py-3">
              {GROUPS.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                              active && "bg-accent text-foreground",
                            )}
                          >
                            <Icon className="size-4 shrink-0" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {isAdmin && (
                <div className="mb-3 border-t border-border pt-3">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Shield className="size-4 shrink-0" />
                    Admin Console
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
