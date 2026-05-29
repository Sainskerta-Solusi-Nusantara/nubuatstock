import type { OhlcvBar } from "@/lib/types/picks";
import type { PatternMatch } from "./types";
import { findPivots, linearSlope, mean, type Pivot } from "./utils";

/**
 * Pattern detector algorithms. Pure functions — input OHLCV, output PatternMatch[].
 *
 * Each detector returns array karena bisa ada multiple instances pattern di window (mis. 2x bull flag).
 *
 * Confidence scoring (0-1):
 *   - 1.0: Tekstbook perfect match
 *   - 0.7-0.9: Strong, all key conditions met
 *   - 0.5-0.7: Decent, minor variations
 *   - < 0.5: Weak, often suppressed by UI
 *
 * Convention: kalau pattern memerlukan minimum bars > available, return [].
 */

// ====================== BULL/BEAR FLAG ======================

export function detectBullFlag(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 30) return [];
  const matches: PatternMatch[] = [];

  // Strategy: scan window 20-30 bars
  //   1. Strong uptrend in early window: > 8% in 5-10 bars (the "pole")
  //   2. Followed by tight consolidation (range < 50% of pole height) trending slightly down
  //   3. Pattern is "forming" — breakout = close > pole high

  for (let endIdx = bars.length - 1; endIdx >= 30; endIdx -= 1) {
    // Consolidation: last 5-15 bars
    for (const consolDuration of [5, 7, 10, 12, 15]) {
      const consolStart = endIdx - consolDuration;
      if (consolStart < 15) continue;

      const consolBars = bars.slice(consolStart, endIdx + 1);
      const consolHighs = consolBars.map((b) => b.high);
      const consolLows = consolBars.map((b) => b.low);
      const consolHighest = Math.max(...consolHighs);
      const consolLowest = Math.min(...consolLows);
      const consolRange = consolHighest - consolLowest;
      if (consolRange === 0) continue;

      // Pole: 5-12 bars BEFORE consolidation
      for (const poleDuration of [5, 7, 10]) {
        const poleStart = consolStart - poleDuration;
        if (poleStart < 0) continue;

        const poleBars = bars.slice(poleStart, consolStart + 1);
        const poleLow = poleBars[0]!.low;
        const poleHigh = consolHighest; // Pole top = consolidation top
        const poleHeight = poleHigh - poleLow;
        const polePct = (poleHeight / poleLow) * 100;

        if (polePct < 8) continue; // Not strong enough rally

        // Consolidation must be < 50% of pole height
        if (consolRange > poleHeight * 0.5) continue;

        // Consolidation trend should be slightly down (or flat). Slope < 0 or near zero.
        const closes = consolBars.map((b, i) => ({ x: i, y: b.close }));
        const slope = linearSlope(closes);
        const slopePct = (slope / consolBars[0]!.close) * 100; // per bar %
        if (slopePct > 0.5) continue; // Going up too much (not a flag)
        if (slopePct < -1.0) continue; // Falling too fast (not a flag, downtrend)

        // Volume should taper in consolidation
        const poleVol = mean(poleBars.map((b) => b.volume));
        const consolVol = mean(consolBars.map((b) => b.volume));
        const volTaper = consolVol < poleVol * 0.9;

        // Confidence
        let confidence = 0.5;
        if (polePct > 15) confidence += 0.15;
        if (volTaper) confidence += 0.15;
        if (consolDuration >= 7 && consolDuration <= 12) confidence += 0.1;
        if (slopePct < 0 && slopePct > -0.5) confidence += 0.1;
        confidence = Math.min(confidence, 0.95);

        // Status: completed kalau last close > consolHighest, else forming
        const lastClose = bars[endIdx]!.close;
        const status = lastClose > consolHighest * 1.005 ? "completed" : "forming";

        const breakout = consolHighest;
        const target = breakout + poleHeight; // Pole projected up
        const stop = consolLowest;

        matches.push({
          patternType: "bull_flag",
          category: "continuation",
          direction: "bullish",
          status,
          startIndex: poleStart,
          endIndex: endIdx,
          confidence,
          keyLevels: { breakout, target, stop, support: consolLowest, resistance: consolHighest },
          volumeConfirmation: volTaper,
          narrative: `Bull Flag terbentuk setelah rally ${polePct.toFixed(1)}% (${poleDuration} bar pole), diikuti konsolidasi ${consolDuration} bar dengan ${volTaper ? "volume mengering (konfirmasi)" : "volume tetap"}. Target proyeksi pole: ${target.toFixed(0)}. Stop loss: ${stop.toFixed(0)}.`,
        });

        // Keep first valid match per window
        return matches;
      }
    }
  }

  return matches;
}

export function detectBearFlag(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 30) return [];
  const matches: PatternMatch[] = [];

  for (let endIdx = bars.length - 1; endIdx >= 30; endIdx -= 1) {
    for (const consolDuration of [5, 7, 10, 12, 15]) {
      const consolStart = endIdx - consolDuration;
      if (consolStart < 15) continue;

      const consolBars = bars.slice(consolStart, endIdx + 1);
      const consolHighest = Math.max(...consolBars.map((b) => b.high));
      const consolLowest = Math.min(...consolBars.map((b) => b.low));
      const consolRange = consolHighest - consolLowest;
      if (consolRange === 0) continue;

      for (const poleDuration of [5, 7, 10]) {
        const poleStart = consolStart - poleDuration;
        if (poleStart < 0) continue;

        const poleBars = bars.slice(poleStart, consolStart + 1);
        const poleHigh = poleBars[0]!.high;
        const poleLow = consolLowest;
        const poleHeight = poleHigh - poleLow;
        const polePct = (poleHeight / poleHigh) * 100;

        if (polePct < 8) continue;
        if (consolRange > poleHeight * 0.5) continue;

        // Consolidation trend slightly UP (counter-rally pre breakdown)
        const closes = consolBars.map((b, i) => ({ x: i, y: b.close }));
        const slope = linearSlope(closes);
        const slopePct = (slope / consolBars[0]!.close) * 100;
        if (slopePct < -0.5) continue;
        if (slopePct > 1.0) continue;

        const poleVol = mean(poleBars.map((b) => b.volume));
        const consolVol = mean(consolBars.map((b) => b.volume));
        const volTaper = consolVol < poleVol * 0.9;

        let confidence = 0.5;
        if (polePct > 15) confidence += 0.15;
        if (volTaper) confidence += 0.15;
        if (consolDuration >= 7 && consolDuration <= 12) confidence += 0.1;
        confidence = Math.min(confidence, 0.95);

        const lastClose = bars[endIdx]!.close;
        const breakdown = consolLowest;
        const status = lastClose < breakdown * 0.995 ? "completed" : "forming";

        const target = breakdown - poleHeight;
        const stop = consolHighest;

        matches.push({
          patternType: "bear_flag",
          category: "continuation",
          direction: "bearish",
          status,
          startIndex: poleStart,
          endIndex: endIdx,
          confidence,
          keyLevels: { breakout: breakdown, target, stop, support: consolLowest, resistance: consolHighest },
          volumeConfirmation: volTaper,
          narrative: `Bear Flag terbentuk setelah drop ${polePct.toFixed(1)}% (${poleDuration} bar pole), diikuti konsolidasi naik tipis ${consolDuration} bar. Target proyeksi: ${target.toFixed(0)}. Stop: ${stop.toFixed(0)}.`,
        });

        return matches;
      }
    }
  }

  return matches;
}

