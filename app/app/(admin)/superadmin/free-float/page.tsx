import { getFreeFloatDashboard } from "@/lib/freefloat/service";
import { fmtDateId } from "@/lib/utils/date-id";
import { RefreshButton } from "../ownership-1percent/refresh-button";
import { FreeFloatPanel } from "./free-float-panel";

export const dynamic = "force-dynamic";

export default async function FreeFloatPage() {
  const ff = await getFreeFloatDashboard();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="rounded bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">BEI</span>
            Free Float <span className="text-sm font-normal text-muted-foreground">(status pemenuhan)</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Posisi {fmtDateId(ff.snapshotDate) || "—"} · Sumber: BEI · {ff.summary.total} emiten
          </p>
        </div>
        <RefreshButton />
      </div>
      <FreeFloatPanel ff={ff} />
    </div>
  );
}
