"use client";

import { useState } from "react";
import { Play, TrendingUp, TrendingDown, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EquityPoint { date: string; equity: number; drawdownPct: number; position: "in" | "out" }
interface Trade { entryDate: string; entryPrice: number; exitDate: string; exitPrice: number; shares: number; returnPct: number; holdingDays: number }
interface BacktestResult {
  ticker: string;
  strategy: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
  benchmarkBuyHold: { finalEquity: number; returnPct: number };
}

export default function BacktestPage() {
  const [form, setForm] = useState({
    ticker: "BBRI",
    strategy: "sma_crossover" as "sma_crossover" | "rsi_mean_reversion" | "breakout",
    startDate: "2023-01-01",
    endDate: new Date().toISOString().slice(0, 10),
    initialCapital: 100_000_000,
    fastPeriod: 20,
    slowPeriod: 50,
    rsiPeriod: 14,
    oversold: 30,
    overbought: 70,
    lookback: 20,
    commissionPct: 0.0015,
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null); setResult(null);
    try {
      const params: Record<string, number> =
        form.strategy === "sma_crossover" ? { fastPeriod: form.fastPeriod, slowPeriod: form.slowPeriod }
        : form.strategy === "rsi_mean_reversion" ? { period: form.rsiPeriod, oversold: form.oversold, overbought: form.overbought }
        : form.strategy === "breakout" ? { lookback: form.lookback }
        : {};

      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker, strategy: form.strategy, startDate: form.startDate, endDate: form.endDate,
          initialCapital: form.initialCapital, params, commissionPct: form.commissionPct,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Backtest gagal");
      setResult(data.data);
      toast.success(`Backtest selesai — ${data.data.totalTrades} trade`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backtest Strategi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test strategi trading di data historis sebelum risk uang asli. Educational baseline — no slippage model,
          no overnight gap risk, single position 100% equity.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">Konfigurasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Ticker">
              <input
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                maxLength={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
              />
            </Field>

            <Field label="Strategi">
              <select
                value={form.strategy}
                onChange={(e) => setForm({ ...form, strategy: e.target.value as never })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="sma_crossover">SMA Crossover</option>
                <option value="rsi_mean_reversion">RSI Mean Reversion</option>
                <option value="breakout">N-day Breakout</option>
                <option value="buy_hold">Buy &amp; Hold (baseline)</option>
              </select>
            </Field>

            {form.strategy === "sma_crossover" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fast MA"><input type="number" value={form.fastPeriod} onChange={(e) => setForm({ ...form, fastPeriod: +e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                <Field label="Slow MA"><input type="number" value={form.slowPeriod} onChange={(e) => setForm({ ...form, slowPeriod: +e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
              </div>
            )}
            {form.strategy === "rsi_mean_reversion" && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Period"><input type="number" value={form.rsiPeriod} onChange={(e) => setForm({ ...form, rsiPeriod: +e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                <Field label="Oversold"><input type="number" value={form.oversold} onChange={(e) => setForm({ ...form, oversold: +e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                <Field label="Overbought"><input type="number" value={form.overbought} onChange={(e) => setForm({ ...form, overbought: +e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
              </div>
            )}
            {form.strategy === "breakout" && (
              <Field label="Lookback days"><input type="number" value={form.lookback} onChange={(e) => setForm({ ...form, lookback: +e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="Start date"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /></Field>
              <Field label="End date"><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /></Field>
            </div>

            <Field label="Modal awal (Rp)">
              <input
                type="number"
                step="1000000"
                value={form.initialCapital}
                onChange={(e) => setForm({ ...form, initialCapital: +e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              />
            </Field>

            <Field label="Komisi (%)">
              <input
                type="number"
                step="0.0001"
                value={form.commissionPct}
                onChange={(e) => setForm({ ...form, commissionPct: +e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              />
              <div className="mt-0.5 text-[10px] text-muted-foreground">Default 0.15% (~typical Indonesia broker)</div>
            </Field>

            <Button onClick={run} disabled={loading} className="mt-3 w-full">
              {loading ? "Running..." : <><Play className="mr-2 h-4 w-4" />Run Backtest</>}
            </Button>

            {error && (
              <div className="rounded-md border border-bear/40 bg-bear-soft p-3 text-xs text-bear">
                <AlertCircle className="mr-1 inline h-3.5 w-3.5" />{error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {!result && !loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 font-semibold">Konfigurasi strategi di kiri, klik Run Backtest</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Engine akan simulasi trading di data historis & tampilkan equity curve, hit rate, max drawdown, Sharpe ratio.
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* KPI */}
              <div className="grid gap-3 sm:grid-cols-4">
                <Kpi label="Total Return" value={fmtPct(result.totalReturnPct)} positive={result.totalReturnPct >= 0} />
                <Kpi label="Annualized" value={fmtPct(result.annualizedReturnPct)} positive={result.annualizedReturnPct >= 0} />
                <Kpi label="Max Drawdown" value={fmtPct(result.maxDrawdownPct)} positive={false} forceBear />
                <Kpi label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} positive={result.sharpeRatio >= 1} />
              </div>

              {/* vs Buy & Hold */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">vs Buy &amp; Hold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Strategi</div>
                      <div className="mt-1 font-mono text-xl font-bold">{fmtIdr(result.finalEquity)}</div>
                      <div className={result.totalReturnPct >= 0 ? "text-bull" : "text-bear"}>{fmtPct(result.totalReturnPct)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Buy &amp; Hold</div>
                      <div className="mt-1 font-mono text-xl font-bold">{fmtIdr(result.benchmarkBuyHold.finalEquity)}</div>
                      <div className={result.benchmarkBuyHold.returnPct >= 0 ? "text-bull" : "text-bear"}>{fmtPct(result.benchmarkBuyHold.returnPct)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Outperformance</div>
                      <div className={`mt-1 font-mono text-xl font-bold ${(result.totalReturnPct - result.benchmarkBuyHold.returnPct) >= 0 ? "text-bull" : "text-bear"}`}>
                        {fmtPct(result.totalReturnPct - result.benchmarkBuyHold.returnPct)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equity curve */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <EquityChart curve={result.equityCurve} initialCapital={result.initialCapital} />
                </CardContent>
              </Card>

              {/* Trade stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statistik Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <Stat label="Total trades" value={String(result.totalTrades)} />
                    <Stat label="Win rate" value={fmtPct(result.winRate)} />
                    <Stat label="Avg win" value={fmtPct(result.avgWinPct)} positive />
                    <Stat label="Avg loss" value={fmtPct(result.avgLossPct)} negative />
                    <Stat label="Profit factor" value={isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : "∞"} />
                    <Stat label="Winning" value={String(result.winningTrades)} positive />
                    <Stat label="Losing" value={String(result.losingTrades)} negative />
                    <Stat label="Trade rate" value={`${(result.totalTrades / (result.equityCurve.length / 252)).toFixed(1)}/yr`} />
                  </div>
                </CardContent>
              </Card>

              {/* Trades */}
              {result.trades.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Trade History ({result.trades.length})</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-3 py-1.5">Entry</th>
                            <th className="px-3 py-1.5 text-right">Entry Px</th>
                            <th className="px-3 py-1.5">Exit</th>
                            <th className="px-3 py-1.5 text-right">Exit Px</th>
                            <th className="px-3 py-1.5 text-right">Hold</th>
                            <th className="px-3 py-1.5 text-right">Return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.trades.map((t, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-3 py-1.5">{t.entryDate}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{Math.round(t.entryPrice)}</td>
                              <td className="px-3 py-1.5">{t.exitDate}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{Math.round(t.exitPrice)}</td>
                              <td className="px-3 py-1.5 text-right">{t.holdingDays}d</td>
                              <td className={`px-3 py-1.5 text-right font-mono font-semibold ${t.returnPct >= 0 ? "text-bull" : "text-bear"}`}>
                                {t.returnPct >= 0 ? "+" : ""}{(t.returnPct * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <strong>Catatan:</strong> Hasil backtest historis BUKAN jaminan kinerja masa depan. Engine ini educational baseline — tidak include slippage realistis, overnight gap, transaction cost penuh, atau survivorship bias. Pakai untuk eksplorasi hipotesis, bukan keputusan trading langsung.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, value, positive, forceBear }: { label: string; value: string; positive: boolean; forceBear?: boolean }) {
  const color = forceBear ? "text-bear" : positive ? "text-bull" : "text-bear";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  const color = positive ? "text-bull" : negative ? "text-bear" : "";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function fmtPct(n: number): string { return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`; }
function fmtIdr(n: number): string { return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`; }

function EquityChart({ curve, initialCapital }: { curve: EquityPoint[]; initialCapital: number }) {
  if (curve.length < 2) return <div className="text-sm text-muted-foreground">No data</div>;
  const W = 800, H = 240, PAD = 24;
  const max = Math.max(...curve.map((p) => p.equity), initialCapital);
  const min = Math.min(...curve.map((p) => p.equity), initialCapital);
  const range = max - min || 1;
  const dx = (W - PAD * 2) / Math.max(1, curve.length - 1);
  const path = curve.map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + i * dx} ${H - PAD - ((p.equity - min) / range) * (H - PAD * 2)}`).join(" ");
  const baseY = H - PAD - ((initialCapital - min) / range) * (H - PAD * 2);
  const last = curve[curve.length - 1]!;
  const isUp = last.equity >= initialCapital;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full">
        {/* Baseline (initial capital) */}
        <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
        {/* Equity line */}
        <path d={path} fill="none" stroke={isUp ? "oklch(0.72 0.17 160)" : "oklch(0.7 0.22 22)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{curve[0]!.date}</span>
        <span>Baseline: {fmtIdr(initialCapital)}</span>
        <span>{curve[curve.length - 1]!.date}</span>
      </div>
    </div>
  );
}
