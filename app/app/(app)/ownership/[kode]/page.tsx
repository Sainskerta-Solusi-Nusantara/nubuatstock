import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOwnershipByKode } from "@/lib/ksei/service";
import { KSEI_TYPE_LABELS } from "@/lib/ksei/parse";
import type { KseiBreakdown } from "@/db/schema/ksei";

export const dynamic = "force-dynamic";

const TYPE_ORDER: (keyof KseiBreakdown)[] = ["ID", "CP", "MF", "IB", "IS", "PF", "SC", "FD", "OT"];
const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtPct = (part: number, total: number) => (total > 0 ? ((part / total) * 100).toFixed(2) : "0.00") + "%";

export default async function OwnershipDetailPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const row = await getOwnershipByKode(kode);
  if (!row) notFound();

  const local = row.local as KseiBreakdown;
  const foreign = row.foreign as KseiBreakdown;
  const total = row.secNum;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <Link href="/ownership" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Semua emiten
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Globe2 className="h-7 w-7 text-primary" />
          {row.kode}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Komposisi kepemilikan KSEI · posisi <strong>{row.posDate}</strong> · harga Rp{" "}
          {row.priceIdr.toLocaleString("id-ID")}
        </p>
      </header>

      {/* Ringkasan Lokal vs Asing */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Saham</div>
          <div className="mt-1 font-mono text-lg font-bold">{fmt(total)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Lokal</div>
          <div className="mt-1 font-mono text-lg font-bold text-bull">{row.localPct.toFixed(2)}%</div>
          <div className="text-[11px] text-muted-foreground">{fmt(row.localTotal)} saham</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Asing</div>
          <div className="mt-1 font-mono text-lg font-bold text-bear">{row.foreignPct.toFixed(2)}%</div>
          <div className="text-[11px] text-muted-foreground">{fmt(row.foreignTotal)} saham</div>
        </CardContent></Card>
      </div>

      {/* Bar Lokal vs Asing */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div className="flex h-full">
          <div className="bg-bull" style={{ width: `${row.localPct}%` }} title={`Lokal ${row.localPct.toFixed(2)}%`} />
          <div className="bg-bear" style={{ width: `${row.foreignPct}%` }} title={`Asing ${row.foreignPct.toFixed(2)}%`} />
        </div>
      </div>

      {/* Rincian per tipe investor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rincian per Tipe Investor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Tipe Investor</th>
                  <th className="px-4 py-2 text-right">Lokal</th>
                  <th className="px-4 py-2 text-right">%</th>
                  <th className="px-4 py-2 text-right">Asing</th>
                  <th className="px-4 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {TYPE_ORDER.map((k) => {
                  const l = local[k] ?? 0;
                  const f = foreign[k] ?? 0;
                  if (l === 0 && f === 0) return null;
                  return (
                    <tr key={k} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium">{KSEI_TYPE_LABELS[k]}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(l)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{fmtPct(l, total)}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(f)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{fmtPct(f, total)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(row.localTotal)}</td>
                  <td className="px-4 py-2 text-right font-mono">{row.localPct.toFixed(2)}%</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(row.foreignTotal)}</td>
                  <td className="px-4 py-2 text-right font-mono">{row.foreignPct.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Sumber: data resmi KSEI (komposisi kepemilikan). Edukasi, bukan ajakan jual/beli.
      </p>
    </div>
  );
}
