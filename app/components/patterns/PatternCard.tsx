import { TrendingUp, TrendingDown, Zap, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatternRowDTO } from "@/lib/patterns/service";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ExplainButton } from "./ExplainButton";

interface PatternCardProps {
  patterns: PatternRowDTO[];
}

const STATUS_CONFIG = {
  forming: { Icon: Clock, label: "Forming", classes: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
  completed: { Icon: CheckCircle2, label: "Completed", classes: "bg-bull-soft text-bull" },
  invalidated: { Icon: XCircle, label: "Invalidated", classes: "bg-bear-soft text-bear" },
} as const;

export function PatternCard({ patterns }: PatternCardProps) {
  if (patterns.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Detected Patterns
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {patterns.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {patterns.map((p) => {
          const Icon = p.direction === "bullish" ? TrendingUp : TrendingDown;
          const directionClass = p.direction === "bullish" ? "text-bull" : "text-bear";
          const StatusIcon = STATUS_CONFIG[p.status].Icon;
          const currentToBreakout = p.keyLevels.breakout;

          return (
            <div key={p.id} className="rounded-md border border-border bg-card/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{p.patternEmoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{p.patternLabel}</span>
                      <Icon className={cn("h-3.5 w-3.5", directionClass)} />
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {p.startDate} → {p.endDate}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      STATUS_CONFIG[p.status].classes,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {STATUS_CONFIG[p.status].label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Conf: <span className="font-mono font-bold">{(p.confidence * 100).toFixed(0)}%</span>
                  </span>
                </div>
              </div>

              {/* Key Levels Grid */}
              <div className="grid grid-cols-3 gap-2">
                <Level label="Breakout" value={p.keyLevels.breakout} tone="primary" />
                <Level label="Target" value={p.keyLevels.target} tone="bull" />
                <Level label="Stop" value={p.keyLevels.stop} tone="bear" />
              </div>

              {/* Description */}
              <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                {p.patternDescription}
              </p>

              {/* Narrative template (AI-cached narrative ditangani ExplainButton) */}
              {p.narrative && !p.narrative.startsWith("AI:") && (
                <p className="text-[11px] leading-relaxed">
                  {p.narrative}
                </p>
              )}

              {/* Volume confirmation badge */}
              {p.volumeConfirmation && (
                <div className="inline-flex items-center gap-1 rounded bg-bull-soft px-2 py-0.5 text-[10px] font-semibold text-bull">
                  ✓ Volume confirmation
                </div>
              )}

              {/* AI Explanation */}
              <ExplainButton patternId={p.id} initialExplanation={p.narrative} />
            </div>
          );
        })}

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Catatan:</strong> Pattern di-detect oleh algoritma berbasis price/volume — bukan prediksi pasti.
          Status <strong>Forming</strong> = pattern terbentuk tapi belum breakout. <strong>Completed</strong> = breakout confirmed.
          Selalu validate sendiri sebelum trading; pattern bisa gagal (false breakout, fakeout).
        </p>
      </CardContent>
    </Card>
  );
}

function Level({ label, value, tone }: { label: string; value: number; tone: "primary" | "bull" | "bear" }) {
  const toneClass =
    tone === "bull" ? "text-bull border-bull/30 bg-bull-soft" :
    tone === "bear" ? "text-bear border-bear/30 bg-bear-soft" :
    "text-primary border-primary/30 bg-primary/10";

  return (
    <div className={cn("rounded-md border p-2", toneClass)}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{formatNumber(value, 0)}</div>
    </div>
  );
}
