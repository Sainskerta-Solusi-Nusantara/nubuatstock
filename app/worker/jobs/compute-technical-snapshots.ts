import type { Processor } from "bullmq";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { technicalSnapshots } from "@/db/schema/technical";
import {
  atr,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  stochastic,
} from "@/lib/picks/indicators";
import { logger } from "@/lib/logger";
import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Technical snapshots compute worker.
 *
 * Iterate semua emiten aktif, fetch 250 EOD bars (1 trading year), compute semua
 * indikator, upsert snapshot terkini.
 *
 * Idempotent — bisa di-run berkali-kali, hasil sama untuk data sama.
 *
 * Performance:
 * - Bottleneck: query EOD bars (980 × ~12ms). Total ~12s.
 * - Compute: pure JS, ~30ms per emiten. Total ~30s.
 * - Upsert: batched insert. Total ~10s.
 * - Estimasi full pass: 1-2 menit.
 */

const BATCH_SIZE = 50; // Process in batches untuk parallelism

interface CompanyRow {
  kode: string;
}

async function computeOneSnapshot(kode: string): Promise<boolean> {
  const rows = await db
    .select({
      date: quotesEod.tradeDate,
      open: quotesEod.open,
      high: quotesEod.high,
      low: quotesEod.low,
      close: quotesEod.close,
      volume: quotesEod.volume,
      valueIdr: quotesEod.valueIdr,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, kode))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(250);

  if (rows.length < 21) return false; // Too few bars

  // Chronological
  const bars: OhlcvBar[] = rows.slice().reverse().map((r) => {
    const close = Number(r.close);
    const volume = typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume);
    const parsedValueIdr = Number.parseFloat(r.valueIdr);
    return {
      date: r.date,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close,
      volume,
      valueIdr: Number.isFinite(parsedValueIdr) ? parsedValueIdr : close * volume,
    };
  });

  const closes = bars.map((b) => b.close);
  const lastBar = bars[bars.length - 1]!;
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : null;

  // Momentum
  const rsi14Arr = rsi(closes, 14);
  const stoch1055 = stochastic(bars, 10, 5, 5);
  const stoch1433 = stochastic(bars, 14, 3, 3);
  const stoch533 = stochastic(bars, 5, 3, 3);
  const macdResult = macd(closes, 12, 26, 9);

  // MFI 14
  const mfiVal = computeMFI(bars, 14);

  // Trend
  const sma20Arr = sma(closes, 20);
  const sma50Arr = bars.length >= 50 ? sma(closes, 50) : [];
  const sma200Arr = bars.length >= 200 ? sma(closes, 200) : [];
  const ema9Arr = ema(closes, 9);
  const ema21Arr = ema(closes, 21);
  const ema55Arr = bars.length >= 55 ? ema(closes, 55) : [];

  // Volatility
  const bb = bollinger(closes, 20, 2);
  const atr14Arr = atr(bars, 14);

  // Volume averages
  const volumes = bars.map((b) => b.volume);
  const volSma20Arr = sma(volumes, 20);
  const volSma60Arr = bars.length >= 60 ? sma(volumes, 60) : [];

  // Extract last values
  const lastClose = lastBar.close;
  const prevClose = prevBar?.close ?? null;
  const changePct1d = prevClose != null && prevClose !== 0 ? ((lastClose - prevClose) / prevClose) * 100 : null;

  const lastRsi = rsi14Arr.at(-1) ?? null;
  const lastK1055 = stoch1055.k.at(-1) ?? null;
  const lastD1055 = stoch1055.d.at(-1) ?? null;
  const lastK1433 = stoch1433.k.at(-1) ?? null;
  const lastD1433 = stoch1433.d.at(-1) ?? null;
  const lastK533 = stoch533.k.at(-1) ?? null;
  const lastD533 = stoch533.d.at(-1) ?? null;
  const lastMacdLine = macdResult.macd.at(-1) ?? null;
  const lastMacdSignal = macdResult.signal.at(-1) ?? null;
  const lastMacdHist = macdResult.histogram.at(-1) ?? null;
  const prevMacdHist = macdResult.histogram.at(-2) ?? null;
  const macdHistTurningUp = lastMacdHist != null && prevMacdHist != null && prevMacdHist <= 0 && lastMacdHist > 0;
  const macdHistTurningDown = lastMacdHist != null && prevMacdHist != null && prevMacdHist >= 0 && lastMacdHist < 0;

  const lastSma20 = sma20Arr.at(-1) ?? null;
  const lastSma50 = sma50Arr.at(-1) ?? null;
  const lastSma200 = sma200Arr.at(-1) ?? null;
  const lastEma9 = ema9Arr.at(-1) ?? null;
  const lastEma21 = ema21Arr.at(-1) ?? null;
  const lastEma55 = ema55Arr.at(-1) ?? null;

  // ADX
  const adxArr = await import("@/lib/picks/indicators").then((m) => m.adx(bars, 14));
  const lastAdx = adxArr.at(-1) ?? null;

  // BB
  const lastBbUpper = bb.upper.at(-1) ?? null;
  const lastBbMiddle = bb.middle.at(-1) ?? null;
  const lastBbLower = bb.lower.at(-1) ?? null;
  const bbWidth = lastBbUpper != null && lastBbLower != null && lastBbMiddle != null && lastBbMiddle !== 0
    ? ((lastBbUpper - lastBbLower) / lastBbMiddle) * 100
    : null;

  // BB width min last 120 bars
  let bbWidthMin120: number | null = null;
  if (bars.length >= 120) {
    const widths: number[] = [];
    for (let i = bars.length - 120; i < bars.length; i += 1) {
      const u = bb.upper[i];
      const l = bb.lower[i];
      const m = bb.middle[i];
      if (u != null && l != null && m != null && m !== 0) {
        widths.push(((u - l) / m) * 100);
      }
    }
    if (widths.length > 0) bbWidthMin120 = Math.min(...widths);
  }

  const lastAtr = atr14Arr.at(-1) ?? null;

  const lastVolSma20 = volSma20Arr.at(-1) ?? null;
  const lastVolSma60 = volSma60Arr.at(-1) ?? null;
  const last5Vol = bars.slice(-5).reduce((acc, b) => acc + b.volume, 0) / 5;
  const volumeRatio = lastVolSma60 != null && lastVolSma60 > 0 ? last5Vol / lastVolSma60 : null;

  // State flags
  const isAboveSma20 = lastSma20 != null && lastClose > lastSma20;
  const isAboveSma50 = lastSma50 != null && lastClose > lastSma50;
  const isAboveSma200 = lastSma200 != null && lastClose > lastSma200;
  const isBullishStack = lastSma20 != null && lastSma50 != null && lastSma200 != null && lastSma20 > lastSma50 && lastSma50 > lastSma200;
  const isBearishStack = lastSma20 != null && lastSma50 != null && lastSma200 != null && lastSma20 < lastSma50 && lastSma50 < lastSma200;

  // Golden/death cross detection: look at last 10 bars
  let isGoldenCross = false;
  let isDeathCross = false;
  if (bars.length >= 200) {
    for (let i = Math.max(bars.length - 10, 1); i < bars.length; i += 1) {
      const cur50 = sma50Arr[i];
      const cur200 = sma200Arr[i];
      const prev50 = sma50Arr[i - 1];
      const prev200 = sma200Arr[i - 1];
      if (cur50 != null && cur200 != null && prev50 != null && prev200 != null) {
        if (prev50 <= prev200 && cur50 > cur200) isGoldenCross = true;
        if (prev50 >= prev200 && cur50 < cur200) isDeathCross = true;
      }
    }
  }

  // BB squeeze
  const isBbSqueeze = bbWidth != null && bbWidthMin120 != null && bbWidthMin120 > 0
    ? bbWidth <= bbWidthMin120 * 1.1
    : false;

  // 52-week high/low distance
  const lookback52 = Math.min(252, bars.length);
  const recentBars = bars.slice(-lookback52);
  const high52 = Math.max(...recentBars.map((b) => b.high));
  const low52 = Math.min(...recentBars.map((b) => b.low));
  const distHi = high52 > 0 ? ((high52 - lastClose) / high52) * 100 : null;
  const distLo = low52 > 0 ? ((lastClose - low52) / low52) * 100 : null;

  // Upsert
  await db
    .insert(technicalSnapshots)
    .values({
      companyKode: kode,
      tradeDate: lastBar.date,
      lastClose: String(lastClose),
      prevClose: prevClose != null ? String(prevClose) : null,
      changePct1d: changePct1d != null ? String(changePct1d) : null,
      rsi14: lastRsi != null ? String(lastRsi) : null,
      stochK_10_5_5: lastK1055 != null ? String(lastK1055) : null,
      stochD_10_5_5: lastD1055 != null ? String(lastD1055) : null,
      stochK_14_3_3: lastK1433 != null ? String(lastK1433) : null,
      stochD_14_3_3: lastD1433 != null ? String(lastD1433) : null,
      stochK_5_3_3: lastK533 != null ? String(lastK533) : null,
      stochD_5_3_3: lastD533 != null ? String(lastD533) : null,
      macdLine: lastMacdLine != null ? String(lastMacdLine) : null,
      macdSignal: lastMacdSignal != null ? String(lastMacdSignal) : null,
      macdHistogram: lastMacdHist != null ? String(lastMacdHist) : null,
      macdHistogramTurningUp: macdHistTurningUp,
      macdHistogramTurningDown: macdHistTurningDown,
      mfi14: mfiVal != null ? String(mfiVal) : null,
      sma20: lastSma20 != null ? String(lastSma20) : null,
      sma50: lastSma50 != null ? String(lastSma50) : null,
      sma200: lastSma200 != null ? String(lastSma200) : null,
      ema9: lastEma9 != null ? String(lastEma9) : null,
      ema21: lastEma21 != null ? String(lastEma21) : null,
      ema55: lastEma55 != null ? String(lastEma55) : null,
      adx14: lastAdx != null ? String(lastAdx) : null,
      bbUpper20: lastBbUpper != null ? String(lastBbUpper) : null,
      bbMiddle20: lastBbMiddle != null ? String(lastBbMiddle) : null,
      bbLower20: lastBbLower != null ? String(lastBbLower) : null,
      bbWidthCurrent: bbWidth != null ? String(bbWidth) : null,
      bbWidthMin120d: bbWidthMin120 != null ? String(bbWidthMin120) : null,
      atr14: lastAtr != null ? String(lastAtr) : null,
      volumeSma20: lastVolSma20 != null ? BigInt(Math.round(lastVolSma20)) : null,
      volumeSma60: lastVolSma60 != null ? BigInt(Math.round(lastVolSma60)) : null,
      volumeRatio5dVs60d: volumeRatio != null ? String(volumeRatio) : null,
      isAboveSma20,
      isAboveSma50,
      isAboveSma200,
      isBullishMaStack: isBullishStack,
      isBearishMaStack: isBearishStack,
      isGoldenCrossRecent: isGoldenCross,
      isDeathCrossRecent: isDeathCross,
      isBbSqueeze,
      distFrom52wHighPct: distHi != null ? String(distHi) : null,
      distFrom52wLowPct: distLo != null ? String(distLo) : null,
      barsAnalyzed: BigInt(bars.length),
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: technicalSnapshots.companyKode,
      set: {
        tradeDate: lastBar.date,
        lastClose: String(lastClose),
        prevClose: prevClose != null ? String(prevClose) : null,
        changePct1d: changePct1d != null ? String(changePct1d) : null,
        rsi14: lastRsi != null ? String(lastRsi) : null,
        stochK_10_5_5: lastK1055 != null ? String(lastK1055) : null,
        stochD_10_5_5: lastD1055 != null ? String(lastD1055) : null,
        stochK_14_3_3: lastK1433 != null ? String(lastK1433) : null,
        stochD_14_3_3: lastD1433 != null ? String(lastD1433) : null,
        stochK_5_3_3: lastK533 != null ? String(lastK533) : null,
        stochD_5_3_3: lastD533 != null ? String(lastD533) : null,
        macdLine: lastMacdLine != null ? String(lastMacdLine) : null,
        macdSignal: lastMacdSignal != null ? String(lastMacdSignal) : null,
        macdHistogram: lastMacdHist != null ? String(lastMacdHist) : null,
        macdHistogramTurningUp: macdHistTurningUp,
        macdHistogramTurningDown: macdHistTurningDown,
        mfi14: mfiVal != null ? String(mfiVal) : null,
        sma20: lastSma20 != null ? String(lastSma20) : null,
        sma50: lastSma50 != null ? String(lastSma50) : null,
        sma200: lastSma200 != null ? String(lastSma200) : null,
        ema9: lastEma9 != null ? String(lastEma9) : null,
        ema21: lastEma21 != null ? String(lastEma21) : null,
        ema55: lastEma55 != null ? String(lastEma55) : null,
        adx14: lastAdx != null ? String(lastAdx) : null,
        bbUpper20: lastBbUpper != null ? String(lastBbUpper) : null,
        bbMiddle20: lastBbMiddle != null ? String(lastBbMiddle) : null,
        bbLower20: lastBbLower != null ? String(lastBbLower) : null,
        bbWidthCurrent: bbWidth != null ? String(bbWidth) : null,
        bbWidthMin120d: bbWidthMin120 != null ? String(bbWidthMin120) : null,
        atr14: lastAtr != null ? String(lastAtr) : null,
        volumeSma20: lastVolSma20 != null ? BigInt(Math.round(lastVolSma20)) : null,
        volumeSma60: lastVolSma60 != null ? BigInt(Math.round(lastVolSma60)) : null,
        volumeRatio5dVs60d: volumeRatio != null ? String(volumeRatio) : null,
        isAboveSma20,
        isAboveSma50,
        isAboveSma200,
        isBullishMaStack: isBullishStack,
        isBearishMaStack: isBearishStack,
        isGoldenCrossRecent: isGoldenCross,
        isDeathCrossRecent: isDeathCross,
        isBbSqueeze,
        distFrom52wHighPct: distHi != null ? String(distHi) : null,
        distFrom52wLowPct: distLo != null ? String(distLo) : null,
        barsAnalyzed: BigInt(bars.length),
        computedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  return true;
}

function computeMFI(bars: OhlcvBar[], period: number): number | null {
  if (bars.length < period + 1) return null;
  const recent = bars.slice(-period - 1);
  let positiveMF = 0;
  let negativeMF = 0;
  for (let i = 1; i < recent.length; i += 1) {
    const tp = (recent[i]!.high + recent[i]!.low + recent[i]!.close) / 3;
    const tpPrev = (recent[i - 1]!.high + recent[i - 1]!.low + recent[i - 1]!.close) / 3;
    const moneyFlow = tp * recent[i]!.volume;
    if (tp > tpPrev) positiveMF += moneyFlow;
    else if (tp < tpPrev) negativeMF += moneyFlow;
  }
  if (negativeMF === 0) return 100;
  return 100 - 100 / (1 + positiveMF / negativeMF);
}

export const computeTechnicalSnapshotsProcessor: Processor = async (job) => {
  const data = (job.data ?? {}) as { sampleSize?: number; sourceKode?: string };

  if (data.sourceKode) {
    const ok = await computeOneSnapshot(data.sourceKode);
    return { processed: ok ? 1 : 0, failed: ok ? 0 : 1, mode: "single" };
  }

  const conditions = [eq(companies.isActive, true)];
  const allCompanies: CompanyRow[] = await db
    .select({ kode: companies.kode })
    .from(companies)
    .where(and(...conditions))
    .limit(data.sampleSize ?? 9999);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
    const batch = allCompanies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((c) => computeOneSnapshot(c.kode)),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) processed += 1;
      else failed += 1;
    }
    if (i % (BATCH_SIZE * 5) === 0) {
      logger.info({ processed, failed, total: allCompanies.length }, "technical-snapshots progress");
    }
  }

  return { processed, failed, mode: "bulk" };
};
