import Image from "next/image";
import Link from "next/link";
import { GitCompareArrows, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompareChart } from "@/components/compare/CompareChart";
import { compareTickers, type CompareTickerData } from "@/lib/compare/service";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compare — Nubuat",
  description: "Bandingkan 2-4 ticker IDX side-by-side: harga, fundamentals, verdict, sentimen news.",
};

interface PageProps {
  searchParams: Promise<{ tickers?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tickerInput = sp.tickers?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) ?? [];
  const data = tickerInput.length > 0 ? await compareTickers(tickerInput) : [];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-6 w-6 shrink-0 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Compare Tickers</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Bandingkan 2-4 emiten IDX side-by-side: harga performance, fundamental, Nubuat Verdict,
          dan coverage berita 30 hari terakhir.
        </p>
      </header>

      {/* Input form */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Tickers (pisahkan koma, max 4)
              </label>
              <input
                type="text"
                name="tickers"
                defaultValue={tickerInput.join(",")}
                placeholder="BBRI,BMRI,BBCA,BBNI"
                className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm uppercase"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Compare
            </button>
            {tickerInput.length > 0 && (
              <Link
                href="/compare"
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Reset
              </Link>
            )}
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="text-muted-foreground">Quick compares:</span>
            <Link className="text-primary underline" href="/compare?tickers=BBCA,BMRI,BBRI,BBNI">Big 4 Banks</Link>
            <Link className="text-primary underline" href="/compare?tickers=GOTO,EMTK,DMMX">Tech</Link>
            <Link className="text-primary underline" href="/compare?tickers=ASII,IMAS,UNTR">Auto + Heavy Eq</Link>
            <Link className="text-primary underline" href="/compare?tickers=KLBF,SIDO,KAEF">Pharma</Link>
            <Link className="text-primary underline" href="/compare?tickers=ANTM,MDKA,INCO">Metals</Link>
          </div>
        </CardContent>
      </Card>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-semibold">Pilih ticker untuk dibandingkan</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ketik kode ticker dipisah koma (mis. <code className="rounded bg-muted px-1">BBRI,BMRI</code>) atau klik quick compare.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Price chart overlay */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance Comparison (% Normalized)</CardTitle>
            </CardHeader>
            <CardContent>
              <CompareChart data={data} />
            </CardContent>
          </Card>

          {/* Header row with ticker info — scroll horizontally on small screens so each card stays readable */}
          <div className="-mx-1 overflow-x-auto px-1">
            <div
              className="grid gap-3 overflow-x-auto"
              style={{ gridTemplateColumns: `repeat(${data.length}, minmax(150px, 1fr))` }}
            >
              {data.map((d) => (
                <TickerHeader key={d.kode} data={d} />
              ))}
            </div>
          </div>

          {/* Fundamentals comparison */}
          <ComparisonTable data={data} />

          {/* Verdict comparison */}
          <VerdictComparison data={data} />
        </>
      )}
    </div>
  );
}

function TickerHeader({ data: d }: { data: CompareTickerData }) {
  if (!d.found) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <div className="font-mono font-bold">{d.kode}</div>
          <p className="mt-2 text-xs text-muted-foreground">Emiten tidak ditemukan</p>
        </CardContent>
      </Card>
    );
  }

  const tone = (v: number | null) =>
    v == null ? "text-muted-foreground" : v > 0 ? "text-bull" : v < 0 ? "text-bear" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          {d.logoUrl ? (
            <Image src={d.logoUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-md bg-white object-contain" unoptimized />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-mono text-sm font-bold text-primary">
              {d.kode.slice(0, 1)}
            </div>
          )}
          <Link href={`/ticker/${d.kode}`} className="flex-1 min-w-0">
            <div className="font-mono text-base font-bold">{d.kode}</div>
            <div className="line-clamp-1 text-[10px] text-muted-foreground">{d.namaPerusahaan}</div>
          </Link>
        </div>
        <div className="mt-3">
          <div className="font-mono text-xl font-bold">
            {d.lastClose != null ? formatNumber(d.lastClose, 0) : "—"}
          </div>
          <div className={cn("text-xs font-medium", tone(d.changePct1d))}>
            {d.changePct1d != null ? `${d.changePct1d >= 0 ? "+" : ""}${d.changePct1d.toFixed(2)}% hari ini` : "—"}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          <Perf label="5d" value={d.changePct5d} />
          <Perf label="30d" value={d.changePct30d} />
          <Perf label="YTD" value={d.changePctYtd} />
        </div>
      </CardContent>
    </Card>
  );
}

