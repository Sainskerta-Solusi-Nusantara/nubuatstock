import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,20}$/, "Nomor WhatsApp tidak valid (8-20 digit)")
    .optional()
    .or(z.literal("")),
  telegram: z.string().trim().max(64).optional().or(z.literal("")),
});

/**
 * POST /api/superadmin/users/[id]/profile
 * Superadmin edit profil user: nama, WhatsApp (phone), Telegram.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const actor = requireSuperadmin(session);
    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const rows = (await db.execute(
      sql`SELECT id, email, name, phone, telegram FROM users WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`,
    )) as unknown as Array<Record<string, unknown>>;
    const before = rows[0];
    if (!before) return fail(404, "USER_NOT_FOUND", "User tidak ditemukan");

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.whatsapp !== undefined) patch.phone = body.whatsapp === "" ? null : body.whatsapp;
    if (body.telegram !== undefined)
      patch.telegram = body.telegram === "" ? null : body.telegram.replace(/^@/, "");

    await db.update(users).set(patch).where(eq(users.id, id));

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "user.profile_edit",
      targetType: "user",
      targetId: id,
      before: { name: before.name, phone: before.phone, telegram: before.telegram },
      after: { name: patch.name, phone: patch.phone, telegram: patch.telegram },
      metadata: { targetEmail: before.email },
    });

    return ok({ userId: id });
  } catch (err) {
    return handleError(err);
  }
}
