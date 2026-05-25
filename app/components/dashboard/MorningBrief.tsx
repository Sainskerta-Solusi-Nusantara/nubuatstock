import Link from "next/link";
import { Coffee, TrendingUp, TrendingDown, ExternalLink, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestDigest } from "@/lib/daily-digest/generator";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type {
  DigestCalendarEvent,
  DigestNews,
  DigestSectorMover,
  DigestTopPick,
} from "@/db/schema/daily-digest";

export async function MorningBrief() {
  const digest = await getLatestDigest();
  if (!digest) {
    return null;
  }

  const isToday = digest.digestDate === new Date().toISOString().slice(0, 10);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            Morning Brief
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">
            {isToday ? "Hari ini" : digest.digestDate} • AI-generated
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline + Outlook */}
        <div>
          <h3 className="text-base font-bold leading-snug">{digest.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{digest.marketOutlook}</p>
        </div>

        {/* Top Picks */}
        {(digest.topPicks as DigestTopPick[]).length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top Picks Hari Ini
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
              {(digest.topPicks as DigestTopPick[]).slice(0, 5).map((p) => (
                <Link
                  key={p.kode}
                  href={`/ticker/${p.kode}`}
                  className="rounded-md border border-border bg-card p-2 transition hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{p.kode}</span>
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary">
                      {(p.confidence).toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{p.namaPerusahaan}</div>
                  <div className="mt-1 grid grid-cols-3 gap-0.5 text-[9px]">
                    <span className="text-bull">↑{formatNumber(p.targetPrice, 0)}</span>
                    <span className="text-muted-foreground">{formatNumber(p.entryPrice, 0)}</span>
                    <span className="text-bear">↓{formatNumber(p.stopLoss, 0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sector Movers */}
          {(digest.sectorMovers as DigestSectorMover[]).length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sector Movers
              </div>
              <ul className="space-y-1 text-xs">
                {(digest.sectorMovers as DigestSectorMover[]).map((s) => (
                  <li key={s.sectorKode} className="flex items-center justify-between">
                    <Link href={`/screener?sector=${s.sectorKode}`} className="hover:underline">
                      {s.sectorName}
                    </Link>
                    <span
                      className={cn(
                        "font-mono",
                        s.returnPct > 0 ? "text-bull" : s.returnPct < 0 ? "text-bear" : "text-muted-foreground",
                      )}
                    >
                      {s.returnPct >= 0 ? "+" : ""}{s.returnPct.toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/sectors" className="mt-1 inline-block text-[10px] text-primary hover:underline">
                Lihat heatmap lengkap →
              </Link>
            </div>
          )}

          {/* Top News */}
          {(digest.topNews as DigestNews[]).length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Berita Penting 24j
              </div>
              <ul className="space-y-1.5 text-xs">
                {(digest.topNews as DigestNews[]).slice(0, 5).map((n, i) => {
                  const sentIcon =
                    n.sentiment === "bullish" ? (
                      <TrendingUp className="h-3 w-3 text-bull" />
                    ) : n.sentiment === "bearish" ? (
                      <TrendingDown className="h-3 w-3 text-bear" />
                    ) : null;
                  return (
                    <li key={i} className="flex items-start gap-1">
                      {sentIcon}
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 flex-1 hover:underline"
                      >
                        {n.title}
                        <ExternalLink className="ml-0.5 inline h-2.5 w-2.5 opacity-40" />
                      </a>
                    </li>
                  );
                })}
              </ul>
              <Link href="/news" className="mt-1 inline-block text-[10px] text-primary hover:underline">
                Lihat semua →
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Calendar */}
        {(digest.upcomingCalendar as DigestCalendarEvent[]).length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Aksi Korporasi 7 Hari ke Depan
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {(digest.upcomingCalendar as DigestCalendarEvent[]).slice(0, 8).map((c, i) => (
                <Link
                  key={i}
                  href={`/ticker/${c.ticker}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:border-primary/40"
                >
                  <span className="font-mono font-bold">{c.ticker}</span>
                  <span className="text-muted-foreground">{c.date.slice(5)}</span>
                  <span className="rounded bg-muted px-1 text-[9px] uppercase">{c.type}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
