import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companyFundamentals } from "@/db/schema/fundamentals";

/**
 * Two-Stage DCF (Discounted Cash Flow) calculator untuk equity valuation.
 *
 * Formula:
 *   PV(FCFn) = Σ FCFn / (1 + r)^n     for n = 1..N (high-growth phase)
 *   Terminal Value = FCF_N × (1 + g_term) / (r - g_term)
 *   PV(TV) = TV / (1 + r)^N
 *   Equity Value = Σ PV(FCFn) + PV(TV)
 *   Intrinsic Value/Share = Equity Value / Shares Outstanding
 *
 * Default inputs:
 *   - Initial FCF = Earnings × (1 - payout ratio if available) ELSE EPS × shares × 0.85
 *     (loose proxy — sebenarnya butuh data CapEx + ΔWC, tapi MVP cukup ini)
 *   - Growth rate years 1-5 = revenueGrowthYoy ATAU earningsGrowthYoy (cap 25%)
 *   - Terminal growth = 4% (Indonesia long-run GDP-ish nominal)
 *   - Discount rate (CAPM): risk-free (8% IDR) + beta × equity premium (5%)
 *
 * Sensitivity table: 5×5 grid (discount rate vs growth rate).
 * Margin of safety: (intrinsic - current) / current × 100.
 *
 * Caveats:
 *   - DCF sangat sensitif terhadap input — outputnya RANGE, bukan precision number.
 *   - Cocok untuk emiten dengan FCF positif stabil (mature business).
 *   - Banks/insurer DCF kurang akurat → pakai DDM (Dividend Discount Model) sebagai cross-check.
 */

export interface DCFInputs {
  initialFcfIdr: number; // Starting FCF (year 0)
  growthRateY1to5: number; // 0-1 (15% = 0.15)
  growthRateY6to10: number; // 0-1, biasanya half of Y1-5
  terminalGrowthRate: number; // 0-1, max 5%
  discountRate: number; // 0-1 (WACC / Cost of equity)
  sharesOutstanding: number;
  currentPrice: number;
  marketCapIdr: number;
}

export interface DCFResult {
  inputs: DCFInputs;
  projectedFcf: number[]; // 10 years
  presentValues: number[]; // 10 years discounted
  terminalValue: number;
  terminalPv: number;
  enterpriseValue: number;
  intrinsicValuePerShare: number;
  currentPrice: number;
  marginOfSafetyPct: number;
  recommendation: "deeply_undervalued" | "undervalued" | "fair" | "overvalued" | "deeply_overvalued";
  sensitivity: {
    discountRates: number[];
    growthRates: number[];
    matrix: number[][]; // [discountRate][growthRate] = intrinsic value/share
  };
  warnings: string[];
}

const DEFAULT_TERMINAL_GROWTH = 0.04;
const DEFAULT_RISK_FREE_IDR = 0.065; // SBN 10Y proxy
const DEFAULT_EQUITY_PREMIUM = 0.055; // Indonesia ERP
const DEFAULT_BETA = 1.0;

function computeProjected(inputs: DCFInputs): { fcf: number[]; pv: number[]; terminalValue: number; terminalPv: number } {
  const fcf: number[] = [];
  const pv: number[] = [];
  let currentFcf = inputs.initialFcfIdr;

  for (let year = 1; year <= 10; year += 1) {
    const growth = year <= 5 ? inputs.growthRateY1to5 : inputs.growthRateY6to10;
    currentFcf = currentFcf * (1 + growth);
    fcf.push(currentFcf);
    const pvFcf = currentFcf / Math.pow(1 + inputs.discountRate, year);
    pv.push(pvFcf);
  }

  // Terminal value at year 10
  const lastFcf = fcf[fcf.length - 1]!;
  let terminalValue = 0;
  let terminalPv = 0;
  if (inputs.discountRate > inputs.terminalGrowthRate) {
    terminalValue = (lastFcf * (1 + inputs.terminalGrowthRate)) / (inputs.discountRate - inputs.terminalGrowthRate);
    terminalPv = terminalValue / Math.pow(1 + inputs.discountRate, 10);
  }

  return { fcf, pv, terminalValue, terminalPv };
}

function classify(marginPct: number): DCFResult["recommendation"] {
  if (marginPct > 40) return "deeply_undervalued";
  if (marginPct > 15) return "undervalued";
  if (marginPct > -15) return "fair";
  if (marginPct > -40) return "overvalued";
  return "deeply_overvalued";
}

