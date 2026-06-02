import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import { refreshSecuritiesPicksFromSources } from "@/lib/securities-picks/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST — auto-fetch rekomendasi dari sumber sekuritas + ekstraksi AI. Superadmin only. */
export async function POST(_req: NextRequest) {
  try {
    requireSuperadmin(await getSession());
    const result = await refreshSecuritiesPicksFromSources();
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
