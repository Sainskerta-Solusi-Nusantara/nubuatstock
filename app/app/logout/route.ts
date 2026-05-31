import { NextResponse, type NextRequest } from "next/server";

import { getAuth, getSession } from "@/lib/auth/server";
import { recordAuthEvent } from "@/lib/auth/audit";

/**
 * GET /logout — endpoint logout yang bisa diakses langsung dari browser
 * (mis. user mengetik /logout). Sign out via better-auth lalu redirect ke landing.
 *
 * Logout "normal" lewat UI tetap pakai POST /api/auth/logout; route ini cadangan
 * untuk akses URL langsung supaya tidak 404.
 */
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  try {
    const session = await getSession();
    const auth = await getAuth();
    await auth.api.signOut({ headers: req.headers });
    if (session) {
      await recordAuthEvent({
        actorUserId: session.user.id,
        action: "logout",
        ip: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      });
    }
  } catch {
    // Abaikan error sign-out (mis. sesi sudah invalid) — tetap redirect.
  }
  return NextResponse.redirect(new URL("/", base));
}
