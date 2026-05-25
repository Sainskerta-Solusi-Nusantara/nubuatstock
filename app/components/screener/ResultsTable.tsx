import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCompactIDR, formatNumber, formatPercent } from "@/lib/utils/format";
import type { ScreenerRow, SortField } from "@/lib/screener/service";
import { cn } from "@/lib/utils/cn";

interface ResultsTableProps {
  rows: ScreenerRow[];
  sort: SortField;
  sortDir: "asc" | "desc";
  baseHref: string;
}

const COLUMNS: Array<{ field: SortField | null; label: string; align?: "left" | "right" }> = [
  { field: "kode", label: "Ticker", align: "left" },
  { field: null, label: "Sektor", align: "left" },
  { field: null, label: "Last", align: "right" },
  { field: "market_cap", label: "Mkt Cap", align: "right" },
  { field: "pe", label: "P/E", align: "right" },
  { field: "pbv", label: "P/BV", align: "right" },
  { field: "roe", label: "ROE", align: "right" },
  { field: "dividend_yield", label: "Div Yield", align: "right" },
  { field: null, label: "Stoch 10", align: "right" },
  { field: null, label: "RSI 14", align: "right" },
  { field: null, label: "Signals", align: "right" },
];

function SortLink({
  field,
  label,
  currentField,
  currentDir,
  baseHref,
  align,
}: {
  field: SortField | null;
  label: string;
  currentField: SortField;
  currentDir: "asc" | "desc";
  baseHref: string;
  align?: "left" | "right";
}) {
  if (!field) {
    return <span className={align === "right" ? "text-right" : ""}>{label}</span>;
  }
  const isActive = currentField === field;
  const nextDir = isActive && currentDir === "desc" ? "asc" : "desc";
  const url = new URL(baseHref, "http://x");
  url.searchParams.set("sort", field);
  url.searchParams.set("sortDir", nextDir);
  return (
    <Link
      href={url.pathname + url.search}
      className={cn(
        "inline-flex items-center gap-0.5 transition hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
        align === "right" ? "justify-end" : "",
      )}
    >
      <span>{label}</span>
      {isActive ? (
        currentDir === "desc" ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )
      ) : null}
    </Link>
  );
}

function pctBadge(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function ResultsTable({ rows, sort, sortDir, baseHref }: ResultsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-12 text-center">
        <p className="font-semibold">Tidak ada emiten yang cocok dengan kriteria</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Coba lebarkan filter (mis. naikkan max PE atau turunkan min ROE).
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[11px] font-medium uppercase tracking-wide">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "px-3 py-2",
                  col.align === "right" ? "text-right" : "text-left",
                )}
              >
                <SortLink
                  field={col.field}
                  label={col.label}
                  currentField={sort}
                  currentDir={sortDir}
                  baseHref={baseHref}
                  align={col.align}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.kode} className="transition hover:bg-accent/40">
              <td className="px-3 py-2">
                <Link
                  href={`/ticker/${r.kode}`}
                  className="flex items-center gap-2 transition hover:underline"
                >
                  {r.logoUrl ? (
                    <Image
                      src={r.logoUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 rounded-sm object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="h-5 w-5 shrink-0 rounded-sm bg-primary/10 font-mono text-[9px] font-bold leading-5 text-primary text-center">
                      {r.kode.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-mono font-bold">{r.kode}</div>
                    <div className="line-clamp-1 text-[10px] text-muted-foreground">
                      {r.namaPerusahaan}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {r.sectorName ?? "—"}
                {r.isSyariah && (
                  <span className="ml-1 rounded bg-green-500/15 px-1 text-[9px] font-semibold text-green-700 dark:text-green-300">
                    SYARIAH
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                <div>{r.lastClose != null ? formatNumber(r.lastClose, 0) : "—"}</div>
                {r.changePct1d != null && (
                  <div
                    className={cn(
                      "text-[10px]",
                      r.changePct1d > 0 ? "text-bull" : r.changePct1d < 0 ? "text-bear" : "text-muted-foreground",
                    )}
                  >
                    {pctBadge(r.changePct1d)}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {r.marketCapIdr != null ? formatCompactIDR(r.marketCapIdr) : "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {r.peRatio != null ? r.peRatio.toFixed(1) : "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {r.pbvRatio != null ? r.pbvRatio.toFixed(2) : "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {r.roe != null ? `${(r.roe * 100).toFixed(1)}%` : "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {r.dividendYield != null ? `${(r.dividendYield * 100).toFixed(2)}%` : "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {r.stochK_10_5_5 != null ? (
                  <span className={r.stochK_10_5_5 < 20 ? "text-bull" : r.stochK_10_5_5 > 80 ? "text-bear" : ""}>
                    {r.stochK_10_5_5.toFixed(0)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {r.rsi14 != null ? (
                  <span className={r.rsi14 < 30 ? "text-bull" : r.rsi14 > 70 ? "text-bear" : ""}>
                    {r.rsi14.toFixed(0)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex flex-wrap justify-end gap-0.5">
                  {r.isBullishMaStack && (
                    <span className="rounded bg-bull-soft px-1 py-0.5 text-[8px] font-bold text-bull" title="Bullish MA Stack (SMA20 > SMA50 > SMA200)">🟢</span>
                  )}
                  {r.isBbSqueeze && (
                    <span className="rounded bg-yellow-500/15 px-1 py-0.5 text-[8px] font-bold text-yellow-700" title="Bollinger Band Squeeze">🔶</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
