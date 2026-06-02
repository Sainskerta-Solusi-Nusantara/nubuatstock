import { makeCronRoute } from "@/lib/cron/helpers";
import { detectPatternsProcessor } from "@/worker/jobs/detect-patterns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Deteksi pola chart semua emiten inline. Vercel Cron / superadmin. */
const run = makeCronRoute("detect-patterns", detectPatternsProcessor);
export const GET = run;
export const POST = run;
