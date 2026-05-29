import { Users2, Globe2, Building2, Crown, Ghost, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  ACTOR_DESC_TEXT,
  ACTOR_LABEL_TEXT,
  type ActorAggregate,
  type ActorClass,
  type FourActorResult,
} from "@/lib/bandarmology/four-actor";

/**
 * FourActorCard — visualisasi 4-Pelaku Classification (§3.C.3).
 *
 * Pemakaian:
 *   const data = await computeFourActor(ticker);    // lib/bandarmology/four-actor-service
 *   return <FourActorCard data={data} />;
 *
 * Bila `data` null / tanpa data (belum ada broker summary — blokir vendor),
 * tampilkan empty-state "Data bandarmology segera hadir" tanpa dummy data.
 *
 * Catatan wiring: belum dipasang ke tab manapun (orchestrator yang memasang ke
 * ticker tab) untuk hindari bentrok dengan agent paralel di app/** dan
 * components/ticker/**.
 */

interface Props {
  /** Hasil dari computeFourActor(); null bila data belum tersedia. */
  data: { result: FourActorResult; tradeDate: string } | null;
}

const ACTOR_META: Record<
  ActorClass,
  { Icon: typeof Globe2; barClass: string; dotClass: string }
> = {
  foreign: { Icon: Globe2, barClass: "bg-sky-500", dotClass: "bg-sky-500" },
  non_retail: { Icon: Building2, barClass: "bg-violet-500", dotClass: "bg-violet-500" },
  sultan: { Icon: Crown, barClass: "bg-amber-500", dotClass: "bg-amber-500" },
  zombi: { Icon: Ghost, barClass: "bg-emerald-500", dotClass: "bg-emerald-500" },
  retail: { Icon: User, barClass: "bg-muted-foreground", dotClass: "bg-muted-foreground" },
};

export function FourActorCard({ data }: Props) {
  if (!data || !data.result.hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users2 className="h-4 w-4 text-primary" />
            4-Pelaku Pasar — Klasifikasi Bandarmology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Data bandarmology segera hadir"
            description="Klasifikasi 4 pelaku (Foreign, Non-Retail, Sultanmologi, Zombimologi) akan aktif setelah broker summary & foreign flow IDX di-ingest. Engine sudah siap pakai begitu data masuk."
            action={null}
          />
        </CardContent>
      </Card>
    );
  }

  const { result, tradeDate } = data;
  // Tampilkan pelaku berurut pangsa terbesar.
  const sorted = [...result.actors].sort((a, b) => b.grossAmount - a.grossAmount);

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-primary/10 p-5">
          <Users2 className="h-8 w-8 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              4-Pelaku Classification (Bandarmology)
            </div>
            <div className="mt-0.5 text-2xl font-bold tracking-tight">
              {result.dominantActor ? ACTOR_LABEL_TEXT[result.dominantActor] : "—"}
              <span className="ml-2 text-sm font-medium text-muted-foreground">dominan</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{result.summary}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Turnover</div>
            <div className="font-mono text-lg font-bold">{formatCompactIDR(result.totalGross)}</div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">{tradeDate}</div>
          </div>
        </div>
      </Card>

      {/* Composition bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Komposisi Aktivitas per Pelaku</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {sorted
              .filter((a) => a.share > 0)
              .map((a) => (
                <div
                  key={a.actor}
                  className={cn("h-full", ACTOR_META[a.actor].barClass)}
                  style={{ width: `${Math.max(0, a.share * 100)}%` }}
                  title={`${ACTOR_LABEL_TEXT[a.actor]} ${(a.share * 100).toFixed(0)}%`}
                />
              ))}
          </div>

          <ul className="space-y-3">
            {sorted.map((a) => (
              <ActorRow
                key={a.actor}
                agg={a}
                isAccumulator={result.topAccumulator === a.actor}
                isDistributor={result.topDistributor === a.actor}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="px-1 text-[11px] text-muted-foreground">
        <strong>Taksonomi adaptasi Nubuat</strong>: <strong>Foreign</strong> = aliran asing;{" "}
        <strong>Non-Retail</strong> = institusi domestik; <strong>Sultanmologi</strong> = ritel
        kakap (whale); <strong>Zombimologi</strong> = bandar IPO/underwriter. Klasifikasi adalah{" "}
        <strong>heuristik</strong> berbasis metadata broker &amp; pola transaksi —{" "}
        <em>bukan klaim identitas pasti pemodal</em>. Basis:{" "}
        {result.basis === "value" ? "nilai transaksi (IDR)" : "volume lembar"}.
      </p>
    </div>
  );
}

function ActorRow({
  agg,
  isAccumulator,
  isDistributor,
}: {
  agg: ActorAggregate;
  isAccumulator: boolean;
  isDistributor: boolean;
}) {
  const meta = ACTOR_META[agg.actor];
  const Icon = meta.Icon;
  const netTone = agg.netAmount > 0 ? "text-bull" : agg.netAmount < 0 ? "text-bear" : "text-muted-foreground";
  const sharePct = agg.share * 100;

  return (
    <li className="rounded-md border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dotClass)} aria-hidden />
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{ACTOR_LABEL_TEXT[agg.actor]}</span>
          {isAccumulator && (
            <span className="rounded bg-bull-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-bull">
              Akumulasi
            </span>
          )}
          {isDistributor && (
            <span className="rounded bg-bear-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-bear">
              Distribusi
            </span>
          )}
        </span>
        <span className="font-mono text-sm font-semibold">{sharePct.toFixed(0)}%</span>
      </div>

      <p className="mt-1 text-[11px] text-muted-foreground">{ACTOR_DESC_TEXT[agg.actor]}</p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full", meta.barClass)}
          style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
        />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="Beli" value={formatCompactIDR(agg.buyAmount)} tone="bull" />
        <Stat label="Jual" value={formatCompactIDR(agg.sellAmount)} tone="bear" />
        <Stat
          label="Net"
          value={`${agg.netAmount > 0 ? "+" : ""}${formatCompactIDR(agg.netAmount)}`}
          className={netTone}
        />
      </div>
      <div className="mt-1 text-right text-[9px] text-muted-foreground">
        {agg.brokerCount} broker
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear";
  className?: string;
}) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <div className="rounded border border-border bg-background/40 p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-xs font-semibold", toneClass, className)}>
        {value}
      </div>
    </div>
  );
}