// ====================== CUP AND HANDLE ======================

export function detectCupHandle(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 50) return [];
  const matches: PatternMatch[] = [];

  // Cup duration: 30-100 bars; handle: 5-15 bars
  // Strategy: scan ending at last bar
  for (const cupDuration of [30, 45, 60, 80]) {
    if (bars.length < cupDuration + 15) continue;
    for (const handleDuration of [5, 8, 12]) {
      const handleEnd = bars.length - 1;
      const handleStart = handleEnd - handleDuration;
      const cupEnd = handleStart;
      const cupStart = cupEnd - cupDuration;
      if (cupStart < 0) continue;

      const cupBars = bars.slice(cupStart, cupEnd + 1);
      const handleBars = bars.slice(handleStart, handleEnd + 1);

      const leftRim = cupBars[0]!.high;
      const rightRim = cupBars[cupBars.length - 1]!.high;
      const cupBottom = Math.min(...cupBars.map((b) => b.low));
      const cupDepth = ((leftRim - cupBottom) / leftRim) * 100;

      // Cup conditions:
      // - Rims roughly equal (within 5%)
      // - Cup depth 15-50%
      // - U-shape (not V) — middle should be near bottom, gradual recovery
      const rimDiff = Math.abs(leftRim - rightRim) / leftRim;
      if (rimDiff > 0.07) continue;
      if (cupDepth < 12) continue;
      if (cupDepth > 55) continue;

      // U-shape test: bottom in middle third of cup
      const cupBottomIdx = cupBars.findIndex((b) => b.low === cupBottom);
      const middleStart = cupDuration * 0.25;
      const middleEnd = cupDuration * 0.75;
      const inMiddle = cupBottomIdx >= middleStart && cupBottomIdx <= middleEnd;
      if (!inMiddle) continue;

      // Handle: small pullback near right rim, max retracement 50% of upper cup half
      const handleHigh = Math.max(...handleBars.map((b) => b.high));
      const handleLow = Math.min(...handleBars.map((b) => b.low));
      const handleRetrace = ((handleHigh - handleLow) / handleHigh) * 100;
      if (handleRetrace > 20) continue; // Handle terlalu dalam
      if (handleHigh > rightRim * 1.02) continue; // Handle harus di bawah right rim

      // Volume: handle volume should taper
      const cupAvgVol = mean(cupBars.slice(-Math.min(10, cupBars.length)).map((b) => b.volume));
      const handleAvgVol = mean(handleBars.map((b) => b.volume));
      const volTaper = handleAvgVol < cupAvgVol * 0.85;

      let confidence = 0.5;
      if (rimDiff < 0.03) confidence += 0.15;
      if (volTaper) confidence += 0.15;
      if (cupDepth >= 20 && cupDepth <= 40) confidence += 0.15;
      if (handleDuration >= 7) confidence += 0.05;
      confidence = Math.min(confidence, 0.95);

      const lastClose = bars[handleEnd]!.close;
      const breakout = Math.max(leftRim, rightRim);
      const status = lastClose > breakout * 1.005 ? "completed" : "forming";

      const target = breakout + (breakout - cupBottom); // Mirror cup depth
      const stop = handleLow;

      matches.push({
        patternType: "cup_handle",
        category: "continuation",
        direction: "bullish",
        status,
        startIndex: cupStart,
        endIndex: handleEnd,
        confidence,
        keyLevels: { breakout, target, stop, support: cupBottom, resistance: breakout },
        volumeConfirmation: volTaper,
        narrative: `Cup and Handle terbentuk: cup ${cupDuration} bar dengan depth ${cupDepth.toFixed(1)}%, diikuti handle ${handleDuration} bar dengan retracement ${handleRetrace.toFixed(1)}%. ${volTaper ? "Volume taper di handle (konfirmasi). " : ""}Breakout level: ${breakout.toFixed(0)}, target: ${target.toFixed(0)}.`,
      });

      return matches;
    }
  }

  return matches;
}

// ====================== RECTANGLE (BOX) ======================

