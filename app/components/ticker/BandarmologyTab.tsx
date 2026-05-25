import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export async function BandarmologyTab({ ticker }: { ticker: string }) {
  const { computeBandarmology } = await import("@/lib/bandarmology/service");
  const { BandarmologyCard } = await import("@/components/bandarmology/BandarmologyCard");
  const metrics = await computeBandarmology(ticker);

  if (!metrics) {
    return (
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
    );
  }

  return <BandarmologyCard metrics={metrics} />;
}
