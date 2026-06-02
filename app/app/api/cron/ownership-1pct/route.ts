import { NextRequest, NextResponse } from "next/server";

import { cronAuthorized } from "@/lib/cron/helpers";
import { refreshOwnership1pct } from "@/lib/ownership1pct/service";
import { refreshFreeFloat } from "@/lib/freefloat/service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Auto-fetch kepemilikan ≥1% + Free Float dari sumber. Mengakumulasi periode
 * changelog (mendukung tab Perubahan Data multi-periode). Free Float best-effort.
 */
async function run(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const ownership = await refreshOwnership1pct();
    let freeFloat: { count: number; snapshotDate: string | null } | null = null;
    try {
      freeFloat = await refreshFreeFloat();
    } catch {
      freeFloat = null;
    }
    logger.info({ ...ownership, freeFloat }, "cron ownership-1pct refresh");
    return NextResponse.json({ ok: true, ...ownership, freeFloat });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "cron ownership-1pct failed");
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
