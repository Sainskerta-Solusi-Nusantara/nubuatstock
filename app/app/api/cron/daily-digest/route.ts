import { makeCronRoute } from "@/lib/cron/helpers";
import { generateDailyDigestProcessor } from "@/worker/jobs/generate-daily-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Susun & kirim digest harian inline. Vercel Cron / superadmin. */
const run = makeCronRoute("daily-digest", generateDailyDigestProcessor);
export const GET = run;
export const POST = run;
