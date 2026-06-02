import { makeCronRoute } from "@/lib/cron/helpers";
import { analyzeElliottProcessor } from "@/worker/jobs/analyze-elliott";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Hitung Elliott Wave snapshot (1D/1W/1M) semua emiten inline. Vercel Cron / superadmin. */
const run = makeCronRoute("analyze-elliott", analyzeElliottProcessor);
export const GET = run;
export const POST = run;
