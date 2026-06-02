import { listAllSecuritiesPicks, countSecuritiesPicks, COMMON_SECURITIES } from "@/lib/securities-picks/service";
import { SecuritiesPicksManager } from "./manager";
import { PicksRefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function SecuritiesPicksPage() {
  const [rows, stats] = await Promise.all([listAllSecuritiesPicks(), countSecuritiesPicks()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="rounded bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">AGG</span>
            Rekomendasi Sekuritas <span className="text-sm font-normal text-muted-foreground">(agregator Daily Picks)</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-fetch rekomendasi harian dari sumber sekuritas publik (channel Telegram), diekstrak jadi pick terstruktur via AI. Sumber dicantumkan sebagai teks. Tampil publik di Daily Picks. {stats.total} entri · {stats.sources} sumber pada tanggal terbaru ({stats.date ?? "—"}).
          </p>
        </div>
        <PicksRefreshButton />
      </div>
      <SecuritiesPicksManager rows={rows} securitiesOptions={[...COMMON_SECURITIES]} />
    </div>
  );
}
