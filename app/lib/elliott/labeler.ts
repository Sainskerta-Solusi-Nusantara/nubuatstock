import type { OhlcvBar } from "@/lib/types/picks";
import { detectPivots, type ElliottPivot } from "@/lib/elliott/pivots";
import { validateImpulse, type ImpulsePrices } from "@/lib/elliott/rules";
import { detectCorrective } from "@/lib/elliott/corrective";
import type { FibonacciLevels, WavePivot, WaveSegment } from "@/db/schema/elliott";

/**
 * Elliott Wave Labeler — P0 implementation.
 *
 * Detects 5-wave impulse pattern from pivot sequence dengan Elliott's 3 hard rules:
 *
 *   1. Wave 2 cannot retrace more than 100% of Wave 1
 *   2. Wave 3 cannot be the SHORTEST among 1, 3, 5 (often longest, ≥ 1.618× Wave 1)
 *   3. Wave 4 cannot overlap into Wave 1 territory (except diagonal patterns)
 *
 * Algorithm:
 *   1. Find pivots dengan ZigZag threshold 3%
 *   2. Cari sequence of 6 pivots (5 waves = 6 endpoints): L-H-L-H-L-H (uptrend impulse) atau mirror
 *   3. Validate dengan 3 hard rules
 *   4. Compute confidence dari soft guidelines (Fibonacci proportions, alternation, dll)
 *
 * Output:
 *   - WaveSequence dengan label 1-5
 *   - Pivots used
 *   - Fibonacci targets/retracement levels
 *   - Confidence score 0-1
 *   - Current wave (where price is now)
 */

export type WaveType = "impulse_up" | "impulse_down" | "corrective" | "unknown";

export interface WaveAnalysis {
  waveType: WaveType;
  currentWave: string; // 'Wave 3 of 5 (Impulse Up)', etc.
  sequence: WaveSegment[];
  pivots: WavePivot[];
  fibonacciLevels: FibonacciLevels | null;
  confidence: number;
  reasoning: string[];
  /** Subtipe koreksi bila waveType === "corrective" (zigzag | flat). */
  correctiveSubtype?: "zigzag" | "flat";
}

const PIVOT_THRESHOLD_PCT = 3;
const MIN_PIVOTS_FOR_IMPULSE = 6; // 5 waves = 6 endpoints

export function analyzeElliottWave(bars: OhlcvBar[]): WaveAnalysis {
  if (bars.length < 30) {
    return emptyAnalysis(bars, "Data insufficient (need ≥30 bars)");
  }

  const pivots = detectPivots(bars, { thresholdPct: PIVOT_THRESHOLD_PCT });

  const wavePivots: WavePivot[] = pivots.map((p) => ({
    date: p.date,
    price: p.price,
    type: p.type,
  }));

  if (pivots.length < MIN_PIVOTS_FOR_IMPULSE) {
    // Tidak cukup pivot untuk impulse 5-gelombang — coba koreksi A-B-C (butuh 4 pivot).
    const corrective = tryLabelCorrective(pivots, bars, wavePivots);
    if (corrective) return corrective;
    return {
      waveType: "unknown",
      currentWave: "Not enough pivots",
      sequence: [],
      pivots: wavePivots,
      fibonacciLevels: null,
      confidence: 0,
      reasoning: [`Only ${pivots.length} pivots detected, need ≥${MIN_PIVOTS_FOR_IMPULSE} for 5-wave impulse`],
    };
  }

  // Try labeling from the most recent sequence backward
  // Take last 7 pivots (or fewer) and check for valid impulse
  const recent = pivots.slice(-Math.max(7, MIN_PIVOTS_FOR_IMPULSE));
  const result = tryLabelImpulse(recent, bars);

  if (result && result.confidence > 0.4) {
    return result;
  }

  // Fallback 1: koreksi A-B-C (zigzag / flat) dari pivot terkini.
  const corrective = tryLabelCorrective(pivots, bars, wavePivots);
  if (corrective) {
    // Pilih impulse low-confidence vs corrective — utamakan yang lebih tinggi.
    if (!result || corrective.confidence >= result.confidence) return corrective;
  }
  if (result) return result;

  // Fallback 2: report partial pattern
  return {
    waveType: "unknown",
    currentWave: "Pattern unclear",
    sequence: [],
    pivots: wavePivots,
    fibonacciLevels: null,
    confidence: 0.2,
    reasoning: ["No valid 5-wave impulse pattern matched against Elliott's 3 hard rules in recent pivots"],
  };
}

/**
 * Coba label koreksi A-B-C (P1) dari pivot terkini. Mengembalikan WaveAnalysis
 * dengan waveType "corrective" bila pola valid, jika tidak null.
 */
