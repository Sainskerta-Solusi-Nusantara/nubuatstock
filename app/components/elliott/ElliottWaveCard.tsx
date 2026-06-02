import { TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ElliottAnalysisDTO } from "@/lib/elliott/service";
import { projectTargets, guidelineScore } from "@/lib/elliott/projection";
import { ElliottAiNarrative } from "./ElliottAiNarrative";

interface Props {
  analysis: ElliottAnalysisDTO;
}

const WAVE_TYPE_CONFIG = {
  impulse_up: {
    label: "Impulse Up",
    color: "text-bull",
    bg: "bg-bull-soft",
    Icon: TrendingUp,
  },
  impulse_down: {
    label: "Impulse Down",
    color: "text-bear",
    bg: "bg-bear-soft",
    Icon: TrendingDown,
  },
  corrective: {
    label: "Corrective",
    color: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-500/15",
    Icon: Activity,
  },
  unknown: {
    label: "Unclear",
    color: "text-muted-foreground",
    bg: "bg-muted",
    Icon: AlertCircle,
  },
} as const;

export function ElliottWaveCard({ analysis }: Props) {
  const config = WAVE_TYPE_CONFIG[analysis.waveType];
  const Icon = config.Icon;
  const confPct = Math.round(analysis.confidence * 100);

  // P2: proyeksi target Fibonacci & skor pedoman (guideline) — fungsi pure.
  const targets = projectTargets(analysis.sequence);
  const guide = analysis.sequence.length > 0 ? guidelineScore(analysis.sequence) : null;

  const isCorrective = analysis.waveType === "corrective";
  // Detect corrective subtype dari currentWave string (worker menyimpannya di sana).
  const correctiveSubtype = /zigzag/i.test(analysis.currentWave)
    ? "Zigzag (5-3-5)"
    : /flat/i.test(analysis.currentWave)
      ? "Flat (3-3-5)"
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Elliott Wave Analysis
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              config.bg,
              config.color,
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Wave Highlight */}
        <div className={cn("rounded-md p-3", config.bg)}>
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            Current Wave Position
          </div>
          <div className={cn("mt-0.5 text-base font-bold", config.color)}>{analysis.currentWave}</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] opacity-80">
            <span>Confidence: <strong className="font-mono">{confPct}%</strong></span>
            <span>•</span>
            <span>Timeframe: <strong>{analysis.timeframe}</strong></span>
            <span>•</span>
            <span>{new Date(analysis.analyzedAt).toLocaleDateString("id-ID")}</span>
          </div>
        </div>

        {/* Wave Sequence */}
        {analysis.sequence.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isCorrective ? "Corrective Sequence (A-B-C)" : "5-Wave Sequence"}
              {correctiveSubtype && (
                <span className="rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-bold normal-case text-yellow-700 dark:text-yellow-300">
                  {correctiveSubtype}
                </span>
              )}
            </div>
            <div
              className={cn(
                "grid gap-2",
                isCorrective ? "grid-cols-3" : "grid-cols-5",
              )}
            >
              {analysis.sequence.map((w) => {
                // Impulse: 1/3/5 = drive (hijau), 2/4 = corrective (oranye).
                // Corrective: A/C = drive koreksi (oranye), B = counter (kuning).
                const isDriveWave = isCorrective
                  ? ["A", "C"].includes(w.label)
                  : ["1", "3", "5"].includes(w.label);
                const direction = w.endPrice > w.startPrice ? "up" : "down";
                return (
                  <div
                    key={w.label}
                    className={cn(
                      "rounded-md border p-2",
                      isCorrective
                        ? isDriveWave
                          ? "border-orange-500/40 bg-orange-500/15"
                          : "border-yellow-500/40 bg-yellow-500/15"
                        : isDriveWave
                          ? "border-bull/40 bg-bull-soft"
                          : "border-orange-500/40 bg-orange-500/15",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white",
                          isCorrective
                            ? isDriveWave
                              ? "bg-orange-500"
                              : "bg-yellow-500"
                            : isDriveWave
                              ? "bg-bull"
                              : "bg-orange-500",
                        )}
                      >
                        {isCorrective ? w.label : `W${w.label}`}
                      </span>
                      {direction === "up" ? (
                        <TrendingUp className="h-3 w-3 text-bull" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-bear" />
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {formatNumber(w.startPrice, 0)} → {formatNumber(w.endPrice, 0)}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {w.startDate.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground italic">
              {isCorrective
                ? "Oranye = wave A & C (arah koreksi). Kuning = wave B (counter-move)."
                : "Hijau = impulse waves (1, 3, 5). Oranye = corrective (2, 4)."}
            </p>
          </div>
        )}

        {/* Fibonacci Targets */}
        {analysis.fibonacciLevels && (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fibonacci Levels (next move)
            </div>
            <div className="grid grid-cols-2 gap-3">
              {analysis.fibonacciLevels.retracement && (
                <div className="rounded-md border border-border bg-card/40 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Retracement
                  </div>
                  <table className="mt-1 w-full text-[10px]">
                    <tbody>
                      {Object.entries(analysis.fibonacciLevels.retracement).map(([level, price]) => (
                        <tr key={level}>
                          <td className="text-muted-foreground">{level}</td>
                          <td className="text-right font-mono">{formatNumber(price, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {analysis.fibonacciLevels.extension && (
                <div className="rounded-md border border-border bg-card/40 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Extension Targets
                  </div>
                  <table className="mt-1 w-full text-[10px]">
                    <tbody>
                      {Object.entries(analysis.fibonacciLevels.extension).map(([level, price]) => (
                        <tr key={level}>
                          <td className="text-muted-foreground">{level}</td>
                          <td className="text-right font-mono">{formatNumber(price, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* P2: Proyeksi Target (Fibonacci) berdasarkan posisi wave saat ini */}
        {targets.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Proyeksi Target
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold normal-case text-primary">P2</span>
            </div>
            <div className="space-y-1">
              {targets.map((t) => (
                <div key={t.label} className="flex items-center justify-between rounded-md border border-border bg-card/40 px-2 py-1 text-[11px]">
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="font-mono font-semibold">{formatNumber(t.price, 0)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[9px] italic text-muted-foreground">
              Proyeksi rasio Fibonacci dari panjang wave sebelumnya — perkiraan, bukan kepastian.
            </p>
          </div>
        )}

        {/* P2: Skor pedoman (guideline) kualitas wave count */}
        {guide && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                Kualitas Wave Count
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold normal-case text-primary">P2</span>
              </span>
              <span className="font-mono text-foreground">{Math.round(guide.score)}/100</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", guide.score >= 66 ? "bg-bull" : guide.score >= 40 ? "bg-yellow-500" : "bg-bear")}
                style={{ width: `${Math.max(2, Math.min(100, guide.score))}%` }}
              />
            </div>
            {guide.checks.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {guide.checks.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className={cn("flex items-center gap-1", c.passed ? "text-bull" : "")}>
                      {c.passed ? "✓" : "·"} {c.name}
                    </span>
                    <span className="font-mono">{c.points}/{c.maxPoints}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-[9px] italic text-muted-foreground">
              Pedoman lunak Elliott (proporsi, alternasi) — bukan aturan keras; skor tinggi = count lebih rapi.
            </p>
          </div>
        )}

        {/* P2: Penjelasan AI on-demand */}
        {analysis.waveType !== "unknown" && (
          <ElliottAiNarrative kode={analysis.kode} timeframe={analysis.timeframe} />
        )}

        {/* Reasoning */}
        {analysis.narrative && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Validation
            </div>
            <div className="rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
              {analysis.narrative}
            </div>
          </div>
        )}

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Catatan:</strong> Wave count adalah heuristic algorithm berdasarkan pivot detection + Elliott&apos;s 3 hard rules.
          Bersifat subjektif — multiple valid counts mungkin ada. Confidence rendah (&lt; 50%) artinya pattern tidak konklusif.
          Gunakan sebagai context, bukan trading signal pasti.
        </p>
      </CardContent>
    </Card>
  );
}
