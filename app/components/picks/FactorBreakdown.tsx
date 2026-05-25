import { cn } from "@/lib/utils/cn";
import type { FactorBreakdown as FactorBreakdownType } from "@/lib/types/picks";

/**
 * FactorBreakdown — bar chart sederhana per factor (0..100).
 * Server Component, no client JS.
 *
 * `risk_penalty` di-render terpisah (penalti subtractive) supaya user tahu
 * faktor pengurang skor.
 */

interface FactorBreakdownProps {
  factors: FactorBreakdownType;
}

const FACTOR_LABEL: Record<keyof FactorBreakdownType, string> = {
  technical: "Teknikal",
  bandarmology: "Bandarmology",
  fundamental: "Fundamental",
  sentiment: "Sentimen",
  macro: "Makro / Sektor",
  risk_penalty: "Penalti Risiko",
};

export function FactorBreakdownChart({ factors }: FactorBreakdownProps) {
  const positive: (keyof FactorBreakdownType)[] = [
    "technical",
    "bandarmology",
    "fundamental",
    "sentiment",
    "macro",
  ];
  return (
    <div className="space-y-3">
      {positive.map((k) => (
        <FactorRow key={k} label={FACTOR_LABEL[k]} value={factors[k] ?? 0} tone="positive" />
      ))}
      <div className="border-t pt-3">
        <FactorRow
          label={FACTOR_LABEL.risk_penalty}
          value={factors.risk_penalty ?? 0}
          tone="penalty"
        />
      </div>
    </div>
  );
}

interface FactorRowProps {
  label: string;
  value: number;
  tone: "positive" | "penalty";
}

function FactorRow({ label, value, tone }: FactorRowProps) {
  const v = Math.max(0, Math.min(100, value));
  const barColor =
    tone === "penalty"
      ? "bg-bear"
      : v >= 75
        ? "bg-bull"
        : v >= 50
          ? "bg-primary"
          : "bg-muted-foreground";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            tone === "penalty" && "text-bear",
          )}
        >
          {tone === "penalty" ? "-" : ""}
          {v.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
