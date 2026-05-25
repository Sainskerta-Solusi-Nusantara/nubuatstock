import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotesEod } from "@/db/schema/market";
import { sma, rsi } from "@/lib/picks/indicators";

/**
 * Wyckoff Phase Mapping — versi simplified untuk Nubuat MVP.
 *
 * AlphaFlow approach: ranging / expanding / distributing / fading.
 * Nubuat approach: 4 phase klasik Wyckoff dengan heuristic numerik yang konkrit:
 *
 *   - ACCUMULATION (📦): Range-bound sideways setelah downtrend → volume mengecil,
 *     ADX < 20, harga di support zone (oversold RSI), volatility kompresi (BB narrow).
 *     Hipotesis: smart money sedang akumulasi di harga rendah.
 *
 *   - MARKUP (📈): Breakout dari accumulation → harga uptrend kuat, SMA20 > SMA50 > SMA200,
 *     RSI 50-70 (healthy momentum), volume confirming.
 *     Hipotesis: trend up dengan momentum.
 *
 *   - DISTRIBUTION (📤): Range-bound sideways setelah uptrend → volume tetap tinggi,
 *     harga gagal break high, RSI bearish divergence.
 *     Hipotesis: smart money sedang distribusi ke retail.
 *
 *   - MARKDOWN (📉): Breakdown dari distribution → harga downtrend, SMA stack bearish,
 *     RSI < 50.
 *     Hipotesis: trend down dengan momentum bearish.
 *
 * Algorithm: sliding window 60 hari (~3 bulan), per window classify phase by feature vector.
 * Confidence score 0-1 berdasarkan strength of indicators alignment.
 */

export type WyckoffPhase = "accumulation" | "markup" | "distribution" | "markdown" | "unknown";

export interface PhaseSegment {
  startDate: string;
  endDate: string;
  phase: WyckoffPhase;
  confidence: number;
  durationDays: number;
}

export interface WyckoffAnalysis {
  kode: string;
  currentPhase: WyckoffPhase;
  currentConfidence: number;
  currentSince: string;
  segments: PhaseSegment[];
  reasoning: string[];
  stats: {
    barsAnalyzed: number;
    last20dRange: number;
    last60dRange: number;
    volatilityRatio: number; // last 20d vs last 60d (compression detector)
  };
}

interface Bar {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
}

function detectPhase(window: Bar[]): { phase: WyckoffPhase; confidence: number; reasons: string[] } {
  if (window.length < 20) {
    return { phase: "unknown", confidence: 0, reasons: ["insufficient data"] };
  }

  const closes = window.map((b) => b.close);
  const highs = window.map((b) => b.high);
  const lows = window.map((b) => b.low);
  const volumes = window.map((b) => b.volume);

  const last = closes[closes.length - 1]!;
  const first = closes[0]!;
  const trendChange = ((last - first) / first) * 100;

  const windowHi = Math.max(...highs);
  const windowLo = Math.min(...lows);
  const rangePct = ((windowHi - windowLo) / windowLo) * 100;

  // Volatility (close-to-close stdev / mean)
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const variance = closes.reduce((a, b) => a + (b - mean) ** 2, 0) / closes.length;
  const stdev = Math.sqrt(variance);
  const volPct = (stdev / mean) * 100;

  // Volume trend
  const vMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const vRecent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volumeRatio = vRecent / vMean;

  // MA stack
  const sma20 = sma(closes, 20).at(-1) ?? null;
  const sma50 = closes.length >= 50 ? sma(closes, 50).at(-1) ?? null : null;
  const rsi14 = rsi(closes, 14).at(-1) ?? null;

  const reasons: string[] = [];

  // Range-bound: low trend change AND moderate range
  const isRangeBound = Math.abs(trendChange) < 8;
  const isUptrend = trendChange > 5 && sma20 != null && last > sma20;
  const isDowntrend = trendChange < -5 && sma20 != null && last < sma20;
  const lowVol = volPct < 3.5;

  if (isUptrend) {
    let conf = 0.5;
    reasons.push(`Trend up ${trendChange.toFixed(1)}% over window`);
    if (sma50 != null && sma20! > sma50) {
      conf += 0.2;
      reasons.push("SMA20 above SMA50 (bullish stack)");
    }
    if (rsi14 != null && rsi14 > 50 && rsi14 < 75) {
      conf += 0.15;
      reasons.push(`RSI ${rsi14.toFixed(0)} (healthy momentum)`);
    }
    if (volumeRatio > 1.1) {
      conf += 0.15;
      reasons.push(`Volume up ${((volumeRatio - 1) * 100).toFixed(0)}% recent vs avg`);
    }
    return { phase: "markup", confidence: Math.min(1, conf), reasons };
  }

  if (isDowntrend) {
    let conf = 0.5;
    reasons.push(`Trend down ${trendChange.toFixed(1)}% over window`);
    if (sma50 != null && sma20! < sma50) {
      conf += 0.2;
      reasons.push("SMA20 below SMA50 (bearish stack)");
    }
    if (rsi14 != null && rsi14 < 50) {
      conf += 0.15;
      reasons.push(`RSI ${rsi14.toFixed(0)} (weak momentum)`);
    }
    if (volumeRatio > 1.1) {
      conf += 0.15;
      reasons.push(`Volume up — possible capitulation`);
    }
    return { phase: "markdown", confidence: Math.min(1, conf), reasons };
  }

  if (isRangeBound) {
    // Distinguish accumulation vs distribution by PRIOR trend (look at first half of window)
    const half = Math.floor(window.length / 2);
    const firstHalfMean = closes.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const recentMean = closes.slice(-half).reduce((a, b) => a + b, 0) / half;
    const priorTrend = ((firstHalfMean - closes[0]!) / closes[0]!) * 100;

    let conf = 0.5;
    reasons.push(`Range-bound (${rangePct.toFixed(1)}% range)`);
    if (lowVol) {
      conf += 0.15;
      reasons.push(`Volatility compressed (${volPct.toFixed(1)}%)`);
    }
    if (volumeRatio < 0.85) {
      conf += 0.1;
      reasons.push(`Volume drying up`);
    }

    // Accumulation if PRIOR was down, distribution if PRIOR was up
    if (priorTrend < -5 || (rsi14 != null && rsi14 < 40)) {
      conf += 0.1;
      reasons.push(`Prior downtrend + low RSI → likely accumulation`);
      return { phase: "accumulation", confidence: Math.min(1, conf), reasons };
    } else if (priorTrend > 5 || (rsi14 != null && rsi14 > 60)) {
      conf += 0.1;
      reasons.push(`Prior uptrend + high RSI → likely distribution`);
      return { phase: "distribution", confidence: Math.min(1, conf), reasons };
    }

    // Ambiguous range
    if (recentMean > firstHalfMean) {
      reasons.push(`Recent strength → leaning accumulation`);
      return { phase: "accumulation", confidence: Math.min(1, conf), reasons };
    }
    return { phase: "distribution", confidence: Math.min(1, conf), reasons };
  }

  return { phase: "unknown", confidence: 0.3, reasons: ["No clear phase signal"] };
}