export function detectRectangle(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 20) return [];
  const matches: PatternMatch[] = [];

  // Rectangle = price oscillates between defined support and resistance for >= 15 bars
  for (const duration of [15, 20, 30, 40]) {
    if (bars.length < duration + 1) continue;
    const startIdx = bars.length - duration;
    const window = bars.slice(startIdx, bars.length);

    const highs = window.map((b) => b.high);
    const lows = window.map((b) => b.low);
    const top = Math.max(...highs);
    const bottom = Math.min(...lows);
    const range = top - bottom;
    if (range === 0) continue;

    // Test: at least 2 touches near top + 2 touches near bottom
    const topThreshold = top - range * 0.05;
    const bottomThreshold = bottom + range * 0.05;
    const topTouches = window.filter((b) => b.high >= topThreshold).length;
    const bottomTouches = window.filter((b) => b.low <= bottomThreshold).length;

    if (topTouches < 2 || bottomTouches < 2) continue;

    // Range should not be too tight (< 3%) or too wide (> 30%)
    const rangePct = (range / bottom) * 100;
    if (rangePct < 3) continue;
    if (rangePct > 30) continue;

    // Most bars should be inside the range (no major spikes outside)
    const insideCount = window.filter(
      (b) => b.high <= top * 1.01 && b.low >= bottom * 0.99,
    ).length;
    if (insideCount < duration * 0.85) continue;

    const lastClose = bars[bars.length - 1]!.close;
    let direction: "bullish" | "bearish" = "bullish";
    let status: "forming" | "completed" = "forming";
    let patternType: "rectangle_breakout_up" | "rectangle_breakout_down" = "rectangle_breakout_up";

    if (lastClose > top * 1.005) {
      direction = "bullish";
      status = "completed";
      patternType = "rectangle_breakout_up";
    } else if (lastClose < bottom * 0.995) {
      direction = "bearish";
      status = "completed";
      patternType = "rectangle_breakout_down";
    } else {
      // Still ranging — assume bias based on prior trend
      const priorWindow = bars.slice(Math.max(0, startIdx - 20), startIdx);
      if (priorWindow.length > 5) {
        const firstClose = priorWindow[0]!.close;
        const lastPriorClose = priorWindow[priorWindow.length - 1]!.close;
        direction = lastPriorClose > firstClose ? "bullish" : "bearish";
        patternType = direction === "bullish" ? "rectangle_breakout_up" : "rectangle_breakout_down";
      }
    }

    const breakout = direction === "bullish" ? top : bottom;
    const target = direction === "bullish" ? top + range : bottom - range;
    const stop = direction === "bullish" ? bottom : top;

    let confidence = 0.5;
    if (topTouches >= 3) confidence += 0.1;
    if (bottomTouches >= 3) confidence += 0.1;
    if (duration >= 20) confidence += 0.1;
    if (status === "completed") confidence += 0.15;
    confidence = Math.min(confidence, 0.95);

    matches.push({
      patternType,
      category: "continuation",
      direction,
      status,
      startIndex: startIdx,
      endIndex: bars.length - 1,
      confidence,
      keyLevels: { breakout, target, stop, support: bottom, resistance: top },
      volumeConfirmation: false,
      narrative: `Rectangle ${duration} bar dengan support ${bottom.toFixed(0)} (${bottomTouches}x touch) - resistance ${top.toFixed(0)} (${topTouches}x touch). Range ${rangePct.toFixed(1)}%. ${status === "completed" ? `Breakout ${direction === "bullish" ? "atas" : "bawah"} sudah terjadi.` : "Menunggu breakout."}`,
    });

    return matches;
  }

  return matches;
}

// ====================== BULL/BEAR PENNANT ======================

/**
 * Pennant = small SYMMETRICAL triangle (converging trendlines: lower highs +
 * higher lows) yang terbentuk SETELAH strong, near-vertical move (the pole).
 *
 * Beda dengan flag (paralel channel), pennant punya highs turun & lows naik
 * sehingga range menyempit (consolidation segitiga). Beda dengan symmetrical
 * triangle biasa, pennant butuh pole yang tajam & singkat (≤ ~12 bar) tepat
 * sebelum konsolidasi, dan durasi konsolidasi pendek (≤ ~20 bar).
 */
