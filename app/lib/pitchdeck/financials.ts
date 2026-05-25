/**
 * Pitchdeck financials — user scaling, OPEX breakdown, MRR/ARR projections,
 * funding rounds, unit economics.
 *
 * Sumber asumsi:
 * - Salary range Jakarta 2026 (Glassdoor + LinkedIn benchmark)
 * - Cloud pricing actual Neon/Upstash/Cloudflare published rates
 * - DeepSeek pricing: $0.27/M input, $1.10/M output (cache hit $0.07/M)
 * - IDX vendor pricing: Rp 5-20jt/bulan (range publik untuk reseller)
 * - Industri benchmark: SaaS B2C 5% paid conversion, 95% free, 25% benefit on salary
 *
 * Angka HANYA estimasi untuk planning. Real numbers tergantung kondisi pasar,
 * negosiasi vendor, team composition, dan customer acquisition cost actual.
 */

const USD_IDR = 16_500;

export interface UserScale {
  label: string;
  totalUsers: number;
  freeUsers: number;
  starterUsers: number;
  proUsers: number;
  eliteUsers: number;
  institutionalUsers: number;
}

export interface OpexBreakdown {
  // Infrastructure
  databaseUsd: number;
  redisUsd: number;
  hostingUsd: number;
  cdnUsd: number;
  aiInferenceUsd: number;
  vendorDataUsd: number;
  emailUsd: number;
  observabilityUsd: number;
  miscInfraUsd: number;
  // People
  engineeringIdr: number;
  productDesignIdr: number;
  dataAnalystIdr: number;
  customerSuccessIdr: number;
  marketingTeamIdr: number;
  opsFinanceIdr: number;
  complianceIdr: number;
  leadershipIdr: number;
  // GTM & overhead
  marketingSpendIdr: number;
  officeAdminIdr: number;
  legalAccountingIdr: number;
  benefitMultiplier: number; // multiplier untuk salary (BPJS, THR, bonus)
}

// Tier pricing (must match seed/tiers.ts)
const TIER_PRICE = {
  starter: 99_000,
  pro: 299_000,
  elite: 899_000,
  institutional: 25_000_000,
};

// Conversion mix at scale (industri SaaS B2C benchmark)
// 95% free, 4% Starter, 0.8% Pro, 0.2% Elite (+institutional separate)
function distributeUsers(total: number, instCount = 0): UserScale {
  const paid = Math.floor(total * 0.05);
  const free = total - paid;
  const starter = Math.floor(paid * 0.8);
  const pro = Math.floor(paid * 0.16);
  const elite = paid - starter - pro;
  return {
    label: total >= 1_000_000 ? `${(total / 1_000_000).toFixed(0)}M` : `${(total / 1_000).toFixed(0)}K`,
    totalUsers: total,
    freeUsers: free,
    starterUsers: starter,
    proUsers: pro,
    eliteUsers: elite,
    institutionalUsers: instCount,
  };
}

export const USER_SCALES: UserScale[] = [
  distributeUsers(1_000),
  distributeUsers(5_000),
  distributeUsers(10_000),
  distributeUsers(50_000, 2),
  distributeUsers(100_000, 8),
  distributeUsers(500_000, 30),
  distributeUsers(1_000_000, 80),
];

