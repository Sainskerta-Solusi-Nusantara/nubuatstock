import {
  adLineSlope,
  adx,
  bollinger,
  macd,
  pctChange,
  rollingMean,
  rsi,
  sma,
} from "./indicators";
import { computeLevels } from "./levels";
import { classifySetup } from "./setup";
import type {
  FactorBreakdown,
  ForeignFlowDailyInput,
  OhlcvBar,
  ScoringCandidateInput,
  ScoringResult,
  ScoringWeights,
  SectorContext,
} from "@/lib/types/picks";

/**
 * Multi-factor scoring engine. Pure function: tidak ada IO, tidak ada hardcode bobot.
 *
 * Input: ScoringCandidateInput (OHLCV 200D, foreign flow 20D, sector context).
 * Weights: di-pass dari `lib/picks/config.ts` (sumber: DB table `picks_scoring_weights`).
 *
 * Output 0-100 per factor + total weighted score 0-100. `risk_penalty` adalah
 * subtractive: total = sum(weight_i * score_i) untuk i in [technical..macro] -
 * weight_risk_penalty * risk_penalty_score.
 *
 * Fundamental & sentiment di MVP return netral (50) kalau data tidak ada — JANGAN
 * fabrikasi angka. Lihat AGENTS.md §11.
 */

export interface ScoringArgs {
  candidate: ScoringCandidateInput;
  weights: ScoringWeights;
  weightsVersion: string;
  minRrRatio: number;
}

const NEUTRAL_SCORE = 50;

export function scoreCandidate(args: ScoringArgs): ScoringResult {
  const { candidate, weights, weightsVersion, minRrRatio } = args;
  const bars = candidate.ohlcv;

  if (bars.length < 50) {
    return rejected(candidate.companyKode, weightsVersion, "Insufficient OHLCV history (<50 bars)");
  }

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const values = bars.map((b) => b.valueIdr);

  const breakdown: FactorBreakdown = {
    technical: scoreTechnical(bars, closes, volumes),
    bandarmology: scoreBandarmology(bars, candidate.foreignFlow),
    fundamental: scoreFundamental(candidate.marketCapIdr),
    sentiment: NEUTRAL_SCORE,
    macro: scoreMacro(candidate.sectorContext),
    risk_penalty: scoreRiskPenalty(bars, values),
  };

  const positiveScore =
    weights.technical * breakdown.technical +
    weights.bandarmology * breakdown.bandarmology +
    weights.fundamental * breakdown.fundamental +
    weights.sentiment * breakdown.sentiment +
    weights.macro * breakdown.macro;
  const penalty = weights.risk_penalty * breakdown.risk_penalty;
  const score = clampScore(positiveScore - penalty);

  const setup = classifySetup({ bars });
  const levels = computeLevels({ bars, setup: setup.setupType, minRrRatio });

  if (levels.rejected) {
    return {
      companyKode: candidate.companyKode,
      score,
      breakdown,
      setup,
      levels: {
        entryZoneLow: levels.entryZoneLow,
        entryZoneHigh: levels.entryZoneHigh,
        stopLoss: levels.stopLoss,
        tp1: levels.tp1,
        tp2: levels.tp2,
        tp3: levels.tp3,
        atr14: levels.atr14,
        rewardRiskRatio: levels.rewardRiskRatio,
      },
      weightsVersion,
      rejected: true,
      rejectionReason: levels.rejectionReason,
    };
  }

  return {
    companyKode: candidate.companyKode,
    score,
    breakdown,
    setup,
    levels: {
      entryZoneLow: levels.entryZoneLow,
      entryZoneHigh: levels.entryZoneHigh,
      stopLoss: levels.stopLoss,
      tp1: levels.tp1,
      tp2: levels.tp2,
      tp3: levels.tp3,
      atr14: levels.atr14,
      rewardRiskRatio: levels.rewardRiskRatio,
    },
    weightsVersion,
    rejected: false,
    rejectionReason: null,
  };
}

