import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { listSecuritiesPicksGrouped } from "@/lib/securities-picks/service";
import { fmtDateId } from "@/lib/utils/date-id";

const nf = new Intl.NumberFormat("id-ID");
const fmt = (n: number | null) => (n == null ? null : nf.format(n));

/**
 * Section "Rekomendasi Sekuritas" — agregator pilihan harian dari berbagai
 * sekuritas. Sumber dicantumkan sebagai teks (tanpa logo). Server component.
 */
export async function SecuritiesPicksSection() {
  const { date, groups } = await listSecuritiesPicksGrouped();
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Building2 className="size-4 text-primary" /> Rekomendasi Sekuritas
        </h2>
        <span className="text-xs text-muted-foreground">{date ? fmtDateId(date) : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Rangkuman pilihan harian dari berbagai sekuritas (sebagai agregator). Bukan rekomendasi Nubuat — untuk edukasi, bukan ajakan jual/beli.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.securities} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">{g.securities}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sumber</span>
            </div>
            <div className="divide-y divide-border/60">
              {g.picks.map((p) => {
                const entry = p.entryLow != null ? `${fmt(p.entryLow)}${p.entryHigh ? `–${fmt(p.entryHigh)}` : ""}` : null;
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <Link href={`/ticker/${p.kode}`} className="font-mono font-bold text-primary hover:underline">{p.kode}</Link>
                    {p.action && <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[10px] font-semibold text-bull">{p.action}</span>}
                    <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {entry && <span>Entry <span className="font-mono text-foreground">{entry}</span></span>}
                      {p.support != null && <span>S <span className="font-mono">{fmt(p.support)}</span></span>}
                      {p.resistance != null && <span>R <span className="font-mono">{fmt(p.resistance)}</span></span>}
                      {p.target != null && <span>TP <span className="font-mono text-bull">{fmt(p.target)}</span></span>}
                      {p.stopLoss != null && <span>SL <span className="font-mono text-bear">{fmt(p.stopLoss)}</span></span>}
                    </span>
                    {p.rationale && <span className="w-full text-[11px] text-muted-foreground">{p.rationale}</span>}
                    {p.sourceUrl && (
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary">
                        sumber <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
