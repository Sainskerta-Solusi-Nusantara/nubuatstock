import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companyFundamentals } from "@/db/schema/fundamentals";

/**
 * Quick valuation heuristics — Graham Number & Lynch Fair Value.
 *
 * Both are simple, fast estimates yang work well sebagai sanity check
 * untuk validate DCF/DDM hasil yang kompleks.
 *
 * ## Graham Number (Benjamin Graham, Intelligent Investor)
 *   IV = sqrt(22.5 × EPS × BVPS)
 *   - 22.5 = max PE 15 × max PBV 1.5 (Graham's "absolute ceiling" combination)
 *   - Cocok untuk: mature, profitable companies
 *   - Kurang akurat untuk: high-growth (Graham was value-focused)
 *
 * ## Lynch Fair Value (Peter Lynch, One Up On Wall Street)
 *   IV = EPS × growth_rate_pct
 *   - Atau: Fair PE = growth rate (PEG = 1 ideal)
 *   - Cocok untuk: growth companies dengan stable growth track record
 *   - Cap growth rate at 25% (very high growth ridiculous PEs)
 */

export interface GrahamNumberResult {
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafetyPct: number;
  recommendation: "deeply_undervalued" | "undervalued" | "fair" | "overvalued" | "deeply_overvalued";
  applicable: boolean;
  formula: string;
  caveats: string[];
}

export interface LynchFairValueResult {
  intrinsicValue: number;
  currentPrice: number;
  fairPE: number;
  currentPE: number | null;
  pegRatio: number | null;
  marginOfSafetyPct: number;
  recommendation: "deeply_undervalued" | "undervalued" | "fair" | "overvalued" | "deeply_overvalued";
  interpretation: string;
  caveats: string[];
}

function classifyMargin(pct: number) {
  if (pct > 40) return "deeply_undervalued" as const;
  if (pct > 15) return "undervalued" as const;
  if (pct > -15) return "fair" as const;
  if (pct > -40) return "overvalued" as const;
  return "deeply_overvalued" as const;
}

export function runGrahamNumber(opts: { eps: number; bvps: number; currentPrice: number }): GrahamNumberResult {
  const caveats: string[] = [];

  if (opts.eps <= 0) {
    caveats.push("EPS ≤ 0 — Graham Number tidak applicable untuk loss-making business.");
    return {
      intrinsicValue: 0,
      currentPrice: opts.currentPrice,
      marginOfSafetyPct: 0,
      recommendation: "fair",
      applicable: false,
      formula: "IV = √(22.5 × EPS × BVPS)",
      caveats,
    };
  }
  if (opts.bvps <= 0) {
    caveats.push("BVPS ≤ 0 — equity negatif, tidak applicable.");
    return {
      intrinsicValue: 0,
      currentPrice: opts.currentPrice,
      marginOfSafetyPct: 0,
      recommendation: "fair",
      applicable: false,
      formula: "IV = √(22.5 × EPS × BVPS)",
      caveats,
    };
  }

  const iv = Math.sqrt(22.5 * opts.eps * opts.bvps);
  const marginPct = opts.currentPrice > 0 ? ((iv - opts.currentPrice) / opts.currentPrice) * 100 : 0;

  caveats.push("Graham menggunakan max PE 15 × max PBV 1.5 sebagai 'absolute ceiling' value investing klasik.");
  caveats.push("Kurang akurat untuk high-growth atau intangible-heavy business (asset-light tech).");

  return {
    intrinsicValue: iv,
    currentPrice: opts.currentPrice,
    marginOfSafetyPct: marginPct,
    recommendation: classifyMargin(marginPct),
    applicable: true,
    formula: `IV = √(22.5 × ${opts.eps.toFixed(0)} × ${opts.bvps.toFixed(0)}) = ${iv.toFixed(0)}`,
    caveats,
  };
}

export function runLynchFairValue(opts: { eps: number; growthRate: number; currentPrice: number }): LynchFairValueResult {
  const caveats: string[] = [];
  const cappedGrowth = Math.max(0, Math.min(0.25, opts.growthRate));
  const cappedGrowthPct = cappedGrowth * 100;
  // Lynch: Fair PE = growth rate (PEG = 1)
  const fairPE = cappedGrowthPct;
  const iv = opts.eps * fairPE;
  const currentPE = opts.eps > 0 && opts.currentPrice > 0 ? opts.currentPrice / opts.eps : null;
  const pegRatio = currentPE != null && cappedGrowthPct > 0 ? currentPE / cappedGrowthPct : null;
  const marginPct = opts.currentPrice > 0 ? ((iv - opts.currentPrice) / opts.currentPrice) * 100 : 0;

  let interpretation = "";
  if (pegRatio != null) {
    if (pegRatio < 0.5) interpretation = `PEG ${pegRatio.toFixed(2)} — significantly undervalued relative to growth (Lynch favorite zone).`;
    else if (pegRatio < 1.0) interpretation = `PEG ${pegRatio.toFixed(2)} — undervalued, growth not fully priced in.`;
    else if (pegRatio < 1.5) interpretation = `PEG ${pegRatio.toFixed(2)} — fair value, growth roughly priced in.`;
    else if (pegRatio < 2.5) interpretation = `PEG ${pegRatio.toFixed(2)} — premium, market pricing extra growth optimism.`;
    else interpretation = `PEG ${pegRatio.toFixed(2)} — sangat mahal vs growth, growth thesis butuh extreme delivery.`;
  } else {
    interpretation = "Tidak bisa hitung PEG karena EPS atau growth invalid.";
  }

  caveats.push("Lynch fair PE = growth rate (PEG = 1). Cap growth 25% untuk avoid extreme PE.");
  if (opts.growthRate > 0.25) {
    caveats.push(`Growth ${(opts.growthRate * 100).toFixed(1)}% di-cap ke 25% untuk sanity.`);
  }
  caveats.push("Kurang akurat untuk cyclical atau perusahaan dengan growth fluktuatif.");

  return {
    intrinsicValue: iv,
    currentPrice: opts.currentPrice,
    fairPE,
    currentPE,
    pegRatio,
    marginOfSafetyPct: marginPct,
    recommendation: classifyMargin(marginPct),
    interpretation,
    caveats,
  };
}

export async function buildHeuristicsInputs(kode: string, currentPrice: number) {
  const [fund] = await db
    .select()
    .from(companyFundamentals)
    .where(eq(companyFundamentals.companyKode, kode.toUpperCase()))
    .limit(1);

  if (!fund) return null;

  const eps = fund.eps ? Number(fund.eps) : null;
  const bvps = fund.bookValuePerShare ? Number(fund.bookValuePerShare) : null;
  const earningsGrowth = fund.earningsGrowthYoy ? Number(fund.earningsGrowthYoy) : null;
  const revenueGrowth = fund.revenueGrowthYoy ? Number(fund.revenueGrowthYoy) : null;
  const growthRate = earningsGrowth ?? revenueGrowth ?? 0.05;

  return {
    eps: eps ?? 0,
    bvps: bvps ?? 0,
    growthRate,
    currentPrice,
  };
}
