import { Newspaper, TrendingUp, TrendingDown, Minus, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/ui/pagination";
import { listNews, listActiveSources, getNewsStats, countNews } from "@/lib/news/service";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export const metadata = {
  title: "News — Nubuat",
  description:
    "Berita keuangan & saham Indonesia terbaru dari Kontan, Bisnis, CNBC Indonesia, Detik Finance dengan analisis sentimen AI per artikel.",
};

interface PageProps {
  searchParams: Promise<{
    source?: string;
    sentiment?: "bullish" | "neutral" | "bearish";
    ticker?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function NewsFeedPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filterOpts = {
    source: sp.source?.trim() || undefined,
    sentiment: sp.sentiment,
    ticker: sp.ticker?.trim().toUpperCase() || undefined,
    search: sp.q?.trim() || undefined,
  };

  const [articles, sources, stats, total] = await Promise.all([
    listNews({ ...filterOpts, limit: PAGE_SIZE, offset }),
    listActiveSources(),
    getNewsStats(24),
    countNews(filterOpts),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Berita keuangan terbaru dari sumber publik Indonesia, dengan analisis sentimen otomatis
          dan tagging ticker yang relevan. Update tiap 15 menit.
        </p>
      </header>

      {/* Stats — last 24h */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Newspaper}
          label="Artikel (24j)"
          value={stats.totalArticles}
          tone="default"
        />
        <StatCard
          icon={TrendingUp}
          label="Bullish"
          value={stats.bullish}
          tone="bull"
        />
        <StatCard
          icon={Minus}
          label="Neutral"
          value={stats.neutral}
          tone="default"
        />
        <StatCard
          icon={TrendingDown}
          label="Bearish"
          value={stats.bearish}
          tone="bear"
        />
      </div>

      {/* Filter */}
      <form className="flex flex-wrap items-end gap-2" method="get">
        <FilterField label="Sumber">
          <select
            name="source"
            defaultValue={sp.source ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua sumber</option>
            {sources.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Sentimen">
          <select
            name="sentiment"
            defaultValue={sp.sentiment ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua</option>
            <option value="bullish">Bullish</option>
            <option value="neutral">Neutral</option>
            <option value="bearish">Bearish</option>
          </select>
        </FilterField>
        <FilterField label="Ticker">
          <input
            type="text"
            name="ticker"
            defaultValue={sp.ticker ?? ""}
            placeholder="BBRI"
            maxLength={5}
            className="h-9 w-24 rounded-md border border-input bg-background px-3 font-mono text-sm uppercase"
          />
        </FilterField>
        <FilterField label="Cari judul">
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Kata kunci..."
            className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
          />
        </FilterField>
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          <Filter className="h-3.5 w-3.5" />
          Apply
        </button>
        {(sp.source || sp.sentiment || sp.ticker || sp.q) && (
          <a
            href="/news"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </a>
        )}
      </form>

      {/* Article list */}
      {articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Newspaper className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-semibold">Tidak ada artikel yang cocok</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Coba ubah filter atau reset. Worker news ingest akan menambahkan artikel baru tiap 15 menit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {articles.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            basePath="/news"
            searchParams={{
              source: filterOpts.source,
              sentiment: filterOpts.sentiment,
              ticker: filterOpts.ticker,
              q: filterOpts.search,
            }}
          />
        </>
      )}

      {/* Source health footer */}
      {stats.perSource.length > 0 && (
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sumber aktif (24 jam terakhir)
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.perSource.map((s) => (
                <span
                  key={s.slug}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
                  title={
                    s.lastSuccessAt
                      ? `Last success: ${new Date(s.lastSuccessAt).toLocaleString("id-ID")}`
                      : "Belum pernah berhasil fetch"
                  }
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="font-mono text-muted-foreground">{s.count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Disclaimer:</strong> Artikel di-aggregate dari sumber publik (RSS feed). Hak cipta tetap milik
        penerbit asli — klik judul untuk baca di situs sumber. Sentiment scoring dilakukan AI dan
        bersifat indikatif; bukan rekomendasi jual/beli. Selalu verifikasi informasi sebelum trading.
      </p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "default" | "bull" | "bear";
}) {
  const toneClasses = {
    default: "bg-primary/10 text-primary",
    bull: "bg-bull-soft text-bull",
    bear: "bg-bear-soft text-bear",
  } as const;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-mono text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
