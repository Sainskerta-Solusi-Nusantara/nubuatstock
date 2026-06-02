import { getChangelogForClient, getKlinikDashboardData } from "@/lib/ownership1pct/service";
import { fmtDateId } from "@/lib/utils/date-id";
import { RefreshButton } from "./refresh-button";
import { KlinikDashboard } from "./klinik-dashboard";

export const dynamic = "force-dynamic";

export default async function Pct1Page() {
  const [data, changelog] = await Promise.all([
    getKlinikDashboardData(),
    getChangelogForClient(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="rounded bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">IDX</span>
            Kepemilikan ≥1% <span className="text-sm font-normal text-muted-foreground">(review)</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Per {fmtDateId(data.snapshotDate) || "—"} · Sumber: KSEI &amp; BEI
            {data.fetchedAt ? ` · diambil ${new Date(data.fetchedAt).toLocaleString("id-ID")}` : ""}
          </p>
        </div>
        <RefreshButton />
      </div>

      {data.emiten.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Belum ada data. Klik &ldquo;Refresh dari sumber&rdquo;.
        </div>
      ) : (
        <KlinikDashboard data={data} changelog={changelog} />
      )}
    </div>
  );
}
