import Link from "next/link";
import { Layers, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSectorMetrics, type SectorMetrics } from "@/lib/sectors/service";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sector Heatmap — Nubuat",
  description:
    "Performance ringkasan 11 sektor IDX-IC: return 1d/5d/30d/YTD, average PE/PBV/ROE, top gainer/loser per sektor.",
};

interface PageProps {
  searchParams: Promise<{ window?: "1d" | "5d" | "30d" | "ytd" }>;
}

const WINDOW_OPTIONS: Array<{ key: "1d" | "5d" | "30d" | "ytd"; label: string }> = [
  { key: "1d", label: "1 hari" },
  { key: "5d", label: "5 hari" },
  { key: "30d", label: "30 hari" },
  { key: "ytd", label: "YTD" },
];

function pickReturn(s: SectorMetrics, w: "1d" | "5d" | "30d" | "ytd"): number | null {
  if (w === "1d") return s.avgReturn1d;
  if (w === "5d") return s.avgReturn5d;
  if (w === "30d") return s.avgReturn30d;
  return s.avgReturnYtd;
}

/**
 * Heatmap color scale berdasarkan return %:
 *   < -5%: very bearish (dark red)
 *   -5 to -2%: bearish (red)
 *   -2 to -0.5%: slightly bearish (light red)
 *   -0.5 to 0.5%: neutral (gray)
 *   0.5 to 2%: slightly bullish (light green)
 *   2 to 5%: bullish (green)
 *   > 5%: very bullish (dark green)
 */
function heatColor(pct: number | null): string {
  if (pct == null) return "bg-muted text-muted-foreground";
  if (pct < -5) return "bg-bear text-white";
  if (pct < -2) return "bg-bear/80 text-white";
  if (pct < -0.5) return "bg-bear/50 text-white";
  if (pct < 0.5) return "bg-muted text-foreground";
  if (pct < 2) return "bg-bull/40 text-bull";
  if (pct < 5) return "bg-bull/75 text-white";
  return "bg-bull text-white";
}

export default async function SectorsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const window = sp.window ?? "1d";
  const metrics = await getSectorMetrics();

  const totalMarketCap = metrics.reduce((a, b) => a + b.totalMarketCapIdr, 0);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Sector Heatmap</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance ringkasan 11 sektor IDX-IC. Return = weighted average by market cap.
          Klik card sektor untuk drill-down ke screener.
        </p>
      </header>

      {/* Window selector */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-1 w-fit">
        {WINDOW_OPTIONS.map((w) => (
          <Link
            key={w.key}
            href={`/sectors?window=${w.key}`}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition",
              window === w.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {/* Heatmap grid — proportional to market cap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Heatmap — ukuran sel proportional terhadap market cap, warna = return {window}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid auto-rows-[76px] grid-cols-2 gap-2 sm:auto-rows-[96px] sm:grid-cols-3 lg:grid-cols-4">
            {metrics.map((s) => {
              const ret = pickReturn(s, window);
              const weight = (s.totalMarketCapIdr / totalMarketCap) * 100;
              // Cell row span proportional to weight (max span = 3)
              const rowSpan = weight > 15 ? 3 : weight > 8 ? 2 : 1;
              return (
                <Link
                  key={s.kode}
                  href={`/screener?sector=${s.kode}`}
                  className={cn(
                    "flex flex-col justify-between rounded-md p-3 transition hover:scale-[1.02]",
                    heatColor(ret),
                  )}
                  style={{ gridRow: `span ${rowSpan}` }}
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      {s.kode}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm font-bold leading-tight">
                      {s.nama}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="font-mono text-2xl font-bold">
                      {ret != null ? `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%` : "—"}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-80">
                      <span>{s.totalEmiten} emiten</span>
                      <span>{weight.toFixed(1)}% MC</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ranking table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sector Ranking — detail metrics</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Sektor</th>
                <th className="px-3 py-2 text-right">Emiten</th>
                <th className="px-3 py-2 text-right">Mkt Cap</th>
                <th className="px-3 py-2 text-right">1d</th>
                <th className="px-3 py-2 text-right">5d</th>
                <th className="px-3 py-2 text-right">30d</th>
                <th className="px-3 py-2 text-right">YTD</th>
                <th className="px-3 py-2 text-right">Avg P/E</th>
                <th className="px-3 py-2 text-right">Avg P/BV</th>
                <th className="px-3 py-2 text-right">Avg ROE</th>
                <th className="px-3 py-2 text-right">Avg Div Yld</th>
                <th className="px-3 py-2 text-left">Top Mover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.map((s) => (
                <tr key={s.kode} className="transition hover:bg-accent/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/screener?sector=${s.kode}`}
                      className="flex items-center gap-1 transition hover:underline"
                    >
                      <span className="font-semibold">{s.nama}</span>
                      <ArrowRight className="h-3 w-3 opacity-40" />
                    </Link>
                    <div className="text-[10px] font-mono text-muted-foreground">{s.kode}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{s.totalEmiten}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{formatCompactIDR(s.totalMarketCapIdr)}</td>
                  <td className={cn("px-3 py-2 text-right font-mono font-semibold", retToneClass(s.avgReturn1d))}>
                    {fmtRet(s.avgReturn1d)}
                  </td>
                  <td className={cn("px-3 py-2 text-right font-mono", retToneClass(s.avgReturn5d))}>
                    {fmtRet(s.avgReturn5d)}
                  </td>
                  <td className={cn("px-3 py-2 text-right font-mono", retToneClass(s.avgReturn30d))}>
                    {fmtRet(s.avgReturn30d)}
                  </td>
                  <td className={cn("px-3 py-2 text-right font-mono", retToneClass(s.avgReturnYtd))}>
                    {fmtRet(s.avgReturnYtd)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {s.avgPe != null ? s.avgPe.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {s.avgPbv != null ? s.avgPbv.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {s.avgRoe != null ? `${(s.avgRoe * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {s.avgDividendYield != null ? `${(s.avgDividendYield * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.topGainerKode && (
                      <Link href={`/ticker/${s.topGainerKode}`} className="inline-flex items-center gap-1 text-bull hover:underline">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-mono font-bold">{s.topGainerKode}</span>
                        <span>{fmtRet(s.topGainerChangePct)}</span>
                      </Link>
                    )}
                    {s.topLoserKode && s.topLoserKode !== s.topGainerKode && (
                      <Link href={`/ticker/${s.topLoserKode}`} className="ml-2 inline-flex items-center gap-1 text-bear hover:underline">
                        <TrendingDown className="h-3 w-3" />
                        <span className="font-mono font-bold">{s.topLoserKode}</span>
                        <span>{fmtRet(s.topLoserChangePct)}</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Catatan:</strong> Return per sektor adalah <strong>weighted average</strong> by market cap
        (bias terhadap large cap di sektor tsb). P/E, P/BV, ROE, Div Yield juga weighted. Emiten yang
        tidak punya data fundamental tetap ikut count tapi tidak di-aggregate. Klasifikasi sektor pakai
        IDX-IC (11 sektor utama). Top gainer/loser = berdasarkan return 1d (terlepas dari window filter).
      </p>
    </div>
  );
}

function fmtRet(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function retToneClass(v: number | null): string {
  if (v == null) return "text-muted-foreground";
  return v > 0 ? "text-bull" : v < 0 ? "text-bear" : "";
}
