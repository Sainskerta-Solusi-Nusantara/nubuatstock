/**
 * Helper bersama untuk route Vercel Cron yang menjalankan job worker secara
 * INLINE (tanpa BullMQ worker). Dipakai supaya job harian tetap jalan di
 * serverless tanpa menunggu deploy worker.
 *
 * Auth: sama dengan cron lama (picks-generate/news-ingest) —
 *  - CRON_SECRET di-set → terima header `Authorization: Bearer <secret>`
 *    (Vercel Cron mengirim ini otomatis); fallback ke sesi superadmin.
 *  - CRON_SECRET kosong → terbuka (job idempotent, aman).
 */

import { NextRequest, NextResponse } from "next/server";
import type { Job, Processor } from "bullmq";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";

export async function cronAuthorized(req: NextRequest): Promise<boolean> {
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

/**
 * Bungkus sebuah BullMQ Processor jadi handler route (GET=POST). Memanggil
 * processor dengan job stub (`{ data, name, id }`) — cukup untuk job yang hanya
 * membaca `job.data` (atau tak membacanya sama sekali).
 */
export function makeCronRoute(
  name: string,
  processor: Processor,
  data: Record<string, unknown> = {},
) {
  return async function run(req: NextRequest) {
    if (!(await cronAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    try {
      const job = { data, name, id: "cron" } as unknown as Job;
      const result = await processor(job, "");
      logger.info({ job: name, result }, "cron job done");
      return NextResponse.json({ ok: true, job: name, result: result ?? null });
    } catch (err) {
      logger.error({ job: name, err: (err as Error).message }, "cron job failed");
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
    }
  };
}
