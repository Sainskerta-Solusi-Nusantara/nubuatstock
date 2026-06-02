import { makeCronRoute } from "@/lib/cron/helpers";
import { evaluatePickOutcomesProcessor } from "@/worker/jobs/evaluate-pick-outcomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Evaluasi outcome Daily Picks (T+1/T+5/T+20) inline. Vercel Cron / superadmin. */
const run = makeCronRoute("evaluate-outcomes", evaluatePickOutcomesProcessor);
export const GET = run;
export const POST = run;
