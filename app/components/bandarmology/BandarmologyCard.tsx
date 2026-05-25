import { TrendingUp, TrendingDown, Minus, Activity, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { BandarmologyMetrics } from "@/lib/bandarmology/service";

interface Props {
  metrics: BandarmologyMetrics;
}

const VERDICT_CONFIG = {
  smart_money_buying: { bg: "bg-bull", fg: "text-white", softBg: "bg-bull-soft", softFg: "text-bull", label: "Smart Money Buying", Icon: TrendingUp },
  smart_money_selling: { bg: "bg-bear", fg: "text-white", softBg: "bg-bear-soft", softFg: "text-bear", label: "Smart Money Selling", Icon: TrendingDown },
  neutral: { bg: "bg-yellow-500", fg: "text-white", softBg: "bg-yellow-500/15", softFg: "text-yellow-700 dark:text-yellow-300", label: "Neutral / Sideways", Icon: Minus },
} as const;

function trendBadge(trend: "accumulating" | "neutral" | "distributing"): { class: string; label: string } {
  if (trend === "accumulating") return { class: "bg-bull-soft text-bull", label: "Accumulating ↑" };
  if (trend === "distributing") return { class: "bg-bear-soft text-bear", label: "Distributing ↓" };
  return { class: "bg-muted text-muted-foreground", label: "Neutral" };
}

export function BandarmologyCard({ metrics }: Props) {
  const v = VERDICT_CONFIG[metrics.overallVerdict];
  const VIcon = v.Icon;
  const adTrend = trendBadge(metrics.adLine.trend);
  const obvTrend = trendBadge(metrics.obv.trend);

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <Card className="overflow-hidden">
        <div className={cn("flex items-center gap-4 p-5", v.bg, v.fg)}>
          <VIcon className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Smart Money Verdict
            </div>
            <div className="mt-0.5 text-2xl font-bold tracking-tight">{v.label}</div>
            <div className="mt-1 text-[11px] opacity-80">
              Based on A/D Line, OBV, MFI, buy/sell pressure
              {metrics.foreignFlow.available ? ", and foreign flow" : ""}
            </div>
          </div>
          <div className="text-right text-[10px] opacity-80">
            <div>As of</div>
            <div className="font-mono">{metrics.asOf}</div>
          </div>
        </div>
      </Card>

      {/* Volume-based metrics (always available) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Accumulation / Distribution (A/D)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Metric
              label="A/D Line 20d change"
              value={`${metrics.adLine.change20d >= 0 ? "+" : ""}${metrics.adLine.change20d.toFixed(1)}%`}
              badgeClass={adTrend.class}
              badgeLabel={adTrend.label}
            />
            <p className="text-[11px] text-muted-foreground">
              <strong>A/D Line</strong> (Chaikin) — cumulative measure of money flow based on close
              position within daily range. Naik = akumulasi (smart money buying at high range);
              turun = distribusi (selling at low range).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              On-Balance Volume (OBV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Metric
              label="OBV 20d direction"
              value={metrics.obv.change20d >= 0 ? "↑ Up" : "↓ Down"}
              badgeClass={obvTrend.class}
              badgeLabel={obvTrend.label}
            />
            <p className="text-[11px] text-muted-foreground">
              <strong>OBV</strong> (Granville) — cumulative volume that adds on up-days and
              subtracts on down-days. Diverge dengan harga = warning signal smart money exit.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Money Flow Index (MFI 14)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-3xl font-bold">{metrics.mfi.current.toFixed(0)}</span>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                  metrics.mfi.state === "overbought" ? "bg-bear-soft text-bear" :
                  metrics.mfi.state === "oversold" ? "bg-bull-soft text-bull" :
                  "bg-muted text-muted-foreground",
                )}
              >
                {metrics.mfi.state}
              </span>
            </div>
            {/* MFI bar */}
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  metrics.mfi.current > 70 ? "bg-bear" : metrics.mfi.current < 30 ? "bg-bull" : "bg-yellow-500",
                )}
                style={{ width: `${metrics.mfi.current}%` }}
              />
              <div className="absolute left-[20%] top-0 h-full w-px bg-muted-foreground/40" />
              <div className="absolute left-[80%] top-0 h-full w-px bg-muted-foreground/40" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              <strong>MFI</strong> = volume-weighted RSI. {">80"} = overbought (distribusi); {"<20"} = oversold (akumulasi).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Buy/Sell Pressure 20d
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "font-mono text-3xl font-bold",
                  metrics.buySellPressure.last20d > 0 ? "text-bull" : metrics.buySellPressure.last20d < 0 ? "text-bear" : "text-muted-foreground",
                )}
              >
                {metrics.buySellPressure.last20d >= 0 ? "+" : ""}
                {metrics.buySellPressure.last20d.toFixed(0)}
              </span>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                  metrics.buySellPressure.interpretation === "buyers_dominant" ? "bg-bull-soft text-bull" :
                  metrics.buySellPressure.interpretation === "sellers_dominant" ? "bg-bear-soft text-bear" :
                  "bg-muted text-muted-foreground",
                )}
              >
                {metrics.buySellPressure.interpretation.replace("_", " ")}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute top-0 h-full w-px bg-foreground/40"
                style={{ left: "50%" }}
              />
              <div
                className={cn(
                  "absolute top-0 h-full",
                  metrics.buySellPressure.last20d >= 0 ? "left-1/2 bg-bull" : "right-1/2 bg-bear",
                )}
                style={{ width: `${Math.abs(metrics.buySellPressure.last20d) / 2}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Rata-rata posisi close vs midpoint daily range. Positif = close di atas tengah (buyer dominant); negatif = sebaliknya. Range -100 to +100.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume spike */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Volume Activity (5d vs 60d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Avg vol 5d" value={formatNumber(metrics.volumeSpike.last5dAvg, 0)} />
            <Stat label="Avg vol 60d" value={formatNumber(metrics.volumeSpike.last60dAvg, 0)} />
            <Stat
              label="Spike ratio"
              value={`${metrics.volumeSpike.spikeRatio.toFixed(2)}×`}
              tone={metrics.volumeSpike.interpretation === "high_interest" ? "bull" : metrics.volumeSpike.interpretation === "drying_up" ? "bear" : "neutral"}
            />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {metrics.volumeSpike.interpretation === "high_interest" && "🔥 Volume spike — minat tinggi (bisa breakout atau distribusi)."}
            {metrics.volumeSpike.interpretation === "drying_up" && "💤 Volume mengering — interest minimal (bisa setup akumulasi atau ditinggalkan)."}
            {metrics.volumeSpike.interpretation === "normal" && "Volume normal — tidak ada sinyal divergen."}
          </p>
        </CardContent>
      </Card>

      {/* Foreign flow & broker — when available */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Foreign Flow & Broker Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.foreignFlow.available || metrics.brokerActivity.available ? (
            <div className="space-y-3">
              {metrics.foreignFlow.available && (
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Net Foreign 5d" value={metrics.foreignFlow.netLast5d != null ? formatCompactIDR(metrics.foreignFlow.netLast5d) : "—"} tone={(metrics.foreignFlow.netLast5d ?? 0) > 0 ? "bull" : "bear"} />
                  <Stat label="Net Foreign 20d" value={metrics.foreignFlow.netLast20d != null ? formatCompactIDR(metrics.foreignFlow.netLast20d) : "—"} tone={(metrics.foreignFlow.netLast20d ?? 0) > 0 ? "bull" : "bear"} />
                  <Stat label="Net Foreign 60d" value={metrics.foreignFlow.netLast60d != null ? formatCompactIDR(metrics.foreignFlow.netLast60d) : "—"} tone={(metrics.foreignFlow.netLast60d ?? 0) > 0 ? "bull" : "bear"} />
                </div>
              )}
              {metrics.brokerActivity.available && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-bull">
                      Top Net Buyers (20d)
                    </div>
                    {metrics.brokerActivity.topNetBuyers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {metrics.brokerActivity.topNetBuyers.map((b) => (
                          <li key={b.broker} className="flex justify-between">
                            <span className="font-mono font-semibold">{b.broker}</span>
                            <span className="text-bull">{formatCompactIDR(b.netValueIdr)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-bear">
                      Top Net Sellers (20d)
                    </div>
                    {metrics.brokerActivity.topNetSellers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {metrics.brokerActivity.topNetSellers.map((b) => (
                          <li key={b.broker} className="flex justify-between">
                            <span className="font-mono font-semibold">{b.broker}</span>
                            <span className="text-bear">{formatCompactIDR(b.netValueIdr)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-card/40 p-4 text-center">
              <p className="text-sm font-semibold">📊 Foreign flow & broker data belum di-ingest</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Metrik volume-based di atas (A/D, OBV, MFI, buy/sell pressure) sudah aktif dan
                bisa mendeteksi smart money pattern dari data harga harian. Foreign flow &
                broker leaderboard akan tersedia setelah vendor data IDX di-konfigurasi di admin panel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "neutral" }) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm font-semibold", toneClass)}>{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  badgeClass,
  badgeLabel,
}: {
  label: string;
  value: string;
  badgeClass: string;
  badgeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 font-mono text-2xl font-bold">{value}</div>
      </div>
      <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase", badgeClass)}>
        {badgeLabel}
      </span>
    </div>
  );
}