function tryLabelCorrective(
  pivots: ElliottPivot[],
  bars: OhlcvBar[],
  wavePivots: WavePivot[],
): WaveAnalysis | null {
  const corr = detectCorrective(pivots);
  if (!corr) return null;

  const sequence: WaveSegment[] = corr.segments.map((s) => ({
    label: s.label,
    startDate: s.startDate,
    endDate: s.endDate,
    startPrice: s.startPrice,
    endPrice: s.endPrice,
  }));

  // Current wave: di mana harga sekarang relatif ujung Wave C.
  const lastBar = bars[bars.length - 1]!;
  const cEnd = corr.prices.pC;
  const subtypeLabel = corr.subtype === "zigzag" ? "Zigzag" : "Flat";
  const dirLabel = corr.direction === "down" ? "Corrective Down" : "Corrective Up";
  let currentWave: string;
  if (corr.direction === "down") {
    currentWave =
      lastBar.close <= cEnd * 1.01
        ? `Wave C of A-B-C (${subtypeLabel} ${dirLabel}) — koreksi mungkin selesai`
        : `Post Wave C → kemungkinan impulse baru / akhir koreksi (${subtypeLabel})`;
  } else {
    currentWave =
      lastBar.close >= cEnd * 0.99
        ? `Wave C of A-B-C (${subtypeLabel} ${dirLabel}) — koreksi mungkin selesai`
        : `Post Wave C → kemungkinan impulse baru / akhir koreksi (${subtypeLabel})`;
  }

  // Fibonacci dari rentang A (p0 → pA) untuk proyeksi target C / next move.
  const fibDir = corr.direction === "down" ? "down" : "up";
  const fib = computeFibLevels(corr.prices.p0, corr.prices.pC, fibDir);

  return {
    waveType: "corrective",
    currentWave,
    sequence,
    pivots: wavePivots,
    fibonacciLevels: fib,
    confidence: corr.confidence,
    reasoning: corr.reasoning,
    correctiveSubtype: corr.subtype,
  };
}

function tryLabelImpulse(pivots: ElliottPivot[], bars: OhlcvBar[]): WaveAnalysis | null {
  // Try uptrend impulse: L-H-L-H-L-H
  // 6 pivots define 5 waves
  // pivots[0]=start L, pivots[1]=W1 top H, pivots[2]=W2 bottom L,
  // pivots[3]=W3 top H, pivots[4]=W4 bottom L, pivots[5]=W5 top H

  // Try uptrend
  const uptrend = tryDirectedImpulse(pivots, "up", bars);
  if (uptrend && uptrend.confidence > 0.4) return uptrend;

  // Try downtrend (mirror)
  const downtrend = tryDirectedImpulse(pivots, "down", bars);
  if (downtrend && downtrend.confidence > 0.4) return downtrend;

  // Return best effort even kalau confidence low
  if (uptrend && downtrend) {
    return uptrend.confidence >= downtrend.confidence ? uptrend : downtrend;
  }
  return uptrend ?? downtrend ?? null;
}

