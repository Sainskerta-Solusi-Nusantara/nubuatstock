import { GET as generate, POST as generatePost } from "@/app/api/cron/picks-generate/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Safety-retry Daily Picks (~07:30 WIB, sebelum bursa buka 09:00).
 *
 * Logika identik dengan /api/cron/picks-generate (re-export handler-nya).
 * IDEMPOTEN: kalau run 06:00 WIB sukses, pick yang sama di-skip oleh unique
 * index (0 baru); kalau run 06:00 gagal/miss/timeout, retry ini menambal.
 * Tujuan: anti-miss daily picks meski satu run gagal.
 */
export const GET = generate;
export const POST = generatePost;
