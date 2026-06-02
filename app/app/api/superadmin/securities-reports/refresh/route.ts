import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import { refreshSecuritiesReports } from "@/lib/securities-reports/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — fetch ulang riset dari semua sumber sekuritas. Superadmin only. */
export async function POST(_req: NextRequest) {
  try {
    requireSuperadmin(await getSession());
    const result = await refreshSecuritiesReports(60);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
