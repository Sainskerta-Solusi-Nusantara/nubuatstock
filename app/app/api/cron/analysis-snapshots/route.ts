import { makeCronRoute } from "@/lib/cron/helpers";
import { computeAnalysisSnapshotsProcessor } from "@/worker/jobs/compute-analysis-snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Agregasi verdict+wyckoff+pattern+elliott per emiten inline. Vercel Cron / superadmin. */
const run = makeCronRoute("analysis-snapshots", computeAnalysisSnapshotsProcessor);
export const GET = run;
export const POST = run;
