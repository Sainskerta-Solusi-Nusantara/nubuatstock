import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  invoices,
  payments,
  subscriptionHistory,
  subscriptionTiers,
  tierEntitlements,
  usageCounters,
  userSubscriptions,
} from "@/db/schema/billing";

/**
 * Type publik domain billing — di-import oleh Agent lain via path ini.
 *
 * Re-export Drizzle row types + Zod schemas untuk request/response validation.
 */

// =================== Re-export DB row types ===================

export type {
  Invoice,
  NewInvoice,
  NewPayment,
  NewSubscriptionHistoryRow,
  NewSubscriptionTier,
  NewTierEntitlement,
  NewUsageCounter,
  NewUserSubscription,
  Payment,
  SubscriptionHistoryRow,
  SubscriptionTier,
  TierEntitlement,
  UsageCounter,
  UserSubscription,
} from "@/db/schema/billing";

// =================== Tier kode enum ===================

/**
 * Daftar tier kode publik yang dikenal aplikasi. Source of truth tetap di DB
 * (tabel subscription_tiers); enum ini untuk type-safety di kode yang memang
 * butuh literal — misal pembuatan free subscription saat signup.
 *
 * Tambahkan tier baru di sini DAN di seed kalau ditambah tier baru. Jangan
 * hardcode tier kode lain (e.g., "platinum") tanpa update enum.
 */
export const tierKodeSchema = z.enum([
  "free",
  "starter",
  "pro",
  "elite",
  "institutional",
]);
export type TierKode = z.infer<typeof tierKodeSchema>;

export const DEFAULT_FREE_TIER_KODE: TierKode = "free";

/**
 * Hierarki tier untuk perbandingan minimum-tier. Semakin besar nilai, semakin tinggi tier.
 * Catatan: hanya untuk membandingkan minimum requirement (e.g., requireTier(user, "pro")).
 * Untuk entitlement spesifik, gunakan tier_entitlements (jangan asumsi inherit).
 */
export const TIER_RANK: Record<TierKode, number> = {
  free: 0,
  starter: 10,
  pro: 20,
  elite: 30,
  institutional: 40,
};

// =================== Subscription status & provider enums ===================

export const subscriptionStatusSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "cancelled",
  "expired",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionProviderSchema = z.enum(["midtrans", "xendit", "manual"]);
export type SubscriptionProvider = z.infer<typeof subscriptionProviderSchema>;

export const billingCycleSchema = z.enum(["monthly", "annual"]);
export type BillingCycle = z.infer<typeof billingCycleSchema>;

export const invoiceStatusSchema = z.enum([
  "draft",
  "sent",
  "paid",
  "void",
  "uncollectible",
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const paymentStatusSchema = z.enum([
  "pending",
  "success",
  "failed",
  "refunded",
  "expired",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// =================== Entitlement keys ===================

/**
 * Daftar entitlement key yang dikenal aplikasi. Source of truth tetap di DB
 * (tabel tier_entitlements). Enum ini untuk autocomplete & guard di kode caller.
 */
export const entitlementKeys = [
  "ai.queries_per_day",
  "watchlist.max_items",
  "alerts.max_active",
  "picks.daily_visible",
  "data.foreign_flow.intraday_resolution_min",
  "data.realtime_delay_seconds",
  "feature.bandarmology_full",
  "feature.research_aggregator",
  "feature.backtest_max_strategies",
  "feature.paper_trading",
  "feature.ai_deep_mode",
  "feature.api_access",
] as const;
export type EntitlementKey = (typeof entitlementKeys)[number];

/**
 * Counter keys untuk quota tracking. Konvensi: namespace.action.
 * Tambah kalau ada counter baru (mis. ai.queries, alerts.created).
 */
export const counterKeys = [
  "ai.queries",
  "alerts.created",
  "picks.unlock",
  "backtest.runs",
  "api.requests",
] as const;
export type CounterKey = (typeof counterKeys)[number];

/**
 * Mapping counter → entitlement limit key. Saat counter di-INCR, kita check
 * limit dari entitlement ini.
 */
export const COUNTER_LIMIT_MAP: Record<CounterKey, EntitlementKey | null> = {
  "ai.queries": "ai.queries_per_day",
  "alerts.created": null, // alerts use max_active (stateful), not per-day counter
  "picks.unlock": "picks.daily_visible",
  "backtest.runs": "feature.backtest_max_strategies",
  "api.requests": null,
};

// =================== Zod schemas (drizzle-zod) ===================

export const subscriptionTierSelectSchema = createSelectSchema(subscriptionTiers);
export const subscriptionTierInsertSchema = createInsertSchema(subscriptionTiers);

export const tierEntitlementSelectSchema = createSelectSchema(tierEntitlements);
export const tierEntitlementInsertSchema = createInsertSchema(tierEntitlements);

export const userSubscriptionSelectSchema = createSelectSchema(userSubscriptions);
export const userSubscriptionInsertSchema = createInsertSchema(userSubscriptions);

export const subscriptionHistorySelectSchema = createSelectSchema(subscriptionHistory);

export const invoiceSelectSchema = createSelectSchema(invoices);
export const paymentSelectSchema = createSelectSchema(payments);
export const usageCounterSelectSchema = createSelectSchema(usageCounters);

// =================== API request/response shapes ===================

export const subscribeRequestSchema = z.object({
  tierKode: tierKodeSchema,
  billingCycle: billingCycleSchema.default("monthly"),
  provider: subscriptionProviderSchema.default("midtrans"),
});
export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

export const cancelRequestSchema = z.object({
  reason: z.string().max(500).optional(),
  immediate: z.boolean().default(false),
});
export type CancelRequest = z.infer<typeof cancelRequestSchema>;

export interface TierWithEntitlements {
  tier: typeof subscriptionTiers.$inferSelect;
  entitlements: Record<string, unknown>;
}

export interface UsageSummaryItem {
  counterKey: CounterKey;
  windowKey: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
}

export interface CurrentSubscriptionResponse {
  subscription: typeof userSubscriptions.$inferSelect | null;
  tier: typeof subscriptionTiers.$inferSelect | null;
  entitlements: Record<string, unknown>;
  usage: UsageSummaryItem[];
  disclaimer: string;
}

export interface SubscribeResponse {
  invoiceId: string;
  invoiceNumber: string;
  amountIdr: number;
  provider: SubscriptionProvider;
  /** Stub MVP: URL redirect kosong sampai integrasi Midtrans/Xendit aktif. */
  redirectUrl: string | null;
  /** Stub MVP: token Snap (Midtrans) atau invoice URL (Xendit). */
  paymentToken: string | null;
  status: "pending_payment";
}
