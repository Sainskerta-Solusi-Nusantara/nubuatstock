import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { newsArticleTickers, newsArticles } from "@/db/schema/news";
import { ema, rsi, sma } from "@/lib/picks/indicators";

/**
 * Verdict Scoring Engine 0–10 — adaptasi konsep AlphaFlow ke universe Nubuat.
 *
 * 6 factor weighted score (cocok dengan data yang tersedia di Nubuat — kalau
 * bandarmology data ter-ingest nanti, tinggal tambah factor 7th):
 *
 *   1. Technical Trend     (25%) — MA stack (price > SMA20 > SMA50 > SMA200), RSI zone
 *   2. Momentum            (15%) — % change 5d/20d, distance from 52w high/low
 *   3. Value               (15%) — PE, PBV vs sector median (lower = better)
 *   4. Quality             (15%) — ROE, profit margin, current ratio
 *   5. Growth              (15%) — revenue YoY, earnings YoY
 *   6. News Sentiment      (15%) — avg sentiment score 30d, article volume
 *
 * Setiap factor menghasilkan score 0-10 + faktor signals (raw values + interpretation).
 * Overall verdict = weighted average → rounded ke 1 decimal.
 *
 * Verdict label:
 *   - 8.0–10.0: STRONG BUY (hijau gelap)
 *   - 6.5–7.9:  BUY (hijau)
 *   - 4.5–6.4:  HOLD (kuning)
 *   - 3.0–4.4:  SELL (oranye)
 *   - 0.0–2.9:  STRONG SELL (merah)
 *
 * Transparency: kembalikan factor-level data sehingga user paham KENAPA verdict-nya
 * begitu — tidak black-box.
 */

export interface FactorScore {
  name: string;
  score: number; // 0-10
  weight: number; // 0-1
  signals: Array<{ label: string; value: string; positive: boolean | null }>;
}

export interface VerdictResult {
  kode: string;
  overallScore: number; // 0-10
  label: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
  factors: FactorScore[];
  asOf: Date;
  warnings: string[];
}

const FACTOR_WEIGHTS = {
  technical: 0.25,
  momentum: 0.15,
  value: 0.15,
  quality: 0.15,
  growth: 0.15,
  sentiment: 0.15,
} as const;

function clamp(v: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, v));
}

function labelFor(score: number): VerdictResult["label"] {
  if (score >= 8.0) return "STRONG BUY";
  if (score >= 6.5) return "BUY";
  if (score >= 4.5) return "HOLD";
  if (score >= 3.0) return "SELL";
  return "STRONG SELL";
}

// ===================== Factor: Technical =====================

function scoreTechnical(closes: number[]): FactorScore {
  const signals: FactorScore["signals"] = [];

  if (closes.length < 50) {
    return {
      name: "Technical Trend",
      score: 5,
      weight: FACTOR_WEIGHTS.technical,
      signals: [{ label: "Data insufficient", value: `${closes.length} bars`, positive: null }],
    };
  }

  const last = closes[closes.length - 1]!;
  const sma20 = sma(closes, 20).at(-1) ?? null;
  const sma50 = sma(closes, 50).at(-1) ?? null;
  const sma200 = closes.length >= 200 ? sma(closes, 200).at(-1) ?? null : null;
  const rsi14 = rsi(closes, 14).at(-1) ?? null;

  let score = 5; // neutral baseline

  if (sma20 != null && last > sma20) {
    score += 1;
    signals.push({ label: "Price > SMA20", value: `${last.toFixed(2)} > ${sma20.toFixed(2)}`, positive: true });
  } else if (sma20 != null) {
    score -= 1;
    signals.push({ label: "Price < SMA20", value: `${last.toFixed(2)} < ${sma20.toFixed(2)}`, positive: false });
  }

  if (sma50 != null && sma20 != null && sma20 > sma50) {
    score += 1;
    signals.push({ label: "SMA20 > SMA50 (uptrend)", value: "Bullish stack", positive: true });
  } else if (sma50 != null && sma20 != null) {
    score -= 1;
    signals.push({ label: "SMA20 < SMA50 (downtrend)", value: "Bearish stack", positive: false });
  }

  if (sma200 != null && sma50 != null && sma50 > sma200) {
    score += 1.5;
    signals.push({ label: "Long-term uptrend (SMA50 > SMA200)", value: "Above 200-day", positive: true });
  } else if (sma200 != null && sma50 != null) {
    score -= 1.5;
    signals.push({ label: "Long-term downtrend (SMA50 < SMA200)", value: "Below 200-day", positive: false });
  }

  if (rsi14 != null) {
    if (rsi14 > 70) {
      score -= 0.5;
      signals.push({ label: "RSI overbought", value: rsi14.toFixed(1), positive: false });
    } else if (rsi14 < 30) {
      score += 0.5; // oversold = mean reversion opportunity
      signals.push({ label: "RSI oversold (rebound zone)", value: rsi14.toFixed(1), positive: true });
    } else if (rsi14 > 50) {
      score += 0.25;
      signals.push({ label: "RSI bullish (50-70)", value: rsi14.toFixed(1), positive: true });
    } else {
      signals.push({ label: "RSI neutral/weak", value: rsi14.toFixed(1), positive: null });
    }
  }

  return {
    name: "Technical Trend",
    score: clamp(score),
    weight: FACTOR_WEIGHTS.technical,
    signals,
  };
}

