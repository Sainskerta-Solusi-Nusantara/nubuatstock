import { makeCronRoute } from "@/lib/cron/helpers";
import { accountDeletionSweepProcessor } from "@/worker/jobs/account-deletion-sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Hard-delete akun lewat grace 30 hari (UU PDP) inline. Vercel Cron / superadmin. */
const run = makeCronRoute("account-deletion-sweep", accountDeletionSweepProcessor);
export const GET = run;
export const POST = run;