function detectPennant(
  bars: OhlcvBar[],
  variant: "bull" | "bear",
): PatternMatch[] {
  if (bars.length < 25) return [];

  for (let endIdx = bars.length - 1; endIdx >= 25; endIdx -= 1) {
    for (const consolDuration of [6, 8, 10, 12, 15]) {
      const consolStart = endIdx - consolDuration;
      if (consolStart < 12) continue;

      const consolBars = bars.slice(consolStart, endIdx + 1);
      const consolHighs = consolBars.map((b, i) => ({ x: i, y: b.high }));
      const consolLows = consolBars.map((b, i) => ({ x: i, y: b.low }));
      const highSlope = linearSlope(consolHighs);
      const lowSlope = linearSlope(consolLows);
      const baseClose = consolBars[0]!.close;
      const highSlopePct = (highSlope / baseClose) * 100;
      const lowSlopePct = (lowSlope / baseClose) * 100;

      // Symmetrical convergence: highs sloping DOWN, lows sloping UP.
      if (highSlopePct >= -0.05) continue;
      if (lowSlopePct <= 0.05) continue;

      // Range must be contracting: end range < start range (apex forming).
      const firstHalf = consolBars.slice(0, Math.ceil(consolBars.length / 2));
      const secondHalf = consolBars.slice(Math.floor(consolBars.length / 2));
      const firstRange =
        Math.max(...firstHalf.map((b) => b.high)) - Math.min(...firstHalf.map((b) => b.low));
      const secondRange =
        Math.max(...secondHalf.map((b) => b.high)) - Math.min(...secondHalf.map((b) => b.low));
      if (firstRange === 0) continue;
      if (secondRange >= firstRange * 0.85) continue; // Must contract ≥ 15%

      const consolHighest = Math.max(...consolBars.map((b) => b.high));
      const consolLowest = Math.min(...consolBars.map((b) => b.low));

      // Pole: sharp move 5-12 bars before consolidation.
      let poleFound = false;
      let poleStart = consolStart;
      let poleHeight = 0;
      let polePct = 0;
      for (const poleDuration of [4, 5, 7, 10, 12]) {
        const ps = consolStart - poleDuration;
        if (ps < 0) continue;
        const poleBars = bars.slice(ps, consolStart + 1);
        if (variant === "bull") {
          const pLow = poleBars[0]!.low;
          const pHigh = consolHighest;
          const h = pHigh - pLow;
          const pct = (h / pLow) * 100;
          if (pct >= 10) {
            poleFound = true;
            poleStart = ps;
            poleHeight = h;
            polePct = pct;
            break;
          }
        } else {
          const pHigh = poleBars[0]!.high;
          const pLow = consolLowest;
          const h = pHigh - pLow;
          const pct = (h / pHigh) * 100;
          if (pct >= 10) {
            poleFound = true;
            poleStart = ps;
            poleHeight = h;
            polePct = pct;
            break;
          }
        }
      }
      if (!poleFound) continue;

      // Pennant consolidation must be modest vs pole (small flag).
      const consolRange = consolHighest - consolLowest;
      if (consolRange > poleHeight * 0.6) continue;

      // Volume taper during consolidation = textbook.
      const poleBars = bars.slice(poleStart, consolStart + 1);
      const poleVol = mean(poleBars.map((b) => b.volume));
      const consolVol = mean(consolBars.map((b) => b.volume));
      const volTaper = consolVol < poleVol * 0.9;

      const lastClose = bars[endIdx]!.close;
      const direction = variant === "bull" ? "bullish" : "bearish";
      const patternType = variant === "bull" ? "bull_pennant" : "bear_pennant";

      let status: "forming" | "completed" = "forming";
      if (variant === "bull" && lastClose > consolHighest * 1.005) status = "completed";
      if (variant === "bear" && lastClose < consolLowest * 0.995) status = "completed";

      const breakout = variant === "bull" ? consolHighest : consolLowest;
      const target = variant === "bull" ? breakout + poleHeight : breakout - poleHeight;
      const stop = variant === "bull" ? consolLowest : consolHighest;

      let confidence = 0.5;
      if (polePct > 18) confidence += 0.15;
      if (volTaper) confidence += 0.15;
      if (secondRange < firstRange * 0.6) confidence += 0.1; // strong convergence
      if (status === "completed") confidence += 0.1;
      confidence = Math.min(confidence, 0.95);

      return [{
        patternType,
        category: "continuation",
        direction,
        status,
        startIndex: poleStart,
        endIndex: endIdx,
        confidence,
        keyLevels: { breakout, target, stop, support: consolLowest, resistance: consolHighest },
        volumeConfirmation: volTaper,
        narrative: `${variant === "bull" ? "Bullish" : "Bearish"} Pennant: ${variant === "bull" ? "rally" : "drop"} tajam ${polePct.toFixed(1)}% (pole) diikuti konsolidasi segitiga simetris ${consolDuration} bar yang menyempit (range -${(((firstRange - secondRange) / firstRange) * 100).toFixed(0)}%). ${volTaper ? "Volume mengering (konfirmasi). " : ""}Breakout: ${breakout.toFixed(0)}, target proyeksi pole: ${target.toFixed(0)}, stop: ${stop.toFixed(0)}.`,
      }];
    }
  }

  return [];
}

export function detectBullPennant(bars: OhlcvBar[]): PatternMatch[] {
  return detectPennant(bars, "bull");
}

export function detectBearPennant(bars: OhlcvBar[]): PatternMatch[] {
  return detectPennant(bars, "bear");
}

// ====================== INVERSE CUP AND HANDLE ======================

/**
 * Inverse Cup & Handle = mirror dari cup & handle: rounded TOP (cup terbalik)
 * diikuti small upward "handle" (pullback ke atas), lalu breakdown ke bawah
 * neckline. Bearish continuation/reversal di downtrend.
 *
 * Geometri:
 *   - Cup: dome shape — kedua "rim" (low di kiri & kanan) kira-kira sama,
 *     dengan puncak (high) di tengah. Tinggi cup 12-55%.
 *   - Handle: rebound kecil di dekat right rim, retracement terbatas, masih
 *     di atas right rim (tidak menembus support cup terlalu jauh).
 */
export function detectInverseCupHandle(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 50) return [];

  for (const cupDuration of [30, 45, 60, 80]) {
    if (bars.length < cupDuration + 15) continue;
    for (const handleDuration of [5, 8, 12]) {
      const handleEnd = bars.length - 1;
      const handleStart = handleEnd - handleDuration;
      const cupEnd = handleStart;
      const cupStart = cupEnd - cupDuration;
      if (cupStart < 0) continue;

      const cupBars = bars.slice(cupStart, cupEnd + 1);
      const handleBars = bars.slice(handleStart, handleEnd + 1);

      const leftRim = cupBars[0]!.low;
      const rightRim = cupBars[cupBars.length - 1]!.low;
      const cupTop = Math.max(...cupBars.map((b) => b.high));
      const cupHeight = ((cupTop - leftRim) / leftRim) * 100;

      // Rims roughly equal (lows), dome height in range.
      const rimDiff = Math.abs(leftRim - rightRim) / leftRim;
      if (rimDiff > 0.07) continue;
      if (cupHeight < 12) continue;
      if (cupHeight > 55) continue;

      // Dome test: top (high) in middle third of cup.
      const cupTopIdx = cupBars.findIndex((b) => b.high === cupTop);
      const middleStart = cupDuration * 0.25;
      const middleEnd = cupDuration * 0.75;
      if (cupTopIdx < middleStart || cupTopIdx > middleEnd) continue;

      // Handle: small upward pullback near right rim, limited extent, stays above rim.
      const handleHigh = Math.max(...handleBars.map((b) => b.high));
      const handleLow = Math.min(...handleBars.map((b) => b.low));
      const handleRetrace = ((handleHigh - handleLow) / handleLow) * 100;
      if (handleRetrace > 20) continue; // Handle terlalu besar
      if (handleLow < rightRim * 0.98) continue; // Handle harus di atas right rim

      const cupAvgVol = mean(cupBars.slice(-Math.min(10, cupBars.length)).map((b) => b.volume));
      const handleAvgVol = mean(handleBars.map((b) => b.volume));
      const volTaper = handleAvgVol < cupAvgVol * 0.85;

      let confidence = 0.5;
      if (rimDiff < 0.03) confidence += 0.15;
      if (volTaper) confidence += 0.15;
      if (cupHeight >= 20 && cupHeight <= 40) confidence += 0.15;
      if (handleDuration >= 7) confidence += 0.05;
      confidence = Math.min(confidence, 0.95);

      const lastClose = bars[handleEnd]!.close;
      const breakdown = Math.min(leftRim, rightRim); // neckline support
      const status = lastClose < breakdown * 0.995 ? "completed" : "forming";

      const target = breakdown - (cupTop - breakdown); // Mirror dome height down
      const stop = handleHigh;

      return [{
        patternType: "inverse_cup_handle",
        category: "continuation",
        direction: "bearish",
        status,
        startIndex: cupStart,
        endIndex: handleEnd,
        confidence,
        keyLevels: { breakout: breakdown, target, stop, support: breakdown, resistance: cupTop, neckline: breakdown },
        volumeConfirmation: volTaper,
        narrative: `Inverse Cup and Handle: rounded top (dome) ${cupDuration} bar dengan tinggi ${cupHeight.toFixed(1)}%, diikuti handle ${handleDuration} bar (rebound ${handleRetrace.toFixed(1)}%). ${volTaper ? "Volume taper di handle (konfirmasi). " : ""}Breakdown neckline: ${breakdown.toFixed(0)}, target downside: ${target.toFixed(0)}, stop: ${stop.toFixed(0)}.`,
      }];
    }
  }

  return [];
}

