import { and, desc, eq, inArray } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "../db";
import { logger } from "../logger";
import { NotFoundError, ValidationError } from "../errors";
import {
  invoices,
  subscriptionHistory,
  subscriptionTiers,
  userSubscriptions,
  type SubscriptionTier,
  type UserSubscription,
} from "@/db/schema/billing";
import {
  DEFAULT_FREE_TIER_KODE,
  type BillingCycle,
  type SubscriptionProvider,
  type TierKode,
} from "../types/billing";
import { invalidateUserCache } from "./entitlements";
import { emitSubscriptionChanged } from "./events";

/**
 * Subscription lifecycle operations.
 *
 * - `ensureFreeSubscription(userId)` — idempotent, create free subscription kalau
 *   user belum punya. Dipanggil dari Agent 3 callback saat signup.
 * - `createPendingUpgrade(userId, tierKode, cycle, provider)` — buat invoice draft
 *   untuk tier baru. Subscription baru di-aktivasi setelah payment webhook.
 * - `activatePaidSubscription(userId, invoiceId)` — promote subscription ke tier
 *   target setelah pembayaran berhasil.
 * - `cancelSubscription(userId, opts)` — mark cancel_at_period_end atau immediate.
 *
 * Semua mutation tulis ke subscription_history sebagai audit trail.
 */

interface EnsureFreeOptions {
  userId: string;
  metadata?: Record<string, unknown>;
}

export async function ensureFreeSubscription(opts: EnsureFreeOptions): Promise<UserSubscription> {
  const existing = await db
    .select()
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, opts.userId),
        inArray(userSubscriptions.status, ["active", "trialing"]),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!;
  }

  // Pastikan tier free ada (seeded).
  const freeTier = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.kode, DEFAULT_FREE_TIER_KODE))
    .limit(1);
  if (freeTier.length === 0) {
    throw new ValidationError(
      "Free tier belum di-seed. Jalankan db:seed sebelum signup user.",
    );
  }

  const now = new Date();
  const id = ulid();
  const inserted = await db
    .insert(userSubscriptions)
    .values({
      id,
      userId: opts.userId,
      tierKode: DEFAULT_FREE_TIER_KODE,
      status: "active",
      billingCycle: "monthly",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      provider: "manual",
      metadata: opts.metadata ?? {},
    })
    .returning();

  await db.insert(subscriptionHistory).values({
    userId: opts.userId,
    subscriptionId: id,
    action: "created",
    toTierKode: DEFAULT_FREE_TIER_KODE,
    toStatus: "active",
    actorUserId: null,
    reason: "Auto-created on signup",
  });

  invalidateUserCache(opts.userId);
  await emitSubscriptionChanged({
    userId: opts.userId,
    subscriptionId: id,
    fromTier: null,
    toTier: DEFAULT_FREE_TIER_KODE,
    action: "created",
  });

  logger.info({ userId: opts.userId, subscriptionId: id }, "Free subscription created");
  return inserted[0]!;
}

/**
 * Start trial subscription untuk user — tier "pro" by default, 7 hari.
 *
 * Idempotent: kalau user sudah punya active/trialing subscription, return existing.
 * Worker `expire-trial` akan auto-downgrade ke Free setelah trial_ends_at.
 */
