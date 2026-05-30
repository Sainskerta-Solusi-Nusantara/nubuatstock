import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { notifications } from "@/db/schema/notifications";
import { handleError, ok } from "@/lib/utils/api";
import type {
  NotificationFeedItem,
  NotificationFeedResponse,
} from "@/lib/types/notifications";

/**
 * GET /api/notifications/list
 *
 * Daftar 30 notifikasi terbaru milik user (terbaru dulu) + unreadCount.
 * Dipakai NotificationBell (dropdown lonceng) & polling badge unread.
 *
 * Catatan: GET /api/notifications (root) menyediakan feed cursor-paginated yang
 * lebih lengkap. Endpoint ini versi ringkas (limit tetap 30) khusus untuk lonceng
 * in-app supaya kontraknya stabil & sederhana.
 */
export const dynamic = "force-dynamic";

const LIST_LIMIT = 30;

export async function GET() {
  try {
    const session = await requireSession();

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.id))
      .limit(LIST_LIMIT);

    const items: NotificationFeedItem[] = rows.map((r) => ({
      id: r.id,
      templateKey: r.templateKey,
      title: r.title,
      body: r.body,
      linkUrl: r.linkUrl ?? null,
      severity: r.severity,
      isRead: r.isRead,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      payload: r.payload ?? {},
    }));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false),
        ),
      );

    const response: NotificationFeedResponse = {
      items,
      nextCursor: null,
      unreadCount: countRow?.count ?? 0,
    };
    return ok(response);
  } catch (err) {
    return handleError(err);
  }
}
