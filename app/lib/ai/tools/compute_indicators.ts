import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface ComputeIndicatorsArgs {
  kode: string;
  indicators: Array<"rsi" | "sma" | "ema" | "macd">;
  rsiPeriod?: number;
  smaPeriod?: number;
  emaPeriod?: number;
  lookbackDays?: number;
}

interface BarLike {
  date?: string;
  time?: string | number;
  close: number;
}

/**
 * `compute_indicators` — hitung indikator teknikal dasar server-side dari OHLCV.
 *
 * Dependencies: Agent 5 `getOhlcv` untuk data input. Komputasi sendiri (tidak panggil
 * library third-party — keep ringan).
 */
export const computeIndicatorsTool: ToolDefinition<ComputeIndicatorsArgs> = {
  name: "compute_indicators",
  description:
    "Hitung indikator teknikal dasar (RSI, SMA, EMA, MACD) untuk satu ticker IDX. Gunakan saat user minta analisis momentum/tren teknikal.",
  parameters: {
    type: "object",
    properties: {
      kode: {
        type: "string",
        description: "Kode ticker IDX uppercase.",
        pattern: "^[A-Z0-9]{3,6}$",
      },
      indicators: {
        type: "array",
        items: { type: "string", enum: ["rsi", "sma", "ema", "macd"] },
        minItems: 1,
        description: "Daftar indikator yang ingin dihitung.",
      },
      rsiPeriod: {
        type: "number",
        description: "Periode RSI. Default 14.",
        minimum: 2,
        maximum: 100,
      },
      smaPeriod: {
        type: "number",
        description: "Periode SMA. Default 20.",
        minimum: 2,
        maximum: 200,
      },
      emaPeriod: {
        type: "number",
        description: "Periode EMA. Default 20.",
        minimum: 2,
        maximum: 200,
      },
      lookbackDays: {
        type: "number",
        description: "Berapa hari OHLCV diambil untuk hitung. Default 120.",
        minimum: 30,
        maximum: 500,
      },
    },
    required: ["kode", "indicators"],
    additionalProperties: false,
  },
  async handler(args) {
    const kode = args.kode?.toUpperCase?.();
    if (!kode || !/^[A-Z0-9]{3,6}$/.test(kode)) {
      return {
        ok: false,
        error: { code: "INVALID_TICKER", message: "Format ticker tidak valid." },
      };
    }
    const indicators = args.indicators ?? [];
    if (indicators.length === 0) {
      return {
        ok: false,
        error: { code: "NO_INDICATOR", message: "Pilih minimal satu indikator." },
      };
    }

    try {
      const mod = (await import("@/lib/market-data").catch(() => null)) as
        | { getOhlcv?: (k: string, opts: unknown) => Promise<unknown> }
        | null;
      if (!mod?.getOhlcv) {
        return {
          ok: false,
          error: {
            code: "MARKET_DATA_NOT_READY",
            message: "Data OHLCV belum tersedia untuk komputasi indikator.",
          },
        };
      }
      const lookback = args.lookbackDays ?? 120;
      const raw = (await mod.getOhlcv(kode, { interval: "1d", limit: lookback })) as
        | BarLike[]
        | { bars?: BarLike[] }
        | null;
      const bars = extractBars(raw);
      if (!bars || bars.length < 30) {
        return {
          ok: false,
          error: {
            code: "INSUFFICIENT_DATA",
            message: "Data OHLCV tidak cukup untuk hitung indikator (minimal 30 bar).",
          },
        };
      }
      const closes = bars.map((b) => Number(b.close)).filter((n) => Number.isFinite(n));

      const result: Record<string, unknown> = { kode, barCount: closes.length };

      if (indicators.includes("rsi")) {
        const period = args.rsiPeriod ?? 14;
        result.rsi = {
          period,
          latest: rsi(closes, period),
        };
      }
      if (indicators.includes("sma")) {
        const period = args.smaPeriod ?? 20;
        result.sma = { period, latest: sma(closes, period) };
      }
      if (indicators.includes("ema")) {
        const period = args.emaPeriod ?? 20;
        const series = emaSeries(closes, period);
        result.ema = { period, latest: series.at(-1) ?? null };
      }
      if (indicators.includes("macd")) {
        result.macd = macd(closes);
      }

      result.latestClose = closes.at(-1) ?? null;
      return { ok: true, data: result };
    } catch (err) {
      logger.warn({ err, args }, "compute_indicators tool error");
      return {
        ok: false,
        error: {
          code: "COMPUTE_FAILED",
          message: err instanceof Error ? err.message : "Gagal menghitung indikator",
        },
      };
    }
  },
};

function extractBars(raw: unknown): BarLike[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as BarLike[];
  if (typeof raw === "object" && raw !== null && Array.isArray((raw as { bars?: unknown }).bars)) {
    return (raw as { bars: BarLike[] }).bars;
  }
  return null;
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  const seedSlice = values.slice(0, period);
  let prev = seedSlice.reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    const cur = values[i]!;
    prev = cur * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values: number[], period: number): number | null {
  if (values.length < period + 1) return null;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i]! - values[i - 1]!;
    if (change >= 0) gainSum += change;
    else lossSum -= change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i]! - values[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(values: number[]): {
  macdLine: number | null;
  signalLine: number | null;
  histogram: number | null;
} {
  if (values.length < 35) return { macdLine: null, signalLine: null, histogram: null };
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  // align by index from the end
  const len = Math.min(ema12.length, ema26.length);
  const macdSeries: number[] = [];
  for (let i = 0; i < len; i++) {
    macdSeries.push(ema12[ema12.length - len + i]! - ema26[ema26.length - len + i]!);
  }
  const signalSeries = emaSeries(macdSeries, 9);
  const macdLine = macdSeries.at(-1) ?? null;
  const signalLine = signalSeries.at(-1) ?? null;
  return {
    macdLine,
    signalLine,
    histogram: macdLine !== null && signalLine !== null ? macdLine - signalLine : null,
  };
}
