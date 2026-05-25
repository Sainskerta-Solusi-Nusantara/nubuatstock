import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { VerdictResult } from "@/lib/verdict/service";

interface VerdictCardProps {
  verdict: VerdictResult;
}

const LABEL_CONFIG = {
  "STRONG BUY": {
    bg: "bg-bull",
    fg: "text-white",
    softBg: "bg-bull-soft",
    softFg: "text-bull",
    Icon: TrendingUp,
  },
  BUY: {
    bg: "bg-bull/85",
    fg: "text-white",
    softBg: "bg-bull-soft",
    softFg: "text-bull",
    Icon: TrendingUp,
  },
  HOLD: {
    bg: "bg-yellow-500",
    fg: "text-white",
    softBg: "bg-yellow-500/15",
    softFg: "text-yellow-700 dark:text-yellow-300",
    Icon: Minus,
  },
  SELL: {
    bg: "bg-orange-500",
    fg: "text-white",
    softBg: "bg-orange-500/15",
    softFg: "text-orange-700 dark:text-orange-300",
    Icon: TrendingDown,
  },
  "STRONG SELL": {
    bg: "bg-bear",
    fg: "text-white",
    softBg: "bg-bear-soft",
    softFg: "text-bear",
    Icon: TrendingDown,
  },
} as const;

function FactorBar({
  name,
  score,
  weight,
  signals,
}: {
  name: string;
  score: number;
  weight: number;
  signals: Array<{ label: string; value: string; positive: boolean | null }>;
}) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7
      ? "bg-bull"
      : score >= 5.5
        ? "bg-yellow-500"
        : score >= 3.5
          ? "bg-orange-500"
          : "bg-bear";

  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{name}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            {(weight * 100).toFixed(0)}%
          </span>
        </div>
        <span className="font-mono text-sm font-bold">{score.toFixed(1)}<span className="text-xs text-muted-foreground">/10</span></span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px]">
          {signals.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5">
              {s.positive === true ? (
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-bull" />
              ) : s.positive === false ? (
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-bear" />
              ) : (
                <Minus className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">{s.label}:</span>
              <span className="font-mono font-medium">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VerdictCard({ verdict }: VerdictCardProps) {
  const config = LABEL_CONFIG[verdict.label];
  const Icon = config.Icon;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className={cn("flex items-center gap-4 p-5", config.bg, config.fg)}>
        <Icon className="h-8 w-8 shrink-0" />
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            Nubuat Verdict
          </div>
          <div className="mt-0.5 text-2xl font-bold tracking-tight">{verdict.label}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-4xl font-bold tracking-tight">
            {verdict.overallScore.toFixed(1)}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">/ 10</div>
        </div>
      </div>

      {/* Factor breakdown */}
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {verdict.factors.map((f) => (
            <FactorBar
              key={f.name}
              name={f.name}
              score={f.score}
              weight={f.weight}
              signals={f.signals}
            />
          ))}
        </div>

        {verdict.warnings.length > 0 && (
          <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-2 text-[11px]">
            <div className="flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-300">
              <AlertCircle className="h-3 w-3" />
              Data caveats
            </div>
            <ul className="mt-1 ml-4 list-disc text-orange-700/80 dark:text-orange-300/80">
              {verdict.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Disclaimer:</strong> Verdict score adalah agregat algoritmik 6 faktor
          (Technical 25%, Momentum 15%, Value 15%, Quality 15%, Growth 15%, Sentiment 15%).
          <strong> Bukan rekomendasi jual/beli</strong> — gunakan sebagai data point untuk research Anda sendiri.
          Score di-recompute setiap halaman dimuat dari snapshot data terkini.
        </p>
      </CardContent>
    </Card>
  );
}
