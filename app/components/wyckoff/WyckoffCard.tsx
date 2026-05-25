import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PHASE_META, type WyckoffAnalysis } from "@/lib/wyckoff/service";
import { cn } from "@/lib/utils/cn";

interface WyckoffCardProps {
  analysis: WyckoffAnalysis;
}

const PHASE_BG_CLASS = {
  accumulation: "bg-blue-500",
  markup: "bg-bull",
  distribution: "bg-orange-500",
  markdown: "bg-bear",
  unknown: "bg-muted",
} as const;

const PHASE_SOFT_CLASS = {
  accumulation: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  markup: "bg-bull-soft text-bull",
  distribution: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  markdown: "bg-bear-soft text-bear",
  unknown: "bg-muted text-muted-foreground",
} as const;

export function WyckoffCard({ analysis }: WyckoffCardProps) {
  const meta = PHASE_META[analysis.currentPhase];
  const confPct = Math.round(analysis.currentConfidence * 100);

  // Render segment timeline — proportional bar of phase history
  const totalDays = analysis.segments.reduce((acc, s) => acc + Math.max(s.durationDays, 1), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <span className="text-xl">{meta.emoji}</span>
            <span>Wyckoff Phase</span>
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              PHASE_SOFT_CLASS[analysis.currentPhase],
            )}
          >
            {meta.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current phase summary */}
        <div className={cn("rounded-md p-3", PHASE_SOFT_CLASS[analysis.currentPhase])}>
          <p className="text-xs leading-relaxed">{meta.description}</p>
          <div className="mt-2 flex items-center gap-3 text-[10px]">
            <span className="font-semibold">Confidence: {confPct}%</span>
            <span>•</span>
            <span>Since {new Date(analysis.currentSince).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>

        {/* Reasoning */}
        {analysis.reasoning.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Why this phase?
            </div>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {analysis.reasoning.map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-primary">→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Phase history timeline */}
        {analysis.segments.length > 1 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phase Timeline (last {totalDays} days)
            </div>
            <div className="flex h-7 overflow-hidden rounded-md">
              {analysis.segments.map((s, i) => {
                const widthPct = (Math.max(s.durationDays, 1) / Math.max(totalDays, 1)) * 100;
                const segMeta = PHASE_META[s.phase];
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-center text-[10px] font-bold text-white transition hover:opacity-80",
                      PHASE_BG_CLASS[s.phase],
                    )}
                    style={{ width: `${widthPct}%`, minWidth: widthPct > 5 ? undefined : "20px" }}
                    title={`${segMeta.label} • ${s.durationDays}d • conf ${Math.round(s.confidence * 100)}% • ${s.startDate} → ${s.endDate}`}
                  >
                    {widthPct > 8 && segMeta.emoji}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {(["accumulation", "markup", "distribution", "markdown"] as const).map((p) => (
                <span key={p} className="inline-flex items-center gap-1">
                  <span className={cn("h-2.5 w-2.5 rounded", PHASE_BG_CLASS[p])} />
                  {PHASE_META[p].label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <Stat label="Range 20d" value={`${analysis.stats.last20dRange.toFixed(1)}%`} />
          <Stat label="Range 60d" value={`${analysis.stats.last60dRange.toFixed(1)}%`} />
          <Stat
            label="Volatility"
            value={analysis.stats.volatilityRatio < 0.7 ? "Compressing" : analysis.stats.volatilityRatio > 1.3 ? "Expanding" : "Stable"}
          />
        </div>

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Catatan:</strong> Wyckoff phase mapping berbasis heuristic price+volume pattern.
          Bukan prediksi pasti — gunakan sebagai konteks untuk risk framing, bukan trigger trading.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono font-semibold">{value}</div>
    </div>
  );
}
