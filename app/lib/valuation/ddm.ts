import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companyFundamentals } from "@/db/schema/fundamentals";

/**
 * Dividend Discount Model (DDM).
 *
 * 2 mode:
 *   - Gordon Growth (single-stage constant): IV = D1 / (r - g)
 *   - 2-Stage: hyper-growth N tahun → terminal Gordon Growth perpetual
 *
 * Cocok untuk: banks, utilities, REIT, mature dividend payer.
 * Kurang akurat untuk: growth stocks (no dividend), cyclical.
 *
 * Default assumptions:
 *   - g (terminal growth): 4% (Indonesia long-run GDP-ish)
 *   - r (cost of equity via CAPM): risk-free (6.5% IDR) + beta × 5.5%
 *   - High-growth duration: 5 tahun
 */

export interface DDMInputs {
  /** Current dividend per share (TTM atau forward) */
  currentDps: number;
  /** Growth rate stage 1 (1-5 tahun) */
  growthStage1: number;
  /** Growth rate terminal */
  terminalGrowth: number;
  /** Cost of equity (discount rate) */
  costOfEquity: number;
  /** Durasi stage 1 (default 5 tahun) */
  stage1Years: number;
  currentPrice: number;
}

export interface DDMResult {
  inputs: DDMInputs;
  projectedDividends: number[]; // Stage 1 dividends
  terminalValue: number;
  terminalPv: number;
  totalIntrinsicValue: number;
  marginOfSafetyPct: number;
  recommendation: "deeply_undervalued" | "undervalued" | "fair" | "overvalued" | "deeply_overvalued";
  applicability: "high" | "medium" | "low";
  warnings: string[];
}

const DEFAULT_TERMINAL_GROWTH = 0.04;
const DEFAULT_RISK_FREE_IDR = 0.065;
const DEFAULT_EQUITY_PREMIUM = 0.055;
const DEFAULT_BETA = 1.0;

export function runDDM(inputs: DDMInputs): DDMResult {
  const warnings: string[] = [];

  if (inputs.currentDps <= 0) {
    warnings.push("DPS ≤ 0 — DDM tidak applicable (perusahaan tidak bayar dividen).");
  }
  if (inputs.costOfEquity <= inputs.terminalGrowth) {
    warnings.push("Cost of equity harus > terminal growth. Terminal value tak terhingga / negatif.");
  }
  if (inputs.growthStage1 > 0.25) {
    warnings.push("Stage 1 growth > 25% sangat agresif — sanity check.");
  }

  // Project stage 1 dividends
  const projectedDividends: number[] = [];
  let currentD = inputs.currentDps;
  for (let year = 1; year <= inputs.stage1Years; year += 1) {
    currentD = currentD * (1 + inputs.growthStage1);
    projectedDividends.push(currentD);
  }

  // Terminal value at end of stage 1
  const lastD = projectedDividends[projectedDividends.length - 1] ?? inputs.currentDps;
  const terminalDps = lastD * (1 + inputs.terminalGrowth);
  let terminalValue = 0;
  let terminalPv = 0;
  if (inputs.costOfEquity > inputs.terminalGrowth) {
    terminalValue = terminalDps / (inputs.costOfEquity - inputs.terminalGrowth);
    terminalPv = terminalValue / Math.pow(1 + inputs.costOfEquity, inputs.stage1Years);
  }

  // PV of stage 1 dividends
  const dividendsPv = projectedDividends.reduce(
    (acc, d, idx) => acc + d / Math.pow(1 + inputs.costOfEquity, idx + 1),
    0,
  );

  const totalIV = dividendsPv + terminalPv;
  const marginPct = inputs.currentPrice > 0 ? ((totalIV - inputs.currentPrice) / inputs.currentPrice) * 100 : 0;

  // Applicability based on dividend yield baseline
  const yieldPct = (inputs.currentDps / Math.max(inputs.currentPrice, 0.01)) * 100;
  const applicability: DDMResult["applicability"] =
    yieldPct > 4 ? "high" : yieldPct > 2 ? "medium" : "low";

  return {
    inputs,
    projectedDividends,
    terminalValue,
    terminalPv,
    totalIntrinsicValue: totalIV,
    marginOfSafetyPct: marginPct,
    recommendation: classifyMargin(marginPct),
    applicability,
    warnings,
  };
}

function classifyMargin(pct: number): DDMResult["recommendation"] {
  if (pct > 40) return "deeply_undervalued";
  if (pct > 15) return "undervalued";
  if (pct > -15) return "fair";
  if (pct > -40) return "overvalued";
  return "deeply_overvalued";
}

export async function buildDefaultDdmInputs(kode: string, currentPrice: number): Promise<DDMInputs | null> {
  const [fund] = await db
    .select()
    .from(companyFundamentals)
    .where(eq(companyFundamentals.companyKode, kode.toUpperCase()))
    .limit(1);

  if (!fund) return null;

  const currentDps = fund.dividendPerShareTtm ? Number(fund.dividendPerShareTtm) : 0;
  if (currentDps <= 0) return null; // Skip — not a dividend payer

  const beta = fund.beta ? Number(fund.beta) : DEFAULT_BETA;
  const earningsGrowth = fund.earningsGrowthYoy ? Number(fund.earningsGrowthYoy) : null;
  // Stage 1 growth = min(earnings growth, 12%) — conservative cap
  const growthStage1 = earningsGrowth != null ? Math.max(0, Math.min(0.12, earningsGrowth)) : 0.06;

  return {
    currentDps,
    growthStage1,
    terminalGrowth: DEFAULT_TERMINAL_GROWTH,
    costOfEquity: DEFAULT_RISK_FREE_IDR + beta * DEFAULT_EQUITY_PREMIUM,
    stage1Years: 5,
    currentPrice,
  };
}
