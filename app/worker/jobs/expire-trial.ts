import type { Processor } from "bullmq";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSubscriptions, subscriptionHistory } from "@/db/schema/billing";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Daily job: cek semua subscription status="trialing" yang trial_ends_at < now.
 * Transition mereka ke fallback tier (default: "free") secara seamless.
 *
 * Idempotent — kalau row sudah cancelled, skip. Log ke subscription_history
 * untuk audit trail.
 *
 * Cron schedule: `0 1 * * *` (01:00 WIB tiap hari) — di-bootstrap di scheduler.
 *
 * Side effect: emit `subscription.changed` event supaya entitlement cache
 * invalidated di sisi user (next request akan re-resolve tier).
 */
export const expireTrialProcessor: Processor = async () => {
  logger.info("Running trial expiry job...");
  const fallbackTier = await getConfig<string>("trial.fallback_tier", { defaultValue: "free" });

  const now = new Date();
  // Cari trialing subs yang sudah expire
  const expired = await db
    .select({
      id: userSubscriptions.id,
      userId: userSubscriptions.userId,
      tierKode: userSubscriptions.tierKode,
      trialEndsAt: userSubscriptions.trialEndsAt,
    })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.status, "trialing"),
        lt(userSubscriptions.trialEndsAt, now),
      ),
    );

  if (expired.length === 0) {
    logger.info("No trials to expire");
    return { processed: 0 };
  }

  logger.info({ count: expired.length }, "Expiring trials...");
  let processed = 0;
  let errors = 0;

  for (const sub of expired) {
    try {
      // Mark old trial as expired
      await db
        .update(userSubscriptions)
        .set({
          status: "expired",
          currentPeriodEnd: now,
        })
        .where(eq(userSubscriptions.id, sub.id));

      // Create new Free subscription
      const newSubs = await db
        .insert(userSubscriptions)
        .values({
          userId: sub.userId,
          tierKode: fallbackTier,
          status: "active",
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 365 * 86400_000), // 1 year forward
          cancelAtPeriodEnd: false,
          provider: "manual",
        })
        .returning();

      // Audit log subscription change
      const newSubId = newSubs[0]?.id ?? sub.id;
      await db
        .insert(subscriptionHistory)
        .values({
          userId: sub.userId,
          subscriptionId: newSubId,
          action: "trial_ended",
          fromTierKode: sub.tierKode,
          toTierKode: fallbackTier,
          fromStatus: "trialing",
          toStatus: "active",
          occurredAt: now,
          metadata: { previousSubscriptionId: sub.id, newSubscriptionId: newSubs[0]?.id },
        })
        .catch(() => undefined); // subscription_history table optional

      // Emit event untuk invalidate cache
      try {
        const { publishEvent } = await import("@/lib/queue/events");
        if (publishEvent) {
          await publishEvent("subscription.changed", {
            userId: sub.userId,
            previousTier: sub.tierKode,
            newTier: fallbackTier,
            changedAt: now.toISOString(),
            reason: "trial_expired",
          });
        }
      } catch {
        // ignore
      }

      // Send notification: trial expired email
      try {
        const { getQueue } = await import("@/lib/queue");
        const q = await getQueue("notifications.send");
        await q.add(
          "trial-expired-email",
          { userId: sub.userId, fromTier: sub.tierKode, toTier: fallbackTier },
          { removeOnComplete: 100, removeOnFail: 200 },
        );
      } catch {
        // ignore
      }

      processed++;
    } catch (err) {
      logger.error({ err, subId: sub.id, userId: sub.userId }, "Failed to expire trial");
      errors++;
    }
  }

  logger.info({ processed, errors, total: expired.length }, "Trial expiry done");
  return { processed, errors, total: expired.length };
};
