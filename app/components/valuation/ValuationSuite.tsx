import { TrendingUp, TrendingDown, Minus, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Recommendation =
  | "deeply_undervalued"
  | "undervalued"
  | "fair"
  | "overvalued"
  | "deeply_overvalued";

interface ValuationMethod {
  name: string;
  formula?: string;
  intrinsicValue: number | null;
  marginPct: number | null;
  recommendation: Recommendation | null;
  applicable: boolean;
  note?: string;
}

interface Props {
  ticker: string;
  currentPrice: number;
  methods: ValuationMethod[];
}

const REC_CONFIG: Record<Recommendation, { bg: string; fg: string; label: string }> = {
  deeply_undervalued: { bg: "bg-bull", fg: "text-white", label: "Deeply Undervalued" },
  undervalued: { bg: "bg-bull/85", fg: "text-white", label: "Undervalued" },
  fair: { bg: "bg-yellow-500", fg: "text-white", label: "Fair" },
  overvalued: { bg: "bg-orange-500", fg: "text-white", label: "Overvalued" },
  deeply_overvalued: { bg: "bg-bear", fg: "text-white", label: "Deeply Overvalued" },
};

export function ValuationSuite({ ticker, currentPrice, methods }: Props) {
  const applicable = methods.filter((m) => m.applicable && m.intrinsicValue != null);

  if (applicable.length === 0) {
    return null;
  }

  // Consensus stats
  const ivs = applicable.map((m) => m.intrinsicValue!);
  const median = ivs.slice().sort((a, b) => a - b)[Math.floor(ivs.length / 2)] ?? 0;
  const min = Math.min(...ivs);
  const max = Math.max(...ivs);
  const mean = ivs.reduce((a, b) => a + b, 0) / ivs.length;

  const consensusMarginPct = currentPrice > 0 ? ((median - currentPrice) / currentPrice) * 100 : 0;
  const consensusRec: Recommendation =
    consensusMarginPct > 40 ? "deeply_undervalued" :
    consensusMarginPct > 15 ? "undervalued" :
    consensusMarginPct > -15 ? "fair" :
    consensusMarginPct > -40 ? "overvalued" :
    "deeply_overvalued";
  const consensusConfig = REC_CONFIG[consensusRec];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Valuation Suite — Multi-Method Consensus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consensus verdict */}
        <div className={cn("rounded-md p-4", consensusConfig.bg, consensusConfig.fg)}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                Consensus dari {applicable.length} Method ({ticker})
              </div>
              <div className="mt-0.5 text-xl font-bold">{consensusConfig.label}</div>
              <div className="mt-1 text-[11px] opacity-80">
                Median IV: <strong>{formatNumber(median, 0)}</strong> vs current{" "}
                <strong>{formatNumber(currentPrice, 0)}</strong>
                {" "}({consensusMarginPct >= 0 ? "+" : ""}{consensusMarginPct.toFixed(1)}% margin)
              </div>
            </div>
            {consensusMarginPct > 0 ? (
              <TrendingUp className="h-8 w-8 shrink-0" />
            ) : consensusMarginPct < 0 ? (
              <TrendingDown className="h-8 w-8 shrink-0" />
            ) : (
              <Minus className="h-8 w-8 shrink-0" />
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Stat label="Min IV" value={formatNumber(min, 0)} />
          <Stat label="Mean IV" value={formatNumber(mean, 0)} tone={mean > currentPrice ? "bull" : "bear"} />
          <Stat label="Max IV" value={formatNumber(max, 0)} />
        </div>

        {/* Per-method breakdown table */}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-2 py-1.5 text-left">Method</th>
                <th className="px-2 py-1.5 text-right">IV/Share</th>
                <th className="px-2 py-1.5 text-right">Margin %</th>
                <th className="px-2 py-1.5 text-center">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.map((m) => {
                const config = m.recommendation ? REC_CONFIG[m.recommendation] : null;
                const tone =
                  m.marginPct == null ? "text-muted-foreground" :
                  m.marginPct > 0 ? "text-bull" : "text-bear";
                return (
                  <tr key={m.name} className={!m.applicable ? "opacity-50" : ""}>
                    <td className="px-2 py-1.5">
                      <div className="font-semibold">{m.name}</div>
                      {m.note && (
                        <div className="text-[9px] text-muted-foreground italic">{m.note}</div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {m.intrinsicValue != null ? formatNumber(m.intrinsicValue, 0) : "—"}
                    </td>
                    <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", tone)}>
                      {m.marginPct != null ? `${m.marginPct >= 0 ? "+" : ""}${m.marginPct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {config ? (
                        <span className={cn("inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", config.bg, config.fg)}>
                          {config.label.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Multi-method advantage:</strong> Tiap valuation method punya bias berbeda
          (DCF sensitif growth; DDM butuh dividend; Graham value-bias; Lynch growth-bias).
          Consensus dari multiple method memberi range estimate lebih reliable. Hindari over-confidence
          pada 1 angka — pakai sebagai range (min-median-max) untuk decision.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear" | "neutral";
}) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <div className="rounded-md border border-border bg-card/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm font-bold", toneClass)}>{value}</div>
    </div>
  );
}
