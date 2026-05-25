import { Suspense } from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  Bell,
  Bot,
  CommandIcon,
  ListChecks,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { requireSession } from "@/lib/auth/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MorningBrief } from "@/components/dashboard/MorningBrief";
import { getActiveSubscription } from "@/lib/billing";
import { getTodayPicks, listPicksHistory } from "@/lib/picks/service";
import {
  listWatchlists,
  getWatchlistWithQuotes,
} from "@/lib/watchlist/service";
import { getSectorRotation, type RotationEntity } from "@/lib/rotation/service";
import { db } from "@/lib/db";
import { aiConversations } from "@/db/schema/ai";
import type { PickListItemDTO } from "@/lib/types/picks";
import type { WatchlistItemView } from "@/lib/types/watchlist";

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.user.name?.split(" ")[0] ?? "Investor";
  const userId = session.user.id;

  // Parallel fetch — each wrapped in try/catch via helper so one failure doesn't 500 the page.
  const [tierLabel, picks, watchlistItems, sectors, recentChats] = await Promise.all([
    safeGetTierLabel(userId),
    safeGetTopPicks(),
    safeGetWatchlistItems(userId),
    safeGetSectorRotation(),
    safeGetRecentConversations(userId),
  ]);

  return (
    <div className="space-y-6">
      <DashboardGreeting firstName={firstName} tierLabel={tierLabel} />

      <Suspense fallback={null}>
        <MorningBrief />
      </Suspense>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4 text-primary" aria-hidden />
                Daily Picks
              </CardTitle>
              <CardDescription>
                Top 5 rekomendasi harian berbasis multi-faktor.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/picks">
                Lihat semua <ArrowRight className="ml-1 size-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DailyPicksPreview picks={picks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Star className="size-4 text-primary" aria-hidden />
              Watchlist
            </CardTitle>
            <CardDescription>5 ticker teratas pantauan Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <WatchlistPreview items={watchlistItems} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" aria-hidden />
              Market Overview
            </CardTitle>
            <CardDescription>IHSG &amp; sektor performers hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <MarketOverview sectors={sectors} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4 text-primary" aria-hidden />
              AI Copilot
            </CardTitle>
            <CardDescription>Percakapan terbaru Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentConversations conversations={recentChats} />
          </CardContent>
        </Card>
      </section>

      <QuickActions />
    </div>
  );
}

// =================== Safe fetchers ===================

async function safeGetTierLabel(userId: string): Promise<string> {
  try {
    const active = await getActiveSubscription(userId);
    return active?.tier.nama ?? "Free";
  } catch {
    return "Free";
  }
}

async function safeGetTopPicks(): Promise<PickListItemDTO[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todays = await getTodayPicks({ tradeDate: today });
    if (todays.length > 0) return todays.slice(0, 5);
    // Fallback: latest published picks across recent history (so empty trading day still shows context).
    const hist = await listPicksHistory({ limit: 5, offset: 0 });
    return hist.items.slice(0, 5);
  } catch {
    return [];
  }
}

async function safeGetWatchlistItems(userId: string): Promise<WatchlistItemView[]> {
  try {
    const wls = await listWatchlists(userId);
    if (wls.length === 0) return [];
    // Prefer the default ("Utama") watchlist; fallback to first.
    const target = wls.find((w) => w.isDefault) ?? wls[0]!;
    const detail = await getWatchlistWithQuotes(userId, target.id);
    return detail.items.slice(0, 5);
  } catch {
    return [];
  }
}

async function safeGetSectorRotation(): Promise<RotationEntity[]> {
  try {
    const rows = await getSectorRotation();
    return rows.slice(0, 6);
  } catch {
    return [];
  }
}

interface RecentConversation {
  id: string;
  title: string;
  contextKode: string | null;
  updatedAt: Date;
}

async function safeGetRecentConversations(userId: string): Promise<RecentConversation[]> {
  try {
    // Note: ai_conversations doesn't expose `updatedAt` separate from `lastMessageAt`;
    // `lastMessageAt` is the correct sort field for "recent activity".
    const rows = await db
      .select({
        id: aiConversations.id,
        title: aiConversations.title,
        contextKode: aiConversations.contextKode,
        lastMessageAt: aiConversations.lastMessageAt,
        updatedAt: aiConversations.updatedAt,
      })
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(3);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      contextKode: r.contextKode,
      updatedAt: r.lastMessageAt ?? r.updatedAt,
    }));
  } catch {
    return [];
  }
}

// =================== Presentational ===================

function DashboardGreeting({
  firstName,
  tierLabel,
}: {
  firstName: string;
  tierLabel: string;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
        ? "Selamat siang"
        : hour < 19
          ? "Selamat sore"
          : "Selamat malam";

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan pasar &amp; alat analisa Anda untuk hari ini.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="uppercase tracking-wider">
          {tierLabel}
        </Badge>
        <Button asChild size="sm" variant="outline">
          <Link href="/subscription">Upgrade</Link>
        </Button>
      </div>
    </div>
  );
}

