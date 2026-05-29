"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  Bot,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  LineChart,
  ListChecks,
  Newspaper,
  Search,
  Star,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Minus,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPalette } from "./CommandPaletteProvider";
import { useHotkey } from "@/lib/hooks/use-hotkey";
import type { CompanySearchHitDTO } from "@/lib/types/companies";

const RECENT_KEY = "nubuat-cmdk-recent";

const STATIC_NAV = [
  { id: "nav-dashboard", label: "Dashboard", href: "/", icon: Home },
  { id: "nav-picks", label: "Daily Picks", href: "/picks", icon: ListChecks },
  { id: "nav-news", label: "News Feed", href: "/news", icon: Newspaper },
  { id: "nav-screener", label: "Screener", href: "/screener", icon: Search },
  { id: "nav-watchlist", label: "Watchlist", href: "/watchlist", icon: Star },
  { id: "nav-alerts", label: "Alerts", href: "/alerts", icon: Bell },
  { id: "nav-calendar", label: "Calendar Aksi Korporasi", href: "/calendar", icon: Calendar },
  { id: "nav-research", label: "Riset", href: "/research", icon: FileText },
  { id: "nav-backtest", label: "Backtest", href: "/backtest", icon: LineChart },
  { id: "nav-compare", label: "Compare Tickers", href: "/compare", icon: LineChart },
  { id: "nav-workspace", label: "Terminal Pro (Workspace)", href: "/workspace", icon: LayoutGrid },
  { id: "nav-portfolio", label: "Paper Trade", href: "/portfolio", icon: Wallet },
  { id: "nav-leaderboard", label: "Hall of Fame (Leaderboard)", href: "/leaderboard", icon: Trophy },
  { id: "nav-sectors", label: "Sector Heatmap", href: "/sectors", icon: LineChart },
  { id: "nav-copilot", label: "AI Buddy", href: "/copilot", icon: Bot },
  { id: "nav-guidance", label: "Guidance / Cara Pakai", href: "/guidance", icon: FileText },
  {
    id: "nav-subscription",
    label: "Subscription",
    href: "/subscription",
    icon: CreditCard,
  },
];

/**
 * Bloomberg-style function codes. Pengguna mengetik kode → palette
 * mengeksekusi navigation/action. Codes dinamis tergantung context (mis. ada
 * ticker terpilih), tapi untuk MVP cukup static + ticker-aware.
 */
const FUNCTIONS = [
  { id: "fn-eqs", code: "EQS", label: "Equity Screener", href: "/screener" },
  { id: "fn-news", code: "NEWS", label: "Live News Feed", href: "/news" },
  { id: "fn-cal", code: "CAL", label: "Corp Action Calendar", href: "/calendar" },
  { id: "fn-pick", code: "PICK", label: "Daily Picks", href: "/picks" },
  { id: "fn-bt", code: "BT", label: "Backtest Engine", href: "/backtest" },
  { id: "fn-rsh", code: "RSH", label: "Riset Reports", href: "/research" },
  { id: "fn-ai", code: "AI", label: "AI Buddy", href: "/copilot" },
  { id: "fn-ws", code: "WS", label: "Terminal Pro Workspace", href: "/workspace" },
  { id: "fn-rv", code: "RV", label: "Relative Valuation / Compare", href: "/compare" },
  { id: "fn-n", code: "N", label: "News Feed", href: "/news" },
];

/** Screener strategy preset shortcuts. */
const PRESETS = [
  { id: "preset-value", label: "Value Hunter (low PE/PBV)", href: "/screener?preset=value-hunter" },
  { id: "preset-growth", label: "Growth Story (>20% growth)", href: "/screener?preset=growth-story" },
  { id: "preset-dividend", label: "Dividend Aristocrat", href: "/screener?preset=dividend-aristocrat" },
  { id: "preset-quality", label: "Quality Wide-Moat", href: "/screener?preset=quality" },
  { id: "preset-smallcap", label: "Small-Cap Rocket", href: "/screener?preset=small-cap-rocket" },
  { id: "preset-bluechip", label: "Blue Chip IDX", href: "/screener?preset=blue-chip" },
];

/** News filter shortcuts. */
const NEWS_FILTERS = [
  { id: "news-bull", label: "Bullish news", href: "/news?sentiment=bullish", Icon: TrendingUp },
  { id: "news-bear", label: "Bearish news", href: "/news?sentiment=bearish", Icon: TrendingDown },
  { id: "news-neutral", label: "Neutral news", href: "/news?sentiment=neutral", Icon: Minus },
];

interface RecentEntry {
  label: string;
  href: string;
  ts: number;
}

function loadRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentEntry =>
          !!x &&
          typeof x === "object" &&
          typeof (x as RecentEntry).href === "string" &&
          typeof (x as RecentEntry).label === "string",
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}

