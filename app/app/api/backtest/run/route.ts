import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, fail, handleError } from "@/lib/utils/api";
import { runBacktest } from "@/lib/backtest/engine";

const bodySchema = z.object({
  ticker: z.string().regex(/^[A-Z][A-Z0-9]{2,4}$/),
  strategy: z.enum(["sma_crossover", "rsi_mean_reversion", "breakout", "buy_hold"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  initialCapital: z.number().int().min(1_000_000).max(10_000_000_000),
  params: z.record(z.string(), z.number()).default({}),
  commissionPct: z.number().min(0).max(0.05).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = bodySchema.parse(body);

    // Validate strategy params
    if (input.strategy === "sma_crossover") {
      if (!input.params.fastPeriod || !input.params.slowPeriod) {
        return fail(400, "MISSING_PARAMS", "sma_crossover butuh fastPeriod & slowPeriod");
      }
      if (input.params.fastPeriod >= input.params.slowPeriod) {
        return fail(400, "INVALID_PARAMS", "fastPeriod harus < slowPeriod");
      }
    }
    if (input.strategy === "rsi_mean_reversion") {
      if (!input.params.period || !input.params.oversold || !input.params.overbought) {
        return fail(400, "MISSING_PARAMS", "rsi_mean_reversion butuh period, oversold, overbought");
      }
    }
    if (input.strategy === "breakout") {
      if (!input.params.lookback) {
        return fail(400, "MISSING_PARAMS", "breakout butuh lookback");
      }
    }

    const result = await runBacktest(input);

    // Truncate equity curve for response payload (full curve > 1000 points bisa berat)
    const sampledCurve = result.equityCurve.length > 250
      ? result.equityCurve.filter((_, i) => i % Math.ceil(result.equityCurve.length / 250) === 0).concat([result.equityCurve[result.equityCurve.length - 1]!])
      : result.equityCurve;

    return ok({ ...result, equityCurve: sampledCurve });
  } catch (err) {
    return handleError(err);
  }
}
