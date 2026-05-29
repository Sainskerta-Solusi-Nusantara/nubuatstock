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
  ] = await Promise.all([
    import("@/lib/bandarmology/service"),
    import("@/components/bandarmology/BandarmologyCard"),
    import("@/lib/bandarmology/spike-service"),
    import("@/components/bandarmology/SpikeCard"),
    import("@/lib/bandarmology/four-actor-service"),
    import("@/components/bandarmology/FourActorCard"),
  ]);

  const [metrics, spike, fourActor] = await Promise.all([
    computeBandarmology(ticker),
    computeSpike(ticker),
    computeFourActor(ticker),
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

      {/* Spike Detection / Frequency Analyzer — konsentrasi 1 bandar vs retail */}
      <SpikeCard data={spike} />

      {/* 4-Pelaku: Non-Retail / Sultanmologi / Foreign / Zombimologi */}
      <FourActorCard data={fourActor} />
    </div>
  );
}
