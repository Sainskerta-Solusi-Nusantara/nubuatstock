import type { Processor } from "bullmq";
import { and, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/lib/db";
import {
  invoices,
  subscriptionHistory,
  subscriptionTiers,
  userSubscriptions,
} from "@/db/schema/billing";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { DEFAULT_FREE_TIER_KODE } from "@/lib/types/billing";

/**
 * Daily job: cari subscription `active` non-free yang `current_period_end`
 * <= now()+lookahead (default 3 hari) dan BELUM dijadwalkan cancel, lalu buat
 * invoice perpanjangan (renewal) untuk tier yang sama + emit event/notifikasi
 * "renewal due".
 *
 * MVP tanpa card-on-file: kita HANYA membuat invoice draft + reminder. Auto-charge
 * kartu sungguhan butuh recurring API gateway → DI LUAR scope. User membayar
 * invoice renewal lewat flow yang sama dengan upgrade (webhook → activate).
 *
 * Idempotent: kita pakai `period_window` (YYYY-MM-DD dari current_period_end)
 * di metadata invoice + cek apakah sudah ada invoice renewal untuk subscription
 * + periode yang sama. Jadi run berulang tidak membuat invoice dobel.
 *
 * Cron schedule: `0 2 * * *` (02:00 WIB tiap hari) — di-bootstrap di scheduler.
 */
export const renewSubscriptionsProcessor: Processor = async () => {
  logger.info("Running subscription renewal job...");

  const lookaheadDays = await getConfig<number>("billing.renew_lookahead_days", {
    defaultValue: 3,
  }).catch(() => 3);

  const now = new Date();
  const threshold = new Date(now.getTime() + lookaheadDays * 86_400_000);

  // Subscription aktif, non-free, period_end dalam jendela, & tidak cancel.
  const due = await db
    .select({
      id: userSubscriptions.id,
      userId: userSubscriptions.userId,
      tierKode: userSubscriptions.tierKode,
      billingCycle: userSubscriptions.billingCycle,
      provider: userSubscriptions.provider,
      currentPeriodEnd: userSubscriptions.currentPeriodEnd,
    })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.status, "active"),
        ne(userSubscriptions.tierKode, DEFAULT_FREE_TIER_KODE),
        eq(userSubscriptions.cancelAtPeriodEnd, false),
        lte(userSubscriptions.currentPeriodEnd, threshold),
        gt(userSubscriptions.currentPeriodEnd, now),
      ),
    );

  if (due.length === 0) {
    logger.info("No subscriptions due for renewal");
    return { processed: 0 };
  }

  logger.info({ count: due.length, lookaheadDays }, "Subscriptions due for renewal...");
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const sub of due) {
    try {
      const periodEnd = sub.currentPeriodEnd;
      if (!periodEnd) {
        skipped++;
        continue;
      }
      // Window key = tanggal akhir periode → satu invoice renewal per periode.
      const periodWindow = periodEnd.toISOString().slice(0, 10);

      // Idempotensi: cek apakah sudah ada invoice renewal untuk sub + window ini.
      const existing = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.subscriptionId, sub.id),
            inArray(invoices.status, ["draft", "sent", "paid"]),
            sql`${invoices.metadata} ->> 'renewal' = 'true'`,
            sql`${invoices.metadata} ->> 'periodWindow' = ${periodWindow}`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Harga tier saat ini (kalau tier tidak aktif lagi, skip — jangan tagih).
      const [tier] = await db
        .select()
        .from(subscriptionTiers)
        .where(eq(subscriptionTiers.kode, sub.tierKode))
        .limit(1);
      if (!tier || !tier.isActive) {
        skipped++;
        continue;
      }
      const amount = sub.billingCycle === "annual" ? tier.priceAnnualIdr : tier.priceMonthlyIdr;
      if (amount <= 0) {
        skipped++;
        continue;
      }

      const invoiceId = ulid();
      const invoiceNumber = `NUB-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${invoiceId.slice(-8)}`;
      // Renewal invoice jatuh tempo di akhir periode berjalan.
      const dueDate = periodEnd;
      const nextPeriodStart = periodEnd;
      const cycleDays = sub.billingCycle === "annual" ? 365 : 30;
      const nextPeriodEnd = new Date(periodEnd.getTime() + cycleDays * 86_400_000);

      await db.insert(invoices).values({
        id: invoiceId,
        userId: sub.userId,
        subscriptionId: sub.id,
        tierKode: sub.tierKode,
        billingCycle: sub.billingCycle,
        amountIdr: amount,
        currency: "IDR",
        status: "draft",
        issuedAt: now,
        dueDate,
        periodStart: nextPeriodStart,
        periodEnd: nextPeriodEnd,
        provider: sub.provider,
        invoiceNumber,
        metadata: {
          renewal: true,
          periodWindow,
          targetTierKode: sub.tierKode,
          fromTierKode: sub.tierKode,
        },
      });

      // Audit trail.
      await db
        .insert(subscriptionHistory)
        .values({
          userId: sub.userId,
          subscriptionId: sub.id,
          action: "renewed",
          fromTierKode: sub.tierKode,
          toTierKode: sub.tierKode,
          fromStatus: "active",
          toStatus: "active",
          occurredAt: now,
          reason: `Renewal due invoice ${invoiceNumber}`,
          metadata: { invoiceId, periodWindow },
        })
        .catch(() => undefined);

      // Emit subscription.changed (action "renewed") untuk fan-out/cache.
      try {
        const { emitSubscriptionChanged } = await import("@/lib/billing");
        await emitSubscriptionChanged({
          userId: sub.userId,
          subscriptionId: sub.id,
          fromTier: sub.tierKode as never,
          toTier: sub.tierKode as never,
          action: "renewed",
        });
      } catch (err) {
        logger.warn({ err, subId: sub.id }, "emitSubscriptionChanged renewed failed");
      }

      // Notifikasi "renewal due" (best-effort lewat queue notifications).
      try {
        const { getQueue } = await import("@/lib/queue");
        const q = await getQueue("notifications.send");
        await q.add(
          "renewal-due",
          {
            userId: sub.userId,
            tierKode: sub.tierKode,
            invoiceId,
            invoiceNumber,
            amountIdr: amount,
            dueDate: dueDate.toISOString(),
          },
          { removeOnComplete: 100, removeOnFail: 200 },
        );
      } catch (err) {
        logger.warn({ err, subId: sub.id }, "renewal-due notification enqueue failed");
      }

      processed++;
    } catch (err) {
      logger.error({ err, subId: sub.id, userId: sub.userId }, "Failed to create renewal invoice");
      errors++;
    }
  }

  logger.info({ processed, skipped, errors, total: due.length }, "Subscription renewal done");
  return { processed, skipped, errors, total: due.length };
};
