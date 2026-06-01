import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
});

/**
 * GET /api/account/profile — data profil user yang sedang login (untuk seed form).
 *
 * Sengaja di route handler (bukan Server Component): di sini cookie/sesi dibaca
 * andal, beda dengan getSession di RSC yang bisa flaky kalau dipanggil ganda.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const [row] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    return ok({ name: row?.name ?? "", email: row?.email ?? "" });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/account/profile — update profil milik user yang sedang login.
 *
 * Pakai requireSession + update DB langsung (bukan better-auth client updateUser)
 * supaya andal dengan sesi server kita & tidak kena quirk endpoint client.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { name } = bodySchema.parse(await req.json());
    await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, session.userId));
    return ok({ name });
  } catch (err) {
    return handleError(err);
  }
}