export const OPEX_AT_SCALE: Record<string, OpexBreakdown> = {
  "1K": {
    databaseUsd: 0,        // Neon Hobby free
    redisUsd: 10,          // Upstash starter
    hostingUsd: 20,        // Fly.io kecil
    cdnUsd: 0,             // Cloudflare free
    aiInferenceUsd: 10,    // ~30M tokens dengan cache
    vendorDataUsd: 0,      // Yahoo Finance free
    emailUsd: 0,           // Resend free 3K/bulan
    observabilityUsd: 0,   // Sentry + PostHog free tier
    miscInfraUsd: 20,      // Domain, misc
    engineeringIdr: 25_000_000,    // 1 mid engineer
    productDesignIdr: 0,
    dataAnalystIdr: 0,
    customerSuccessIdr: 0,
    marketingTeamIdr: 15_000_000,  // 1 content/marketing junior
    opsFinanceIdr: 0,
    complianceIdr: 0,
    leadershipIdr: 40_000_000,     // Founder salary
    marketingSpendIdr: 10_000_000,
    officeAdminIdr: 3_000_000,
    legalAccountingIdr: 2_000_000,
    benefitMultiplier: 1.0,        // pre-seed, no BPJS/benefit yet
  },
  "5K": {
    databaseUsd: 19,
    redisUsd: 30,
    hostingUsd: 80,
    cdnUsd: 20,
    aiInferenceUsd: 50,
    vendorDataUsd: 0,
    emailUsd: 20,
    observabilityUsd: 26,
    miscInfraUsd: 30,
    engineeringIdr: 70_000_000,   // 2 engineer (1 senior, 1 mid)
    productDesignIdr: 25_000_000,
    dataAnalystIdr: 30_000_000,
    customerSuccessIdr: 12_000_000,
    marketingTeamIdr: 20_000_000,
    opsFinanceIdr: 0,
    complianceIdr: 0,
    leadershipIdr: 40_000_000,
    marketingSpendIdr: 25_000_000,
    officeAdminIdr: 8_000_000,
    legalAccountingIdr: 5_000_000,
    benefitMultiplier: 1.2,
  },
  "10K": {
    databaseUsd: 69,              // Neon Scale
    redisUsd: 80,
    hostingUsd: 200,
    cdnUsd: 50,
    aiInferenceUsd: 200,
    vendorDataUsd: 100,           // Invezgo basic
    emailUsd: 20,
    observabilityUsd: 80,
    miscInfraUsd: 50,
    engineeringIdr: 120_000_000,  // 3 engineer
    productDesignIdr: 30_000_000,
    dataAnalystIdr: 35_000_000,
    customerSuccessIdr: 15_000_000,
    marketingTeamIdr: 35_000_000, // marketing + content
    opsFinanceIdr: 15_000_000,
    complianceIdr: 0,
    leadershipIdr: 50_000_000,
    marketingSpendIdr: 50_000_000,
    officeAdminIdr: 15_000_000,
    legalAccountingIdr: 10_000_000,
    benefitMultiplier: 1.25,
  },
  "50K": {
    databaseUsd: 250,             // Neon Scale Pro
    redisUsd: 200,
    hostingUsd: 600,
    cdnUsd: 200,
    aiInferenceUsd: 500,
    vendorDataUsd: 500,           // Invezgo Pro
    emailUsd: 50,
    observabilityUsd: 200,
    miscInfraUsd: 100,
    engineeringIdr: 280_000_000,  // 8 engineer mix senior/mid
    productDesignIdr: 60_000_000,
    dataAnalystIdr: 70_000_000,
    customerSuccessIdr: 40_000_000,
    marketingTeamIdr: 80_000_000,
    opsFinanceIdr: 35_000_000,
    complianceIdr: 30_000_000,
    leadershipIdr: 100_000_000,
    marketingSpendIdr: 150_000_000,
    officeAdminIdr: 40_000_000,
    legalAccountingIdr: 25_000_000,
    benefitMultiplier: 1.25,
  },
  "100K": {
    databaseUsd: 700,             // Neon Business
    redisUsd: 500,
    hostingUsd: 1_500,
    cdnUsd: 400,
    aiInferenceUsd: 1_200,
    vendorDataUsd: 1_500,         // IDX direct (essential at scale)
    emailUsd: 90,
    observabilityUsd: 500,
    miscInfraUsd: 200,
    engineeringIdr: 480_000_000,  // 12 engineer
    productDesignIdr: 90_000_000,
    dataAnalystIdr: 140_000_000,
    customerSuccessIdr: 80_000_000,
    marketingTeamIdr: 140_000_000,
    opsFinanceIdr: 60_000_000,
    complianceIdr: 60_000_000,
    leadershipIdr: 180_000_000,
    marketingSpendIdr: 300_000_000,
    officeAdminIdr: 80_000_000,
    legalAccountingIdr: 50_000_000,
    benefitMultiplier: 1.3,
  },
  "500K": {
    databaseUsd: 2_500,
    redisUsd: 1_500,
    hostingUsd: 5_000,
    cdnUsd: 1_000,
    aiInferenceUsd: 5_000,
    vendorDataUsd: 5_000,
    emailUsd: 200,
    observabilityUsd: 1_500,
    miscInfraUsd: 500,
    engineeringIdr: 900_000_000,   // 25 engineer
    productDesignIdr: 150_000_000,
    dataAnalystIdr: 270_000_000,
    customerSuccessIdr: 200_000_000,
    marketingTeamIdr: 280_000_000,
    opsFinanceIdr: 120_000_000,
    complianceIdr: 100_000_000,
    leadershipIdr: 350_000_000,
    marketingSpendIdr: 600_000_000,
    officeAdminIdr: 200_000_000,
    legalAccountingIdr: 100_000_000,
    benefitMultiplier: 1.3,
  },
  "1M": {
    databaseUsd: 5_000,
    redisUsd: 3_000,
    hostingUsd: 10_000,
    cdnUsd: 2_000,
    aiInferenceUsd: 12_000,
    vendorDataUsd: 10_000,        // Full IDX + Bloomberg-like
    emailUsd: 500,
    observabilityUsd: 3_000,
    miscInfraUsd: 1_000,
    engineeringIdr: 1_800_000_000, // 50 engineer
    productDesignIdr: 250_000_000,
    dataAnalystIdr: 500_000_000,
    customerSuccessIdr: 400_000_000,
    marketingTeamIdr: 500_000_000,
    opsFinanceIdr: 250_000_000,
    complianceIdr: 200_000_000,
    leadershipIdr: 600_000_000,
    marketingSpendIdr: 1_200_000_000,
    officeAdminIdr: 400_000_000,
    legalAccountingIdr: 250_000_000,
    benefitMultiplier: 1.3,
  },
};

