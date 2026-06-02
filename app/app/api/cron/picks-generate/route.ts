import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { quotesEod } from "@/db/schema/market";
import { generatePicksJob } from "@/worker/jobs/generate-picks";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET/POST /api/cron/picks-generate — generate Daily Picks untuk tanggal EOD
 * terbaru (inline, tanpa worker). Dipanggil Vercel Cron / manual superadmin.
 * Auth: CRON_SECRET (bila di-set) atau sesi superadmin; bila CRON_SECRET kosong,
 * terbuka (idempotent — pick yang sudah ada di-skip).
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
    const r = await db.select({ d: sql<string>`max(${quotesEod.tradeDate})` }).from(quotesEod);
    const tradeDate = r[0]?.d;
    if (!tradeDate) return NextResponse.json({ ok: false, error: "no_eod_data" }, { status: 400 });
    const result = await generatePicksJob({ tradeDate, generateNarrative: true });
    logger.info(result, "cron picks generate");
    return NextResponse.json({ ok: true, tradeDate, ...result });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "cron picks generate failed");
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
