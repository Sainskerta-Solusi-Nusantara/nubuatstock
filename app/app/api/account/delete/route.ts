import { NextRequest } from "next/server";

import { handleError, ok } from "@/lib/utils/api";
import { getAuth, requireSession } from "@/lib/auth";
import { auditLog } from "@/lib/observability/audit";
import { logger } from "@/lib/logger";
import { requestAccountDeletion } from "@/lib/account/delete";

/**
 * UU PDP — Account deletion endpoint.
 *
 * `POST` /api/account/delete
 *   - Auth WAJIB.
 *   - Soft-delete akun + jadwalkan hard-delete 30 hari ke depan (grace period).
 *   - Sign-out semua sesi (better-auth signOut) supaya akun langsung tidak bisa dipakai.
 *   - Tulis audit log.
 *
 * Hard-delete permanen dieksekusi oleh worker/cron terpisah yang men-sweep
 * baris dengan `scheduled_deletion_at <= now()` (FOLLOW-UP, di luar scope).
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.userId;

    const result = await requestAccountDeletion(userId);

    await auditLog({
      action: "account.deletion_requested",
      targetType: "user",
      targetId: userId,
      actorUserId: userId,
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: {
        scheduledDeletionAt: result.scheduledDeletionAt.toISOString(),
        graceDays: result.graceDays,
      },
    });

    // Cabut sesi aktif. Best-effort — jangan gagalkan request kalau signOut error.
    try {
      const auth = await getAuth();
      await auth.api.signOut({ headers: req.headers });
    } catch (err) {
      logger.warn({ err, userId }, "signOut during account deletion failed");
    }

    return ok({
      scheduledDeletionAt: result.scheduledDeletionAt.toISOString(),
      deletionRequestedAt: result.deletionRequestedAt.toISOString(),
      graceDays: result.graceDays,
      message: `Akun dijadwalkan untuk dihapus pada ${result.scheduledDeletionAt
        .toISOString()
        .slice(0, 10)}. Login kembali dalam ${result.graceDays} hari untuk membatalkan.`,
    });
  } catch (err) {
    return handleError(err);
  }
}
