import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { PickDisclaimer } from "@/components/picks/PickDisclaimer";
import type { PickListItemDTO } from "@/lib/types/picks";

/**
 * PickCard — ringkas: ticker, setup_type chip, score gauge, entry/SL/TP/RR,
 * confidence. Server Component — pure render.
 */

interface PickCardProps {
  pick: PickListItemDTO;
}

const SETUP_LABEL: Record<string, string> = {
  continuation: "Continuation",
  reversal: "Reversal",
  breakout: "Breakout",
  pullback: "Pullback",
  range: "Range",
};

const CONFIDENCE_LABEL: Record<string, { label: string; variant: "bull" | "neutral" | "bear" }> = {
  high: { label: "High", variant: "bull" },
  medium: { label: "Medium", variant: "neutral" },
  low: { label: "Low", variant: "bear" },
};

function fmt(n: number, frac = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(n);
}

/** Harga saham IDX = bilangan bulat rupiah (tanpa desimal). */
function price(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Zona entry: satu angka bila low≈high (dibulatkan), selain itu rentang. */
function entryRange(low: number, high: number): string {
  const lo = Math.round(low);
  const hi = Math.round(high);
  return lo === hi ? price(lo) : `${price(lo)} – ${price(hi)}`;
}

/** Potensi gain % dari titik entry ke target. */
function gainPct(entry: number, target: number): number {
  return entry > 0 ? ((target - entry) / entry) * 100 : 0;
}

function signedPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function PickCard({ pick }: PickCardProps) {
  const conf = CONFIDENCE_LABEL[pick.confidence] ?? CONFIDENCE_LABEL.low!;
  const scorePct = Math.max(0, Math.min(100, pick.score));
  return (
    <Card className="flex flex-col gap-2 transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base font-bold tracking-wide">
            <Link href={`/picks/${pick.id}`} className="hover:underline">
              {pick.companyKode}
            </Link>
          </CardTitle>
          {pick.namaPerusahaan ? (
            <p className="text-xs text-muted-foreground line-clamp-1">{pick.namaPerusahaan}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary">{SETUP_LABEL[pick.setupType] ?? pick.setupType}</Badge>
          <Badge variant={conf.variant}>{conf.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ScoreGauge value={scorePct} />
        {(() => {
          const entryMid = (pick.entryZoneLow + pick.entryZoneHigh) / 2;
          const gainTp1 = gainPct(entryMid, pick.tp1);
          const gainTp2 = pick.tp2 === null ? null : gainPct(entryMid, pick.tp2);
          return (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <Field label="Entry" value={entryRange(pick.entryZoneLow, pick.entryZoneHigh)} />
                <Field label="Stop Loss" value={price(pick.stopLoss)} tone="bear" />
                <Field label="TP1" value={price(pick.tp1)} tone="bull" />
                <Field
                  label="TP2"
                  value={pick.tp2 === null ? "—" : price(pick.tp2)}
                  tone={pick.tp2 === null ? "muted" : "bull"}
                />
                <Field
                  label="TP3"
                  value={pick.tp3 === null ? "—" : price(pick.tp3)}
                  tone={pick.tp3 === null ? "muted" : "bull"}
                />
                <Field label="R/R" value={`${fmt(pick.rewardRiskRatio)}x`} />
              </div>
              {/* Potensi gain dari titik tengah entry ke target */}
              <div className="flex items-center justify-between rounded-md bg-bull-soft px-2.5 py-1.5 text-xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Potensi Gain
                </span>
                <span className="flex items-center gap-2 font-semibold tabular-nums text-bull">
                  <span>{signedPct(gainTp1)}<span className="ml-0.5 text-[9px] font-normal text-muted-foreground">TP1</span></span>
                  {gainTp2 !== null && (
                    <span>{signedPct(gainTp2)}<span className="ml-0.5 text-[9px] font-normal text-muted-foreground">TP2</span></span>
                  )}
                </span>
              </div>
            </>
          );
        })()}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {pick.timeHorizon.replace(/_/g, " ")}
          </span>
          <Badge variant="outline" className="text-[10px]">
            Bukan ajakan jual/beli
          </Badge>
        </div>
        <PickDisclaimer variant="card" />
      </CardContent>
    </Card>
  );
}

interface ScoreGaugeProps {
  value: number;
}

function ScoreGauge({ value }: ScoreGaugeProps) {
  const tone = value >= 75 ? "bg-bull" : value >= 55 ? "bg-primary" : "bg-muted-foreground";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
        <span className="text-sm font-semibold tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  tone?: "bull" | "bear" | "muted";
}

function Field({ label, value, tone }: FieldProps) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "bull" && "text-bull",
          tone === "bear" && "text-bear",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
