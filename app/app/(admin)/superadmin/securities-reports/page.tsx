import { FileText } from "lucide-react";
import { listSecuritiesReports, countSecuritiesReports } from "@/lib/securities-reports/service";
import { ReportsRefreshButton } from "./refresh-button";
import { ReportAdmin } from "./report-admin";

export const dynamic = "force-dynamic";

export default async function SecuritiesReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; securities?: string }>;
}) {
  const sp = await searchParams;
  const [reports, stats] = await Promise.all([
    listSecuritiesReports({ q: sp.q, securities: sp.securities, limit: 200 }),
    countSecuritiesReports(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" /> Riset Sekuritas <span className="text-sm font-normal text-muted-foreground">(agregator)</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Riset/insight publik dari sekuritas, atribusi sumber (teks, tanpa logo) + tautan asli. {stats.total} riset · {stats.sources} sumber.
          </p>
        </div>
        <ReportsRefreshButton />
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Cari judul riset…" className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Cari</button>
      </form>

      <ReportAdmin rows={reports} />

      <p className="text-[11px] text-muted-foreground">
        Review internal. Henan = fetch otomatis (Strapi). Sekuritas lain umumnya tanpa feed publik → tambah manual (judul + tautan). Konten milik masing-masing sekuritas; Nubuat hanya mengagregasi tautan publik.
      </p>
    </div>
  );
}