// ====================== ASCENDING / DESCENDING TRIANGLE ======================

export function detectAscendingTriangle(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 20) return [];
  return detectTriangle(bars, "ascending");
}

export function detectDescendingTriangle(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 20) return [];
  return detectTriangle(bars, "descending");
}

function detectTriangle(
  bars: OhlcvBar[],
  variant: "ascending" | "descending",
): PatternMatch[] {
  for (const duration of [20, 30, 40]) {
    if (bars.length < duration) continue;
    const startIdx = bars.length - duration;
    const window = bars.slice(startIdx, bars.length);

    const highs = window.map((b, i) => ({ x: i, y: b.high }));
    const lows = window.map((b, i) => ({ x: i, y: b.low }));
    const highSlope = linearSlope(highs);
    const lowSlope = linearSlope(lows);

    const baseClose = window[0]!.close;
    const highSlopePct = (highSlope / baseClose) * 100;
    const lowSlopePct = (lowSlope / baseClose) * 100;

    if (variant === "ascending") {
      // Resistance flat (highSlope near 0), support rising
      if (Math.abs(highSlopePct) > 0.1) continue;
      if (lowSlopePct < 0.1) continue;
    } else {
      // Support flat, resistance falling
      if (Math.abs(lowSlopePct) > 0.1) continue;
      if (highSlopePct > -0.1) continue;
    }

    const top = Math.max(...window.map((b) => b.high));
    const bottom = Math.min(...window.map((b) => b.low));
    const range = top - bottom;

    const lastClose = bars[bars.length - 1]!.close;
    const direction = variant === "ascending" ? "bullish" : "bearish";
    const patternType = variant === "ascending" ? "ascending_triangle" : "descending_triangle";

    let status: "forming" | "completed" = "forming";
    if (variant === "ascending" && lastClose > top * 1.005) status = "completed";
    if (variant === "descending" && lastClose < bottom * 0.995) status = "completed";

    const breakout = variant === "ascending" ? top : bottom;
    const target = variant === "ascending" ? top + range : bottom - range;
    const stop = variant === "ascending" ? bottom : top;

    let confidence = 0.55;
    if (duration >= 30) confidence += 0.1;
    if (status === "completed") confidence += 0.2;
    confidence = Math.min(confidence, 0.95);

    return [{
      patternType,
      category: variant === "ascending" ? "continuation" : "continuation",
      direction,
      status,
      startIndex: startIdx,
      endIndex: bars.length - 1,
      confidence,
      keyLevels: { breakout, target, stop, support: bottom, resistance: top },
      volumeConfirmation: false,
      narrative: `${variant === "ascending" ? "Ascending" : "Descending"} Triangle terbentuk ${duration} bar dengan ${variant === "ascending" ? "resistance flat + higher lows" : "support flat + lower highs"}. ${status === "completed" ? "Breakout sudah terjadi." : `Menunggu breakout ${direction === "bullish" ? "atas" : "bawah"}.`}`,
    }];
  }

  return [];
}

// ====================== DOUBLE TOP / DOUBLE BOTTOM ======================

export function detectDoubleTop(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 30) return [];
  const pivots = findPivots(bars, 3);
  if (pivots.length < 3) return [];

  // Find consecutive 2 highs with similar price + valley between
  for (let i = pivots.length - 1; i >= 2; i -= 1) {
    const second = pivots[i]!;
    if (second.type !== "high") continue;
    const valley = pivots[i - 1]!;
    if (valley.type !== "low") continue;
    const first = pivots[i - 2]!;
    if (first.type !== "high") continue;

    // Heights similar (within 3%)
    const heightDiff = Math.abs(first.price - second.price) / first.price;
    if (heightDiff > 0.05) continue;

    // Valley should be at least 5% below tops
    const valleyDepth = ((first.price - valley.price) / first.price) * 100;
    if (valleyDepth < 5) continue;

    const neckline = valley.price;
    const lastClose = bars[bars.length - 1]!.close;
    const status = lastClose < neckline * 0.99 ? "completed" : "forming";

    const target = neckline - (first.price - neckline); // Mirror down
    const stop = Math.max(first.price, second.price);

    let confidence = 0.5;
    if (heightDiff < 0.02) confidence += 0.2;
    if (valleyDepth > 8) confidence += 0.1;
    if (status === "completed") confidence += 0.15;
    confidence = Math.min(confidence, 0.95);

    return [{
      patternType: "double_top",
      category: "reversal",
      direction: "bearish",
      status,
      startIndex: first.index,
      endIndex: bars.length - 1,
      confidence,
      keyLevels: { breakout: neckline, target, stop, neckline },
      volumeConfirmation: false,
      narrative: `Double Top terdeteksi: peak pertama di ${first.price.toFixed(0)} (${first.date}), valley ${valley.price.toFixed(0)}, peak kedua di ${second.price.toFixed(0)} (${second.date}). Neckline support: ${neckline.toFixed(0)}. Target downside: ${target.toFixed(0)}.`,
    }];
  }

  return [];
}

