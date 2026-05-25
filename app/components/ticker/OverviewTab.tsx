import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import type { CompanyDetailDTO } from "@/lib/types/companies";

import { loadOhlcv } from "@/components/ticker/shared";
import { MTFChart } from "@/components/ticker/MTFChartLazy";

export async function OverviewTab({
  ticker,
  company,
}: {
  ticker: string;
  company: CompanyDetailDTO;
}) {
  const data = await loadOhlcv(ticker);

  // Collect chart overlays dari top 2 patterns (breakout + target + stop) — visualize langsung di chart.
  const { getPatternsForTicker } = await import("@/lib/patterns/service");
  const topPatterns = (await getPatternsForTicker(ticker, 0.6)).slice(0, 2);
  const chartOverlays: Array<{ type: "horizontal-line"; price: number; label: string; color: string }> = [];
  for (const p of topPatterns) {
    chartOverlays.push({ type: "horizontal-line", price: p.keyLevels.breakout, label: `${p.patternLabel} BO`, color: "#2563eb" });
    chartOverlays.push({ type: "horizontal-line", price: p.keyLevels.target, label: `${p.patternLabel} TP`, color: "#16a34a" });
    chartOverlays.push({ type: "horizontal-line", price: p.keyLevels.stop, label: `${p.patternLabel} SL`, color: "#dc2626" });
  }

  // Nubuat Verdict — try cached snapshot first (10-50x faster), fallback compute on miss.
  const { getAnalysisSnapshot } = await import("@/lib/analysis/snapshot-service");
  const { VerdictCard } = await import("@/components/verdict/VerdictCard");
  const snapshot = await getAnalysisSnapshot(ticker);
  let verdict: Awaited<ReturnType<typeof import("@/lib/verdict/service").computeVerdict>> | null = null;
  if (
    snapshot?.verdictScore != null &&
    snapshot.verdictLabel &&
    snapshot.verdictFactors.length > 0
  ) {
    verdict = {
      kode: snapshot.kode,
      overallScore: snapshot.verdictScore,
      label: snapshot.verdictLabel as "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL",
      factors: snapshot.verdictFactors as NonNullable<
        Awaited<ReturnType<typeof import("@/lib/verdict/service").computeVerdict>>
      >["factors"],
      asOf: snapshot.computedAt,
      warnings: [],
    } as Awaited<ReturnType<typeof import("@/lib/verdict/service").computeVerdict>>;
  } else {
    // Snapshot belum ada atau belum punya factor breakdown — recompute on-demand
    // (sedikit lebih lambat tapi jamin user lihat detail). Worker daily akan
    // refresh snapshot lengkap nanti.
    const { computeVerdict } = await import("@/lib/verdict/service");
    verdict = await computeVerdict(ticker);
  }

  return (
    <div className="space-y-4">
      {verdict && <VerdictCard verdict={verdict} />}

      <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle>Harga 5 Tahun</CardTitle>
          <CardDescription>Candlestick EoD dari vendor aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState
              title="Data harga belum tersedia"
              description="Jalankan ingest EoD atau cek konfigurasi vendor."
              action={{ href: "/admin", label: "Setup vendor" }}
            />
          ) : (
            <MTFChart
              ticker={ticker}
              data={data}
              defaultTimeframe="1Y"
              defaultActive={["sma20", "sma50"]}
              overlays={chartOverlays}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Key Stats</CardTitle>
          <CardDescription>Snapshot fundamental ringkas.</CardDescription>
        </CardHeader>
        <CardContent>
          <KeyStatsList company={company} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle>Corporate Actions</CardTitle>
          <CardDescription>
            Dividen, split, rights issue, &amp; aksi lainnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Feed corporate actions belum aktif"
            description="Data dividen &amp; aksi korporasi akan tampil setelah ingestion berjalan."
          />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function KeyStatsList({ company }: { company: CompanyDetailDTO }) {
  const rows = [
    { label: "Market Cap", value: formatCompactIDR(company.marketCapIdr) },
    {
      label: "Shares Out",
      value: formatNumber(company.sharesOutstanding, 0),
    },
    {
      label: "Free Float",
      value: company.freeFloatPct == null ? "—" : `${formatNumber(company.freeFloatPct, 2)}%`,
    },
    { label: "IPO", value: company.tanggalIpo ?? "—" },
    { label: "Sektor", value: company.sectorNamaId ?? company.sectorKode },
    { label: "Papan", value: company.papanNama ?? company.papanKode },
    { label: "P/E", value: "—" },
    { label: "P/BV", value: "—" },
    { label: "Div Yield", value: "—" },
    { label: "52W High", value: "—" },
    { label: "52W Low", value: "—" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {r.label}
          </dt>
          <dd className="font-mono font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
