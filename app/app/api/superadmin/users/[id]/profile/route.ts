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
  email: z.string().trim().email("Email tidak valid").max(254).optional(),
  emailVerified: z.boolean().optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,20}$/, "Nomor WhatsApp tidak valid (8-20 digit)")
    .optional()
    .or(z.literal("")),
  telegram: z.string().trim().max(64).optional().or(z.literal("")),
  locale: z.string().trim().max(20).optional().or(z.literal("")),
  timezone: z.string().trim().max(48).optional().or(z.literal("")),
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
      sql`SELECT id, email, name, phone, telegram, email_verified, locale, timezone FROM users WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`,
    )) as unknown as Array<Record<string, unknown>>;
    const before = rows[0];
    if (!before) return fail(404, "USER_NOT_FOUND", "User tidak ditemukan");

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.whatsapp !== undefined) patch.phone = body.whatsapp === "" ? null : body.whatsapp;
    if (body.telegram !== undefined)
      patch.telegram = body.telegram === "" ? null : body.telegram.replace(/^@/, "");
    if (body.locale !== undefined && body.locale !== "") patch.locale = body.locale;
    if (body.timezone !== undefined && body.timezone !== "") patch.timezone = body.timezone;

    // Email — superadmin override; cek keunikan (case-insensitive, exclude diri target).
    if (body.email !== undefined) {
      const newEmail = body.email.toLowerCase();
      const dup = (await db.execute(
        sql`SELECT id FROM users WHERE lower(email) = ${newEmail} AND id <> ${id} AND deleted_at IS NULL LIMIT 1`,
      )) as unknown as Array<Record<string, unknown>>;
      if (dup.length > 0) return fail(409, "EMAIL_TAKEN", "Email sudah dipakai user lain.");
      patch.email = newEmail;
    }

    // Status verifikasi email (toggle manual superadmin).
    if (body.emailVerified !== undefined) {
      patch.emailVerified = body.emailVerified;
      patch.emailVerifiedAt = body.emailVerified ? new Date() : null;
    }

    await db.update(users).set(patch).where(eq(users.id, id));

    await auditLog({
      actorUserId: actor.userId,
      actorRole: String(actor.role ?? ""),
      action: "user.profile_edit",
      targetType: "user",
      targetId: id,
      before: {
        name: before.name,
        email: before.email,
        emailVerified: before.email_verified,
        phone: before.phone,
        telegram: before.telegram,
        locale: before.locale,
        timezone: before.timezone,
      },
      after: patch,
      metadata: { targetEmail: before.email },
    });

    return ok({ userId: id });
  } catch (err) {
    return handleError(err);
  }
}
