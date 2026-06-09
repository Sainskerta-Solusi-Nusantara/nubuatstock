import Link from "next/link";
import { Search, Sparkles, RotateCcw, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultsTable } from "@/components/screener/ResultsTable";
import { SavedScreensManager } from "@/components/screener/SavedScreensManager";
import { NlSearch } from "@/components/screener/NlSearch";
import { runScreener, listSectors, listPapan, type ScreenerFilters, type SortField } from "@/lib/screener/service";
import { SCREENER_PRESETS, getPreset } from "@/lib/screener/presets";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Screener — Nubuat",
  description: "Filter 980+ emiten IDX berdasarkan PE, PBV, ROE, dividend yield, dan kriteria fundamental lain.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function parseNum(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Pilihan jumlah baris per halaman. Default 10 (ringkas untuk pemula).
const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PER_PAGE = 10;

function perPageFromQuery(sp: Record<string, string | undefined>): number {
  const n = parseNum(sp.limit);
  return n && (PER_PAGE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PER_PAGE;
}

function filtersFromQuery(sp: Record<string, string | undefined>): ScreenerFilters {
  const preset = sp.preset ? getPreset(sp.preset) : undefined;
  const base: ScreenerFilters = preset ? { ...preset.filters } : {};

  // User override fields (allow ANY field override).
  if (sp.sector) base.sectorKode = sp.sector;
  if (sp.papan) base.papanKode = sp.papan;
  if (sp.syariah === "1") base.isSyariah = true;
  if (sp.q) base.search = sp.q;
  if (sp.minMC) base.minMarketCap = parseNum(sp.minMC);
  if (sp.maxMC) base.maxMarketCap = parseNum(sp.maxMC);
  if (sp.minPE) base.minPe = parseNum(sp.minPE);
  if (sp.maxPE) base.maxPe = parseNum(sp.maxPE);
  if (sp.minPBV) base.minPbv = parseNum(sp.minPBV);
  if (sp.maxPBV) base.maxPbv = parseNum(sp.maxPBV);
  if (sp.minROE) base.minRoe = parseNum(sp.minROE);
  if (sp.minPM) base.minProfitMargin = parseNum(sp.minPM);
  if (sp.minRG) base.minRevenueGrowth = parseNum(sp.minRG);
  if (sp.maxDER) base.maxDebtToEquity = parseNum(sp.maxDER);
  if (sp.minDY) base.minDividendYield = parseNum(sp.minDY);
  // Technical filters
  if (sp.minStoch) base.minStochK_10_5_5 = parseNum(sp.minStoch);
  if (sp.maxStoch) base.maxStochK_10_5_5 = parseNum(sp.maxStoch);
  if (sp.minRSI) base.minRsi14 = parseNum(sp.minRSI);
  if (sp.maxRSI) base.maxRsi14 = parseNum(sp.maxRSI);
  if (sp.aboveSMA50 === "1") base.isAboveSma50 = true;
  if (sp.aboveSMA200 === "1") base.isAboveSma200 = true;
  if (sp.bullStack === "1") base.isBullishMaStack = true;
  if (sp.bbSqueeze === "1") base.isBbSqueeze = true;
  if (sp.goldenCross === "1") base.isGoldenCrossRecent = true;
  if (sp.minADX) base.minAdx = parseNum(sp.minADX);
  if (sp.stochCross === "1") base.stochBullishCross_10_5_5 = true;
  if (sp.macdUp === "1") base.macdHistogramTurningUp = true;
  if (sp.minVolRatio) base.minVolumeRatio = parseNum(sp.minVolRatio);
  if (sp.sort) base.sort = sp.sort as SortField;
  if (sp.sortDir) base.sortDir = sp.sortDir as "asc" | "desc";

  base.limit = perPageFromQuery(sp);
  base.offset = parseNum(sp.offset) ?? 0;
  return base;
}

function buildBaseHref(sp: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "sort" && k !== "sortDir") params.set(k, v);
  }
  const qs = params.toString();
  return `/screener${qs ? `?${qs}` : ""}`;
}

