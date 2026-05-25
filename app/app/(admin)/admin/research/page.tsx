import Link from "next/link";
import { Plus, FileText, Edit, Eye, Download, ExternalLink } from "lucide-react";
import { listAdminResearch, countByStatus } from "@/lib/research/admin";
import { countResearch } from "@/lib/research/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const listFilters = {
    status: (sp.status as never) || undefined,
    q: sp.q?.trim(),
  };
  const [reports, counts, total] = await Promise.all([
    listAdminResearch({
      ...listFilters,
      limit: PAGE_SIZE,
      offset,
    }),
    countByStatus(),
    countResearch(listFilters),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riset</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola laporan riset emiten. Status workflow: draft → review → published → archived.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/research/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Tulis Riset Baru
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <StatusFilter label="Semua" status="" count={Object.values(counts).reduce((s, c) => s + c, 0)} current={sp.status ?? ""} />
        <StatusFilter label="Draft" status="draft" count={counts.draft ?? 0} current={sp.status ?? ""} />
        <StatusFilter label="Review" status="review" count={counts.review ?? 0} current={sp.status ?? ""} />
        <StatusFilter label="Published" status="published" count={counts.published ?? 0} current={sp.status ?? ""} />
        <StatusFilter label="Archived" status="archived" count={counts.archived ?? 0} current={sp.status ?? ""} />
      </div>

      <form className="flex gap-2" method="get">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Cari judul atau ticker..."
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" variant="secondary">Cari</Button>
      </form>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-semibold">Belum ada riset</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Mulai dengan klik <strong>Tulis Riset Baru</strong> di pojok kanan atas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Ticker</th>
                    <th className="px-4 py-2.5">Judul</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Rating</th>
                    <th className="px-4 py-2.5 text-right">TP</th>
                    <th className="px-4 py-2.5">Tier</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Views</th>
                    <th className="px-4 py-2.5 text-right">DLs</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono font-semibold">{r.companyKode ?? "—"}</td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <Link href={`/admin/research/${r.id}/edit`} className="hover:text-primary line-clamp-1">
                          {r.title}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">/{r.slug}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs uppercase">{r.reportType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2.5">
                        <RatingPill rating={r.rating} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {r.targetPrice ? `Rp ${new Intl.NumberFormat("id-ID").format(Number(r.targetPrice))}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px] uppercase">{r.minTierRequired}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {r.viewCount}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> {r.downloadCount}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {r.status === "published" && (
                            <Link href={`/research/${r.slug}`} target="_blank" className="rounded p-1.5 hover:bg-accent" title="View live">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <Link href={`/admin/research/${r.id}/edit`} className="rounded p-1.5 hover:bg-accent" title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/research"
          searchParams={{
            status: sp.status,
            q: sp.q,
          }}
        />
      )}
    </div>
  );
}

function StatusFilter({
  label, status, count, current,
}: { label: string; status: string; count: number; current: string }) {
  const active = current === status;
  const href = status ? `/admin/research?status=${status}` : "/admin/research";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 ${active ? "bg-primary-foreground/20" : "bg-secondary"}`}>{count}</span>
    </Link>
  );
}

function RatingPill({ rating }: { rating: string }) {
  const palette: Record<string, string> = {
    strong_buy: "text-bull bg-bull-soft",
    buy: "text-bull bg-bull-soft",
    hold: "text-neutral bg-neutral-soft",
    sell: "text-bear bg-bear-soft",
    strong_sell: "text-bear bg-bear-soft",
    not_rated: "text-muted-foreground bg-secondary",
  };
  const label: Record<string, string> = {
    strong_buy: "S.BUY", buy: "BUY", hold: "HOLD", sell: "SELL", strong_sell: "S.SELL", not_rated: "—",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${palette[rating] ?? ""}`}>
      {label[rating] ?? rating}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    review: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    published: "bg-bull-soft text-bull",
    archived: "bg-neutral-soft text-muted-foreground line-through",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${palette[status] ?? ""}`}>{status}</span>;
}
