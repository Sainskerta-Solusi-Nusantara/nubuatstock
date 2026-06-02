import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEmitenWithHolders } from "@/lib/ownership1pct/service";
import { getOwnershipByKode } from "@/lib/ksei/service";

export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
function fmtIdr(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} jt`;
  return fmt(n);
}

export default async function Pct1DetailPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const data = await getEmitenWithHolders(kode);
  if (!data) notFound();
  const { emiten: e, holders } = data;

  // Harga dari KSEI BalancePos (kalau ada) untuk hitung Nilai (Rp).
  const ksei = await getOwnershipByKode(kode).catch(() => null);
  const price = ksei?.priceIdr ?? 0;
  const marketCap = price > 0 && ksei?.secNum ? price * ksei.secNum : 0;

  return (
    <div className="space-y-5">
      <Link href="/superadmin/ownership-1percent" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Semua emiten
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary px-2.5 py-1 font-mono text-lg font-bold text-primary-foreground">{e.kode}</span>
          <div>
            <div className="font-semibold">{e.issuerName}</div>
            <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
              {price > 0 && <Badge variant="outline">Harga: Rp {fmt(price)}</Badge>}
              {marketCap > 0 && <Badge variant="outline">Market Cap: Rp {fmtIdr(marketCap)}</Badge>}
              {e.sector && <Badge variant="secondary">{e.sector}</Badge>}
              <Badge className="bg-bear/15 text-bear">CCS {Math.round(e.ccs)}</Badge>
              {e.ownershipType && <Badge variant="outline">{e.ownershipType}</Badge>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{e.holderCount} pemegang saham · pegang {e.pctSum.toFixed(2)}%</div>
          <div className="text-lg font-bold">Free Float <span className="text-bull">{e.freeFloat.toFixed(2)}%</span></div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { l: "CR1 (terbesar)", v: `${e.cr1.toFixed(2)}%` },
          { l: "CR3 (top 3)", v: `${e.cr3.toFixed(2)}%` },
          { l: "HHI", v: e.hhi.toFixed(0) },
          { l: "CCS", v: Math.round(e.ccs).toString() },
        ].map((m) => (
          <Card key={m.l}><CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.l}</div>
            <div className="mt-0.5 font-mono text-lg font-bold">{m.v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Pemegang Saham</th>
                <th className="px-3 py-2">Tipe</th><th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Saham</th>
                {price > 0 && <th className="px-3 py-2 text-right">Nilai (Rp)</th>}
                <th className="px-3 py-2 text-right">% Kepemilikan</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{h.rank}</td>
                  <td className="px-3 py-2 font-medium">{h.investorName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{h.investorType || "Unknown"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">{h.localForeign === "F" ? "Asing" : "Lokal"}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono">
                    {fmt(h.totalShares)}
                    {h.holdingsScrip > 0 && <div className="text-[10px] text-muted-foreground">Scrip: {fmt(h.holdingsScrip)}</div>}
                  </td>
                  {price > 0 && <td className="px-3 py-2 whitespace-nowrap text-right font-mono">{fmtIdr(h.totalShares * price)}</td>}
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono font-semibold">{h.percentage.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <p className="text-[11px] text-muted-foreground">
        Sumber: KSEI. Nilai (Rp) memakai harga dari KSEI BalancePos bila tersedia. Review internal.
      </p>
    </div>
  );
}
