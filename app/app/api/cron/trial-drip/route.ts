import { makeCronRoute } from "@/lib/cron/helpers";
import { trialDripProcessor } from "@/worker/jobs/trial-drip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Kirim email drip trial (D+3/D+5/D+6) inline. Vercel Cron / superadmin. */
const run = makeCronRoute("trial-drip", trialDripProcessor);
export const GET = run;
export const POST = run;
