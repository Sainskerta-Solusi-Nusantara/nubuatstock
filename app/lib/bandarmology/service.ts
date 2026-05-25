import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotesEod } from "@/db/schema/market";
import { brokerSummaryDaily, foreignFlowDaily } from "@/db/schema/market";

/**
 * Bandarmology service — analisis smart money activity dari volume + price patterns.
 *
 * Layer 1 (PRIMARY): Computed dari quotes_eod (always available):
 *   - Accumulation/Distribution Line (A/D Line) — Marc Chaikin formula
 *   - On-Balance Volume (OBV) — Granville
 *   - Money Flow Index (MFI 14) — volume-weighted RSI
 *   - Volume Price Trend (VPT)
 *   - Volume Spike Detection (vs 20d avg)
 *   - Buy/Sell Pressure (intraday close vs HL midpoint)
 *
 * Layer 2 (when ingestion ready): foreign_flow_daily & broker_summary_daily
 *   - Net foreign flow last 5/20/60d
 *   - Top broker accumulator (buyer concentration HHI)
 *   - Lead-lag broker analysis
 *
 * Output: structured metrics + interpretation (bullish/neutral/bearish per metric).
 */

export interface BandarmologyMetrics {
  kode: string;
  asOf: string;
  // Volume-based (computed from quotes_eod)
  adLine: {
    current: number;
    change20d: number;
    trend: "accumulating" | "neutral" | "distributing";
  };
  obv: {
    current: number;
    change20d: number;
    trend: "accumulating" | "neutral" | "distributing";
  };
  mfi: {
    current: number;
    state: "overbought" | "oversold" | "neutral";
  };
  volumeSpike: {
    last5dAvg: number;
    last60dAvg: number;
    spikeRatio: number;
    interpretation: "high_interest" | "normal" | "drying_up";
  };
  buySellPressure: {
    last20d: number; // -100 to +100
    interpretation: "buyers_dominant" | "sellers_dominant" | "balanced";
  };
  // External data (may be unavailable)
  foreignFlow: {
    available: boolean;
    netLast5d: number | null;
    netLast20d: number | null;
    netLast60d: number | null;
  };
  brokerActivity: {
    available: boolean;
    topNetBuyers: Array<{ broker: string; netValueIdr: number; volume: number }>;
    topNetSellers: Array<{ broker: string; netValueIdr: number; volume: number }>;
    concentrationHhi: number | null; // 0-10000 (10000 = 1 broker dominates)
  };
  overallVerdict: "smart_money_buying" | "smart_money_selling" | "neutral";
}

interface Bar {
  date: string;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
}

