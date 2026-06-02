import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { listSecuritiesPicksGrouped } from "@/lib/securities-picks/service";
import { securitiesSiteUrl } from "@/lib/securities/sites";
import { fmtDateId } from "@/lib/utils/date-id";

const nf = new Intl.NumberFormat("id-ID");
const fmt = (n: number | null) => (n == null ? "—" : nf.format(n));

/**
 * "Rekomendasi Sekuritas" — agregator pilihan harian dari berbagai sekuritas,
 * disajikan sebagai SATU TABEL flat agar mudah dipindai. Sumber = teks (tanpa
 * logo). Server component.
 */
export async function SecuritiesPicksSection() {
  const { date, groups } = await listSecuritiesPicksGrouped();
  const rows = groups.flatMap((g) => g.picks);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Building2 className="size-4 text-primary" /> Rekomendasi Sekuritas
        </h2>
        <span className="text-xs text-muted-foreground">{date ? fmtDateId(date) : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Rangkuman pilihan harian dari berbagai sekuritas (Nubuat sebagai agregator). Bukan rekomendasi Nubuat — edukasi, bukan ajakan jual/beli.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Sumber</th><th className="px-3 py-2">Kode</th><th className="px-3 py-2">Aksi</th>
              <th className="px-3 py-2 text-right">Entry</th><th className="px-3 py-2 text-right">Support</th>
              <th className="px-3 py-2 text-right">Resist.</th><th className="px-3 py-2 text-right">Target</th>
              <th className="px-3 py-2 text-right">Stop</th><th className="px-3 py-2">Catatan</th><th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                  {securitiesSiteUrl(p.securities) ? (
                    <a href={securitiesSiteUrl(p.securities)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-primary hover:underline">
                      {p.securities} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : p.securities}
                </td>
                <td className="px-3 py-2"><Link href={`/ticker/${p.kode}`} className="font-mono font-bold text-primary hover:underline">{p.kode}</Link></td>
                <td className="px-3 py-2">{p.action ? <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[10px] font-semibold text-bull">{p.action}</span> : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-mono">{p.entryLow != null ? `${fmt(p.entryLow)}${p.entryHigh ? `–${fmt(p.entryHigh)}` : ""}` : "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmt(p.support)}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmt(p.resistance)}</td>
                <td className="px-3 py-2 text-right font-mono text-bull">{fmt(p.target)}</td>
                <td className="px-3 py-2 text-right font-mono text-bear">{fmt(p.stopLoss)}</td>
                <td className="px-3 py-2"><span className="block max-w-[220px] truncate text-xs text-muted-foreground" title={p.rationale ?? ""}>{p.rationale ?? "—"}</span></td>
                <td className="px-3 py-2 text-right">
                  {p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