export function runDCF(inputs: DCFInputs): DCFResult {
  const warnings: string[] = [];
  if (inputs.discountRate <= inputs.terminalGrowthRate) {
    warnings.push("Discount rate harus > terminal growth rate. Terminal value tidak terhitung.");
  }
  if (inputs.initialFcfIdr <= 0) {
    warnings.push("Initial FCF negatif/nol — DCF tidak applicable untuk loss-making business.");
  }
  if (inputs.growthRateY1to5 > 0.30) {
    warnings.push("Growth rate > 30% sangat agresif — sanity check biasanya cap 25%.");
  }
  if (inputs.terminalGrowthRate > 0.05) {
    warnings.push("Terminal growth > 5% melampaui long-run GDP nominal Indonesia.");
  }

  const { fcf, pv, terminalValue, terminalPv } = computeProjected(inputs);
  const enterpriseValue = pv.reduce((a, b) => a + b, 0) + terminalPv;
  const intrinsicPerShare = inputs.sharesOutstanding > 0 ? enterpriseValue / inputs.sharesOutstanding : 0;
  const marginPct = inputs.currentPrice > 0 ? ((intrinsicPerShare - inputs.currentPrice) / inputs.currentPrice) * 100 : 0;

  // Sensitivity grid: 5 discount rates × 5 growth rates
  const discountRates = [
    Math.max(inputs.discountRate - 0.04, 0.05),
    Math.max(inputs.discountRate - 0.02, 0.05),
    inputs.discountRate,
    inputs.discountRate + 0.02,
    inputs.discountRate + 0.04,
  ];
  const growthRates = [
    Math.max(inputs.growthRateY1to5 - 0.10, 0),
    Math.max(inputs.growthRateY1to5 - 0.05, 0),
    inputs.growthRateY1to5,
    inputs.growthRateY1to5 + 0.05,
    inputs.growthRateY1to5 + 0.10,
  ];
  const matrix: number[][] = [];
  for (const d of discountRates) {
    const row: number[] = [];
    for (const g of growthRates) {
      const sub = computeProjected({
        ...inputs,
        discountRate: d,
        growthRateY1to5: g,
        growthRateY6to10: g / 2,
      });
      const ev = sub.pv.reduce((a, b) => a + b, 0) + sub.terminalPv;
      const ips = inputs.sharesOutstanding > 0 ? ev / inputs.sharesOutstanding : 0;
      row.push(ips);
    }
    matrix.push(row);
  }

  return {
    inputs,
    projectedFcf: fcf,
    presentValues: pv,
    terminalValue,
    terminalPv,
    enterpriseValue,
    intrinsicValuePerShare: intrinsicPerShare,
    currentPrice: inputs.currentPrice,
    marginOfSafetyPct: marginPct,
    recommendation: classify(marginPct),
    sensitivity: { discountRates, growthRates, matrix },
    warnings,
  };
}

/**
 * Auto-build default inputs dari company_fundamentals.
 * Caller bisa override via UI form.
 */
export async function buildDefaultDcfInputs(kode: string, currentPrice: number): Promise<DCFInputs | null> {
  const [fund] = await db
    .select()
    .from(companyFundamentals)
    .where(eq(companyFundamentals.companyKode, kode.toUpperCase()))
    .limit(1);

  if (!fund) return null;

  const shares = fund.sharesOutstanding ? Number(fund.sharesOutstanding) : 0;
  const marketCap = fund.marketCapIdr ? Number(fund.marketCapIdr) : currentPrice * shares;
  const eps = fund.eps ? Number(fund.eps) : null;
  const beta = fund.beta ? Number(fund.beta) : DEFAULT_BETA;
  const revGrowth = fund.revenueGrowthYoy ? Number(fund.revenueGrowthYoy) : null;
  const earnGrowth = fund.earningsGrowthYoy ? Number(fund.earningsGrowthYoy) : null;
  const payoutRatio = fund.payoutRatio ? Number(fund.payoutRatio) : null;

  // Initial FCF proxy:
  //   - Kalau EPS positif, FCF ≈ Net Income × (1 - payout ratio) × shares (retained for reinvest)
  //     ditambah dividend (mereka share value-nya juga)
  //     Simplification: pakai NI = EPS × shares
  //   - Default: 70% of net income retained sebagai FCF (very rough)
  let initialFcf = 0;
  if (eps != null && eps > 0 && shares > 0) {
    const netIncome = eps * shares;
    const retentionRatio = payoutRatio != null && payoutRatio > 0 ? Math.max(0, 1 - payoutRatio) : 0.7;
    // FCF ≈ Net Income (proxy karena CapEx data tidak lengkap)
    initialFcf = netIncome;
    void retentionRatio; // future: tighter formula
  }

  // Growth: prefer revenueGrowthYoy, fallback earningsGrowthYoy, cap 25%
  let growthY1to5 = 0.10; // default conservative
  if (revGrowth != null) growthY1to5 = revGrowth;
  else if (earnGrowth != null) growthY1to5 = earnGrowth;
  growthY1to5 = Math.max(0, Math.min(0.25, growthY1to5));

  // CAPM cost of equity
  const discountRate = DEFAULT_RISK_FREE_IDR + beta * DEFAULT_EQUITY_PREMIUM;

  return {
    initialFcfIdr: initialFcf,
    growthRateY1to5: growthY1to5,
    growthRateY6to10: growthY1to5 / 2,
    terminalGrowthRate: DEFAULT_TERMINAL_GROWTH,
    discountRate,
    sharesOutstanding: shares,
    currentPrice,
    marketCapIdr: marketCap,
  };
}

export const RECOMMENDATION_META = {
  deeply_undervalued: { label: "Deeply Undervalued", color: "bg-bull text-white", description: "Margin of safety > 40%. DCF estimate jauh di atas harga pasar." },
  undervalued: { label: "Undervalued", color: "bg-bull/85 text-white", description: "Margin of safety 15-40%. Pasar mungkin under-price asset." },
  fair: { label: "Fair Value", color: "bg-yellow-500 text-white", description: "Harga pasar ±15% dari intrinsic value. Tidak ada edge signifikan dari valuasi." },
  overvalued: { label: "Overvalued", color: "bg-orange-500 text-white", description: "Harga di atas DCF estimate 15-40%. Sentimen bullish atau growth premium." },
  deeply_overvalued: { label: "Deeply Overvalued", color: "bg-bear text-white", description: "Harga di atas DCF > 40%. Risiko correction tinggi." },
} as const;
