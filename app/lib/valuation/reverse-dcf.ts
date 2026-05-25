import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companyFundamentals } from "@/db/schema/fundamentals";

/**
 * Reverse DCF — solve for growth rate yang implied oleh harga sekarang.
 *
 * "Apa ekspektasi growth yang pasar implikasikan dari current market cap?"
 *
 * Algorithm:
 *   - Given: marketCap, current FCF (proxy: NI), discount rate, terminal growth
 *   - Solve: g (stage 1 growth) such that PV(FCFs) + PV(TV) = marketCap
 *
 * Binary search method karena equation non-linear.
 *
 * Use case: kalau "implied growth" > 20%, market expects aggressive growth — bisa overvalued.
 * Kalau < 5%, market pricing pesimis — bisa undervalued.
 */

export interface ReverseDCFInputs {
  marketCapIdr: number;
  initialFcfIdr: number;
  terminalGrowth: number;
  discountRate: number;
  projectionYears: number; // typically 10
}

export interface ReverseDCFResult {
  inputs: ReverseDCFInputs;
  impliedGrowthY1to5: number; // The solved growth rate
  interpretation: "very_pessimistic" | "pessimistic" | "fair" | "optimistic" | "very_optimistic";
  comment: string;
  iterations: number;
  warnings: string[];
}

function computeNPV(opts: { initialFcf: number; growth: number; terminalGrowth: number; discountRate: number; years: number }): number {
  let pv = 0;
  let fcf = opts.initialFcf;
  for (let year = 1; year <= opts.years; year += 1) {
    fcf = fcf * (1 + opts.growth);
    pv += fcf / Math.pow(1 + opts.discountRate, year);
  }
  // Terminal value
  if (opts.discountRate > opts.terminalGrowth) {
    const tv = (fcf * (1 + opts.terminalGrowth)) / (opts.discountRate - opts.terminalGrowth);
    pv += tv / Math.pow(1 + opts.discountRate, opts.years);
  }
  return pv;
}

export function runReverseDCF(inputs: ReverseDCFInputs): ReverseDCFResult {
  const warnings: string[] = [];

  if (inputs.initialFcfIdr <= 0) {
    warnings.push("Initial FCF ≤ 0 — Reverse DCF tidak applicable.");
    return {
      inputs,
      impliedGrowthY1to5: 0,
      interpretation: "fair",
      comment: "Tidak applicable untuk loss-making business.",
      iterations: 0,
      warnings,
    };
  }

  // Binary search untuk g yang membuat NPV = marketCap
  let lo = -0.10; // -10% (extreme decline)
  let hi = 0.50; // 50% (extreme growth)
  let iterations = 0;
  const targetNPV = inputs.marketCapIdr;
  const tolerance = inputs.marketCapIdr * 0.005; // 0.5%

  let solvedG = 0;
  while (lo <= hi && iterations < 100) {
    const mid = (lo + hi) / 2;
    const npv = computeNPV({
      initialFcf: inputs.initialFcfIdr,
      growth: mid,
      terminalGrowth: inputs.terminalGrowth,
      discountRate: inputs.discountRate,
      years: inputs.projectionYears,
    });
    if (Math.abs(npv - targetNPV) <= tolerance) {
      solvedG = mid;
      break;
    }
    if (npv < targetNPV) {
      lo = mid + 0.001;
    } else {
      hi = mid - 0.001;
    }
    solvedG = mid;
    iterations += 1;
  }

  // Interpretation
  let interpretation: ReverseDCFResult["interpretation"];
  let comment: string;
  if (solvedG < 0.02) {
    interpretation = "very_pessimistic";
    comment = `Market expects growth ${(solvedG * 100).toFixed(1)}%/yr — sangat rendah. Bisa undervalued kalau perusahaan bisa growth lebih tinggi.`;
  } else if (solvedG < 0.08) {
    interpretation = "pessimistic";
    comment = `Market expects ${(solvedG * 100).toFixed(1)}%/yr growth — di bawah Indonesia GDP nominal. Mungkin undervalued atau mature business.`;
  } else if (solvedG < 0.15) {
    interpretation = "fair";
    comment = `Market expects ${(solvedG * 100).toFixed(1)}%/yr growth — sejalan dengan ekspektasi market average untuk growth business.`;
  } else if (solvedG < 0.25) {
    interpretation = "optimistic";
    comment = `Market pricing in growth tinggi ${(solvedG * 100).toFixed(1)}%/yr — premium valuation, perlu validasi growth thesis.`;
  } else {
    interpretation = "very_optimistic";
    comment = `Market expects ${(solvedG * 100).toFixed(1)}%/yr growth — sangat agresif. Risk premium tinggi kalau growth gagal.`;
  }

  return {
    inputs,
    impliedGrowthY1to5: solvedG,
    interpretation,
    comment,
    iterations,
    warnings,
  };
}

export async function buildReverseDcfInputs(kode: string): Promise<ReverseDCFInputs | null> {
  const [fund] = await db
    .select()
    .from(companyFundamentals)
    .where(eq(companyFundamentals.companyKode, kode.toUpperCase()))
    .limit(1);

  if (!fund) return null;

  const marketCap = fund.marketCapIdr ? Number(fund.marketCapIdr) : 0;
  const shares = fund.sharesOutstanding ? Number(fund.sharesOutstanding) : 0;
  const eps = fund.eps ? Number(fund.eps) : null;
  const beta = fund.beta ? Number(fund.beta) : 1.0;

  if (marketCap <= 0 || shares <= 0 || eps == null || eps <= 0) return null;

  const initialFcf = eps * shares; // Net income proxy

  return {
    marketCapIdr: marketCap,
    initialFcfIdr: initialFcf,
    terminalGrowth: 0.04,
    discountRate: 0.065 + beta * 0.055,
    projectionYears: 10,
  };
}