function pushRecent(entry: { label: string; href: string }) {
  if (typeof window === "undefined") return;
  const list = loadRecent().filter((e) => e.href !== entry.href);
  list.unshift({ ...entry, ts: Date.now() });
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = React.useState("");
  const [tickers, setTickers] = React.useState<CompanySearchHitDTO[]>([]);
  const [loadingTickers, setLoadingTickers] = React.useState(false);
  const [recent, setRecent] = React.useState<RecentEntry[]>([]);

  useHotkey("mod+k", () => setOpen(!open), { enabled: true });

  React.useEffect(() => {
    if (open) setRecent(loadRecent());
  }, [open]);

  // Debounced ticker search via /api/companies/search?q=... (typo-tolerant,
  // pg_trgm: "BBR"→BBRI, "TLKOM"→TLKM, "bank bca"→BBCA — IMPROVEMENT_PLAN §8.4 #26).
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setTickers([]);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setLoadingTickers(true);
        const url = `/api/companies/search?q=${encodeURIComponent(q)}&limit=8`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) {
          setTickers([]);
          return;
        }
        const json = (await res.json()) as {
          ok: boolean;
          data?: { items?: Array<{ kode: string; namaPerusahaan: string; sectorKode: string; logoUrl: string | null }>; };
        };
        if (!json.ok || !json.data?.items) {
          setTickers([]);
          return;
        }
        setTickers(
          json.data.items.map((c) => ({
            kode: c.kode,
            namaPerusahaan: c.namaPerusahaan,
            sectorKode: c.sectorKode,
            logoUrl: c.logoUrl,
          })),
        );
      } catch {
        setTickers([]);
      } finally {
        setLoadingTickers(false);
      }
    }, 180);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [query, open]);

  const go = React.useCallback(
    (href: string, label: string) => {
      pushRecent({ href, label });
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router, setOpen],
  );

  // Bloomberg-style: if user types pure ticker code, fast-jump.
  const upperQ = query.trim().toUpperCase();
  const isTickerLike = /^[A-Z0-9]{3,6}$/.test(upperQ);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Cari ticker, navigasi, atau fungsi (mis. BBRI, EQS)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loadingTickers ? "Mencari..." : "Tidak ada hasil."}
        </CommandEmpty>

        {isTickerLike && (
          <>
            <CommandGroup heading="Jump">
              <CommandItem
                value={`jump-${upperQ}`}
                onSelect={() => go(`/ticker/${upperQ}`, upperQ)}
              >
                <LineChart aria-hidden />
                <span>
                  Buka <span className="font-mono font-semibold">{upperQ}</span>
                </span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {tickers.length > 0 && (
          <>
            <CommandGroup heading="Ticker">
              {tickers.map((t) => (
                <CommandItem
                  key={t.kode}
                  value={`ticker-${t.kode}-${t.namaPerusahaan}`}
                  onSelect={() => go(`/ticker/${t.kode}`, t.kode)}
                >
                  <Building2 aria-hidden />
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <span>
                      <span className="font-mono font-semibold">{t.kode}</span>
                      <span className="ml-2 text-muted-foreground">
                        {t.namaPerusahaan}
                      </span>
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {t.sectorKode}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {STATIC_NAV.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem
                key={n.id}
                value={`nav-${n.label}`}
                onSelect={() => go(n.href, n.label)}
              >
                <Icon aria-hidden />
                <span>{n.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Functions">
          {FUNCTIONS.map((f) => (
            <CommandItem
              key={f.id}
              value={`fn-${f.code}-${f.label}`}
              onSelect={() => go(f.href, f.label)}
            >
              <Sparkles aria-hidden />
              <span>
                <span className="font-mono font-semibold">{f.code}</span>
                <span className="ml-2 text-muted-foreground">{f.label}</span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Screener Presets">
          {PRESETS.map((p) => (
            <CommandItem
              key={p.id}
              value={`preset-${p.label}`}
              onSelect={() => go(p.href, p.label)}
            >
              <Sparkles aria-hidden className="text-primary" />
              <span>{p.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="News Filters">
          {NEWS_FILTERS.map((n) => {
            const Icon = n.Icon;
            return (
              <CommandItem
                key={n.id}
                value={`news-${n.label}`}
                onSelect={() => go(n.href, n.label)}
              >
                <Icon aria-hidden />
                <span>{n.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent">
              {recent.map((r) => (
                <CommandItem
                  key={`recent-${r.href}`}
                  value={`recent-${r.label}-${r.href}`}
                  onSelect={() => go(r.href, r.label)}
                >
                  <AlertCircle aria-hidden />
                  <span>{r.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