export async function startTrialSubscription(opts: {
  userId: string;
  tierKode?: TierKode;
  durationDays?: number;
  metadata?: Record<string, unknown>;
}): Promise<UserSubscription> {
  // Idempotent — kalau sudah ada active/trialing, tidak override
  const existing = await db
    .select()
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, opts.userId),
        inArray(userSubscriptions.status, ["active", "trialing"]),
      ),
    )
    .limit(1);

  const targetTier = opts.tierKode ?? ("pro" as TierKode);
  const durationDays = opts.durationDays ?? 7;
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + durationDays * 86400000);

  // Kalau already trialing pro, return as-is
  if (existing.length > 0 && existing[0]!.status === "trialing" && existing[0]!.tierKode === targetTier) {
    return existing[0]!;
  }

  // Upgrade existing free subscription ke trialing pro
  if (existing.length > 0) {
    const existingSub = existing[0]!;
    const updated = await db
      .update(userSubscriptions)
      .set({
        tierKode: targetTier,
        status: "trialing",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        metadata: { ...((existingSub.metadata as Record<string, unknown>) ?? {}), ...(opts.metadata ?? {}), trialStartedAt: now.toISOString() },
        updatedAt: now,
      })
      .where(eq(userSubscriptions.id, existingSub.id))
      .returning();

    await db.insert(subscriptionHistory).values({
      userId: opts.userId,
      subscriptionId: existingSub.id,
      action: "trial_started",
      fromTierKode: existingSub.tierKode,
      toTierKode: targetTier,
      fromStatus: existingSub.status,
      toStatus: "trialing",
      actorUserId: null,
      reason: `Trial ${durationDays} hari dimulai`,
    });

    invalidateUserCache(opts.userId);
    await emitSubscriptionChanged({
      userId: opts.userId,
      subscriptionId: existingSub.id,
      fromTier: existingSub.tierKode as TierKode,
      toTier: targetTier,
      action: "trial_started",
    });

    logger.info(
      { userId: opts.userId, subscriptionId: existingSub.id, trialEndsAt, tierKode: targetTier },
      "Trial subscription started (upgrade from existing)",
    );
    return updated[0]!;
  }

  // Buat baru sebagai trialing
  const id = ulid();
  const inserted = await db
    .insert(userSubscriptions)
    .values({
      id,
      userId: opts.userId,
      tierKode: targetTier,
      status: "trialing",
      billingCycle: "monthly",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
      provider: "manual",
      metadata: { ...(opts.metadata ?? {}), trialStartedAt: now.toISOString() },
    })
    .returning();

  await db.insert(subscriptionHistory).values({
    userId: opts.userId,
    subscriptionId: id,
    action: "trial_started",
    toTierKode: targetTier,
    toStatus: "trialing",
    actorUserId: null,
    reason: `Trial ${durationDays} hari dimulai pada signup`,
  });

  invalidateUserCache(opts.userId);
  await emitSubscriptionChanged({
    userId: opts.userId,
    subscriptionId: id,
    fromTier: null,
    toTier: targetTier,
    action: "trial_started",
  });

  logger.info(
    { userId: opts.userId, subscriptionId: id, trialEndsAt, tierKode: targetTier },
    "Trial subscription created (fresh)",
  );
  return inserted[0]!;
}

export async function getActiveSubscription(
  userId: string,
): Promise<{ subscription: UserSubscription; tier: SubscriptionTier } | null> {
  const rows = await db
    .select()
    .from(userSubscriptions)
    .innerJoin(subscriptionTiers, eq(userSubscriptions.tierKode, subscriptionTiers.kode))
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        inArray(userSubscriptions.status, ["active", "trialing"]),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  return {
    subscription: rows[0]!.user_subscriptions,
    tier: rows[0]!.subscription_tiers,
  };
}

interface CreatePendingUpgradeOptions {
  userId: string;
  targetTierKode: TierKode;
  billingCycle: BillingCycle;
  provider: SubscriptionProvider;
}

interface CreatePendingUpgradeResult {
  invoiceId: string;
  invoiceNumber: string;
  amountIdr: number;
  targetTier: SubscriptionTier;
}

export async function createPendingUpgrade(
  opts: CreatePendingUpgradeOptions,
): Promise<CreatePendingUpgradeResult> {
  const targetTier = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.kode, opts.targetTierKode))
    .limit(1);

  if (targetTier.length === 0) {
    throw new NotFoundError(`Tier ${opts.targetTierKode}`);
  }
  const tier = targetTier[0]!;
  if (!tier.isActive) {
    throw new ValidationError(`Tier ${opts.targetTierKode} tidak aktif`);
  }

  const amount =
    opts.billingCycle === "annual" ? tier.priceAnnualIdr : tier.priceMonthlyIdr;

  if (amount <= 0) {
    throw new ValidationError(
      "Tier ini tidak berbayar — tidak perlu invoice. Gunakan endpoint downgrade kalau ingin pindah ke free.",
    );
  }

  const active = await getActiveSubscription(opts.userId);
  const invoiceId = ulid();
  const invoiceNumber = `NUB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${invoiceId.slice(-8)}`;
  const now = new Date();
  const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam

  await db.insert(invoices).values({
    id: invoiceId,
    userId: opts.userId,
    subscriptionId: active?.subscription.id ?? null,
    tierKode: opts.targetTierKode,
    billingCycle: opts.billingCycle,
    amountIdr: amount,
    currency: "IDR",
    status: "draft",
    issuedAt: now,
    dueDate,
    provider: opts.provider,
    invoiceNumber,
    metadata: {
      targetTierKode: opts.targetTierKode,
      fromTierKode: active?.subscription.tierKode ?? null,
    },
  });

  logger.info(
    { userId: opts.userId, invoiceId, tier: opts.targetTierKode, amount },
    "Pending upgrade invoice created",
  );

  return {
    invoiceId,
    invoiceNumber,
    amountIdr: amount,
    targetTier: tier,
  };
}

/**
 * Activate subscription setelah payment berhasil. Idempotent — pemanggilan
 * berulang dari webhook duplicate aman.
 */
