import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jsonbT, softDelete, ulid, ulidRef, withTimestamps } from "./_base";
import { users } from "./auth";

/**
 * Subscription & billing schema untuk Nubuat.
 *
 * Prinsip:
 * - SEMUA pricing, kuota, & fitur per tier DI DB (subscription_tiers + tier_entitlements).
 *   Tidak ada literal harga / batas di kode.
 * - Tier menggunakan natural string code ("free", "starter", "pro", "elite", "institutional")
 *   sebagai PK untuk readability di query & log.
 * - user_subscriptions referensi user_id sebagai text (soft FK ke auth.users milik Agent 3,
 *   FK constraint di-add via separate migration setelah Agent 3 mendefinisikan tabel).
 * - usage_counters di-back oleh Redis (atomic INCR) + Postgres sebagai source of truth.
 *   Reset harian di tengah malam WIB; period_window menyimpan window (YYYY-MM-DD / YYYY-MM).
 *
 * Audit log perubahan tier → subscription_history.
 * Invoice & payment terpisah agar bisa support multiple payment per invoice (split, retry).
 */

// =================== Enums ===================

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "cancelled",
  "expired",
]);

export const subscriptionProviderEnum = pgEnum("subscription_provider", [
  "midtrans",
  "xendit",
  "manual",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "void",
  "uncollectible",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
  "expired",
]);

export const subscriptionHistoryActionEnum = pgEnum("subscription_history_action", [
  "created",
  "upgraded",
  "downgraded",
  "renewed",
  "cancelled",
  "reactivated",
  "expired",
  "trial_started",
  "trial_ended",
]);

// =================== Tables ===================

/**
 * `subscription_tiers` — definisi tier publik & internal.
 *
 * Admin edit harga / fitur di /admin/billing (Agent 10). Tidak ada hardcode harga di kode.
 * `features` adalah array of strings untuk display di pricing page; entitlement aktual
 * (numeric/boolean) ada di tier_entitlements.
 *
 * `is_public=false` untuk Institutional (custom pricing, tidak ditampilkan di pricing page).
 */
export const subscriptionTiers = pgTable(
  "subscription_tiers",
  {
    kode: text("kode").primaryKey().notNull(),
    nama: text("nama").notNull(),
    tagline: text("tagline"),
    priceMonthlyIdr: bigint("price_monthly_idr", { mode: "number" }).notNull().default(0),
    priceAnnualIdr: bigint("price_annual_idr", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("IDR"),
    trialDays: integer("trial_days").notNull().default(0),
    isPublic: boolean("is_public").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    features: jsonbT<string[]>("features").notNull().default(sql`'[]'::jsonb`),
    badge: text("badge"),
    ctaLabel: text("cta_label"),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("subscription_tiers_nama_uq").on(t.nama),
    index("subscription_tiers_sort_idx").on(t.sortOrder),
    index("subscription_tiers_active_public_idx").on(t.isActive, t.isPublic),
  ],
);

/**
 * `tier_entitlements` — atomic capability per tier.
 *
 * `entitlement_key` namespaced (dot-notation):
 *   - ai.queries_per_day
 *   - watchlist.max_items
 *   - alerts.max_active
 *   - picks.daily_visible
 *   - data.foreign_flow.intraday_resolution_min
 *   - data.realtime_delay_seconds
 *   - feature.bandarmology_full
 *   - feature.research_aggregator
 *   - feature.backtest_max_strategies
 *   - feature.paper_trading
 *   - feature.ai_deep_mode
 *   - feature.api_access
 *
 * `entitlement_value` jsonb — number / boolean / array sesuai kebutuhan.
 * Unique (tier_kode, entitlement_key) supaya idempotent seed & upsert.
 */
export const tierEntitlements = pgTable(
  "tier_entitlements",
  {
    id: ulid(),
    tierKode: text("tier_kode")
      .notNull()
      .references(() => subscriptionTiers.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    entitlementKey: text("entitlement_key").notNull(),
    entitlementValue: jsonbT<unknown>("entitlement_value").notNull(),
    description: text("description"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("tier_entitlements_tier_key_uq").on(t.tierKode, t.entitlementKey),
    index("tier_entitlements_key_idx").on(t.entitlementKey),
  ],
);

/**
 * `user_subscriptions` — subscription aktif per user.
 *
 * Constraint: hanya satu subscription dengan status active|trialing per user
 *   (partial unique index, lihat di bawah).
 *
 * `user_id` FK ke auth.users (Agent 3) dengan onDelete cascade.
 */
export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    tierKode: text("tier_kode")
      .notNull()
      .references(() => subscriptionTiers.kode, { onDelete: "restrict", onUpdate: "cascade" }),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | annual
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: "date" }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true, mode: "date" }),
    paymentMethodId: text("payment_method_id"),
    provider: subscriptionProviderEnum("provider").notNull().default("manual"),
    providerSubscriptionId: text("provider_subscription_id"),
    metadata: jsonbT<Record<string, unknown>>("metadata").notNull().default({}),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    index("user_subscriptions_user_idx").on(t.userId),
    index("user_subscriptions_tier_idx").on(t.tierKode),
    index("user_subscriptions_status_idx").on(t.status),
    // Partial unique — satu user hanya boleh satu subscription aktif/trialing.
    uniqueIndex("user_subscriptions_user_active_uq")
      .on(t.userId)
      .where(sql`status IN ('active', 'trialing')`),
    index("user_subscriptions_period_end_idx").on(t.currentPeriodEnd),
  ],
);

