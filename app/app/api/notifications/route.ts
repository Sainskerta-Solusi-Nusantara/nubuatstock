import type { NextRequest } from "next/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { notifications } from "@/db/schema/notifications";
import { handleError, ok } from "@/lib/utils/api";
import {
  listNotificationsQuerySchema,
  type NotificationFeedItem,
  type NotificationFeedResponse,
} from "@/lib/types/notifications";

/**
 * GET /api/notifications
 *
 * Cursor-paginated user notification feed.
 * Query params:
 *   limit       1-100 (default 20)
 *   cursor      notification.id dari item terakhir (ULID time-sortable)
 *   unreadOnly  "true" / "false"
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const params = listNotificationsQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") ?? undefined,
    });

    const where = [eq(notifications.userId, session.user.id)];
    if (params.unreadOnly) where.push(eq(notifications.isRead, false));
    if (params.cursor) where.push(lt(notifications.id, params.cursor));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...where))
      .orderBy(desc(notifications.id))
      .limit(params.limit + 1);

    const hasMore = rows.length > params.limit;
    const slice = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? slice[slice.length - 1]?.id ?? null : null;

    const items: NotificationFeedItem[] = slice.map((r) => ({
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

    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)),
      );
    const count = countRows[0]?.count ?? 0;

    const response: NotificationFeedResponse = {
      items,
      nextCursor,
      unreadCount: count,
    };
    return ok(response);
  } catch (err) {
    return handleError(err);
  }
}
