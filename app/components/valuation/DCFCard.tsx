import { TrendingUp, TrendingDown, Minus, AlertCircle, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { RECOMMENDATION_META, type DCFResult } from "@/lib/valuation/dcf";
import { cn } from "@/lib/utils/cn";

interface DCFCardProps {
  result: DCFResult;
}

export function DCFCard({ result }: DCFCardProps) {
  const meta = RECOMMENDATION_META[result.recommendation];
  const Icon =
    result.recommendation === "deeply_undervalued" || result.recommendation === "undervalued"
      ? TrendingUp
      : result.recommendation === "overvalued" || result.recommendation === "deeply_overvalued"
        ? TrendingDown
        : Minus;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          DCF Intrinsic Valuation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verdict header */}
        <div className={cn("flex items-center gap-3 rounded-md p-4", meta.color)}>
          <Icon className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              DCF Verdict
            </div>
            <div className="mt-0.5 text-xl font-bold">{meta.label}</div>
            <div className="mt-0.5 text-[11px] opacity-80">{meta.description}</div>
          </div>
        </div>

        {/* Price comparison */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Current Price" value={formatNumber(result.currentPrice, 0)} />
          <Stat
            label="DCF Intrinsic Value"
            value={formatNumber(result.intrinsicValuePerShare, 0)}
            tone={result.marginOfSafetyPct > 0 ? "bull" : "bear"}
          />
          <Stat
            label="Margin of Safety"
            value={`${result.marginOfSafetyPct >= 0 ? "+" : ""}${result.marginOfSafetyPct.toFixed(1)}%`}
            tone={result.marginOfSafetyPct > 15 ? "bull" : result.marginOfSafetyPct < -15 ? "bear" : "neutral"}
          />
        </div>

        {/* Inputs used */}
        <div className="rounded-md border border-border bg-card/40 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assumptions
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Assumption label="Initial FCF" value={formatCompactIDR(result.inputs.initialFcfIdr)} />
            <Assumption label="Growth Y1-5" value={`${(result.inputs.growthRateY1to5 * 100).toFixed(1)}%/yr`} />
            <Assumption label="Growth Y6-10" value={`${(result.inputs.growthRateY6to10 * 100).toFixed(1)}%/yr`} />
            <Assumption label="Terminal Growth" value={`${(result.inputs.terminalGrowthRate * 100).toFixed(1)}%`} />
            <Assumption label="Discount Rate" value={`${(result.inputs.discountRate * 100).toFixed(1)}%`} />
            <Assumption label="Enterprise Value" value={formatCompactIDR(result.enterpriseValue)} />
            <Assumption label="Terminal Value (PV)" value={formatCompactIDR(result.terminalPv)} />
            <Assumption label="TV % of Total" value={`${((result.terminalPv / result.enterpriseValue) * 100).toFixed(0)}%`} />
          </div>
        </div>

        {/* Sensitivity matrix */}
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sensitivity: Intrinsic Value/Share (rows = discount rate, cols = growth rate)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-border bg-muted/50 px-2 py-1 text-left font-mono text-[10px]">D \ G</th>
                  {result.sensitivity.growthRates.map((g, i) => (
                    <th key={i} className="border border-border bg-muted/50 px-2 py-1 text-right font-mono text-[10px]">
                      {(g * 100).toFixed(0)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.sensitivity.matrix.map((row, ri) => (
                  <tr key={ri}>
                    <td className="border border-border bg-muted/30 px-2 py-1 font-mono text-[10px]">
                      {(result.sensitivity.discountRates[ri]! * 100).toFixed(1)}%
                    </td>
                    {row.map((cell, ci) => {
                      const isCurrent = ri === 2 && ci === 2; // center
                      const aboveCurrent = cell > result.currentPrice * 1.1;
                      const belowCurrent = cell < result.currentPrice * 0.9;
                      return (
                        <td
                          key={ci}
                          className={cn(
                            "border border-border px-2 py-1 text-right font-mono text-[10px]",
                            isCurrent && "font-bold ring-2 ring-primary",
                            aboveCurrent && "bg-bull-soft text-bull",
                            belowCurrent && "bg-bear-soft text-bear",
                          )}
                        >
                          {formatNumber(cell, 0)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground italic">
            Sel hijau = intrinsic value &gt; harga sekarang. Sel merah = di bawah. Ring biru = assumption kamu.
          </p>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-2 text-[11px]">
            <div className="flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-300">
              <AlertCircle className="h-3 w-3" />
              Caveats
            </div>
            <ul className="mt-1 ml-4 list-disc text-orange-700/80 dark:text-orange-300/80">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Disclaimer:</strong> DCF mengasumsikan FCF ≈ Net Income (TTM) sebagai proxy karena
          data CapEx + ΔWC detail belum di-ingest. Hasil DCF SANGAT SENSITIF terhadap input
          (terutama growth rate dan discount rate) — gunakan sebagai range, bukan precision number.
          Banks & insurance: DCF kurang akurat, prefer DDM (Dividend Discount Model — coming soon).
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
  const toneClass =
    tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-bold", toneClass)}>{value}</div>
    </div>
  );
}

function Assumption({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  );
}
