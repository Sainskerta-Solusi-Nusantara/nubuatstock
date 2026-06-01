import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import { refreshOwnership1pct } from "@/lib/ownership1pct/service";
import { refreshFreeFloat } from "@/lib/freefloat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/superadmin/ownership-1pct/refresh — fetch ulang data kepemilikan
 * ≥1% + status Free Float dari sumber, lalu simpan ke DB. Superadmin only.
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    requireSuperadmin(session);
    const ownership = await refreshOwnership1pct();
    // Free Float dari sumber terpisah — jangan gagalkan refresh utama bila error.
    let freeFloat: { count: number; snapshotDate: string | null } | null = null;
    try {
      freeFloat = await refreshFreeFloat();
    } catch {
      freeFloat = null;
    }
    return ok({ ...ownership, freeFloat });
  } catch (err) {
    return handleError(err);
  }
}