export interface ProjectionRow {
  scaleLabel: string;
  totalUsers: number;
  paidUsers: number;
  conversionPct: number;
  mrrIdr: number;
  arrIdr: number;
  opexIdr: number;
  netMonthlyIdr: number;
  netMarginPct: number;
  cumulativeMonthsToBreakEven: number | null;
}

export function computeMRR(scale: UserScale): number {
  return (
    scale.starterUsers * TIER_PRICE.starter +
    scale.proUsers * TIER_PRICE.pro +
    scale.eliteUsers * TIER_PRICE.elite +
    scale.institutionalUsers * TIER_PRICE.institutional
  );
}

export function computeOpex(opex: OpexBreakdown): number {
  const infraUsd =
    opex.databaseUsd + opex.redisUsd + opex.hostingUsd + opex.cdnUsd +
    opex.aiInferenceUsd + opex.vendorDataUsd + opex.emailUsd +
    opex.observabilityUsd + opex.miscInfraUsd;
  const infraIdr = infraUsd * USD_IDR;

  const peopleIdr =
    (opex.engineeringIdr + opex.productDesignIdr + opex.dataAnalystIdr +
     opex.customerSuccessIdr + opex.marketingTeamIdr + opex.opsFinanceIdr +
     opex.complianceIdr + opex.leadershipIdr) * opex.benefitMultiplier;

  const gtmIdr = opex.marketingSpendIdr + opex.officeAdminIdr + opex.legalAccountingIdr;

  return infraIdr + peopleIdr + gtmIdr;
}

export function buildProjections(): ProjectionRow[] {
  return USER_SCALES.map((scale, idx) => {
    const opex = OPEX_AT_SCALE[scale.label]!;
    const mrr = computeMRR(scale);
    const opexMonthly = computeOpex(opex);
    const net = mrr - opexMonthly;
    const margin = mrr > 0 ? (net / mrr) * 100 : 0;
    return {
      scaleLabel: scale.label,
      totalUsers: scale.totalUsers,
      paidUsers: scale.starterUsers + scale.proUsers + scale.eliteUsers + scale.institutionalUsers,
      conversionPct: scale.totalUsers > 0 ? ((scale.starterUsers + scale.proUsers + scale.eliteUsers + scale.institutionalUsers) / scale.totalUsers) * 100 : 0,
      mrrIdr: mrr,
      arrIdr: mrr * 12,
      opexIdr: opexMonthly,
      netMonthlyIdr: net,
      netMarginPct: margin,
      cumulativeMonthsToBreakEven: null,
    };
  });
}

export const FUNDING_ROUNDS = [
  {
    round: "Pre-seed",
    amountUsd: "$300K – $500K",
    amountIdr: "Rp 5 – 8 Mrd",
    runway: "12–18 bulan",
    purpose: "Build MVP + validate PMF dengan 1K-5K user closed alpha",
    timing: "M0–M6",
  },
  {
    round: "Seed",
    amountUsd: "$1.5M – $3M",
    amountIdr: "Rp 25 – 50 Mrd",
    runway: "18–24 bulan",
    purpose: "Scale tim ke 10-15 orang, public launch, growth ke 10K–50K user",
    timing: "M6–M18",
  },
  {
    round: "Series A",
    amountUsd: "$8M – $15M",
    amountIdr: "Rp 130 – 250 Mrd",
    runway: "24+ bulan",
    purpose: "Lisensi data IDX direct, mobile app, ekspansi regional ke 100K–500K user",
    timing: "M18–M36",
  },
  {
    round: "Series B",
    amountUsd: "$25M+",
    amountIdr: "Rp 400 Mrd+",
    runway: "36+ bulan",
    purpose: "Multi-asset (obligasi/ETF/Reksadana), strategy marketplace, regional dominance",
    timing: "M36+ (after profitability path proven)",
  },
];

export const UNIT_ECONOMICS = {
  arpu: {
    monthly: 163_000,
    annual: 1_956_000,
    description: "Blended ARPU dari mix tier paid (Starter 80%, Pro 16%, Elite 4%): (99k×0.8 + 299k×0.16 + 899k×0.04) = Rp 163k/bln paying user",
  },
  cogs: {
    monthly: 18_500,
    description: "AI inference (~Rp 8k) + data vendor share (~Rp 3.5k) + payment gateway fee 2.5% (~Rp 4k) + email/SMS (~Rp 1k) + infra share (~Rp 2k)",
  },
  grossMargin: 0.886, // 88.6%
  cacTargetByPhase: {
    earlyBeta: 100_000,
    publicLaunch: 250_000,
    scale: 350_000,
    mainstream: 450_000,
  },
  churn: {
    monthlyStarter: 0.05,  // 5% monthly
    monthlyPro: 0.03,
    monthlyElite: 0.02,
    blended: 0.045,
  },
  ltvBlended: 3_620_000, // ARPU 163k × gross margin 88.6% × (1/churn 4.5%) = 3.21M (annual recurring) atau bisa lebih kalau tier upgrade
  paybackPeriodMonths: 2.7,
  ltvCacRatio: 14.5, // 3.62M / 250K = 14.5x (sehat untuk SaaS)
};
