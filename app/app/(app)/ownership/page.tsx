import Link from "next/link";
import { Search, ArrowRight, Building2, Globe2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listOwnership } from "@/lib/ksei/service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kepemilikan Saham (KSEI) — Nubuat",
  description: "Komposisi kepemilikan saham IDX dari KSEI: porsi Lokal vs Asing per tipe investor, per emiten.",
};

const PAGE_SIZE = 50;

function pctColor(p: number): string {
  if (p >= 50) return "text-bear";
  if (p >= 25) return "text-amber-600";
  return "text-muted-foreground";
}

const fmtPct = (n: number) => `${n.toFixed(2)}%`;
const fmtShares = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export default async function OwnershipPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sort = (sp.sort as "kode" | "foreign" | "local" | "price" | undefined) ?? "foreign";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const { posDate, total, rows } = await listOwnership({ q, sort, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (sort) u.set("sort", sort);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === "") u.delete(k);
      else u.set(k, String(v));
    }
    const s = u.toString();
    return s ? `/ownership?${s}` : "/ownership";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Globe2 className="h-6 w-6 text-primary" />
          Kepemilikan Saham (KSEI)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Komposisi kepemilikan tiap emiten dari data resmi KSEI — porsi <strong>Lokal vs Asing</strong>{" "}
          dan rincian per tipe investor.{" "}
          {posDate ? <>Posisi per <strong>{posDate}</strong>.</> : null}
        </p>
      </header>

      {!posDate ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Data KSEI belum tersedia. Admin perlu mengunggah file komposisi kepemilikan dulu.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search + sort */}
          <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari kode emiten… (mis. BBRI, ADRO)"
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <input type="hidden" name="sort" value={sort} />
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Cari
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Urut:</span>
            {([
              { key: "foreign", label: "% Asing tertinggi" },
              { key: "local", label: "% Lokal tertinggi" },
              { key: "kode", label: "Kode A-Z" },
              { key: "price", label: "Harga tertinggi" },
            ] as const).map((s) => (
              <Link
                key={s.key}
                href={buildHref({ sort: s.key, page: undefined })}
                className={`rounded-full border px-3 py-1 transition ${
                  sort === s.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Kode</th>
                      <th className="px-4 py-2 text-right">Harga</th>
                      <th className="px-4 py-2 text-right">Total Saham</th>
                      <th className="px-4 py-2 text-right">% Asing</th>
                      <th className="px-4 py-2 text-right">% Lokal</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Tidak ada emiten yang cocok.</td></tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                          <td className="px-4 py-2 font-mono font-bold text-primary">
                            <Link href={`/ownership/${r.kode}`}>{r.kode}</Link>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{r.priceIdr.toLocaleString("id-ID")}</td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">{fmtShares(r.secNum)}</td>
                          <td className={`px-4 py-2 text-right font-mono font-semibold ${pctColor(r.foreignPct)}`}>{fmtPct(r.foreignPct)}</td>
                          <td className="px-4 py-2 text-right font-mono">{fmtPct(r.localPct)}</td>
                          <td className="px-4 py-2 text-right">
                            <Link href={`/ownership/${r.kode}`} className="inline-flex text-muted-foreground hover:text-primary">
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">
                {total.toLocaleString("id-ID")} emiten · halaman {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildHref({ page: page - 1 })} className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent">← Sebelumnya</Link>
                )}
                {page < totalPages && (
                  <Link href={buildHref({ page: page + 1 })} className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent">Berikutnya →</Link>
                )}
              </div>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3" />
            Data komposisi kepemilikan resmi KSEI. Edukasi, bukan ajakan jual/beli.
          </p>
        </>
      )}
    </div>
  );
}
