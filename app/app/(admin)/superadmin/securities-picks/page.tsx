import { listAllSecuritiesPicks, countSecuritiesPicks, COMMON_SECURITIES } from "@/lib/securities-picks/service";
import { SecuritiesPicksManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function SecuritiesPicksPage() {
  const [rows, stats] = await Promise.all([listAllSecuritiesPicks(), countSecuritiesPicks()]);

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="rounded bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">AGG</span>
          Rekomendasi Sekuritas <span className="text-sm font-normal text-muted-foreground">(agregator Daily Picks)</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Kurasi rekomendasi harian dari berbagai sekuritas (sumber dicantumkan sebagai teks, tanpa logo). Tampil publik di halaman Daily Picks. {stats.total} entri · {stats.sources} sumber pada tanggal terbaru ({stats.date ?? "—"}).
        </p>
      </div>
      <SecuritiesPicksManager rows={rows} securitiesOptions={[...COMMON_SECURITIES]} />
    </div>
  );
}