function tryDirectedImpulse(
  pivots: ElliottPivot[],
  direction: "up" | "down",
  bars: OhlcvBar[],
): WaveAnalysis | null {
  if (pivots.length < MIN_PIVOTS_FOR_IMPULSE) return null;

  // Search untuk valid 6-pivot subsequence dari end ke awal
  // For uptrend: L-H-L-H-L-H
  // For downtrend: H-L-H-L-H-L
  const startType = direction === "up" ? "low" : "high";

  // Iterate through possible starting points
  for (let startIdx = pivots.length - MIN_PIVOTS_FOR_IMPULSE; startIdx >= 0; startIdx -= 1) {
    const candidate = pivots.slice(startIdx, startIdx + MIN_PIVOTS_FOR_IMPULSE);

    // Validate alternation
    if (candidate[0]!.type !== startType) continue;
    let alternationOk = true;
    for (let i = 1; i < candidate.length; i += 1) {
      const expected = candidate[i - 1]!.type === "low" ? "high" : "low";
      if (candidate[i]!.type !== expected) {
        alternationOk = false;
        break;
      }
    }
    if (!alternationOk) continue;

    // Extract wave endpoints
    // candidate[0]=W0 start (before W1), candidate[1]=W1 end (top), candidate[2]=W2 end, ...
    const w0 = candidate[0]!;
    const w1 = candidate[1]!;
    const w2 = candidate[2]!;
    const w3 = candidate[3]!;
    const w4 = candidate[4]!;
    const w5 = candidate[5]!;

    // Validate Elliott's 3 hard rules via dedicated rules module.
    const prices: ImpulsePrices = {
      p0: w0.price,
      p1: w1.price,
      p2: w2.price,
      p3: w3.price,
      p4: w4.price,
      p5: w5.price,
    };
    const validation = validateImpulse(prices, direction);
    const { wave1Length, wave2Length, wave3Length, wave4Length } = validation;

    // Salah satu hard rule dilanggar → coba subsequence lain.
    if (!validation.valid) continue;

    const reasoning: string[] = [
      `✓ ${validation.rule1.message}`,
      `✓ ${validation.rule2.message}`,
      `✓ ${validation.rule3.message}`,
    ];

    // Compute soft confidence boosters
    let confidence = 0.5;

    // Wave 3 extension ratio (commonly 1.618× Wave 1)
    const w3Ratio = wave3Length / wave1Length;
    if (w3Ratio > 1.5 && w3Ratio < 2.5) {
      confidence += 0.15;
      reasoning.push(`✓ Wave 3 = ${w3Ratio.toFixed(2)}× Wave 1 (near 1.618 golden ratio)`);
    } else if (w3Ratio > 1) {
      confidence += 0.05;
      reasoning.push(`Wave 3 = ${w3Ratio.toFixed(2)}× Wave 1`);
    }

    // Wave 2 Fibonacci retracement (50-61.8% common)
    const w2RetracePct = wave2Length / wave1Length;
    if (w2RetracePct >= 0.5 && w2RetracePct <= 0.65) {
      confidence += 0.1;
      reasoning.push(`✓ Wave 2 retraced ${(w2RetracePct * 100).toFixed(0)}% (golden zone 50-61.8%)`);
    }

    // Wave 4 Fibonacci retracement (38.2% common)
    const w4RetracePct = wave4Length / wave3Length;
    if (w4RetracePct >= 0.3 && w4RetracePct <= 0.5) {
      confidence += 0.1;
      reasoning.push(`✓ Wave 4 retraced ${(w4RetracePct * 100).toFixed(0)}% (typical 38-50%)`);
    }

    // Alternation: Wave 2 vs Wave 4 (one sharp, one sideways — different time)
    // Simplified: different durations or different retracement %
    // Skip for P0

    confidence = Math.min(confidence, 0.95);

    // Build wave sequence
    const sequence: WaveSegment[] = [
      { label: "1", startDate: w0.date, endDate: w1.date, startPrice: w0.price, endPrice: w1.price },
      { label: "2", startDate: w1.date, endDate: w2.date, startPrice: w1.price, endPrice: w2.price },
      { label: "3", startDate: w2.date, endDate: w3.date, startPrice: w2.price, endPrice: w3.price },
      { label: "4", startDate: w3.date, endDate: w4.date, startPrice: w3.price, endPrice: w4.price },
      { label: "5", startDate: w4.date, endDate: w5.date, startPrice: w4.price, endPrice: w5.price },
    ];

    // Determine current wave: where is the latest bar relative to wave 5 completion?
    const lastBar = bars[bars.length - 1]!;
    const isUp = direction === "up";
    let currentWave = "";

    // Check if last bar is past w5 (in new wave A correction) or still in wave 5
    const w5End = w5.price;
    if (isUp) {
      if (lastBar.close > w5End * 1.01) {
        currentWave = "Wave 5 extending / continuing impulse up";
      } else if (lastBar.close < w5End * 0.97) {
        currentWave = "Post Wave 5 → likely Wave A (corrective down)";
      } else {
        currentWave = "Wave 5 of 5 (Impulse Up) — near completion";
      }
    } else {
      if (lastBar.close < w5End * 0.99) {
        currentWave = "Wave 5 extending / continuing impulse down";
      } else if (lastBar.close > w5End * 1.03) {
        currentWave = "Post Wave 5 → likely Wave A (corrective up)";
      } else {
        currentWave = "Wave 5 of 5 (Impulse Down) — near completion";
      }
    }

    // Fibonacci levels for next move
    const fib = computeFibLevels(w0.price, w5.price, direction);

    return {
      waveType: isUp ? "impulse_up" : "impulse_down",
      currentWave,
      sequence,
      pivots: pivots.map((p) => ({ date: p.date, price: p.price, type: p.type })),
      fibonacciLevels: fib,
      confidence,
      reasoning,
    };
  }

  return null;
}

function computeFibLevels(start: number, end: number, direction: "up" | "down"): FibonacciLevels {
  const range = Math.abs(end - start);
  if (direction === "up") {
    return {
      retracement: {
        "0.236": end - range * 0.236,
        "0.382": end - range * 0.382,
        "0.500": end - range * 0.5,
        "0.618": end - range * 0.618,
        "0.786": end - range * 0.786,
      },
      extension: {
        "1.272": end + range * 0.272,
        "1.618": end + range * 0.618,
        "2.618": end + range * 1.618,
      },
    };
  }
  return {
    retracement: {
      "0.236": end + range * 0.236,
      "0.382": end + range * 0.382,
      "0.500": end + range * 0.5,
      "0.618": end + range * 0.618,
      "0.786": end + range * 0.786,
    },
    extension: {
      "1.272": end - range * 0.272,
      "1.618": end - range * 0.618,
      "2.618": end - range * 1.618,
    },
  };
}

function emptyAnalysis(bars: OhlcvBar[], reason: string): WaveAnalysis {
  return {
    waveType: "unknown",
    currentWave: "Insufficient data",
    sequence: [],
    pivots: [],
    fibonacciLevels: null,
    confidence: 0,
    reasoning: [reason],
  };
}
