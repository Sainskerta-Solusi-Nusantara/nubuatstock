import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";

const bodySchema = z.object({
  // WhatsApp wajib: 8-20 digit (boleh diawali + atau 0).
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,20}$/, "Nomor WhatsApp tidak valid (8-20 digit)"),
  telegram: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "") : undefined)),
});

/**
 * POST /api/account/contact — simpan nomor WhatsApp (mandatory) + Telegram
 * (opsional) untuk user yang sedang login. Dipakai saat signup & dari Settings.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { whatsapp, telegram } = bodySchema.parse(await req.json());

    await db
      .update(users)
      .set({ phone: whatsapp, telegram: telegram ?? null, updatedAt: new Date() })
      .where(eq(users.id, session.userId));

    return ok({ saved: true });
  } catch (err) {
    return handleError(err);
  }
}
