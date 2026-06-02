import { makeCronRoute } from "@/lib/cron/helpers";
import { expireTrialProcessor } from "@/worker/jobs/expire-trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Downgrade trial kedaluwarsa → Free inline. Vercel Cron / superadmin. */
const run = makeCronRoute("expire-trial", expireTrialProcessor);
export const GET = run;
export const POST = run;