function Perf({ label, value }: { label: string; value: number | null }) {
  const tone = value == null ? "text-muted-foreground" : value > 0 ? "text-bull" : value < 0 ? "text-bear" : "text-muted-foreground";
  return (
    <div className="rounded bg-card/40 p-1.5 text-center">
      <div className="uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-mono font-semibold", tone)}>
        {value != null ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` : "—"}
      </div>
    </div>
  );
}

function ComparisonTable({ data }: { data: CompareTickerData[] }) {
  const ROWS = [
    { label: "Market Cap", key: "marketCapIdr" as const, fmt: (v: number) => formatCompactIDR(v) },
    { label: "P/E (TTM)", key: "peRatio" as const, fmt: (v: number) => v.toFixed(1), lowerBetter: true },
    { label: "P/BV", key: "pbvRatio" as const, fmt: (v: number) => v.toFixed(2), lowerBetter: true },
    { label: "ROE", key: "roe" as const, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Profit Margin", key: "profitMargin" as const, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Debt/Equity", key: "debtToEquity" as const, fmt: (v: number) => v.toFixed(2), lowerBetter: true },
    { label: "Revenue Growth YoY", key: "revenueGrowthYoy" as const, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Earnings Growth YoY", key: "earningsGrowthYoy" as const, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Dividend Yield", key: "dividendYield" as const, fmt: (v: number) => `${(v * 100).toFixed(2)}%` },
    { label: "Beta", key: "beta" as const, fmt: (v: number) => v.toFixed(2) },
    { label: "52w High", key: "fiftyTwoWeekHigh" as const, fmt: (v: number) => formatNumber(v, 0) },
    { label: "52w Low", key: "fiftyTwoWeekLow" as const, fmt: (v: number) => formatNumber(v, 0) },
  ];

  // For each row, find best ticker (highest/lowest) for highlighting
  const bestPerRow: Record<string, string | null> = {};
  for (const row of ROWS) {
    const vals = data.map((d) => ({ kode: d.kode, v: d[row.key] }));
    const valid = vals.filter((x) => x.v != null) as Array<{ kode: string; v: number }>;
    if (valid.length < 2) {
      bestPerRow[row.label] = null;
      continue;
    }
    valid.sort((a, b) => (row.lowerBetter ? a.v - b.v : b.v - a.v));
    bestPerRow[row.label] = valid[0]!.kode;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fundamentals Side-by-Side</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left">Metric</th>
              {data.map((d) => (
                <th key={d.kode} className="px-3 py-2 text-right font-mono">{d.kode}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-2 text-xs text-muted-foreground">{row.label}</td>
                {data.map((d) => {
                  const val = d[row.key];
                  const isBest = bestPerRow[row.label] === d.kode;
                  return (
                    <td
                      key={d.kode}
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        isBest && "font-bold text-bull",
                      )}
                    >
                      {val != null ? row.fmt(val as number) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function VerdictComparison({ data }: { data: CompareTickerData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Nubuat Verdict Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 overflow-x-auto">
        <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(160px, 1fr))` }}>
          {data.map((d) => {
            if (!d.verdict) {
              return (
                <div key={d.kode} className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  <div className="font-mono font-bold">{d.kode}</div>
                  <div className="mt-1">Verdict tidak tersedia</div>
                </div>
              );
            }
            const labelColor =
              d.verdict.label === "STRONG BUY" ? "bg-bull text-white" :
              d.verdict.label === "BUY" ? "bg-bull/85 text-white" :
              d.verdict.label === "HOLD" ? "bg-yellow-500 text-white" :
              d.verdict.label === "SELL" ? "bg-orange-500 text-white" :
              "bg-bear text-white";

            return (
              <div key={d.kode} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">{d.kode}</span>
                  <span className={cn("rounded px-2 py-0.5 text-[9px] font-bold uppercase", labelColor)}>
                    {d.verdict.label}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold">{d.verdict.overallScore.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
                <div className="space-y-1">
                  {d.verdict.factors.map((f) => (
                    <div key={f.name} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-20 truncate text-muted-foreground">{f.name}</span>
                      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full",
                            f.score >= 7 ? "bg-bull" :
                            f.score >= 5.5 ? "bg-yellow-500" :
                            f.score >= 3.5 ? "bg-orange-500" :
                            "bg-bear",
                          )}
                          style={{ width: `${(f.score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-mono font-semibold">{f.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* News coverage */}
        <div className="grid gap-2 overflow-x-auto pt-3 border-t border-border" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(120px, 1fr))` }}>
          {data.map((d) => (
            <div key={d.kode} className="rounded-md bg-card/40 p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">News 30d</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-0.5 text-bull">
                  <TrendingUp className="h-3 w-3" />{d.bullishCount30d}
                </span>
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  <Minus className="h-3 w-3" />{d.newsCount30d - d.bullishCount30d - d.bearishCount30d}
                </span>
                <span className="inline-flex items-center gap-0.5 text-bear">
                  <TrendingDown className="h-3 w-3" />{d.bearishCount30d}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">Total: {d.newsCount30d}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
