"use client";

import { useState } from "react";
import { Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProUpsell } from "./pro-upsell";
import { WalkForwardResult } from "./walk-forward-result";
import { MonteCarloResult } from "./monte-carlo-result";
import type { WalkForwardResultDTO, MonteCarloResultDTO } from "./types";

export interface AdvancedConfig {
  ticker: string;
  strategy: "sma_crossover" | "rsi_mean_reversion" | "breakout" | "buy_hold";
  startDate: string;
  endDate: string;
  initialCapital: number;
  params: Record<string, number>;
  commissionPct: number;
}

type Mode = "walk_forward" | "monte_carlo";

export function AdvancedPanel({ mode, isPro, getConfig }: { mode: Mode; isPro: boolean; getConfig: () => AdvancedConfig }) {
  const [windows, setWindows] = useState(4);
  const [trainRatio, setTrainRatio] = useState(0.7);
  const [iterations, setIterations] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wf, setWf] = useState<WalkForwardResultDTO | null>(null);
  const [mc, setMc] = useState<MonteCarloResultDTO | null>(null);

  if (!isPro) {
    return <ProUpsell feature={mode === "walk_forward" ? "Walk-Forward analysis" : "Monte Carlo simulation"} />;
  }

  async function run() {
    setLoading(true); setError(null); setWf(null); setMc(null);
    try {
      const cfg = getConfig();
      const payload =
        mode === "walk_forward"
          ? { mode, input: { ticker: cfg.ticker, strategy: cfg.strategy, startDate: cfg.startDate, endDate: cfg.endDate, initialCapital: cfg.initialCapital, params: cfg.params, commissionPct: cfg.commissionPct }, windows, trainRatio }
          : { mode, input: { ticker: cfg.ticker, strategy: cfg.strategy, startDate: cfg.startDate, endDate: cfg.endDate, initialCapital: cfg.initialCapital, params: cfg.params, commissionPct: cfg.commissionPct }, iterations };

      const res = await fetch("/api/backtest/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Analisis gagal");
      if (mode === "walk_forward") {
        setWf(data.data as WalkForwardResultDTO);
        toast.success("Walk-Forward selesai");
      } else {
        setMc(data.data as MonteCarloResultDTO);
        toast.success("Monte Carlo selesai");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "walk_forward" ? "Walk-Forward Analysis" : "Monte Carlo Simulation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {mode === "walk_forward"
              ? "Bagi range jadi beberapa window rolling, uji strategi di tiap segmen out-of-sample. Pakai konfigurasi strategi & ticker dari panel kiri."
              : "Resample urutan trade dari backtest untuk lihat distribusi outcome (percentile, prob. profit, sebaran drawdown). Pakai konfigurasi strategi & ticker dari panel kiri."}
          </p>

          {mode === "walk_forward" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Jumlah window (${windows})`}>
                <input type="range" min={2} max={12} value={windows} onChange={(e) => setWindows(+e.target.value)} className="w-full" />
              </Field>
              <Field label={`Train ratio (${(trainRatio * 100).toFixed(0)}%)`}>
                <input type="range" min={30} max={90} step={5} value={trainRatio * 100} onChange={(e) => setTrainRatio(+e.target.value / 100)} className="w-full" />
              </Field>
            </div>
          ) : (
            <Field label={`Iterasi (${iterations.toLocaleString("id-ID")})`}>
              <input type="range" min={100} max={10000} step={100} value={iterations} onChange={(e) => setIterations(+e.target.value)} className="w-full" />
            </Field>
          )}

          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? "Running..." : <><Play className="mr-2 h-4 w-4" />{mode === "walk_forward" ? "Run Walk-Forward" : "Run Monte Carlo"}</>}
          </Button>

          {error && (
            <div className="rounded-md border border-bear/40 bg-bear-soft p-3 text-xs text-bear">
              <AlertCircle className="mr-1 inline h-3.5 w-3.5" />{error}
            </div>
          )}
        </CardContent>
      </Card>

      {wf && <WalkForwardResult result={wf} />}
      {mc && <MonteCarloResult result={mc} />}
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
