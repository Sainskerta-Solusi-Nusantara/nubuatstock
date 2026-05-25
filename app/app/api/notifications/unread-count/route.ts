import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { notifications } from "@/db/schema/notifications";
import { handleError, ok } from "@/lib/utils/api";

/**
 * GET /api/notifications/unread-count
 *
 * Returns `{ count: number }` untuk badge in-app.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false),
        ),
      );
    return ok({ count: row?.count ?? 0 });
  } catch (err) {
    return handleError(err);
  }
}