// ===================== Factor: Momentum =====================

function scoreMomentum(closes: number[], hi52: number | null, lo52: number | null): FactorScore {
  const signals: FactorScore["signals"] = [];

  if (closes.length < 21) {
    return {
      name: "Momentum",
      score: 5,
      weight: FACTOR_WEIGHTS.momentum,
      signals: [{ label: "Data insufficient", value: `${closes.length} bars`, positive: null }],
    };
  }

  const last = closes[closes.length - 1]!;
  const fiveAgo = closes[closes.length - 6] ?? null;
  const twentyAgo = closes[closes.length - 21] ?? null;

  let score = 5;

  if (fiveAgo) {
    const pct = ((last - fiveAgo) / fiveAgo) * 100;
    if (pct > 5) {
      score += 1.5;
      signals.push({ label: "5d gain", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct > 0) {
      score += 0.5;
      signals.push({ label: "5d gain", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct < -5) {
      score -= 1.5;
      signals.push({ label: "5d loss", value: `${pct.toFixed(1)}%`, positive: false });
    } else {
      score -= 0.25;
      signals.push({ label: "5d small dip", value: `${pct.toFixed(1)}%`, positive: false });
    }
  }

  if (twentyAgo) {
    const pct = ((last - twentyAgo) / twentyAgo) * 100;
    if (pct > 10) {
      score += 1.5;
      signals.push({ label: "20d strong rally", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct > 0) {
      score += 0.5;
      signals.push({ label: "20d gain", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct < -10) {
      score -= 1.5;
      signals.push({ label: "20d sharp decline", value: `${pct.toFixed(1)}%`, positive: false });
    }
  }

  if (hi52 != null && lo52 != null && hi52 > lo52) {
    const positionPct = ((last - lo52) / (hi52 - lo52)) * 100;
    if (positionPct > 80) {
      score += 0.5;
      signals.push({ label: "Near 52w high", value: `${positionPct.toFixed(0)}% of range`, positive: true });
    } else if (positionPct < 20) {
      score -= 0.5;
      signals.push({ label: "Near 52w low", value: `${positionPct.toFixed(0)}% of range`, positive: false });
    } else {
      signals.push({ label: "Mid 52w range", value: `${positionPct.toFixed(0)}% of range`, positive: null });
    }
  }

  return {
    name: "Momentum",
    score: clamp(score),
    weight: FACTOR_WEIGHTS.momentum,
    signals,
  };
}

// ===================== Factor: Value =====================

function scoreValue(pe: number | null, pbv: number | null): FactorScore {
  const signals: FactorScore["signals"] = [];
  let score = 5;

  if (pe == null && pbv == null) {
    return {
      name: "Value",
      score: 5,
      weight: FACTOR_WEIGHTS.value,
      signals: [{ label: "No fundamentals data", value: "—", positive: null }],
    };
  }

  if (pe != null) {
    if (pe <= 0) {
      score -= 1;
      signals.push({ label: "PE negative (loss-making)", value: pe.toFixed(1), positive: false });
    } else if (pe < 10) {
      score += 2;
      signals.push({ label: "PE very low", value: pe.toFixed(1), positive: true });
    } else if (pe < 15) {
      score += 1;
      signals.push({ label: "PE attractive", value: pe.toFixed(1), positive: true });
    } else if (pe < 25) {
      signals.push({ label: "PE fair", value: pe.toFixed(1), positive: null });
    } else if (pe < 40) {
      score -= 1;
      signals.push({ label: "PE rich", value: pe.toFixed(1), positive: false });
    } else {
      score -= 2;
      signals.push({ label: "PE very expensive", value: pe.toFixed(1), positive: false });
    }
  }

  if (pbv != null) {
    if (pbv < 1) {
      score += 1.5;
      signals.push({ label: "PBV below book value", value: pbv.toFixed(2), positive: true });
    } else if (pbv < 2) {
      score += 0.5;
      signals.push({ label: "PBV reasonable", value: pbv.toFixed(2), positive: true });
    } else if (pbv < 4) {
      signals.push({ label: "PBV fair", value: pbv.toFixed(2), positive: null });
    } else {
      score -= 1;
      signals.push({ label: "PBV premium", value: pbv.toFixed(2), positive: false });
    }
  }

  return {
    name: "Value",
    score: clamp(score),
    weight: FACTOR_WEIGHTS.value,
    signals,
  };
}

// ===================== Factor: Quality =====================

function scoreQuality(roe: number | null, profitMargin: number | null, currentRatio: number | null, der: number | null): FactorScore {
  const signals: FactorScore["signals"] = [];
  let score = 5;

  if (roe == null && profitMargin == null) {
    return {
      name: "Quality",
      score: 5,
      weight: FACTOR_WEIGHTS.quality,
      signals: [{ label: "No fundamentals data", value: "—", positive: null }],
    };
  }

  if (roe != null) {
    const roePct = roe * 100;
    if (roePct > 20) {
      score += 2;
      signals.push({ label: "ROE excellent", value: `${roePct.toFixed(1)}%`, positive: true });
    } else if (roePct > 15) {
      score += 1;
      signals.push({ label: "ROE strong", value: `${roePct.toFixed(1)}%`, positive: true });
    } else if (roePct > 8) {
      score += 0.5;
      signals.push({ label: "ROE OK", value: `${roePct.toFixed(1)}%`, positive: true });
    } else if (roePct > 0) {
      signals.push({ label: "ROE weak", value: `${roePct.toFixed(1)}%`, positive: false });
    } else {
      score -= 1.5;
      signals.push({ label: "ROE negative", value: `${roePct.toFixed(1)}%`, positive: false });
    }
  }

  if (profitMargin != null) {
    const pmPct = profitMargin * 100;
    if (pmPct > 15) {
      score += 1;
      signals.push({ label: "Net margin strong", value: `${pmPct.toFixed(1)}%`, positive: true });
    } else if (pmPct > 5) {
      score += 0.25;
      signals.push({ label: "Net margin OK", value: `${pmPct.toFixed(1)}%`, positive: true });
    } else if (pmPct < 0) {
      score -= 1;
      signals.push({ label: "Net margin negative", value: `${pmPct.toFixed(1)}%`, positive: false });
    }
  }

  if (der != null) {
    if (der < 0.5) {
      score += 0.5;
      signals.push({ label: "DER low (low leverage)", value: der.toFixed(2), positive: true });
    } else if (der > 2) {
      score -= 1;
      signals.push({ label: "DER high (over-leveraged)", value: der.toFixed(2), positive: false });
    }
  }

  if (currentRatio != null) {
    if (currentRatio > 2) {
      score += 0.25;
      signals.push({ label: "Current ratio strong", value: currentRatio.toFixed(2), positive: true });
    } else if (currentRatio < 1) {
      score -= 0.5;
      signals.push({ label: "Current ratio < 1 (liquidity risk)", value: currentRatio.toFixed(2), positive: false });
    }
  }

  return {
    name: "Quality",
    score: clamp(score),
    weight: FACTOR_WEIGHTS.quality,
    signals,
  };
}

// ===================== Factor: Growth =====================

function scoreGrowth(revenueGrowth: number | null, earningsGrowth: number | null): FactorScore {
  const signals: FactorScore["signals"] = [];
  let score = 5;

  if (revenueGrowth == null && earningsGrowth == null) {
    return {
      name: "Growth",
      score: 5,
      weight: FACTOR_WEIGHTS.growth,
      signals: [{ label: "No growth data", value: "—", positive: null }],
    };
  }

  if (revenueGrowth != null) {
    const pct = revenueGrowth * 100;
    if (pct > 25) {
      score += 2;
      signals.push({ label: "Revenue rocket growth", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct > 15) {
      score += 1.5;
      signals.push({ label: "Revenue strong growth", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct > 5) {
      score += 0.5;
      signals.push({ label: "Revenue moderate growth", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct > 0) {
      signals.push({ label: "Revenue slow growth", value: `+${pct.toFixed(1)}%`, positive: null });
    } else {
      score -= 1.5;
      signals.push({ label: "Revenue contraction", value: `${pct.toFixed(1)}%`, positive: false });
    }
  }

  if (earningsGrowth != null) {
    const pct = earningsGrowth * 100;
    if (pct > 30) {
      score += 1.5;
      signals.push({ label: "Earnings rocket", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct > 10) {
      score += 0.75;
      signals.push({ label: "Earnings growing", value: `+${pct.toFixed(1)}%`, positive: true });
    } else if (pct < -20) {
      score -= 2;
      signals.push({ label: "Earnings collapse", value: `${pct.toFixed(1)}%`, positive: false });
    } else if (pct < 0) {
      score -= 1;
      signals.push({ label: "Earnings declining", value: `${pct.toFixed(1)}%`, positive: false });
    }
  }

  return {
    name: "Growth",
    score: clamp(score),
    weight: FACTOR_WEIGHTS.growth,
    signals,
  };
}

// ===================== Factor: News Sentiment =====================

async function scoreSentiment(kode: string): Promise<FactorScore> {
  const signals: FactorScore["signals"] = [];
  let score = 5;

  const since = new Date(Date.now() - 30 * 86400 * 1000);
  const rows = await db
    .select({
      sentiment: newsArticles.sentiment,
      score: newsArticles.sentimentScore,
    })
    .from(newsArticleTickers)
    .innerJoin(newsArticles, eq(newsArticles.id, newsArticleTickers.articleId))
    .where(
      and(
        eq(newsArticleTickers.companyKode, kode),
        gte(newsArticles.publishedAt, since),
      ),
    )
    .limit(50);

  if (rows.length === 0) {
    return {
      name: "News Sentiment",
      score: 5,
      weight: FACTOR_WEIGHTS.sentiment,
      signals: [{ label: "No recent news", value: "0 articles 30d", positive: null }],
    };
  }

  const scored = rows.filter((r) => r.score != null);
  if (scored.length === 0) {
    return {
      name: "News Sentiment",
      score: 5,
      weight: FACTOR_WEIGHTS.sentiment,
      signals: [{ label: "News not yet scored", value: `${rows.length} articles 30d`, positive: null }],
    };
  }

  const avg = scored.reduce((a, b) => a + Number(b.score), 0) / scored.length;
  const bullish = rows.filter((r) => r.sentiment === "bullish").length;
  const bearish = rows.filter((r) => r.sentiment === "bearish").length;

  // avg score [-1, 1] → contribution to score
  score += avg * 4; // ±1 → ±4 points

  signals.push({
    label: "Avg sentiment 30d",
    value: `${avg >= 0 ? "+" : ""}${avg.toFixed(2)}`,
    positive: avg > 0,
  });
  signals.push({
    label: "Article distribution",
    value: `${bullish} bullish / ${bearish} bearish / ${rows.length - bullish - bearish} neutral`,
    positive: bullish > bearish ? true : bearish > bullish ? false : null,
  });
  signals.push({
    label: "Coverage",
    value: `${rows.length} articles 30d`,
    positive: rows.length >= 5 ? true : null,
  });

  return {
    name: "News Sentiment",
    score: clamp(score),
    weight: FACTOR_WEIGHTS.sentiment,
    signals,
  };
}

// ===================== Main Compute =====================

export async function computeVerdict(kode: string): Promise<VerdictResult | null> {
  const k = kode.toUpperCase();
  const warnings: string[] = [];

  // 1. Fetch latest 250 EOD bars (1 trading year).
  const bars = await db
    .select({
      close: quotesEod.close,
      tradeDate: quotesEod.tradeDate,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, k))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(250);

  // 2. Fetch fundamentals.
  const [fund] = await db
    .select()
    .from(companyFundamentals)
    .where(eq(companyFundamentals.companyKode, k))
    .limit(1);

  if (bars.length === 0 && !fund) {
    return null;
  }

  // Reverse to chronological for indicators
  const closes = bars.slice().reverse().map((b) => Number(b.close));

  if (closes.length < 50) warnings.push(`Only ${closes.length} EOD bars available`);
  if (!fund) warnings.push("No fundamentals snapshot");

  const hi52 = fund?.fiftyTwoWeekHigh ? Number(fund.fiftyTwoWeekHigh) : null;
  const lo52 = fund?.fiftyTwoWeekLow ? Number(fund.fiftyTwoWeekLow) : null;

  const technical = scoreTechnical(closes);
  const momentum = scoreMomentum(closes, hi52, lo52);
  const value = scoreValue(
    fund?.peRatioTrailing ? Number(fund.peRatioTrailing) : null,
    fund?.pbvRatio ? Number(fund.pbvRatio) : null,
  );
  const quality = scoreQuality(
    fund?.roe ? Number(fund.roe) : null,
    fund?.profitMargin ? Number(fund.profitMargin) : null,
    fund?.currentRatio ? Number(fund.currentRatio) : null,
    fund?.debtToEquity ? Number(fund.debtToEquity) : null,
  );
  const growth = scoreGrowth(
    fund?.revenueGrowthYoy ? Number(fund.revenueGrowthYoy) : null,
    fund?.earningsGrowthYoy ? Number(fund.earningsGrowthYoy) : null,
  );
  const sentiment = await scoreSentiment(k);

  const factors: FactorScore[] = [technical, momentum, value, quality, growth, sentiment];

  const overallScore =
    factors.reduce((acc, f) => acc + f.score * f.weight, 0) /
    factors.reduce((acc, f) => acc + f.weight, 0);

  const overall = Math.round(overallScore * 10) / 10;

  return {
    kode: k,
    overallScore: overall,
    label: labelFor(overall),
    factors,
    asOf: new Date(),
    warnings,
  };
}
