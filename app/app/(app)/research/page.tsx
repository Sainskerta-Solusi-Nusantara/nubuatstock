import Link from "next/link";
import Image from "next/image";
import { Download, Eye, TrendingDown, TrendingUp, Search } from "lucide-react";
import { listPublishedResearch, RATING_DISPLAY, REPORT_TYPE_LABEL, HORIZON_LABEL } from "@/lib/research/service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  ticker?: string;
  sector?: string;
  rating?: string;
  type?: string;
}

export default async function ResearchListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const reports = await listPublishedResearch({
    q: sp.q?.trim(),
    ticker: sp.ticker?.trim(),
    sector: sp.sector?.trim(),
    rating: sp.rating?.trim(),
    reportType: sp.type?.trim(),
    limit: 60,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Riset</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Laporan riset emiten ala sekuritas — dibuat oleh tim analis Nubuat & kontributor. Setiap laporan menyertakan
          thesis, valuasi, dan risiko. Download PDF untuk referensi offline.
        </p>
      </div>

      <FilterBar current={sp} />

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({ current }: { current: SearchParams }) {
  return (
    <form className="flex flex-wrap items-center gap-2" method="get">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="Cari judul atau ticker..."
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
        />
      </div>
      <select name="rating" defaultValue={current.rating ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Semua rating</option>
        <option value="strong_buy">Strong Buy</option>
        <option value="buy">Buy</option>
        <option value="hold">Hold</option>
        <option value="sell">Sell</option>
        <option value="strong_sell">Strong Sell</option>
      </select>
      <select name="type" defaultValue={current.type ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Semua jenis</option>
        <option value="initiation">Initiation</option>
        <option value="update">Update</option>
        <option value="earnings_review">Earnings Review</option>
        <option value="thematic">Thematic</option>
        <option value="sector">Sector</option>
        <option value="macro">Macro</option>
        <option value="flash">Flash Note</option>
      </select>
      <input
        type="text"
        name="ticker"
        defaultValue={current.ticker ?? ""}
        placeholder="BBRI"
        maxLength={5}
        className="h-10 w-20 rounded-md border border-input bg-background px-3 text-sm font-mono uppercase"
      />
      <button className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110">
        Filter
      </button>
    </form>
  );
}

interface ReportCardProps {
  report: Awaited<ReturnType<typeof listPublishedResearch>>[number];
}

function ReportCard({ report }: ReportCardProps) {
  const rating = RATING_DISPLAY[report.rating] ?? RATING_DISPLAY.not_rated!;
  const upsidePct = report.upsideDownsidePct != null ? Number(report.upsideDownsidePct) : null;
  const upsideNorm = upsidePct != null ? (Math.abs(upsidePct) < 5 ? upsidePct * 100 : upsidePct) : null;

  return (
    <Card className="group overflow-hidden transition hover:border-primary/40 hover:shadow-md">
      <Link href={`/research/${report.slug}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            {report.companyKode ? (
              <div className="inline-flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-wider">{report.companyKode}</span>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {REPORT_TYPE_LABEL[report.reportType] ?? report.reportType}
                </Badge>
              </div>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {REPORT_TYPE_LABEL[report.reportType] ?? report.reportType}
              </Badge>
            )}
            <Badge className={cn("text-[10px] uppercase tracking-wider", rating.color, "bg-transparent border border-current")}>
              {rating.label}
            </Badge>
          </div>

          {report.companyName && (
            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{report.companyName}</div>
          )}

          <h3 className="mt-3 font-semibold leading-snug line-clamp-2">{report.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{report.summary}</p>

          {/* Target & upside */}
          {(report.targetPrice || upsidePct != null) && (
            <div className="mt-4 flex items-center gap-4 rounded-md border border-border bg-accent/30 px-3 py-2 text-xs">
              {report.targetPrice && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Target</div>
                  <div className="font-mono font-semibold">Rp {new Intl.NumberFormat("id-ID").format(Number(report.targetPrice))}</div>
                </div>
              )}
              {upsideNorm != null && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Upside</div>
                  <div className={cn("flex items-center gap-1 font-mono font-semibold", upsideNorm >= 0 ? "text-bull" : "text-bear")}>
                    {upsideNorm >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {upsideNorm >= 0 ? "+" : ""}
                    {upsideNorm.toFixed(2)}%
                  </div>
                </div>
              )}
              <div className="ml-auto">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horizon</div>
                <div className="text-xs">{HORIZON_LABEL[report.timeHorizon]}</div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {report.authorName} · {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {report.viewCount}</span>
              <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {report.downloadCount}</span>
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-12 text-center">
      <h3 className="font-semibold">Belum ada laporan riset terbit</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Tim analis Nubuat sedang menyiapkan laporan pertama.
      </p>
    </div>
  );
}