export function detectDoubleBottom(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 30) return [];
  const pivots = findPivots(bars, 3);
  if (pivots.length < 3) return [];

  for (let i = pivots.length - 1; i >= 2; i -= 1) {
    const second = pivots[i]!;
    if (second.type !== "low") continue;
    const peak = pivots[i - 1]!;
    if (peak.type !== "high") continue;
    const first = pivots[i - 2]!;
    if (first.type !== "low") continue;

    const heightDiff = Math.abs(first.price - second.price) / first.price;
    if (heightDiff > 0.05) continue;

    const peakHeight = ((peak.price - first.price) / first.price) * 100;
    if (peakHeight < 5) continue;

    const neckline = peak.price;
    const lastClose = bars[bars.length - 1]!.close;
    const status = lastClose > neckline * 1.01 ? "completed" : "forming";

    const target = neckline + (neckline - first.price);
    const stop = Math.min(first.price, second.price);

    let confidence = 0.5;
    if (heightDiff < 0.02) confidence += 0.2;
    if (peakHeight > 8) confidence += 0.1;
    if (status === "completed") confidence += 0.15;
    confidence = Math.min(confidence, 0.95);

    return [{
      patternType: "double_bottom",
      category: "reversal",
      direction: "bullish",
      status,
      startIndex: first.index,
      endIndex: bars.length - 1,
      confidence,
      keyLevels: { breakout: neckline, target, stop, neckline },
      volumeConfirmation: false,
      narrative: `Double Bottom terdeteksi: bottom pertama di ${first.price.toFixed(0)} (${first.date}), peak ${peak.price.toFixed(0)}, bottom kedua di ${second.price.toFixed(0)} (${second.date}). Neckline resistance: ${neckline.toFixed(0)}. Target upside: ${target.toFixed(0)}.`,
    }];
  }

  return [];
}

// ====================== HEAD & SHOULDERS / INVERSE H&S ======================

/**
 * Head & Shoulders (bearish reversal):
 *   - 3 swing highs: left shoulder (LS), head (H), right shoulder (RS).
 *   - Head harus tertinggi; kedua bahu lebih rendah & kira-kira sejajar (within ~5%).
 *   - 2 swing low di antaranya membentuk neckline; breakdown di bawah neckline = konfirmasi.
 *
 * Inverse H&S (bullish reversal) = mirror: 3 swing lows, head terendah, neckline
 * dari 2 swing high; breakout di atas neckline = konfirmasi.
 */
function detectHeadShouldersImpl(
  bars: OhlcvBar[],
  variant: "normal" | "inverse",
): PatternMatch[] {
  if (bars.length < 30) return [];
  const pivots = findPivots(bars, 3);
  if (pivots.length < 5) return [];

  // Extremes that form the shoulders/head are "high" for normal, "low" for inverse.
  const peakType = variant === "normal" ? "high" : "low";
  const valleyType = variant === "normal" ? "low" : "high";

  // Scan most recent qualifying sequence: peak - valley - peak(extreme) - valley - peak.
  for (let i = pivots.length - 1; i >= 4; i -= 1) {
    const rs = pivots[i]!; // right shoulder
    const v2 = pivots[i - 1]!; // right neckline pivot
    const head = pivots[i - 2]!;
    const v1 = pivots[i - 3]!; // left neckline pivot
    const ls = pivots[i - 4]!; // left shoulder

    if (rs.type !== peakType || head.type !== peakType || ls.type !== peakType) continue;
    if (v1.type !== valleyType || v2.type !== valleyType) continue;

    if (variant === "normal") {
      // Head must be the tallest peak.
      if (head.price <= ls.price || head.price <= rs.price) continue;
    } else {
      // Head must be the lowest trough.
      if (head.price >= ls.price || head.price >= rs.price) continue;
    }

    // Shoulders roughly symmetric (within 6%).
    const shoulderDiff = Math.abs(ls.price - rs.price) / Math.max(ls.price, rs.price);
    if (shoulderDiff > 0.06) continue;

    // Head should stand out vs the higher shoulder by >= 3%.
    const refShoulder = variant === "normal" ? Math.max(ls.price, rs.price) : Math.min(ls.price, rs.price);
    const headProminence = Math.abs(head.price - refShoulder) / refShoulder;
    if (headProminence < 0.03) continue;

    // Neckline = line through the two interior valley pivots. Use sloped neckline
    // evaluated at the end index for the breakout level.
    const necklineSlope = (v2.price - v1.price) / (v2.index - v1.index || 1);
    const lastIdx = bars.length - 1;
    const necklineAtEnd = v2.price + necklineSlope * (lastIdx - v2.index);
    const necklineMid = (v1.price + v2.price) / 2;

    const lastClose = bars[lastIdx]!.close;
    const direction = variant === "normal" ? "bearish" : "bullish";
    const patternType = variant === "normal" ? "head_shoulders" : "inverse_head_shoulders";

    let status: "forming" | "completed" = "forming";
    if (variant === "normal" && lastClose < necklineAtEnd * 0.99) status = "completed";
    if (variant === "inverse" && lastClose > necklineAtEnd * 1.01) status = "completed";

    // Target = neckline projected by head-to-neckline height.
    const height = Math.abs(head.price - necklineMid);
    const target = variant === "normal" ? necklineAtEnd - height : necklineAtEnd + height;
    const stop = variant === "normal" ? Math.max(ls.price, rs.price) : Math.min(ls.price, rs.price);

    let confidence = 0.5;
    if (shoulderDiff < 0.03) confidence += 0.15;
    if (headProminence > 0.06) confidence += 0.1;
    if (Math.abs(necklineSlope) < (necklineMid * 0.002)) confidence += 0.1; // flat neckline
    if (status === "completed") confidence += 0.15;
    confidence = Math.min(confidence, 0.95);

    return [{
      patternType,
      category: "reversal",
      direction,
      status,
      startIndex: ls.index,
      endIndex: lastIdx,
      confidence,
      keyLevels: {
        breakout: necklineAtEnd,
        target,
        stop,
        neckline: necklineAtEnd,
        support: variant === "normal" ? necklineMid : head.price,
        resistance: variant === "normal" ? head.price : necklineMid,
      },
      volumeConfirmation: false,
      narrative: variant === "normal"
        ? `Head & Shoulders: bahu kiri ${ls.price.toFixed(0)} (${ls.date}), kepala ${head.price.toFixed(0)} (${head.date}), bahu kanan ${rs.price.toFixed(0)} (${rs.date}). Neckline ${necklineAtEnd.toFixed(0)} — breakdown = bearish reversal. Target downside: ${target.toFixed(0)}, stop: ${stop.toFixed(0)}.`
        : `Inverse Head & Shoulders: bahu kiri ${ls.price.toFixed(0)} (${ls.date}), kepala ${head.price.toFixed(0)} (${head.date}), bahu kanan ${rs.price.toFixed(0)} (${rs.date}). Neckline ${necklineAtEnd.toFixed(0)} — breakout = bullish reversal. Target upside: ${target.toFixed(0)}, stop: ${stop.toFixed(0)}.`,
    }];
  }

  return [];
}

