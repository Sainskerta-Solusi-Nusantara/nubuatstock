/**
 * UU PDP — Data export (hak akses & portabilitas data subjek data pribadi).
 *
 * `collectUserData(userId)` mengumpulkan SELURUH data milik satu user dari
 * semua tabel yang punya kolom `user_id` (atau yang terhubung lewat FK ke
 * baris milik user), lalu mengembalikannya sebagai satu objek JSON serializable.
 *
 * Catatan keamanan:
 * - Field sensitif (password hash, token, secret terenkripsi) DIBUANG / di-redact.
 *   Subjek data berhak atas datanya, bukan atas kredensial internal sistem.
 * - Semua query difilter ketat by `userId` (atau parent id milik user).
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import {
  watchlists,
  watchlistItems,
  alerts,
  alertTriggers,
} from "@/db/schema/user-data";
import { savedScreens } from "@/db/schema/saved-screens";
import {
  paperPortfolios,
  paperPositions,
  paperTrades,
} from "@/db/schema/paper-trading";
import {
  userSubscriptions,
  subscriptionHistory,
  invoices,
  payments,
  usageCounters,
} from "@/db/schema/billing";
import { userLegalAcceptances } from "@/db/schema/legal-acceptance";
import { aiConversations, aiMessages, aiUsageLog } from "@/db/schema/ai";
import { notifications } from "@/db/schema/notifications";
import { supportTickets, supportMessages } from "@/db/schema/support";

export interface UserDataExport {
  meta: {
    exportedAt: string;
    userId: string;
    format: "nubuat.account-export";
    version: 1;
  };
  profile: Record<string, unknown> | null;
  watchlists: unknown[];
  watchlistItems: unknown[];
  alerts: unknown[];
  alertTriggers: unknown[];
  savedScreens: unknown[];
  paperPortfolios: unknown[];
  paperPositions: unknown[];
  paperTrades: unknown[];
  subscriptions: unknown[];
  subscriptionHistory: unknown[];
  invoices: unknown[];
  payments: unknown[];
  usageCounters: unknown[];
  legalAcceptances: unknown[];
  aiConversations: unknown[];
  aiMessages: unknown[];
  aiUsage: unknown[];
  notifications: unknown[];
  supportTickets: unknown[];
  supportMessages: unknown[];
}

/** Buang field sensitif dari baris profil user sebelum diekspor. */
function sanitizeProfile(
  row: typeof users.$inferSelect | undefined,
): Record<string, unknown> | null {
  if (!row) return null;
  // Whitelist kolom yang aman & relevan untuk subjek data.
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.emailVerified,
    emailVerifiedAt: row.emailVerifiedAt,
    image: row.image,
    role: row.role,
    locale: row.locale,
    timezone: row.timezone,
    phone: row.phone,
    phoneVerifiedAt: row.phoneVerifiedAt,
    mfaEnabled: row.mfaEnabled,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletionRequestedAt: row.deletionRequestedAt,
    scheduledDeletionAt: row.scheduledDeletionAt,
  };
}

/**
 * Kumpulkan semua data milik `userId`. Menjalankan query parent dulu, lalu
 * child-table di-resolve via id parent (watchlist items, paper positions/trades,
 * AI messages, support messages, alert triggers).
 */
export async function collectUserData(userId: string): Promise<UserDataExport> {
  const [
    profileRow,
    watchlistRows,
    alertRows,
    savedScreenRows,
    portfolioRows,
    subscriptionRows,
    subHistoryRows,
    invoiceRows,
    paymentRows,
    usageCounterRows,
    legalRows,
    conversationRows,
    aiUsageRows,
    notificationRows,
    ticketRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(watchlists).where(eq(watchlists.userId, userId)),
    db.select().from(alerts).where(eq(alerts.userId, userId)),
    db.select().from(savedScreens).where(eq(savedScreens.userId, userId)),
    db.select().from(paperPortfolios).where(eq(paperPortfolios.userId, userId)),
    db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)),
    db.select().from(subscriptionHistory).where(eq(subscriptionHistory.userId, userId)),
    db.select().from(invoices).where(eq(invoices.userId, userId)),
    db.select().from(payments).where(eq(payments.userId, userId)),
    db.select().from(usageCounters).where(eq(usageCounters.userId, userId)),
    db.select().from(userLegalAcceptances).where(eq(userLegalAcceptances.userId, userId)),
    db.select().from(aiConversations).where(eq(aiConversations.userId, userId)),
    db.select().from(aiUsageLog).where(eq(aiUsageLog.userId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select().from(supportTickets).where(eq(supportTickets.userId, userId)),
  ]);

  const watchlistIds = watchlistRows.map((w) => w.id);
  const alertIds = alertRows.map((a) => a.id);
  const portfolioIds = portfolioRows.map((p) => p.id);
  const conversationIds = conversationRows.map((c) => c.id);
  const ticketIds = ticketRows.map((t) => t.id);

  const [
    watchlistItemRows,
    alertTriggerRows,
    positionRows,
    tradeRows,
    aiMessageRows,
    supportMessageRows,
  ] = await Promise.all([
    watchlistIds.length
      ? db.select().from(watchlistItems).where(inArray(watchlistItems.watchlistId, watchlistIds))
      : Promise.resolve([]),
    alertIds.length
      ? db.select().from(alertTriggers).where(inArray(alertTriggers.alertId, alertIds))
      : Promise.resolve([]),
    portfolioIds.length
      ? db.select().from(paperPositions).where(inArray(paperPositions.portfolioId, portfolioIds))
      : Promise.resolve([]),
    portfolioIds.length
      ? db.select().from(paperTrades).where(inArray(paperTrades.portfolioId, portfolioIds))
      : Promise.resolve([]),
    conversationIds.length
      ? db.select().from(aiMessages).where(inArray(aiMessages.conversationId, conversationIds))
      : Promise.resolve([]),
    ticketIds.length
      ? db
          .select()
          .from(supportMessages)
          .where(
            and(
              inArray(supportMessages.ticketId, ticketIds),
              eq(supportMessages.authorUserId, userId),
            ),
          )
      : Promise.resolve([]),
  ]);

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      userId,
      format: "nubuat.account-export",
      version: 1,
    },
    profile: sanitizeProfile(profileRow[0]),
    watchlists: watchlistRows,
    watchlistItems: watchlistItemRows,
    alerts: alertRows,
    alertTriggers: alertTriggerRows,
    savedScreens: savedScreenRows,
    paperPortfolios: portfolioRows,
    paperPositions: positionRows,
    paperTrades: tradeRows,
    subscriptions: subscriptionRows,
    subscriptionHistory: subHistoryRows,
    invoices: invoiceRows,
    payments: paymentRows,
    usageCounters: usageCounterRows,
    legalAcceptances: legalRows,
    aiConversations: conversationRows,
    aiMessages: aiMessageRows,
    aiUsage: aiUsageRows,
    notifications: notificationRows,
    supportTickets: ticketRows,
    supportMessages: supportMessageRows,
  };
}

/** Buat nama file ekspor yang stabil & aman. */
export function buildExportFilename(userId: string, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  const safeId = userId.replace(/[^A-Za-z0-9_-]/g, "");
  return `nubuat-data-export-${safeId}-${stamp}.json`;
}
