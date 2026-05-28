import type { Processor } from "bullmq";
import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { users, verifications } from "@/db/schema/auth";
import { watchlists, watchlistItems, alerts, alertTriggers } from "@/db/schema/user-data";
import { savedScreens } from "@/db/schema/saved-screens";
import {
  paperPortfolios,
  paperPositions,
  paperTrades,
  paperLeaderboardSnapshots,
} from "@/db/schema/paper-trading";
import { aiConversations, aiMessages, aiUsageLog } from "@/db/schema/ai";
import { notifications } from "@/db/schema/notifications";
import { supportTickets, supportMessages } from "@/db/schema/support";

/**
 * UU PDP — Account hard-delete sweep (FOLLOW-UP IMPROVEMENT_PLAN §8.7 #46).
 *
 * Cari user dengan `scheduledDeletionAt <= now()` (soft-deleted + grace 30 hari
 * lewat — lihat lib/account/delete.ts) lalu HAPUS PERMANEN semua datanya.
 *
 * Catatan penting soal FK:
 *  - Sebagian tabel ber-`user_id` di skema ini adalah SOFT reference
 *    (`ulidRef` = text NOT NULL tanpa `.references()`), jadi TIDAK ada
 *    ON DELETE CASCADE dari DB. Tabel-tabel ini WAJIB dihapus eksplisit di sini:
 *      watchlists, alerts, saved_screens, paper_portfolios, ai_conversations,
 *      ai_usage_log, notifications, support_tickets (+ pesannya), verification_tokens.
 *    Plus tabel anak yang ber-parent ke baris milik user (watchlist_items,
 *    alert_triggers, paper_positions/trades/leaderboard, ai_messages,
 *    support_messages).
 *  - Tabel yang PUNYA real FK cascade ke users.id (sessions, accounts,
 *    mfa_factors, password_history, user_subscriptions, subscription_history,
 *    invoices, payments, usage_counters, user_legal_acceptances) akan terhapus
 *    otomatis saat baris `users` di-delete — tidak perlu dihapus manual.
 *
 * Idempotent & defensif: dijalankan per-user di dalam transaction; kalau satu
 * user gagal, user lain tetap diproses. Jumlah baris ter-purge dilog & dikembalikan.
 *
 * Cron: harian 03:00 WIB (lihat lib/queue/scheduler.ts, key
 * `account.deletion_sweep_cron`).
 */

interface SweepSummary {
  scanned: number;
  deletedUsers: number;
  errors: number;
}

/** Hard-delete seluruh data milik satu user dalam satu transaction. */
async function purgeUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // --- Resolusi id parent milik user (untuk hapus tabel anak soft-FK) ---
    const [watchlistRows, alertRows, portfolioRows, conversationRows, ticketRows] =
      await Promise.all([
        tx.select({ id: watchlists.id }).from(watchlists).where(eq(watchlists.userId, userId)),
        tx.select({ id: alerts.id }).from(alerts).where(eq(alerts.userId, userId)),
        tx
          .select({ id: paperPortfolios.id })
          .from(paperPortfolios)
          .where(eq(paperPortfolios.userId, userId)),
        tx
          .select({ id: aiConversations.id })
          .from(aiConversations)
          .where(eq(aiConversations.userId, userId)),
        tx.select({ id: supportTickets.id }).from(supportTickets).where(eq(supportTickets.userId, userId)),
      ]);

    const watchlistIds = watchlistRows.map((r) => r.id);
    const alertIds = alertRows.map((r) => r.id);
    const portfolioIds = portfolioRows.map((r) => r.id);
    const conversationIds = conversationRows.map((r) => r.id);
    const ticketIds = ticketRows.map((r) => r.id);

    // --- Tabel anak (soft FK ke parent milik user) ---
    if (watchlistIds.length) {
      await tx.delete(watchlistItems).where(inArray(watchlistItems.watchlistId, watchlistIds));
    }
    if (alertIds.length) {
      await tx.delete(alertTriggers).where(inArray(alertTriggers.alertId, alertIds));
    }
    if (portfolioIds.length) {
      await tx.delete(paperPositions).where(inArray(paperPositions.portfolioId, portfolioIds));
      await tx.delete(paperTrades).where(inArray(paperTrades.portfolioId, portfolioIds));
      await tx
        .delete(paperLeaderboardSnapshots)
        .where(inArray(paperLeaderboardSnapshots.portfolioId, portfolioIds));
    }
    if (conversationIds.length) {
      await tx.delete(aiMessages).where(inArray(aiMessages.conversationId, conversationIds));
    }
    if (ticketIds.length) {
      // Pesan dalam ticket milik user (siapa pun authornya) + pesan yang ditulis user.
      await tx.delete(supportMessages).where(inArray(supportMessages.ticketId, ticketIds));
    }
    await tx.delete(supportMessages).where(eq(supportMessages.authorUserId, userId));

    // --- Tabel parent ber-user_id (soft FK, tanpa cascade) ---
    await tx.delete(watchlists).where(eq(watchlists.userId, userId));
    await tx.delete(alerts).where(eq(alerts.userId, userId));
    await tx.delete(savedScreens).where(eq(savedScreens.userId, userId));
    await tx.delete(paperPortfolios).where(eq(paperPortfolios.userId, userId));
    await tx.delete(aiConversations).where(eq(aiConversations.userId, userId));
    await tx.delete(aiUsageLog).where(eq(aiUsageLog.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(supportTickets).where(eq(supportTickets.userId, userId));

    // verification_tokens.user_id = plain text tanpa FK → bersihkan eksplisit.
    await tx.delete(verifications).where(eq(verifications.userId, userId));

    // --- Baris user: real-FK cascade akan menghapus sisanya (sessions,
    //     accounts, billing, legal, dst). ---
    await tx.delete(users).where(eq(users.id, userId));
  });
}

export const accountDeletionSweepProcessor: Processor = async () => {
  logger.info("Running account deletion sweep...");

  const now = new Date();
  const due = await db
    .select({ id: users.id, scheduledDeletionAt: users.scheduledDeletionAt })
    .from(users)
    .where(
      and(
        isNotNull(users.scheduledDeletionAt),
        lte(users.scheduledDeletionAt, now),
      ),
    );

  const summary: SweepSummary = { scanned: due.length, deletedUsers: 0, errors: 0 };

  if (due.length === 0) {
    logger.info("No accounts due for hard deletion");
    return summary;
  }

  logger.info({ count: due.length }, "Accounts due for hard deletion");

  for (const u of due) {
    try {
      await purgeUser(u.id);
      summary.deletedUsers++;
      logger.info({ userId: u.id }, "Account permanently purged");

      // Best-effort: emit event supaya downstream (cache, search index) tahu.
      try {
        const { publishEvent } = await import("@/lib/queue/events");
        if (publishEvent) {
          await publishEvent("user.deleted", {
            userId: u.id,
            deletedAt: new Date().toISOString(),
          });
        }
      } catch {
        // ignore — event bus optional
      }
    } catch (err) {
      summary.errors++;
      logger.error({ err, userId: u.id }, "Failed to purge account");
    }
  }

  logger.info(summary, "Account deletion sweep done");
  return summary;
};