/**
 * `subscription_history` — audit perubahan tier user.
 *
 * Setiap upgrade/downgrade/cancel WAJIB tulis row di sini.
 * `reason` opsional, untuk admin manual override / refund / churn-tagging.
 */
export const subscriptionHistory = pgTable(
  "subscription_history",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: ulidRef("subscription_id").references(() => userSubscriptions.id, {
      onDelete: "cascade",
    }),
    action: subscriptionHistoryActionEnum("action").notNull(),
    fromTierKode: text("from_tier_kode"),
    toTierKode: text("to_tier_kode"),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    actorUserId: text("actor_user_id"), // null = system, otherwise admin id
    reason: text("reason"),
    metadata: jsonbT<Record<string, unknown>>("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    index("subscription_history_user_idx").on(t.userId),
    index("subscription_history_subscription_idx").on(t.subscriptionId),
    index("subscription_history_occurred_idx").on(t.occurredAt),
  ],
);

/**
 * `invoices` — invoice per billing period.
 *
 * Provider invoice id digunakan untuk reconciliation dari webhook Midtrans/Xendit.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => userSubscriptions.id, {
      onDelete: "set null",
    }),
    tierKode: text("tier_kode").notNull(),
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    amountIdr: bigint("amount_idr", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("IDR"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    periodStart: timestamp("period_start", { withTimezone: true, mode: "date" }),
    periodEnd: timestamp("period_end", { withTimezone: true, mode: "date" }),
    provider: subscriptionProviderEnum("provider").notNull().default("manual"),
    providerInvoiceId: text("provider_invoice_id"),
    invoiceNumber: text("invoice_number"),
    metadata: jsonbT<Record<string, unknown>>("metadata").notNull().default({}),
    ...withTimestamps,
  },
  (t) => [
    index("invoices_user_idx").on(t.userId),
    index("invoices_subscription_idx").on(t.subscriptionId),
    index("invoices_status_idx").on(t.status),
    uniqueIndex("invoices_provider_id_uq")
      .on(t.provider, t.providerInvoiceId)
      .where(sql`provider_invoice_id IS NOT NULL`),
    uniqueIndex("invoices_number_uq")
      .on(t.invoiceNumber)
      .where(sql`invoice_number IS NOT NULL`),
  ],
);

/**
 * `payments` — pembayaran terhadap invoice.
 *
 * Bisa multiple payment per invoice (retry, partial). `raw_response` di-redact
 * via Pino redactor saat logging; payment gateway PII tidak boleh muncul di log.
 */
export const payments = pgTable(
  "payments",
  {
    id: ulid(),
    invoiceId: ulidRef("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    amountIdr: bigint("amount_idr", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("IDR"),
    provider: subscriptionProviderEnum("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    providerTransactionId: text("provider_transaction_id"),
    paymentMethod: text("payment_method"), // qris | va_bca | gopay | credit_card | dll
    status: paymentStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    failureReason: text("failure_reason"),
    rawResponse: jsonbT<Record<string, unknown>>("raw_response"),
    ...withTimestamps,
  },
  (t) => [
    index("payments_invoice_idx").on(t.invoiceId),
    index("payments_user_idx").on(t.userId),
    index("payments_status_idx").on(t.status),
    uniqueIndex("payments_provider_id_uq")
      .on(t.provider, t.providerPaymentId)
      .where(sql`provider_payment_id IS NOT NULL`),
  ],
);

/**
 * `usage_counters` — quota tracking persistence.
 *
 * Redis adalah primary store untuk INCR atomic (key: `quota:{userId}:{counterKey}:{window}`).
 * Tabel ini diisi via flush periodik (daily) untuk audit, analytics, & survival kalau Redis down.
 *
 * `period_window` format:
 *   - Daily counter: "YYYY-MM-DD" (WIB)
 *   - Monthly counter: "YYYY-MM"
 *   - Lifetime counter: "lifetime"
 */
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    counterKey: text("counter_key").notNull(),
    periodWindow: text("period_window").notNull(),
    count: bigint("count", { mode: "number" }).notNull().default(0),
    limitSnapshot: bigint("limit_snapshot", { mode: "number" }),
    tierKodeSnapshot: text("tier_kode_snapshot"),
    lastIncrementedAt: timestamp("last_incremented_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("usage_counters_user_key_window_uq").on(
      t.userId,
      t.counterKey,
      t.periodWindow,
    ),
    index("usage_counters_user_idx").on(t.userId),
    index("usage_counters_counter_key_idx").on(t.counterKey),
    index("usage_counters_window_idx").on(t.periodWindow),
  ],
);

// =================== Drizzle inferred types ===================

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type NewSubscriptionTier = typeof subscriptionTiers.$inferInsert;

export type TierEntitlement = typeof tierEntitlements.$inferSelect;
export type NewTierEntitlement = typeof tierEntitlements.$inferInsert;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;

export type SubscriptionHistoryRow = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistoryRow = typeof subscriptionHistory.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type UsageCounter = typeof usageCounters.$inferSelect;
export type NewUsageCounter = typeof usageCounters.$inferInsert;
