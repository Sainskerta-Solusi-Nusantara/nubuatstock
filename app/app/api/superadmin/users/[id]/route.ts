import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions } from "@/db/schema/auth";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";

/**
 * DELETE /api/superadmin/users/[id]
 * Soft-delete user (set deleted_at) + revoke sesi. Tidak bisa hapus diri sendiri.
 * Anti-lockout: superadmin lain tetap ada.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const actor = requireSuperadmin(session);
    const { id } = await params;

    if (actor.userId === id) {
      return fail(400, "SELF_DELETE", "Kamu tidak bisa menghapus akunmu sendiri.");
    }

    const rows = (await db.execute(
      sql`SELECT id, email, role FROM users WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`,
    )) as unknown as Array<Record<string, unknown>>;
    const target = rows[0];
    if (!target) return fail(404, "USER_NOT_FOUND", "User tidak ditemukan atau sudah dihapus");

    const now = new Date();
    await db.update(users).set({ deletedAt: now, updatedAt: now }).where(eq(users.id, id));
    // Cabut semua sesi user (langsung logout).
    await db.delete(sessions).where(eq(sessions.userId, id));

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "user.delete",
      targetType: "user",
      targetId: id,
      before: { email: target.email, role: target.role },
      after: { deletedAt: now.toISOString() },
      metadata: { targetEmail: target.email, soft: true },
    });

    return ok({ userId: id, deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
