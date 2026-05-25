import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin, isValidRole } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";

const bodySchema = z.object({
  role: z.enum(["user", "admin", "superadmin"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const actor = requireSuperadmin(session);
    const { id } = await params;
    const body = await req.json();
    const { role } = bodySchema.parse(body);

    if (!isValidRole(role)) {
      return fail(400, "INVALID_ROLE", "Role tidak valid");
    }

    // Prevent self-demotion (anti-lockout)
    if (actor.userId === id && role !== "superadmin") {
      return fail(400, "SELF_DEMOTE", "Anda tidak bisa menurunkan role Anda sendiri. Minta superadmin lain.");
    }

    // Fetch before
    const beforeRows = (await db.execute(sql`SELECT id, email, role FROM users WHERE id = ${id} LIMIT 1`)) as unknown as Array<Record<string, unknown>>;
    const before = beforeRows[0];
    if (!before) return fail(404, "USER_NOT_FOUND", "User tidak ditemukan");
    const beforeRole = String(before.role ?? "user");

    if (beforeRole === role) {
      return ok({ unchanged: true, role });
    }

    await db.execute(sql`UPDATE users SET role = ${role}, updated_at = NOW() WHERE id = ${id}`);

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "user.role_change",
      targetType: "user",
      targetId: id,
      before: { role: beforeRole },
      after: { role },
      metadata: { targetEmail: before.email },
    });

    return ok({ userId: id, oldRole: beforeRole, newRole: role });
  } catch (err) {
    return handleError(err);
  }
}