export function detectHeadShoulders(bars: OhlcvBar[]): PatternMatch[] {
  return detectHeadShouldersImpl(bars, "normal");
}

export function detectInverseHeadShoulders(bars: OhlcvBar[]): PatternMatch[] {
  return detectHeadShouldersImpl(bars, "inverse");
}

// ====================== WEDGES (RISING / FALLING) ======================

/**
 * Wedge = dua trendline yang sama-sama miring ke arah yang sama tapi konvergen.
 *   - Rising Wedge: highs naik + lows naik, tapi lows naik LEBIH CURAM dari highs
 *     (range menyempit). Bearish reversal — breakdown ke bawah.
 *   - Falling Wedge: highs turun + lows turun, tapi highs turun LEBIH CURAM dari
 *     lows (range menyempit). Bullish reversal — breakout ke atas.
 *
 * Beda dengan symmetrical triangle (satu garis naik, satu turun) & channel
 * (paralel, range konstan).
 */
function detectWedge(
  bars: OhlcvBar[],
  variant: "rising" | "falling",
): PatternMatch[] {
  if (bars.length < 20) return [];

  for (const duration of [20, 30, 40]) {
    if (bars.length < duration) continue;
    const startIdx = bars.length - duration;
    const window = bars.slice(startIdx, bars.length);

    const highSlope = linearSlope(window.map((b, i) => ({ x: i, y: b.high })));
    const lowSlope = linearSlope(window.map((b, i) => ({ x: i, y: b.low })));
    const baseClose = window[0]!.close;
    const highSlopePct = (highSlope / baseClose) * 100;
    const lowSlopePct = (lowSlope / baseClose) * 100;

    if (variant === "rising") {
      // Both lines slope up; lows steeper than highs => converging.
      if (highSlopePct <= 0.02) continue;
      if (lowSlopePct <= 0.02) continue;
      if (lowSlope <= highSlope) continue; // lows must rise faster (converge)
    } else {
      // Both lines slope down; highs steeper (more negative) than lows => converging.
      if (highSlopePct >= -0.02) continue;
      if (lowSlopePct >= -0.02) continue;
      if (highSlope >= lowSlope) continue; // highs must fall faster (converge)
    }

    // Range must actually contract from first half to second half.
    const firstHalf = window.slice(0, Math.ceil(window.length / 2));
    const secondHalf = window.slice(Math.floor(window.length / 2));
    const firstRange =
      Math.max(...firstHalf.map((b) => b.high)) - Math.min(...firstHalf.map((b) => b.low));
    const secondRange =
      Math.max(...secondHalf.map((b) => b.high)) - Math.min(...secondHalf.map((b) => b.low));
    if (firstRange === 0) continue;
    if (secondRange >= firstRange * 0.9) continue; // need >= 10% contraction

    const top = Math.max(...window.map((b) => b.high));
    const bottom = Math.min(...window.map((b) => b.low));
    const range = top - bottom;

    const lastClose = bars[bars.length - 1]!.close;
    const direction = variant === "rising" ? "bearish" : "bullish";
    const patternType = variant === "rising" ? "rising_wedge" : "falling_wedge";

    let status: "forming" | "completed" = "forming";
    if (variant === "rising" && lastClose < bottom * 1.005) status = "completed";
    if (variant === "falling" && lastClose > top * 0.995) status = "completed";

    // Breakout level = lower trendline (rising) / upper trendline (falling) near apex.
    const breakout = variant === "rising" ? bottom : top;
    // Target = wedge height projected from breakout.
    const target = variant === "rising" ? bottom - range : top + range;
    const stop = variant === "rising" ? top : bottom;

    let confidence = 0.5;
    if (secondRange < firstRange * 0.6) confidence += 0.15; // strong convergence
    if (duration >= 30) confidence += 0.1;
    if (status === "completed") confidence += 0.15;
    confidence = Math.min(confidence, 0.95);

    return [{
      patternType,
      category: "reversal",
      direction,
      status,
      startIndex: startIdx,
      endIndex: bars.length - 1,
      confidence,
      keyLevels: { breakout, target, stop, support: bottom, resistance: top },
      volumeConfirmation: false,
      narrative: variant === "rising"
        ? `Rising Wedge ${duration} bar: highs & lows sama-sama naik tapi konvergen (range -${(((firstRange - secondRange) / firstRange) * 100).toFixed(0)}%). Bearish reversal — breakdown di ${breakout.toFixed(0)}, target downside ${target.toFixed(0)}, stop ${stop.toFixed(0)}. ${status === "completed" ? "Breakdown sudah terjadi." : "Menunggu breakdown."}`
        : `Falling Wedge ${duration} bar: highs & lows sama-sama turun tapi konvergen (range -${(((firstRange - secondRange) / firstRange) * 100).toFixed(0)}%). Bullish reversal — breakout di ${breakout.toFixed(0)}, target upside ${target.toFixed(0)}, stop ${stop.toFixed(0)}. ${status === "completed" ? "Breakout sudah terjadi." : "Menunggu breakout."}`,
    }];
  }

  return [];
}