// Skeletons retained for potential future <Suspense> use; harmless if unused.
function PicksSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

function MarketOverviewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

function RecentAiSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
// Tag skeletons as intentionally available even if not all rendered.
void PicksSkeleton;
void WatchlistSkeleton;
void MarketOverviewSkeleton;
void RecentAiSkeleton;

function DailyPicksPreview({ picks }: { picks: PickListItemDTO[] }) {
  if (picks.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="size-5" />}
        title="Belum ada Daily Picks"
        description="Engine picks akan menghasilkan rekomendasi setelah data EoD pertama masuk."
        action={{ href: "/picks", label: "Lihat halaman Picks" }}
      />
    );
  }
  return (
    <ul className="divide-y">
      {picks.map((p) => (
        <li key={p.id}>
          <Link
            href={`/picks/${p.id}`}
            className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="outline" className="font-mono text-xs">
                {p.companyKode}
              </Badge>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {p.namaPerusahaan ?? p.companyKode}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {p.setupType.replace(/_/g, " ")} · {p.timeHorizon}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">RR</span>
              <span className="text-sm font-semibold tabular-nums">
                {p.rewardRiskRatio.toFixed(2)}
              </span>
              <Badge variant="secondary" className="tabular-nums">
                {Math.round(p.score)}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function WatchlistPreview({ items }: { items: WatchlistItemView[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Star className="size-5" />}
        title="Watchlist masih kosong"
        description="Tambahkan ticker favorit untuk memantau harga real-time."
        action={{ href: "/watchlist", label: "Buka Watchlist" }}
      />
    );
  }
  return (
    <ul className="divide-y">
      {items.map((it) => {
        const pct = it.quote?.changePct ?? null;
        const tone =
          pct == null
            ? "text-muted-foreground"
            : pct > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : pct < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground";
        return (
          <li key={it.id}>
            <Link
              href={`/saham/${it.companyKode}`}
              className="flex items-center justify-between gap-3 py-2 hover:bg-muted/40 -mx-2 px-2 rounded-md"
            >
              <div className="min-w-0">
                <p className="text-sm font-mono font-semibold">{it.companyKode}</p>
                {it.namaPerusahaan && (
                  <p className="text-xs text-muted-foreground truncate">
                    {it.namaPerusahaan}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm tabular-nums">
                  {it.quote?.last != null
                    ? it.quote.last.toLocaleString("id-ID")
                    : "—"}
                </p>
                <p className={`text-xs tabular-nums ${tone}`}>
                  {pct == null
                    ? "—"
                    : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MarketOverview({ sectors }: { sectors: RotationEntity[] }) {
  if (sectors.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="size-5" />}
        title="Data pasar belum tersedia"
        description="Endpoint ringkasan indeks & sektor sedang disiapkan oleh Market Data service."
        action={{ href: "/admin/market", label: "Setup vendor data" }}
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sectors.map((s) => {
        const quadColor =
          s.currentQuadrant === "Leading"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : s.currentQuadrant === "Improving"
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
              : s.currentQuadrant === "Weakening"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300";
        return (
          <Link
            key={s.kode}
            href={`/sectors/${s.kode}`}
            className="rounded-lg border bg-card p-3 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{s.name}</p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${quadColor}`}
              >
                {s.currentQuadrant}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
              <span>RS {s.currentRs.toFixed(1)}</span>
              <span>Mom {s.currentMomentum.toFixed(1)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function RecentConversations({
  conversations,
}: {
  conversations: RecentConversation[];
}) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<Bot className="size-5" />}
        title="Belum ada percakapan"
        description="Mulai diskusi dengan AI Copilot untuk analisa cepat."
        action={{ href: "/copilot", label: "Buka Copilot" }}
      />
    );
  }
  return (
    <ul className="divide-y">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/copilot/${c.id}`}
            className="flex items-start justify-between gap-2 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {c.contextKode ? `${c.contextKode} · ` : ""}
                {formatRelative(c.updatedAt)}
              </p>
            </div>
            <ArrowRight
              className="size-4 text-muted-foreground shrink-0 mt-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}h lalu`;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function QuickActions() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ActionTile
        icon={<CommandIcon className="size-4" aria-hidden />}
        title="Cari ticker"
        description="Tekan ⌘K untuk membuka palette."
        href="/picks"
      />
      <ActionTile
        icon={<Sparkles className="size-4" aria-hidden />}
        title="Daily Picks"
        description="Rekomendasi multi-faktor."
        href="/picks"
      />
      <ActionTile
        icon={<Bell className="size-4" aria-hidden />}
        title="Atur alert"
        description="Pantau harga otomatis."
        href="/alerts"
      />
      <ActionTile
        icon={<Bot className="size-4" aria-hidden />}
        title="AI Copilot"
        description="Tanya soal saham Anda."
        href="/copilot"
      />
    </section>
  );
}

function ActionTile({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-primary/10 p-1.5 text-primary">
          {icon}
        </span>
        <ArrowRight
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