export default async function ScreenerPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = filtersFromQuery(sp);
  const perPage = perPageFromQuery(sp);
  const activePreset = sp.preset ? getPreset(sp.preset) : undefined;

  const [{ rows, total, filtersApplied }, sectors, papan] = await Promise.all([
    runScreener(filters),
    listSectors(),
    listPapan(),
  ]);

  const baseHref = buildBaseHref(sp);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 shrink-0 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stock Screener</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter universe 980+ emiten IDX berdasarkan PE, PBV, ROE, dividend yield, dan kriteria
            fundamental + technical lain.
          </p>
        </div>
        <SavedScreensManager />
      </header>

      {/* Cari dengan AI (Natural Language) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Cari dengan AI
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              BETA
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ketik kriteria dalam Bahasa Indonesia biasa — AI menerjemahkannya ke filter teknikal
            dan fundamental, lalu menjalankan screener.
          </p>
        </CardHeader>
        <CardContent>
          <NlSearch />
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Strategy Presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SCREENER_PRESETS.map((p) => {
              const isActive = activePreset?.id === p.id;
              return (
                <Link
                  key={p.id}
                  href={`/screener?preset=${p.id}`}
                  className={`rounded-md border p-3 text-left transition ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {isActive && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                </Link>
              );
            })}
          </div>
          {activePreset && (
            <p className="mt-3 rounded-md bg-secondary/40 p-2 text-[11px] italic text-muted-foreground">
              <strong>Philosophy:</strong> {activePreset.philosophy}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filter form — collapsible (tersembunyi default; tetap berfungsi untuk
          power user). Preset & hasil di bawah tidak bergantung pada panel ini. */}
      <Card>
        <details open={filtersApplied > 0} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-6 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-base font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filter Lanjutan
              <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
              {filtersApplied > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {filtersApplied} aktif
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-6 pb-6">
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sp.preset && <input type="hidden" name="preset" value={sp.preset} />}
            {sp.limit && <input type="hidden" name="limit" value={sp.limit} />}

            <FilterField label="Cari (kode / nama)">
              <input type="text" name="q" defaultValue={sp.q ?? ""} placeholder="BBRI, Bank" className="filter-input" />
            </FilterField>

            <FilterField label="Sektor">
              <select name="sector" defaultValue={sp.sector ?? ""} className="filter-input">
                <option value="">Semua sektor</option>
                {sectors.map((s) => (
                  <option key={s.kode} value={s.kode}>
                    {s.nama}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Papan listing">
              <select name="papan" defaultValue={sp.papan ?? ""} className="filter-input">
                <option value="">Semua papan</option>
                {papan.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Syariah only">
              <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                <input type="checkbox" name="syariah" value="1" defaultChecked={sp.syariah === "1"} />
                <span className="text-xs">Hanya saham syariah</span>
              </label>
            </FilterField>

            <FilterField label="Market Cap (Rp)">
              <div className="flex gap-1">
                <input type="number" name="minMC" defaultValue={sp.minMC ?? ""} placeholder="Min" className="filter-input" />
                <input type="number" name="maxMC" defaultValue={sp.maxMC ?? ""} placeholder="Max" className="filter-input" />
              </div>
            </FilterField>

            <FilterField label="P/E Ratio">
              <div className="flex gap-1">
                <input type="number" step="0.1" name="minPE" defaultValue={sp.minPE ?? ""} placeholder="Min" className="filter-input" />
                <input type="number" step="0.1" name="maxPE" defaultValue={sp.maxPE ?? ""} placeholder="Max" className="filter-input" />
              </div>
            </FilterField>

            <FilterField label="P/BV Ratio">
              <div className="flex gap-1">
                <input type="number" step="0.1" name="minPBV" defaultValue={sp.minPBV ?? ""} placeholder="Min" className="filter-input" />
                <input type="number" step="0.1" name="maxPBV" defaultValue={sp.maxPBV ?? ""} placeholder="Max" className="filter-input" />
              </div>
            </FilterField>

            <FilterField label="Min ROE (0-1)">
              <input type="number" step="0.01" name="minROE" defaultValue={sp.minROE ?? ""} placeholder="0.15" className="filter-input" />
            </FilterField>

            <FilterField label="Min Profit Margin">
              <input type="number" step="0.01" name="minPM" defaultValue={sp.minPM ?? ""} placeholder="0.10" className="filter-input" />
            </FilterField>

            <FilterField label="Min Revenue Growth">
              <input type="number" step="0.01" name="minRG" defaultValue={sp.minRG ?? ""} placeholder="0.20" className="filter-input" />
            </FilterField>

            <FilterField label="Max Debt/Equity">
              <input type="number" step="0.1" name="maxDER" defaultValue={sp.maxDER ?? ""} placeholder="1.5" className="filter-input" />
            </FilterField>

            <FilterField label="Min Dividend Yield">
              <input type="number" step="0.01" name="minDY" defaultValue={sp.minDY ?? ""} placeholder="0.04" className="filter-input" />
            </FilterField>

            {/* Technical Filters separator */}
            <div className="col-span-full mt-2 -mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>📊 Technical Filters</span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-primary">REQUIRE TECHNICAL SNAPSHOT</span>
            </div>

            <FilterField label="Stoch 10,5,5 %K range">
              <div className="flex gap-1">
                <input type="number" step="1" name="minStoch" defaultValue={sp.minStoch ?? ""} placeholder="Min" className="filter-input" />
                <input type="number" step="1" name="maxStoch" defaultValue={sp.maxStoch ?? ""} placeholder="35 (Swing)" className="filter-input" />
              </div>
            </FilterField>

            <FilterField label="RSI 14 range">
              <div className="flex gap-1">
                <input type="number" step="1" name="minRSI" defaultValue={sp.minRSI ?? ""} placeholder="30" className="filter-input" />
                <input type="number" step="1" name="maxRSI" defaultValue={sp.maxRSI ?? ""} placeholder="55" className="filter-input" />
              </div>
            </FilterField>

            <FilterField label="Min ADX 14 (trend strength)">
              <input type="number" step="1" name="minADX" defaultValue={sp.minADX ?? ""} placeholder="20+" className="filter-input" />
            </FilterField>

            <FilterField label="Min Volume Ratio (5d/60d)">
              <input type="number" step="0.1" name="minVolRatio" defaultValue={sp.minVolRatio ?? ""} placeholder="1.0 = avg" className="filter-input" />
            </FilterField>

            <FilterField label="Momentum">
              <div className="grid grid-cols-1 gap-1 text-[11px]">
                <label className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
                  <input type="checkbox" name="stochCross" value="1" defaultChecked={sp.stochCross === "1"} />
                  <span>Stoch %K&gt;%D (reversal)</span>
                </label>
                <label className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
                  <input type="checkbox" name="macdUp" value="1" defaultChecked={sp.macdUp === "1"} />
                  <span>MACD histogram ↑</span>
                </label>
              </div>
            </FilterField>

            <FilterField label="MA & Trend">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <label className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
                  <input type="checkbox" name="aboveSMA50" value="1" defaultChecked={sp.aboveSMA50 === "1"} />
                  <span>&gt;SMA50</span>
                </label>
                <label className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
                  <input type="checkbox" name="aboveSMA200" value="1" defaultChecked={sp.aboveSMA200 === "1"} />
                  <span>&gt;SMA200</span>
                </label>
                <label className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
                  <input type="checkbox" name="bullStack" value="1" defaultChecked={sp.bullStack === "1"} />
                  <span>Bull Stack</span>
                </label>
                <label className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
                  <input type="checkbox" name="goldenCross" value="1" defaultChecked={sp.goldenCross === "1"} />
                  <span>Golden ✕</span>
                </label>
              </div>
            </FilterField>

            <FilterField label="BB Squeeze">
              <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                <input type="checkbox" name="bbSqueeze" value="1" defaultChecked={sp.bbSqueeze === "1"} />
                <span className="text-xs">Currently squeezed</span>
              </label>
            </FilterField>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
              >
                <Search className="h-3.5 w-3.5" /> Apply Filter
              </button>
              <Link
                href="/screener"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Link>
              <span className="ml-auto text-xs text-muted-foreground">
                {total.toLocaleString("id-ID")} emiten cocok
              </span>
            </div>
          </form>
          </div>
        </details>
      </Card>

      {/* Results header: ringkasan + pemilih jumlah baris */}
      <ResultsToolbar
        total={total}
        shown={rows.length}
        offset={filters.offset ?? 0}
        perPage={perPage}
        baseHref={baseHref}
      />

      {/* Results */}
      <ResultsTable
        rows={rows}
        sort={filters.sort ?? "market_cap"}
        sortDir={filters.sortDir ?? "desc"}
        baseHref={baseHref}
      />

      {/* Pagination bernomor */}
      <Pagination total={total} offset={filters.offset ?? 0} limit={perPage} baseHref={baseHref} />

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Catatan:</strong> Data fundamental dari Yahoo Finance snapshot (update periodik).
        Beberapa emiten mungkin missing data karena Yahoo tidak punya coverage — emiten tersebut
        tetap muncul tapi value akan tampil &quot;—&quot;. Filter hanya bekerja kalau emiten punya data
        relevan (mis. min ROE 15% akan eksklusi emiten yang ROE-nya null).
      </p>

      <style>{`
        .filter-input {
          height: 2.25rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
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

/** Bangun URL dari baseHref dengan override param tertentu. */
function withParams(baseHref: string, params: Record<string, string | number>): string {
  const url = new URL(baseHref, "http://x");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return url.pathname + url.search;
}

/** Toolbar di atas tabel: ringkasan "menampilkan X–Y dari N" + pemilih jumlah baris. */
function ResultsToolbar({
  total,
  shown,
  offset,
  perPage,
  baseHref,
}: {
  total: number;
  shown: number;
  offset: number;
  perPage: number;
  baseHref: string;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + shown;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
      <span className="text-muted-foreground">
        Menampilkan <strong className="text-foreground">{from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")}</strong> dari{" "}
        {total.toLocaleString("id-ID")} emiten
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Baris:</span>
        {PER_PAGE_OPTIONS.map((n) => (
          <Link
            key={n}
            // Ganti jumlah baris → kembali ke halaman 1 (offset 0).
            href={withParams(baseHref, { limit: n, offset: 0 })}
            className={`rounded-md border px-2 py-0.5 font-medium ${
              n === perPage
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {n}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Daftar nomor halaman dengan elipsis: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current: number, totalPages: number): Array<number | "…"> {
  const out: Array<number | "…"> = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= current - 1 && p <= current + 1)) {
      out.push(p);
    } else if (out[out.length - 1] !== "…") {
      out.push("…");
    }
  }
  return out;
}

function Pagination({
  total,
  offset,
  limit,
  baseHref,
}: {
  total: number;
  offset: number;
  limit: number;
  baseHref: string;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  const page = Math.floor(offset / limit) + 1;

  const urlForPage = (p: number) => withParams(baseHref, { limit, offset: (p - 1) * limit });
  const items = pageWindow(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 rounded-md border border-border bg-card p-2 text-sm">
      <Link
        href={urlForPage(Math.max(1, page - 1))}
        aria-label="Sebelumnya"
        className={`rounded-md border border-border px-2.5 py-1 text-xs ${page === 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"}`}
      >
        ‹
      </Link>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={urlForPage(it)}
            className={`min-w-[2rem] rounded-md border px-2 py-1 text-center text-xs ${
              it === page
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border hover:bg-accent"
            }`}
          >
            {it}
          </Link>
        ),
      )}
      <Link
        href={urlForPage(Math.min(totalPages, page + 1))}
        aria-label="Berikutnya"
        className={`rounded-md border border-border px-2.5 py-1 text-xs ${page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-accent"}`}
      >
        ›
      </Link>
    </div>
  );
}
