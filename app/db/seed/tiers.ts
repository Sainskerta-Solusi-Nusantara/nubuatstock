import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import {
  subscriptionTiers,
  tierEntitlements,
  type NewSubscriptionTier,
} from "../schema/billing";

/**
 * Seed `subscription_tiers` + `tier_entitlements`.
 *
 * SUMBER NILAI: ANALISIS_APLIKASI_SAHAM.md §10.1 Pricing Strategy + §10.2 Trial &
 * §10.3 Acquisition. Tidak boleh ada literal harga / fitur di kode aplikasi —
 * semua dibaca dari DB via `lib/billing` helpers.
 *
 * Idempotent: pakai ON CONFLICT (kode) DO UPDATE untuk tier dan
 * ON CONFLICT (tier_kode, entitlement_key) DO UPDATE untuk entitlement.
 *
 * `UNLIMITED_SENTINEL` adalah representasi "tanpa batas" untuk numeric quota.
 * Helper `consumeQuota` di lib/billing/quota.ts memperlakukan nilai >= sentinel
 * sebagai unlimited (skip Redis check). Disimpan sebagai number besar (bukan
 * Infinity / null) supaya tetap valid JSON & sortable di admin UI.
 */
const UNLIMITED = 999_999;

interface TierDef {
  kode: string;
  nama: string;
  tagline: string;
  priceMonthlyIdr: number;
  priceAnnualIdr: number;
  trialDays: number;
  isPublic: boolean;
  sortOrder: number;
  badge: string | null;
  ctaLabel: string;
  features: string[];
  entitlements: Record<string, unknown>;
}

const tiers: TierDef[] = [
  {
    kode: "free",
    nama: "Free",
    tagline: "Akuisisi — cicipi terminal Nubuat tanpa biaya.",
    priceMonthlyIdr: 0,
    priceAnnualIdr: 0,
    trialDays: 0,
    isPublic: true,
    sortOrder: 10,
    badge: null,
    ctaLabel: "Mulai Gratis",
    features: [
      "Quote real-time delayed 15 menit",
      "Watchlist hingga 10 ticker",
      "1 chart per halaman",
      "Basic TA: 20 indikator",
      "Daily Brief harian",
      "AI Buddy 5 query/hari",
    ],
    entitlements: {
      "ai.queries_per_day": 5,
      "watchlist.max_items": 10,
      "alerts.max_active": 3,
      "picks.daily_visible": 1,
      "data.foreign_flow.intraday_resolution_min": 0,
      "data.realtime_delay_seconds": 900,
      "feature.bandarmology_full": false,
      "feature.research_aggregator": false,
      "feature.backtest_max_strategies": 0,
      "feature.paper_trading": false,
      "feature.ai_deep_mode": false,
      "feature.api_access": false,
    },
  },
  {
    kode: "starter",
    nama: "Starter",
    tagline: "Active retail — quote real-time + Daily Picks.",
    priceMonthlyIdr: 99_000,
    priceAnnualIdr: 990_000,
    trialDays: 7,
    isPublic: true,
    sortOrder: 20,
    badge: "Most Popular",
    ctaLabel: "Coba Gratis 7 Hari",
    features: [
      "Quote real-time (tanpa delay)",
      "Watchlist unlimited",
      "Full TA: 150 indikator",
      "Bandarmology basic (broker summary 1D)",
      "Daily Picks 3/hari",
      "AI Buddy 50 query/hari",
      "Trial 7 hari penuh",
    ],
    entitlements: {
      "ai.queries_per_day": 50,
      "watchlist.max_items": UNLIMITED,
      "alerts.max_active": 20,
      "picks.daily_visible": 3,
      "data.foreign_flow.intraday_resolution_min": 0,
      "data.realtime_delay_seconds": 0,
      "feature.bandarmology_full": false,
      "feature.research_aggregator": false,
      "feature.backtest_max_strategies": 0,
      "feature.paper_trading": false,
      "feature.ai_deep_mode": false,
      "feature.api_access": false,
    },
  },
  {
    kode: "pro",
    nama: "Pro",
    tagline: "Swing & active trader — Brokermology full + Research Aggregator.",
    priceMonthlyIdr: 299_000,
    priceAnnualIdr: 2_990_000,
    trialDays: 7,
    isPublic: true,
    sortOrder: 30,
    badge: "Best Value",
    ctaLabel: "Upgrade ke Pro",
    features: [
      "Semua di Starter",
      "Brokermology full (broker concentration intraday)",
      "Daily Picks 10/hari + update intraday",
      "Research Aggregator (laporan sekuritas + filing IDX)",
      "Multi-chart workspace",
      "Alerts unlimited",
      "Backtest hingga 3 strategi",
      "AI Buddy 500 query/hari",
      "Mobile + Desktop app",
    ],
    entitlements: {
      "ai.queries_per_day": 500,
      "watchlist.max_items": UNLIMITED,
      "alerts.max_active": UNLIMITED,
      "picks.daily_visible": 10,
      "data.foreign_flow.intraday_resolution_min": 60,
      "data.realtime_delay_seconds": 0,
      "feature.bandarmology_full": true,
      "feature.research_aggregator": true,
      "feature.backtest_max_strategies": 3,
      "feature.paper_trading": false,
      "feature.ai_deep_mode": false,
      "feature.api_access": false,
    },
  },
  {
    kode: "elite",
    nama: "Elite",
    tagline: "Power trader & semi-pro — L2 depth, Paper Trading, API access.",
    priceMonthlyIdr: 899_000,
    priceAnnualIdr: 8_990_000,
    trialDays: 7,
    isPublic: true,
    sortOrder: 40,
    badge: null,
    ctaLabel: "Upgrade ke Elite",
    features: [
      "Semua di Pro",
      "Level-2 order book depth",
      "Intraday foreign flow resolusi 5 menit",
      "Paper trading",
      "Strategy marketplace",
      "Priority Discord & concierge onboarding",
      "AI Buddy unlimited + Deep Mode (Opus)",
      "API access read-only (rate-limited)",
    ],
    entitlements: {
      "ai.queries_per_day": UNLIMITED,
      "watchlist.max_items": UNLIMITED,
      "alerts.max_active": UNLIMITED,
      "picks.daily_visible": 10,
      "data.foreign_flow.intraday_resolution_min": 5,
      "data.realtime_delay_seconds": 0,
      "feature.bandarmology_full": true,
      "feature.research_aggregator": true,
      "feature.backtest_max_strategies": 99,
      "feature.paper_trading": true,
      "feature.ai_deep_mode": true,
      "feature.api_access": true,
    },
  },
  {
    kode: "institutional",
    nama: "Institutional",
    tagline: "Sekuritas & asset management — multi-seat, white-label, SLA.",
    priceMonthlyIdr: 25_000_000,
    priceAnnualIdr: 270_000_000,
    trialDays: 0,
    isPublic: false,
    sortOrder: 50,
    badge: "Contact Sales",
    ctaLabel: "Hubungi Kami",
    features: [
      "Semua di Elite",
      "Multi-seat dengan team management",
      "White-label & custom branding",
      "Dedicated SLA & support engineer",
      "Custom data feed integration",
    ],
    entitlements: {
      "ai.queries_per_day": UNLIMITED,
      "watchlist.max_items": UNLIMITED,
      "alerts.max_active": UNLIMITED,
      "picks.daily_visible": 10,
      "data.foreign_flow.intraday_resolution_min": 5,
      "data.realtime_delay_seconds": 0,
      "feature.bandarmology_full": true,
      "feature.research_aggregator": true,
      "feature.backtest_max_strategies": 999,
      "feature.paper_trading": true,
      "feature.ai_deep_mode": true,
      "feature.api_access": true,
    },
  },
];

