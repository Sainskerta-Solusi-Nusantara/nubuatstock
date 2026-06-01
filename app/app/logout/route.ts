import { NextResponse, type NextRequest } from "next/server";

import { getAuth, getSession } from "@/lib/auth/server";
import { recordAuthEvent } from "@/lib/auth/audit";

/**
 * GET /logout — endpoint logout yang bisa diakses langsung dari browser
 * (mis. user mengetik /logout). Sign out via better-auth lalu redirect ke landing.
 *
 * Logout "normal" lewat UI tetap pakai POST /api/auth/logout; route ini cadangan
 * untuk akses URL langsung supaya tidak 404. Redirect membawa ?loggedout=1
 * supaya landing memunculkan toast "Logout berhasil" (lihat LogoutToast).
 */
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  // PENTING: jangan logout untuk request PREFETCH/speculative (Next.js Link
  // prefetch, browser speculation rules). Tanpa guard ini, sekadar membuka
  // dropdown akun (link logout masuk viewport) memicu prefetch GET /logout →
  // user ter-logout tanpa klik. Hanya navigasi NYATA yang boleh sign-out.
  const purpose = (req.headers.get("sec-purpose") ?? req.headers.get("purpose") ?? "").toLowerCase();
  const isPrefetch = purpose.includes("prefetch") || req.headers.get("next-router-prefetch") === "1";
  if (isPrefetch) {
    return NextResponse.redirect(new URL("/", base));
  }

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
  return NextResponse.redirect(new URL("/?loggedout=1", base));
}
