import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import { refreshOwnership1pct } from "@/lib/ownership1pct/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/superadmin/ownership-1pct/refresh — fetch ulang data dari
 * 1pct.klinikpenyesalan.com lalu simpan ke DB. Superadmin only.
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    requireSuperadmin(session);
    const result = await refreshOwnership1pct();
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