function adLine(bars: Bar[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (const b of bars) {
    const range = b.high - b.low;
    const mfm = range === 0 ? 0 : ((b.close - b.low) - (b.high - b.close)) / range;
    cum += mfm * b.volume;
    out.push(cum);
  }
  return out;
}

function obv(bars: Bar[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < bars.length; i += 1) {
    if (i === 0) {
      out.push(0);
      continue;
    }
    const curr = bars[i]!;
    const prev = bars[i - 1]!;
    if (curr.close > prev.close) cum += curr.volume;
    else if (curr.close < prev.close) cum -= curr.volume;
    out.push(cum);
  }
  return out;
}

function mfi(bars: Bar[], period = 14): number | null {
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
  const mr = positiveMF / negativeMF;
  return 100 - 100 / (1 + mr);
}

function buySellPressure(bars: Bar[]): number {
  // Last 20 bars: avg of (close - midpoint) / range × 100
  const recent = bars.slice(-20);
  if (recent.length === 0) return 0;
  let total = 0;
  let n = 0;
  for (const b of recent) {
    const range = b.high - b.low;
    if (range === 0) continue;
    const mid = (b.high + b.low) / 2;
    const pressure = ((b.close - mid) / range) * 100;
    total += pressure;
    n += 1;
  }
  return n > 0 ? total / n : 0;
}

export async function computeBandarmology(kode: string): Promise<BandarmologyMetrics | null> {
  const k = kode.toUpperCase();

  const rows = await db
    .select({
      date: quotesEod.tradeDate,
      close: quotesEod.close,
      high: quotesEod.high,
      low: quotesEod.low,
      open: quotesEod.open,
      volume: quotesEod.volume,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, k))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(120);

  if (rows.length < 21) return null;

  const bars: Bar[] = rows.slice().reverse().map((r) => ({
    date: r.date,
    close: Number(r.close),
    high: Number(r.high),
    low: Number(r.low),
    open: Number(r.open),
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume),
  }));

  // A/D line
  const ad = adLine(bars);
  const adCurrent = ad[ad.length - 1] ?? 0;
  const ad20 = ad.length > 20 ? ad[ad.length - 21] ?? 0 : 0;
  const adChange = adCurrent - ad20;
  const adNormalize = Math.abs(adCurrent) > 0 ? (adChange / Math.abs(adCurrent)) * 100 : 0;

  // OBV
  const obvArr = obv(bars);
  const obvCurrent = obvArr[obvArr.length - 1] ?? 0;
  const obv20 = obvArr.length > 20 ? obvArr[obvArr.length - 21] ?? 0 : 0;
  const obvChange = obvCurrent - obv20;

  // MFI
  const mfiVal = mfi(bars, 14);

  // Volume spike
  const last5 = bars.slice(-5);
  const last60 = bars.slice(-60);
  const avg5 = last5.reduce((a, b) => a + b.volume, 0) / Math.max(last5.length, 1);
  const avg60 = last60.reduce((a, b) => a + b.volume, 0) / Math.max(last60.length, 1);
  const spikeRatio = avg60 > 0 ? avg5 / avg60 : 1;

  // Buy/sell pressure
  const pressure = buySellPressure(bars);

  // Foreign flow (when available)
  const ffRows = await db
    .select({
      tradeDate: foreignFlowDaily.tradeDate,
      netValueIdr: foreignFlowDaily.netValue,
    })
    .from(foreignFlowDaily)
    .where(
      and(
        eq(foreignFlowDaily.companyKode, k),
        gte(foreignFlowDaily.tradeDate, new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
      ),
    )
    .orderBy(desc(foreignFlowDaily.tradeDate))
    .limit(90);

  const foreignAvailable = ffRows.length > 0;
  const sumWindow = (days: number): number => {
    const slice = ffRows.slice(0, days);
    return slice.reduce((a, b) => a + Number(b.netValueIdr ?? 0), 0);
  };

  // Broker activity (when available)
  const brokerRows = await db
    .select({
      brokerCode: brokerSummaryDaily.brokerCode,
      netValue: brokerSummaryDaily.netValueIdr,
      volume: brokerSummaryDaily.volume,
    })
    .from(brokerSummaryDaily)
    .where(
      and(
        eq(brokerSummaryDaily.companyKode, k),
        gte(brokerSummaryDaily.tradeDate, new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10)),
      ),
    )
    .limit(2000);

  const brokerAvailable = brokerRows.length > 0;
  const brokerNet = new Map<string, { netValueIdr: number; volume: number }>();
  for (const r of brokerRows) {
    const cur = brokerNet.get(r.brokerCode) ?? { netValueIdr: 0, volume: 0 };
    cur.netValueIdr += Number(r.netValue ?? 0);
    cur.volume += typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume ?? 0);
    brokerNet.set(r.brokerCode, cur);
  }
  const brokerList = Array.from(brokerNet.entries()).map(([broker, v]) => ({ broker, ...v }));
  const topNetBuyers = brokerList.filter((b) => b.netValueIdr > 0).sort((a, b) => b.netValueIdr - a.netValueIdr).slice(0, 5);
  const topNetSellers = brokerList.filter((b) => b.netValueIdr < 0).sort((a, b) => a.netValueIdr - b.netValueIdr).slice(0, 5);
  const totalAbs = brokerList.reduce((a, b) => a + Math.abs(b.netValueIdr), 0);
  const hhi = totalAbs > 0
    ? brokerList.reduce((acc, b) => acc + Math.pow((Math.abs(b.netValueIdr) / totalAbs) * 100, 2), 0)
    : null;

  // Overall verdict (vote across signals)
  let bullVotes = 0;
  let bearVotes = 0;
  if (adChange > 0) bullVotes += 1; else if (adChange < 0) bearVotes += 1;
  if (obvChange > 0) bullVotes += 1; else if (obvChange < 0) bearVotes += 1;
  if (mfiVal != null && mfiVal > 50) bullVotes += 1; else if (mfiVal != null && mfiVal < 50) bearVotes += 1;
  if (pressure > 10) bullVotes += 1; else if (pressure < -10) bearVotes += 1;
  if (foreignAvailable && sumWindow(20) > 0) bullVotes += 1; else if (foreignAvailable && sumWindow(20) < 0) bearVotes += 1;

  const verdict: BandarmologyMetrics["overallVerdict"] =
    bullVotes - bearVotes >= 2 ? "smart_money_buying" :
    bearVotes - bullVotes >= 2 ? "smart_money_selling" : "neutral";

  return {
    kode: k,
    asOf: bars[bars.length - 1]!.date,
    adLine: {
      current: adCurrent,
      change20d: adNormalize,
      trend: adChange > 0 ? "accumulating" : adChange < 0 ? "distributing" : "neutral",
    },
    obv: {
      current: obvCurrent,
      change20d: obvChange,
      trend: obvChange > 0 ? "accumulating" : obvChange < 0 ? "distributing" : "neutral",
    },
    mfi: {
      current: mfiVal ?? 50,
      state: mfiVal == null ? "neutral" : mfiVal > 80 ? "overbought" : mfiVal < 20 ? "oversold" : "neutral",
    },
    volumeSpike: {
      last5dAvg: avg5,
      last60dAvg: avg60,
      spikeRatio,
      interpretation: spikeRatio > 1.5 ? "high_interest" : spikeRatio < 0.7 ? "drying_up" : "normal",
    },
    buySellPressure: {
      last20d: pressure,
      interpretation: pressure > 10 ? "buyers_dominant" : pressure < -10 ? "sellers_dominant" : "balanced",
    },
    foreignFlow: {
      available: foreignAvailable,
      netLast5d: foreignAvailable ? sumWindow(5) : null,
      netLast20d: foreignAvailable ? sumWindow(20) : null,
      netLast60d: foreignAvailable ? sumWindow(60) : null,
    },
    brokerActivity: {
      available: brokerAvailable,
      topNetBuyers,
      topNetSellers,
      concentrationHhi: hhi,
    },
    overallVerdict: verdict,
  };
}
