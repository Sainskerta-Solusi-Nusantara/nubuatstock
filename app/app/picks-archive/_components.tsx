import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type {
  ArchiveEvaluation,
  ArchiveMonth,
  ArchivePick,
} from "@/lib/picks/archive";

/**
 * Komponen render untuk arsip Daily Picks PUBLIK.
 *
 * Dipisah dari PickCard (auth) karena surface ini fokus ke HASIL historis
 * (return %, hit TP/SL) dan link ke detail diarahkan ke versi auth-gated.
 * Server Components — pure render, design-token aware (no gray hardcoded).
 */

const SETUP_LABEL: Record<string, string> = {
  continuation: "Continuation",
  reversal: "Reversal",
  breakout: "Breakout",
  pullback: "Pullback",
  range: "Range",
};

const CONFIDENCE_VARIANT: Record<string, "bull" | "neutral" | "bear"> = {
  high: "bull",
  medium: "neutral",
  low: "bear",
};

const EVALS: ArchiveEvaluation[] = ["T+1", "T+5", "T+20"];

function pct(v: number, frac = 1): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(v);
}

function signedPct(v: number): string {
  const s = pct(v);
  return v > 0 ? `+${s}%` : `${s}%`;
}

function returnTone(v: number): string {
  if (v > 0) return "text-bull";
  if (v < 0) return "text-bear";
  return "text-muted-foreground";
}

/** Ringkasan agregat hit-rate per bulan. */
export function MonthAggregateCard({ month }: { month: ArchiveMonth }) {
  const a = month.aggregate;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold tracking-tight">{month.monthLabel}</h3>
        <span className="text-xs text-muted-foreground">
          {a.totalPicks} pick{a.totalPicks === 1 ? "" : "s"} dipublikasikan
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {EVALS.map((ev) => {
          const n = a.evaluatedCount[ev];
          const avg = a.avgReturnPct[ev];
          return (
            <div key={ev} className="rounded-md border border-border bg-background p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {ev}
              </div>
              {n > 0 ? (
                <>
                  <div className={cn("mt-1 text-base font-bold tabular-nums", returnTone(avg))}>
                    {signedPct(avg)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">avg return</div>
                  <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] tabular-nums">
                    <span className="text-bull">TP1 {pct(a.tp1HitRate[ev] * 100, 0)}%</span>
                    <span className="text-bear">SL {pct(a.slHitRate[ev] * 100, 0)}%</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{n} dieval.</div>
                </>
              ) : (
                <div className="mt-3 text-[11px] text-muted-foreground">Belum dievaluasi</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Baris satu pick dengan outcome per window. */
export function ArchivePickRow({ pick }: { pick: ArchivePick }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wide">{pick.companyKode}</span>
            <Badge variant="secondary" className="text-[10px]">
              {SETUP_LABEL[pick.setupType] ?? pick.setupType}
            </Badge>
            <Badge variant={CONFIDENCE_VARIANT[pick.confidence] ?? "neutral"} className="text-[10px]">
              {pick.confidence}
            </Badge>
          </div>
          {pick.namaPerusahaan ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {pick.namaPerusahaan}
            </p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{pick.tradeDate}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center sm:w-auto">
        {EVALS.map((ev) => {
          const o = pick.outcomes[ev];
          return (
            <div key={ev} className="min-w-[68px] rounded-md border border-border bg-background px-2 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {ev}
              </div>
              {o ? (
                <>
                  <div className={cn("text-sm font-bold tabular-nums", returnTone(o.returnPct))}>
                    {signedPct(o.returnPct)}
                  </div>
                  <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide">
                    {o.hitSl ? (
                      <span className="text-bear">Hit SL</span>
                    ) : o.hitTp1 ? (
                      <span className="text-bull">Hit TP{o.hitTp3 ? "3" : o.hitTp2 ? "2" : "1"}</span>
                    ) : (
                      <span className="text-muted-foreground">{o.status}</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[10px] text-muted-foreground">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Blok satu bulan: agregat + daftar picks. */
export function MonthBlock({ month, withLink = false }: { month: ArchiveMonth; withLink?: boolean }) {
  return (
    <section className="space-y-3">
      <MonthAggregateCard month={month} />
      <div className="space-y-2">
        {month.picks.map((p) => (
          <ArchivePickRow key={p.id} pick={p} />
        ))}
      </div>
      {withLink ? (
        <Link
          href={`/picks-archive/${month.month}`}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Lihat detail {month.monthLabel} →
        </Link>
      ) : null}
    </section>
  );
}