export function detectRisingWedge(bars: OhlcvBar[]): PatternMatch[] {
  return detectWedge(bars, "rising");
}

export function detectFallingWedge(bars: OhlcvBar[]): PatternMatch[] {
  return detectWedge(bars, "falling");
}

// ====================== SYMMETRICAL TRIANGLE ======================

/**
 * Symmetrical Triangle = lower highs + higher lows yang konvergen (highs turun,
 * lows naik). Netral / indecision — arah bias mengikuti trend sebelum pola.
 * Breakout aktual menentukan arah final.
 */
export function detectSymmetricalTriangle(bars: OhlcvBar[]): PatternMatch[] {
  if (bars.length < 20) return [];

  for (const duration of [20, 30, 40]) {
    if (bars.length < duration) continue;
    const startIdx = bars.length - duration;
    const window = bars.slice(startIdx, bars.length);

    const highSlope = linearSlope(window.map((b, i) => ({ x: i, y: b.high })));
    const lowSlope = linearSlope(window.map((b, i) => ({ x: i, y: b.low })));
    const baseClose = window[0]!.close;
    const highSlopePct = (highSlope / baseClose) * 100;
    const lowSlopePct = (lowSlope / baseClose) * 100;

    // Highs descend, lows ascend (the defining symmetry).
    if (highSlopePct >= -0.05) continue;
    if (lowSlopePct <= 0.05) continue;

    // Roughly symmetric: the two slopes should be comparable in magnitude
    // (otherwise it's an ascending/descending triangle or wedge).
    const ratio = Math.abs(highSlopePct) / Math.abs(lowSlopePct);
    if (ratio < 0.4 || ratio > 2.5) continue;

    // Range must contract.
    const firstHalf = window.slice(0, Math.ceil(window.length / 2));
    const secondHalf = window.slice(Math.floor(window.length / 2));
    const firstRange =
      Math.max(...firstHalf.map((b) => b.high)) - Math.min(...firstHalf.map((b) => b.low));
    const secondRange =
      Math.max(...secondHalf.map((b) => b.high)) - Math.min(...secondHalf.map((b) => b.low));
    if (firstRange === 0) continue;
    if (secondRange >= firstRange * 0.9) continue;

    const top = Math.max(...window.map((b) => b.high));
    const bottom = Math.min(...window.map((b) => b.low));
    const range = top - bottom;

    // Bias: prior trend before the triangle.
    const priorWindow = bars.slice(Math.max(0, startIdx - 15), startIdx);
    let direction: "bullish" | "bearish" = "bullish";
    if (priorWindow.length > 3) {
      const firstClose = priorWindow[0]!.close;
      const lastPriorClose = priorWindow[priorWindow.length - 1]!.close;
      direction = lastPriorClose >= firstClose ? "bullish" : "bearish";
    }

    const lastClose = bars[bars.length - 1]!.close;
    let status: "forming" | "completed" = "forming";
    if (lastClose > top * 1.005) {
      direction = "bullish";
      status = "completed";
    } else if (lastClose < bottom * 0.995) {
      direction = "bearish";
      status = "completed";
    }

    const breakout = direction === "bullish" ? top : bottom;
    const target = direction === "bullish" ? top + range : bottom - range;
    const stop = direction === "bullish" ? bottom : top;

    let confidence = 0.5;
    if (ratio > 0.7 && ratio < 1.4) confidence += 0.1; // well-balanced
    if (secondRange < firstRange * 0.6) confidence += 0.1;
    if (duration >= 30) confidence += 0.05;
    if (status === "completed") confidence += 0.2;
    confidence = Math.min(confidence, 0.95);

    return [{
      patternType: "symmetrical_triangle",
      category: "indecision",
      direction,
      status,
      startIndex: startIdx,
      endIndex: bars.length - 1,
      confidence,
      keyLevels: { breakout, target, stop, support: bottom, resistance: top },
      volumeConfirmation: false,
      narrative: `Symmetrical Triangle ${duration} bar: lower highs + higher lows konvergen (range -${(((firstRange - secondRange) / firstRange) * 100).toFixed(0)}%). Netral — bias ${direction === "bullish" ? "bullish" : "bearish"} mengikuti trend sebelumnya. ${status === "completed" ? `Breakout ${direction === "bullish" ? "atas" : "bawah"} sudah terjadi.` : "Menunggu breakout."} Target: ${target.toFixed(0)}, stop: ${stop.toFixed(0)}.`,
    }];
  }

  return [];
}

// ====================== RUNNER ======================

import { CANDLESTICK_DETECTORS } from "./candlestick";

const DETECTORS = [
  detectBullFlag,
  detectBearFlag,
  detectBullPennant,
  detectBearPennant,
  detectCupHandle,
  detectInverseCupHandle,
  detectRectangle,
  detectAscendingTriangle,
  detectDescendingTriangle,
  detectDoubleTop,
  detectDoubleBottom,
  detectHeadShoulders,
  detectInverseHeadShoulders,
  detectRisingWedge,
  detectFallingWedge,
  detectSymmetricalTriangle,
  ...CANDLESTICK_DETECTORS,
];

export function detectAllPatterns(bars: OhlcvBar[]): PatternMatch[] {
  const all: PatternMatch[] = [];
  for (const detector of DETECTORS) {
    try {
      const matches = detector(bars);
      all.push(...matches);
    } catch (err) {
      // Skip failing detector
      void err;
    }
  }

  // Dedup: jika dua pattern overlap > 80% dan punya direction sama, keep highest confidence
  all.sort((a, b) => b.confidence - a.confidence);
  const filtered: PatternMatch[] = [];
  for (const m of all) {
    const conflict = filtered.find((f) => {
      if (f.direction !== m.direction) return false;
      const overlapStart = Math.max(f.startIndex, m.startIndex);
      const overlapEnd = Math.min(f.endIndex, m.endIndex);
      if (overlapEnd < overlapStart) return false;
      const overlap = overlapEnd - overlapStart;
      const myRange = m.endIndex - m.startIndex;
      return overlap > myRange * 0.7;
    });
    if (!conflict) filtered.push(m);
  }

  return filtered;
}