function rejected(companyKode: string, weightsVersion: string, reason: string): ScoringResult {
  return {
    companyKode,
    score: 0,
    breakdown: {
      technical: 0,
      bandarmology: 0,
      fundamental: 0,
      sentiment: 0,
      macro: 0,
      risk_penalty: 0,
    },
    setup: { setupType: "range", timeHorizon: "swing_3_5d", confidence: "low" },
    levels: {
      entryZoneLow: 0,
      entryZoneHigh: 0,
      stopLoss: 0,
      tp1: 0,
      tp2: null,
      tp3: null,
      atr14: 0,
      rewardRiskRatio: 0,
    },
    weightsVersion,
    rejected: true,
    rejectionReason: reason,
  };
}

function clampScore(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100));
}

// ===================== Component scorers =====================

function scoreTechnical(bars: OhlcvBar[], closes: number[], volumes: number[]): number {
  const last = closes.at(-1)!;
  const sma50Series = sma(closes, 50);
  const sma200Series = closes.length >= 200 ? sma(closes, 200) : null;
  const sma50Last = sma50Series.at(-1) ?? null;
  const sma200Last = sma200Series?.at(-1) ?? null;
  const sma50Prev = sma50Series.at(-2) ?? null;
  const sma200Prev = sma200Series && closes.length >= 201 ? sma200Series.at(-2) ?? null : null;
  const rsiLast = rsi(closes, 14).at(-1) ?? null;
  const macdResult = macd(closes);
  const macdLast = macdResult.macd.at(-1) ?? null;
  const signalLast = macdResult.signal.at(-1) ?? null;
  const macdPrev = macdResult.macd.at(-2) ?? null;
  const signalPrev = macdResult.signal.at(-2) ?? null;
  const bb = bollinger(closes, 20, 2);
  const bbWidth = bb.bandwidth.at(-1) ?? null;
  const bbWidthMedian = median(
    bb.bandwidth.slice(-40, -1).filter((v): v is number => v !== null),
  );
  const adxLast = adx(bars, 14).at(-1) ?? null;

  let s = 0;
  let max = 0;

  // Trend: above SMA50 (15), above SMA200 (10), golden cross last 5 (10)
  max += 35;
  if (sma50Last !== null && last > sma50Last) s += 15;
  if (sma200Last !== null && last > sma200Last) s += 10;
  if (
    sma50Last !== null &&
    sma200Last !== null &&
    sma50Prev !== null &&
    sma200Prev !== null &&
    sma50Prev <= sma200Prev &&
    sma50Last > sma200Last
  ) {
    s += 10;
  }

  // Momentum RSI (sweet spot 50-70 = full, 40-50 / 70-75 = partial)
  max += 20;
  if (rsiLast !== null) {
    if (rsiLast >= 50 && rsiLast <= 70) s += 20;
    else if (rsiLast >= 45 && rsiLast < 50) s += 12;
    else if (rsiLast > 70 && rsiLast <= 78) s += 10;
    else if (rsiLast >= 30 && rsiLast < 45) s += 6;
  }

  // MACD signal cross / above signal
  max += 15;
  if (macdLast !== null && signalLast !== null) {
    if (macdLast > signalLast) s += 10;
    if (
      macdPrev !== null &&
      signalPrev !== null &&
      macdPrev <= signalPrev &&
      macdLast > signalLast
    ) {
      s += 5;
    }
  }

  // Bollinger squeeze breakout potential (lower bandwidth = higher potential)
  max += 10;
  if (bbWidth !== null && bbWidthMedian > 0) {
    if (bbWidth < bbWidthMedian * 0.7) s += 10;
    else if (bbWidth < bbWidthMedian) s += 5;
  }

  // ADX > 25 = trend strength
  max += 10;
  if (adxLast !== null) {
    if (adxLast > 30) s += 10;
    else if (adxLast > 25) s += 7;
    else if (adxLast > 20) s += 4;
  }

  // Volume confirmation (last vol > 1.5x 20D avg)
  max += 10;
  if (volumes.length >= 20) {
    const avg20 = rollingMean(volumes, 20).at(-1) ?? 0;
    const lastVol = volumes.at(-1) ?? 0;
    if (avg20 > 0) {
      if (lastVol >= avg20 * 1.5) s += 10;
      else if (lastVol >= avg20 * 1.2) s += 6;
      else if (lastVol >= avg20) s += 3;
    }
  }

  return clampScore((s / max) * 100);
}

