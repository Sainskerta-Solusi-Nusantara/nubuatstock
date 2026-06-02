import { NextRequest, NextResponse } from "next/server";

import { ingestAllNewsInline } from "@/lib/news/ingest-inline";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET/POST /api/cron/news-ingest — fetch RSS berita & simpan (inline, tanpa
 * worker). Dipanggil otomatis oleh Vercel Cron (lihat vercel.json) atau manual
 * oleh superadmin.
 *
 * Auth: Vercel Cron mengirim `Authorization: Bearer ${CRON_SECRET}` bila env
 * CRON_SECRET di-set. Bila tidak di-set, endpoint terbuka (ingest idempotent &
 * low-risk). Superadmin session juga diizinkan untuk trigger manual.
 */
async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth === `Bearer ${secret}`) return true;
  } else {
    return true; // belum di-set: izinkan (idempotent)
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
    const result = await ingestAllNewsInline();
    logger.info(result, "cron news ingest");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "cron news ingest failed");
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