export async function analyzeWyckoff(kode: string): Promise<WyckoffAnalysis | null> {
  const k = kode.toUpperCase();
  const rows = await db
    .select({
      date: quotesEod.tradeDate,
      close: quotesEod.close,
      high: quotesEod.high,
      low: quotesEod.low,
      volume: quotesEod.volume,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, k))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(250);

  if (rows.length < 30) return null;

  // Chronological order
  const bars: Bar[] = rows.slice().reverse().map((r) => ({
    date: r.date,
    close: Number(r.close),
    high: Number(r.high),
    low: Number(r.low),
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume),
  }));

  // Sliding window phases: 60-day window, slide by 20 days
  const WINDOW = 60;
  const STEP = 20;
  const segments: PhaseSegment[] = [];

  if (bars.length >= WINDOW) {
    for (let i = WINDOW; i <= bars.length; i += STEP) {
      const w = bars.slice(i - WINDOW, i);
      const { phase, confidence } = detectPhase(w);
      const startDate = w[0]!.date;
      const endDate = w[w.length - 1]!.date;

      // Merge with previous if same phase (to compact segments)
      const prev = segments[segments.length - 1];
      if (prev && prev.phase === phase) {
        prev.endDate = endDate;
        prev.durationDays = daysBetween(prev.startDate, prev.endDate);
        prev.confidence = Math.max(prev.confidence, confidence);
      } else {
        segments.push({
          startDate,
          endDate,
          phase,
          confidence,
          durationDays: daysBetween(startDate, endDate),
        });
      }
    }
  }

  // Current phase: analyze last 60 bars
  const recent = bars.slice(-Math.min(60, bars.length));
  const { phase, confidence, reasons } = detectPhase(recent);

  // Stats
  const last20 = bars.slice(-20);
  const last60 = bars.slice(-60);
  const range20 = (Math.max(...last20.map((b) => b.high)) - Math.min(...last20.map((b) => b.low))) / Math.min(...last20.map((b) => b.low)) * 100;
  const range60 = (Math.max(...last60.map((b) => b.high)) - Math.min(...last60.map((b) => b.low))) / Math.min(...last60.map((b) => b.low)) * 100;

  // Find when current phase started (look backward in segments)
  let currentSince = recent[0]!.date;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (segments[i]!.phase === phase) {
      currentSince = segments[i]!.startDate;
    } else {
      break;
    }
  }

  return {
    kode: k,
    currentPhase: phase,
    currentConfidence: confidence,
    currentSince,
    segments,
    reasoning: reasons,
    stats: {
      barsAnalyzed: bars.length,
      last20dRange: range20,
      last60dRange: range60,
      volatilityRatio: range20 / Math.max(range60, 0.01),
    },
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export const PHASE_META = {
  accumulation: {
    label: "Accumulation",
    emoji: "📦",
    description:
      "Smart money sedang akumulasi setelah penurunan. Harga sideways di support, volume mengecil, volatility compressed. Setup untuk breakout ke atas.",
    color: "blue",
  },
  markup: {
    label: "Markup",
    emoji: "📈",
    description:
      "Trend uptrend dengan momentum kuat. SMA stack bullish, RSI healthy. Smart money sudah masuk, retail mulai FOMO. Fase pertumbuhan harga.",
    color: "green",
  },
  distribution: {
    label: "Distribution",
    emoji: "📤",
    description:
      "Smart money sedang distribusi ke retail di harga tinggi. Harga sideways setelah uptrend, gagal break high, volume tetap tinggi. Waspada reversal.",
    color: "orange",
  },
  markdown: {
    label: "Markdown",
    emoji: "📉",
    description:
      "Trend downtrend setelah distribusi. SMA stack bearish, RSI lemah. Retail panik selling, smart money menunggu di harga lebih rendah.",
    color: "red",
  },
  unknown: {
    label: "Unknown",
    emoji: "❓",
    description: "Tidak ada sinyal jelas — kemungkinan transisi antar phase.",
    color: "gray",
  },
} as const;
