import { NextRequest } from "next/server";
import { z } from "zod";

import { getAuth, requireSession } from "@/lib/auth/server";
import { ok, fail, handleError } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(256),
});

/**
 * POST /api/account/change-password — ganti password user yang sedang login.
 *
 * Memanggil better-auth di SERVER (auth.api.changePassword) dengan header request
 * (sesi). Lebih andal daripada client mutation. revokeOtherSessions: keluar di
 * perangkat lain demi keamanan.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = bodySchema.parse(await req.json());
    const auth = await getAuth();
    await auth.api.changePassword({
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        revokeOtherSessions: true,
      },
      headers: req.headers,
    });
    return ok({ changed: true });
  } catch (err) {
    // better-auth melempar APIError untuk password lama salah / akun tanpa password.
    const msg = err instanceof Error ? err.message : "";
    if (/password|credential|invalid|incorrect/i.test(msg)) {
      return fail(
        400,
        "PASSWORD_CHANGE_FAILED",
        "Password lama salah, atau akunmu daftar lewat Google sehingga belum punya password. Pakai 'Lupa password' di halaman login untuk membuat password.",
      );
    }
    return handleError(err);
  }
}
