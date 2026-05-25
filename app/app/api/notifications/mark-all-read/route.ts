import { requireSession } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/notifications";
import { handleError, ok } from "@/lib/utils/api";

/**
 * POST /api/notifications/mark-all-read
 *
 * Tandai semua notifikasi unread milik user sebagai read.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const updated = await markNotificationsRead(session.user.id);
    return ok({ updated });
  } catch (err) {
    return handleError(err);
  }
}
