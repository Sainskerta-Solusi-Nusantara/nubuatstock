import { FileText, ExternalLink, Lock } from "lucide-react";
import { listSecuritiesReports, countSecuritiesReports } from "@/lib/securities-reports/service";
import { formatDateTimeId } from "@/lib/utils/datetime";
import { ReportsRefreshButton } from "./refresh-button";

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

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Terbit</th><th className="px-3 py-2">Sumber</th><th className="px-3 py-2">Judul</th>
              <th className="px-3 py-2">Kategori</th><th className="px-3 py-2 text-right">Buka</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Belum ada riset. Klik &ldquo;Refresh dari sumber&rdquo;.</td></tr>
            ) : reports.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{r.publishedAt ? formatDateTimeId(r.publishedAt) : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{r.securities}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    {r.isMemberOnly ? <Lock className="h-3 w-3 shrink-0 text-amber-600" /> : null}
                    <span className="max-w-[420px] truncate" title={r.title}>{r.title}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.category ?? "—"}{r.categoryType ? ` · ${r.categoryType}` : ""}</td>
                <td className="px-3 py-2 text-right">
                  <a href={(r.isMemberOnly ? r.sourceUrl : r.pdfUrl) ?? r.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {r.isMemberOnly ? "Sumber" : "PDF"} <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Review internal. Konten milik masing-masing sekuritas; Nubuat hanya mengagregasi tautan publik. PDF gated (🔒) hanya menautkan ke halaman sumber.
      </p>
    </div>
  );
}
