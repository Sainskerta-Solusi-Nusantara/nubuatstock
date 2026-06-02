import { NextRequest, NextResponse } from "next/server";

import { cronAuthorized } from "@/lib/cron/helpers";
import { refreshSecuritiesReports } from "@/lib/securities-reports/service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Auto-fetch riset sekuritas dari semua sumber (Henan/Telegram/Samuel/NHIS/KB). */
async function run(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await refreshSecuritiesReports(60);
    logger.info(result, "cron securities-reports refresh");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "cron securities-reports failed");
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
