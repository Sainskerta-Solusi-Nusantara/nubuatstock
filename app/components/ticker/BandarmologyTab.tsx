import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export async function BandarmologyTab({ ticker }: { ticker: string }) {
  const [
    { computeBandarmology },
    { BandarmologyCard },
    { computeSpike },
    { SpikeCard },
    { computeFourActor },
    { FourActorCard },
    { computeBrokerStalker },
    { BrokerStalkerCard },
    { computeMarketSummary },
    { MarketSummaryCard },
  ] = await Promise.all([
    import("@/lib/bandarmology/service"),
    import("@/components/bandarmology/BandarmologyCard"),
    import("@/lib/bandarmology/spike-service"),
    import("@/components/bandarmology/SpikeCard"),
    import("@/lib/bandarmology/four-actor-service"),
    import("@/components/bandarmology/FourActorCard"),
    import("@/lib/bandarmology/broker-stalker-service"),
    import("@/components/bandarmology/BrokerStalkerCard"),
    import("@/lib/bandarmology/market-summary-service"),
    import("@/components/bandarmology/MarketSummaryCard"),
  ]);

  const [metrics, spike, fourActor, brokerStalker, marketSummary] = await Promise.all([
    computeBandarmology(ticker),
    computeSpike(ticker),
    computeFourActor(ticker),
    computeBrokerStalker(ticker),
    computeMarketSummary(ticker),
  ]);

  return (
    <div className="space-y-4">
      {metrics ? (
        <BandarmologyCard metrics={metrics} />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Bandarmology</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Data harga belum cukup"
              description={`Diperlukan minimal 21 hari EoD untuk hitung A/D, OBV, MFI. Ingest data untuk ${ticker}.`}
              action={{ href: "/admin", label: "Setup vendor" }}
            />
          </CardContent>
        </Card>
      )}

      {/* Spike Detection — konsentrasi 1 bandar vs retail */}
      <SpikeCard data={spike} />

      {/* 4-Pelaku: Non-Retail / Sultanmologi / Foreign / Zombimologi */}
      <FourActorCard data={fourActor} />

      {/* Broker Stalker — broker mana akumulasi/distribusi + smart-money bias */}
      <BrokerStalkerCard data={brokerStalker} />

      {/* Market Summary — pergeseran momentum W4/W3/W2 + D3/D2/D1 */}
      <MarketSummaryCard data={marketSummary} />
    </div>
  );
}
