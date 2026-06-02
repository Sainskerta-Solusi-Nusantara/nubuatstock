import { makeCronRoute } from "@/lib/cron/helpers";
import { renewSubscriptionsProcessor } from "@/worker/jobs/renew-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Buat invoice renewal langganan non-free inline. Vercel Cron / superadmin. */
const run = makeCronRoute("renew-subscriptions", renewSubscriptionsProcessor);
export const GET = run;
export const POST = run;
