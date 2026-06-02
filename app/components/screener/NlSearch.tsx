"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Loader2 } from "lucide-react";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import type { ScreenerRow } from "@/lib/screener/service";

/**
 * NL Screener (client) — textbox query Bahasa Indonesia + tombol "Cari dengan AI".
 * POST ke /api/screener/nl, lalu tampilkan:
 *  - chips: filter hasil terjemahan AI (field → nilai)
 *  - tabel: hasil screener (REUSE shape ScreenerRow dari service).
 *
 * Tidak mengubah UI screener manual; ini section terpisah di atas form manual.
 */

interface NlResponse {
  ok: boolean;
  data?: {
    query: string;
    filter: Record<string, unknown>;
    raw: Record<string, unknown>;
    results: { rows: ScreenerRow[]; total: number; filtersApplied: number };
  };
  error?: { code: string; message: string };
}

// Label ramah untuk chip filter.
const FIELD_LABEL: Record<string, string> = {
  sectorKode: "Sektor",
  subSectorKode: "Sub-sektor",
  papanKode: "Papan",
  isSyariah: "Syariah",
  search: "Cari",
  minMarketCap: "Min Mkt Cap",
  maxMarketCap: "Max Mkt Cap",
  minPe: "Min P/E",
  maxPe: "Max P/E",
  minPbv: "Min P/BV",
  maxPbv: "Max P/BV",
  minRoe: "Min ROE",
  minProfitMargin: "Min Margin",
  minRevenueGrowth: "Min Growth",
  maxDebtToEquity: "Max DER",
  minCurrentRatio: "Min Current Ratio",
  minDividendYield: "Min Div Yield",
  minAvgVolume3Mo: "Min Avg Vol 3M",
  minStochK_10_5_5: "Min Stoch10",
  maxStochK_10_5_5: "Max Stoch10",
  stochBullishCross_10_5_5: "Stoch %K>%D",
  minStochK_14_3_3: "Min Stoch14",
  maxStochK_14_3_3: "Max Stoch14",
  minStochK_5_3_3: "Min Stoch5",
  maxStochK_5_3_3: "Max Stoch5",
  minRsi14: "Min RSI",
  maxRsi14: "Max RSI",
  macdAboveZero: "MACD > 0",
  macdHistogramTurningUp: "MACD hist ↑",
  macdHistogramTurningDown: "MACD hist ↓",
  minMfi14: "Min MFI",
  maxMfi14: "Max MFI",
  isAboveSma20: "> SMA20",
  isAboveSma50: "> SMA50",
  isAboveSma200: "> SMA200",
  isBullishMaStack: "Bull MA Stack",
  isBearishMaStack: "Bear MA Stack",
  isGoldenCrossRecent: "Golden Cross",
  isDeathCrossRecent: "Death Cross",
  isBbSqueeze: "BB Squeeze",
  minAtr14: "Min ATR",
  maxAtr14: "Max ATR",
  minVolumeRatio: "Min Vol Ratio",
  minAdx: "Min ADX",
  maxDistFrom52wHighPct: "Dekat 52w High",
  maxDistFrom52wLowPct: "Dekat 52w Low",
  sort: "Urut",
  sortDir: "Arah",
};

const HIDDEN_CHIP_FIELDS = new Set(["limit", "offset"]);

const EXAMPLES = [
  "saham bank RSI di bawah 30 dan volume naik",
  "emiten murah PE di bawah 10 PBV di bawah 1 ROE minimal 15%",
  "saham syariah dividen di atas 5 persen market cap di atas 10 triliun",
  "golden cross baru, harga di atas SMA200, ADX kuat",
];

function chipValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return formatNumber(value, value % 1 === 0 ? 0 : 2);
  return String(value);
}

export function NlSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NlResponse["data"] | null>(null);

  async function runSearch(q: string) {
    const text = q.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/screener/nl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const json: NlResponse = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Gagal memproses query.");
        setData(null);
        return;
      }
      setData(json.data);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  const filterEntries = data
    ? Object.entries(data.filter).filter(
        ([k, v]) => !HIDDEN_CHIP_FIELDS.has(k) && v !== undefined && v !== null,
      )
    : [];

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Mis. "saham bank RSI di bawah 30 dan volume naik"'
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length === 0}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Cari dengan AI
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                void runSearch(ex);
              }}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Filter hasil terjemahan AI
            </p>
            {filterEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                AI tidak menemukan kriteria terstruktur dari query ini. Coba lebih spesifik.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filterEntries.map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                  >
                    <span className="opacity-70">{FIELD_LABEL[k] ?? k}:</span>
                    <span className="font-semibold">{chipValue(k, v)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {data.results.total.toLocaleString("id-ID")} emiten cocok
            {data.results.rows.length < data.results.total &&
              ` (menampilkan ${data.results.rows.length})`}
          </p>

          {data.results.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Tidak ada emiten yang cocok. Coba longgarkan kriteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] font-medium uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-left">Sektor</th>
                    <th className="px-3 py-2 text-right">Last</th>
                    <th className="px-3 py-2 text-right">Mkt Cap</th>
                    <th className="px-3 py-2 text-right">P/E</th>
                    <th className="px-3 py-2 text-right">RSI 14</th>
                    <th className="px-3 py-2 text-right">Stoch 10</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.rows.map((r) => (
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
                            <div className="h-5 w-5 shrink-0 rounded-sm bg-primary/10 text-center font-mono text-[9px] font-bold leading-5 text-primary">
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
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r.lastClose != null ? formatNumber(r.lastClose, 0) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {r.marketCapIdr != null ? formatCompactIDR(r.marketCapIdr) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r.peRatio != null ? r.peRatio.toFixed(1) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r.rsi14 != null ? r.rsi14.toFixed(0) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r.stochK_10_5_5 != null ? r.stochK_10_5_5.toFixed(0) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