function scoreBandarmology(bars: OhlcvBar[], foreignFlow: ForeignFlowDailyInput[]): number {
  let s = 0;
  let max = 0;
  const sorted = [...foreignFlow].sort((a, b) => (a.tradeDate < b.tradeDate ? -1 : 1));
  const nets = sorted.map((r) => r.netValue);

  // Foreign 5D rolling net
  max += 30;
  if (nets.length >= 5) {
    const sum5 = nets.slice(-5).reduce((a, b) => a + b, 0);
    if (sum5 > 0) s += 30;
    else if (sum5 === 0) s += 15;
  }

  // Foreign 20D rolling net
  max += 30;
  if (nets.length >= 20) {
    const sum20 = nets.slice(-20).reduce((a, b) => a + b, 0);
    if (sum20 > 0) s += 30;
    else if (sum20 === 0) s += 15;
  } else if (nets.length > 0) {
    const sumAll = nets.reduce((a, b) => a + b, 0);
    if (sumAll > 0) s += 15;
  }

  // Foreign trend slope (positif = accumulation)
  max += 20;
  if (nets.length >= 10) {
    const cumulative: number[] = [];
    let cum = 0;
    for (const n of nets) {
      cum += n;
      cumulative.push(cum);
    }
    const half = Math.floor(cumulative.length / 2);
    const firstAvg = cumulative.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half);
    const lastAvg =
      cumulative.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, cumulative.length - half);
    if (lastAvg > firstAvg) s += 20;
    else if (lastAvg === firstAvg) s += 10;
  }

  // A/D line slope (proxy domestic accumulation)
  max += 20;
  const slope = adLineSlope(bars, 20);
  if (slope > 0) s += 20;
  else if (slope === 0) s += 10;

  if (max === 0) return NEUTRAL_SCORE;
  return clampScore((s / max) * 100);
}

function scoreFundamental(marketCapIdr: number | null): number {
  // MVP: tilt by market cap likuiditas size only. Belum ada laporan keuangan
  // detail di-ingest. Return netral kalau tidak ada data.
  if (marketCapIdr === null || marketCapIdr <= 0) return NEUTRAL_SCORE;
  if (marketCapIdr >= 50_000_000_000_000) return 60;
  if (marketCapIdr >= 5_000_000_000_000) return 65;
  if (marketCapIdr >= 1_000_000_000_000) return 55;
  return 45;
}

function scoreMacro(sectorContext: SectorContext | null): number {
  if (!sectorContext) return NEUTRAL_SCORE;
  const diff = sectorContext.sectorReturn5dPct - sectorContext.ihsgReturn5dPct;
  if (diff >= 2) return 80;
  if (diff >= 0.5) return 65;
  if (diff >= -0.5) return 50;
  if (diff >= -2) return 35;
  return 20;
}

function scoreRiskPenalty(bars: OhlcvBar[], values: number[]): number {
  if (bars.length < 30) return 50;
  const closes = bars.map((b) => b.close);
  const last = closes.at(-1)!;
  const ret = pctChange(closes, 1).filter((v): v is number => v !== null);
  const variance = stddev(ret.slice(-20));
  let penalty = 0;
  if (variance > 5) penalty += 50;
  else if (variance > 3) penalty += 25;

  if (values.length >= 20) {
    const avg20 = rollingMean(values, 20).at(-1) ?? 0;
    if (avg20 < 1_000_000_000) penalty += 50;
    else if (avg20 < 5_000_000_000) penalty += 15;
  }

  if (bars.length >= 2) {
    const prev = bars.at(-2)!.close;
    if (prev > 0) {
      const gap = Math.abs((last - prev) / prev) * 100;
      if (gap > 7) penalty += 25;
      else if (gap > 4) penalty += 10;
    }
  }

  return clampScore(penalty);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}
