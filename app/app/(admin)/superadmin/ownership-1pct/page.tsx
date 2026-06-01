import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listEmiten, searchInvestor, getSectors, PCT1_SOURCE_URL } from "@/lib/ownership1pct/service";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const fmtShares = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const ffColor = (f: number) => (f < 10 ? "text-bear" : f < 25 ? "text-amber-600" : "text-bull");

export default async function Pct1Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; sort?: string; page?: string; mode?: string; inv?: string }>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "investor" ? "investor" : "emiten";
  const q = (sp.q ?? "").trim();
  const inv = (sp.inv ?? "").trim();
  const sector = (sp.sector ?? "").trim();
  const sort = (sp.sort as "kode" | "freefloat" | "ccs" | "holders" | undefined) ?? "kode";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const sectors = await getSectors();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kepemilikan ≥1% (Review)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data per-pemegang-saham olahan dari{" "}
            <a href={PCT1_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              1pct.klinikpenyesalan.com
            </a>{" "}
            (sumber KSEI). Untuk review & pembanding dengan komposisi KSEI resmi. Belum publik.
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 text-sm">
        <Link href="/superadmin/ownership-1pct" className={`rounded-md px-3 py-1.5 font-medium ${mode === "emiten" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>Per Emiten</Link>
        <Link href="/superadmin/ownership-1pct?mode=investor" className={`rounded-md px-3 py-1.5 font-medium ${mode === "investor" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>Per Investor</Link>
      </div>

      {mode === "investor" ? (
        <InvestorView inv={inv} />
      ) : (
        <EmitenView q={q} sector={sector} sort={sort} page={page} sectors={sectors} />
      )}
    </div>
  );
}

async function EmitenView({
  q, sector, sort, page, sectors,
}: { q: string; sector: string; sort: "kode" | "freefloat" | "ccs" | "holders"; page: number; sectors: string[] }) {
  const { total, rows, fetchedAt } = await listEmiten({ q, sector, sort, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (sector) u.set("sector", sector);
    if (sort) u.set("sort", sort);
    for (const [k, v] of Object.entries(p)) { if (v === undefined || v === "") u.delete(k); else u.set(k, String(v)); }
    const s = u.toString();
    return s ? `/superadmin/ownership-1pct?${s}` : "/superadmin/ownership-1pct";
  };

  return (
    <>
      <form method="get" className="flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Cari kode emiten…" className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm uppercase" />
        <select name="sector" defaultValue={sector} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Semua sektor</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="hidden" name="sort" value={sort} />
        <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Cari</button>
        {fetchedAt && <span className="text-xs text-muted-foreground">Data diambil: {new Date(fetchedAt).toLocaleString("id-ID")}</span>}
      </form>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted-foreground">Urut:</span>
        {([["kode","Kode"],["freefloat","Free Float terkecil"],["ccs","CCS tertinggi"],["holders","Holder terbanyak"]] as const).map(([k,l]) => (
          <Link key={k} href={href({ sort: k, page: undefined })} className={`rounded-full border px-3 py-1 ${sort === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>{l}</Link>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Kode</th><th className="px-3 py-2">Emiten</th><th className="px-3 py-2">Sektor</th>
                <th className="px-3 py-2 text-right">#Holder</th><th className="px-3 py-2 text-right">Free Float</th>
                <th className="px-3 py-2 text-right">CCS</th><th className="px-3 py-2">Tipe</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono font-bold text-primary"><Link href={`/superadmin/ownership-1pct/${r.kode}`}>{r.kode}</Link></td>
                  <td className="px-3 py-2 max-w-[16rem] truncate">{r.issuerName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.sector ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.holderCount}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${ffColor(r.freeFloat)}`}>{r.freeFloat.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round(r.ccs)}</td>
                  <td className="px-3 py-2 text-xs">{r.ownershipType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">{total.toLocaleString("id-ID")} emiten · hal {page}/{totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1 })} className="inline-flex h-9 items-center rounded-md border border-input px-3">← Sebelumnya</Link>}
            {page < totalPages && <Link href={href({ page: page + 1 })} className="inline-flex h-9 items-center rounded-md border border-input px-3">Berikutnya →</Link>}
          </div>
        </div>
      )}
    </>
  );
}

async function InvestorView({ inv }: { inv: string }) {
  const holders = inv.length >= 2 ? await searchInvestor(inv) : [];
  return (
    <>
      <form method="get" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="mode" value="investor" />
        <input name="inv" defaultValue={inv} placeholder="Cari nama investor… (mis. ASTRA, BLACKROCK)" className="h-9 w-72 rounded-md border border-input bg-background px-3 text-sm" />
        <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Cari</button>
      </form>
      {inv.length < 2 ? (
        <p className="text-sm text-muted-foreground">Ketik minimal 2 huruf nama investor.</p>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-2">Investor</th><th className="px-3 py-2">Emiten</th><th className="px-3 py-2">Tipe</th><th className="px-3 py-2">D/F</th><th className="px-3 py-2 text-right">Saham</th><th className="px-3 py-2 text-right">%</th></tr>
              </thead>
              <tbody>
                {holders.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Tidak ditemukan.</td></tr>
                ) : holders.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 max-w-[20rem] truncate">{h.investorName}</td>
                    <td className="px-3 py-2 font-mono font-bold text-primary"><Link href={`/superadmin/ownership-1pct/${h.kode}`}>{h.kode}</Link></td>
                    <td className="px-3 py-2 text-xs">{h.investorType ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{h.localForeign === "F" ? "Asing" : "Lokal"}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtShares(h.totalShares)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{h.percentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}
    </>
  );
}
