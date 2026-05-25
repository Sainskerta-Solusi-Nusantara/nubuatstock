import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { loadOhlcv } from "@/components/ticker/shared";
import { MTFChart } from "@/components/ticker/MTFChartLazy";

export async function TechnicalTab({ ticker }: { ticker: string }) {
  const [data, wyckoff, patterns, elliott] = await Promise.all([
    loadOhlcv(ticker),
    (async () => {
      const { analyzeWyckoff } = await import("@/lib/wyckoff/service");
      return analyzeWyckoff(ticker);
    })(),
    (async () => {
      const { getPatternsForTicker } = await import("@/lib/patterns/service");
      return getPatternsForTicker(ticker, 0.5);
    })(),
    (async () => {
      const { getElliottWavesForTicker } = await import("@/lib/elliott/service");
      return getElliottWavesForTicker(ticker);
    })(),
  ]);

  const { WyckoffCard } = await import("@/components/wyckoff/WyckoffCard");
  const { PatternCard } = await import("@/components/patterns/PatternCard");
  const { ElliottWaveSection } = await import("@/components/elliott/ElliottWaveSection");

  return (
    <div className="space-y-4">
      {wyckoff && <WyckoffCard analysis={wyckoff} />}
      {elliott.length > 0 && <ElliottWaveSection analyses={elliott} />}
      {patterns.length > 0 && <PatternCard patterns={patterns} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Technical Analysis</CardTitle>
          <CardDescription>
            Multi-timeframe chart dengan toggle indikator. Drawing tools menyusul.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState
              title="Data harga belum tersedia"
              description="Jalankan ingest EoD untuk mengisi tabel quotes_eod."
              action={{ href: "/admin", label: "Buka admin" }}
            />
          ) : (
            <MTFChart
              ticker={ticker}
              data={data}
              defaultTimeframe="1Y"
              defaultActive={["sma20", "sma50", "rsi14"]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
