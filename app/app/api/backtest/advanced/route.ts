import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { requireTier } from "@/lib/billing/entitlements";
import { ok, fail, handleError } from "@/lib/utils/api";
import { runBacktest, type BacktestInput } from "@/lib/backtest/engine";
import { runWalkForward } from "@/lib/backtest/walk-forward";
import { runMonteCarlo } from "@/lib/backtest/monte-carlo";

/**
 * POST /api/backtest/advanced
 *
 * Advanced backtesting — Walk-Forward & Monte Carlo. Hasil EPHEMERAL (dihitung
 * on-request, dikembalikan ke UI; tidak disimpan ke DB).
 *
 * Gated minimal tier Pro (requireTier(userId, "pro")).
 */

const baseInput = z.object({
  ticker: z.string().regex(/^[A-Z][A-Z0-9]{2,4}$/),
  strategy: z.enum(["sma_crossover", "rsi_mean_reversion", "breakout", "buy_hold"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  initialCapital: z.number().int().min(1_000_000).max(10_000_000_000),
  params: z.record(z.string(), z.number()).default({}),
  commissionPct: z.number().min(0).max(0.05).optional(),
});

const bodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("walk_forward"),
    input: baseInput,
    windows: z.number().int().min(2).max(12).optional(),
    trainRatio: z.number().min(0.3).max(0.9).optional(),
  }),
  z.object({
    mode: z.literal("monte_carlo"),
    input: baseInput,
    iterations: z.number().int().min(100).max(10_000).optional(),
    seed: z.number().int().optional(),
  }),
]);

function validateStrategyParams(input: z.infer<typeof baseInput>): string | null {
  if (input.strategy === "sma_crossover") {
    if (!input.params.fastPeriod || !input.params.slowPeriod) return "sma_crossover butuh fastPeriod & slowPeriod";
    if (input.params.fastPeriod >= input.params.slowPeriod) return "fastPeriod harus < slowPeriod";
  }
  if (input.strategy === "rsi_mean_reversion") {
    if (!input.params.period || !input.params.oversold || !input.params.overbought) {
      return "rsi_mean_reversion butuh period, oversold, overbought";
    }
  }
  if (input.strategy === "breakout") {
    if (!input.params.lookback) return "breakout butuh lookback";
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requireTier(session.userId, "pro");

    const body = await req.json();
    const parsed = bodySchema.parse(body);

    const paramErr = validateStrategyParams(parsed.input);
    if (paramErr) return fail(400, "INVALID_PARAMS", paramErr);

    const input = parsed.input as BacktestInput;

    if (parsed.mode === "walk_forward") {
      const result = await runWalkForward(input, {
        windows: parsed.windows,
        trainRatio: parsed.trainRatio,
      });
      // Sample combined OOS curve untuk payload ringan.
      const curve = result.combinedOos.equityCurve;
      const sampled =
        curve.length > 250
          ? curve
              .filter((_, i) => i % Math.ceil(curve.length / 250) === 0)
              .concat(curve.length > 0 ? [curve[curve.length - 1]!] : [])
          : curve;
      return ok({ ...result, combinedOos: { ...result.combinedOos, equityCurve: sampled } });
    }

    // monte_carlo: jalankan backtest dulu (single realisasi), lalu resample.
    const backtest = await runBacktest(input);
    const result = runMonteCarlo(backtest, {
      iterations: parsed.iterations,
      seed: parsed.seed,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