export async function activatePaidSubscription(opts: {
  userId: string;
  invoiceId: string;
}): Promise<UserSubscription> {
  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, opts.invoiceId))
    .limit(1);

  if (invoice.length === 0) throw new NotFoundError(`Invoice ${opts.invoiceId}`);
  const inv = invoice[0]!;
  if (inv.userId !== opts.userId) {
    throw new ValidationError("Invoice user mismatch");
  }

  // Tutup subscription aktif sebelumnya (downgrade/expired).
  const active = await getActiveSubscription(opts.userId);
  const now = new Date();
  const cycleDays = inv.billingCycle === "annual" ? 365 : 30;
  const periodEnd = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000);

  if (active) {
    await db
      .update(userSubscriptions)
      .set({
        status: "expired",
        currentPeriodEnd: now,
        updatedAt: now,
      })
      .where(eq(userSubscriptions.id, active.subscription.id));
  }

  const newId = ulid();
  const inserted = await db
    .insert(userSubscriptions)
    .values({
      id: newId,
      userId: opts.userId,
      tierKode: inv.tierKode,
      status: "active",
      billingCycle: inv.billingCycle,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      provider: inv.provider,
      metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber },
    })
    .returning();

  await db
    .update(invoices)
    .set({ status: "paid", paidAt: now, subscriptionId: newId, updatedAt: now })
    .where(eq(invoices.id, inv.id));

  await db.insert(subscriptionHistory).values({
    userId: opts.userId,
    subscriptionId: newId,
    action: active ? "upgraded" : "created",
    fromTierKode: active?.subscription.tierKode ?? null,
    toTierKode: inv.tierKode,
    fromStatus: active?.subscription.status ?? null,
    toStatus: "active",
    reason: `Paid via ${inv.provider} invoice ${inv.invoiceNumber}`,
  });

  invalidateUserCache(opts.userId);
  await emitSubscriptionChanged({
    userId: opts.userId,
    subscriptionId: newId,
    fromTier: (active?.subscription.tierKode ?? null) as TierKode | null,
    toTier: inv.tierKode as TierKode,
    action: active ? "upgraded" : "created",
  });

  logger.info(
    { userId: opts.userId, tier: inv.tierKode, subscriptionId: newId },
    "Paid subscription activated",
  );

  return inserted[0]!;
}

export async function cancelSubscription(opts: {
  userId: string;
  immediate?: boolean;
  reason?: string;
  actorUserId?: string | null;
}): Promise<UserSubscription> {
  const active = await getActiveSubscription(opts.userId);
  if (!active) {
    throw new NotFoundError("Active subscription");
  }
  if (active.subscription.tierKode === DEFAULT_FREE_TIER_KODE) {
    throw new ValidationError("Tidak bisa cancel paket Free.");
  }

  const now = new Date();
  const isImmediate = opts.immediate === true;

  await db
    .update(userSubscriptions)
    .set({
      cancelAtPeriodEnd: !isImmediate,
      cancelledAt: now,
      status: isImmediate ? "cancelled" : active.subscription.status,
      updatedAt: now,
    })
    .where(eq(userSubscriptions.id, active.subscription.id));

  await db.insert(subscriptionHistory).values({
    userId: opts.userId,
    subscriptionId: active.subscription.id,
    action: "cancelled",
    fromTierKode: active.subscription.tierKode,
    toTierKode: isImmediate ? DEFAULT_FREE_TIER_KODE : active.subscription.tierKode,
    fromStatus: active.subscription.status,
    toStatus: isImmediate ? "cancelled" : active.subscription.status,
    actorUserId: opts.actorUserId ?? null,
    reason: opts.reason ?? null,
  });

  // Kalau immediate, downgrade ke free supaya user tetap punya entitlement free.
  if (isImmediate) {
    await ensureFreeSubscription({ userId: opts.userId, metadata: { downgradedFrom: active.subscription.tierKode } });
  }

  invalidateUserCache(opts.userId);
  await emitSubscriptionChanged({
    userId: opts.userId,
    subscriptionId: active.subscription.id,
    fromTier: active.subscription.tierKode as TierKode,
    toTier: isImmediate ? DEFAULT_FREE_TIER_KODE : (active.subscription.tierKode as TierKode),
    action: "cancelled",
  });

  logger.info(
    { userId: opts.userId, subscriptionId: active.subscription.id, immediate: isImmediate },
    "Subscription cancelled",
  );

  const updated = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.id, active.subscription.id))
    .limit(1);
  return updated[0]!;
}

export async function listUserInvoices(userId: string, limit = 20) {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.issuedAt))
    .limit(limit);
}