export async function seedTiers(): Promise<void> {
  logger.info("Seeding subscription_tiers...");
  for (const tier of tiers) {
    const row: NewSubscriptionTier = {
      kode: tier.kode,
      nama: tier.nama,
      tagline: tier.tagline,
      priceMonthlyIdr: tier.priceMonthlyIdr,
      priceAnnualIdr: tier.priceAnnualIdr,
      currency: "IDR",
      trialDays: tier.trialDays,
      isPublic: tier.isPublic,
      sortOrder: tier.sortOrder,
      features: tier.features,
      badge: tier.badge,
      ctaLabel: tier.ctaLabel,
      isActive: true,
    };
    await db
      .insert(subscriptionTiers)
      .values(row)
      .onConflictDoUpdate({
        target: subscriptionTiers.kode,
        set: {
          nama: row.nama,
          tagline: row.tagline,
          priceMonthlyIdr: row.priceMonthlyIdr,
          priceAnnualIdr: row.priceAnnualIdr,
          trialDays: row.trialDays,
          isPublic: row.isPublic,
          sortOrder: row.sortOrder,
          features: row.features,
          badge: row.badge,
          ctaLabel: row.ctaLabel,
          isActive: row.isActive,
          updatedAt: new Date(),
        },
      });
  }
  logger.info(`Seeded ${tiers.length} subscription tiers`);

  logger.info("Seeding tier_entitlements...");
  let entitlementCount = 0;
  for (const tier of tiers) {
    for (const [key, value] of Object.entries(tier.entitlements)) {
      // Idempotent upsert per (tier_kode, entitlement_key).
      const existing = await db
        .select()
        .from(tierEntitlements)
        .where(
          and(
            eq(tierEntitlements.tierKode, tier.kode),
            eq(tierEntitlements.entitlementKey, key),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(tierEntitlements).values({
          tierKode: tier.kode,
          entitlementKey: key,
          entitlementValue: value,
          description: describeEntitlement(key),
        });
      } else {
        await db
          .update(tierEntitlements)
          .set({ entitlementValue: value, updatedAt: new Date() })
          .where(eq(tierEntitlements.id, existing[0]!.id));
      }
      entitlementCount += 1;
    }
  }
  logger.info(`Seeded ${entitlementCount} tier_entitlements`);
}

function describeEntitlement(key: string): string {
  const descriptions: Record<string, string> = {
    "ai.queries_per_day": "Jumlah maksimum query AI Buddy per hari (reset 00:00 WIB).",
    "watchlist.max_items": "Jumlah maksimum ticker di watchlist user.",
    "alerts.max_active": "Jumlah maksimum alert aktif (status enabled).",
    "picks.daily_visible": "Jumlah Daily Picks yang ditampilkan ke user per hari.",
    "data.foreign_flow.intraday_resolution_min":
      "Resolusi data foreign flow intraday (menit). 0 = tidak tersedia, hanya EoD.",
    "data.realtime_delay_seconds":
      "Delay quote dalam detik. 0 = real-time, 900 = 15 menit delayed.",
    "feature.bandarmology_full": "Akses Bandarmology lengkap (broker concentration, dll).",
    "feature.research_aggregator":
      "Akses Research Aggregator (laporan sekuritas + filing IDX).",
    "feature.backtest_max_strategies":
      "Jumlah maksimum strategi backtest yang dapat disimpan user.",
    "feature.paper_trading": "Akses fitur paper trading.",
    "feature.ai_deep_mode": "Akses AI deep research mode (model Opus / setara).",
    "feature.api_access": "Akses API read-only untuk programmatic access.",
  };
  return descriptions[key] ?? "";
}
