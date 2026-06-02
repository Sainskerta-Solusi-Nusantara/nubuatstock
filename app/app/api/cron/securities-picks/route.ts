import { NextRequest, NextResponse } from "next/server";

import { refreshSecuritiesPicksFromSources } from "@/lib/securities-picks/service";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET/POST /api/cron/securities-picks — auto-fetch Rekomendasi Sekuritas dari
 * sumber publik (Telegram) + ekstraksi AI, lalu upsert (inline, tanpa worker).
 * Dipanggil Vercel Cron / manual superadmin.
 * Auth: CRON_SECRET (bila di-set) atau sesi superadmin; bila CRON_SECRET kosong,
 * terbuka (idempotent — pick yang sama di-update, bukan dobel).
 */
async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  } else {
    return true;
  }
  try {
    requireSuperadmin(await getSession());
    return true;
  } catch {
    return false;
  }
}

async function run(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await refreshSecuritiesPicksFromSources();
    logger.info(result, "cron securities-picks refresh");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "cron securities-picks failed");
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
