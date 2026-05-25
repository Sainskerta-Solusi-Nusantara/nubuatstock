import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { notifications } from "@/db/schema/notifications";
import { handleError, ok } from "@/lib/utils/api";
import { NotFoundError } from "@/lib/errors";

/**
 * POST /api/notifications/[id]/read
 *
 * Tandai single notifikasi sebagai read. Hanya pemilik (userId) yang boleh.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const rows = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, session.user.id),
        ),
      )
      .returning({ id: notifications.id });

    if (rows.length === 0) throw new NotFoundError("Notification");
    return ok({ id: rows[0]?.id, isRead: true });
  } catch (err) {
    return handleError(err);
  }
}
