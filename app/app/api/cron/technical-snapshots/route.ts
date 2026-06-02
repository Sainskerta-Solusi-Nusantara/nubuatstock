import { makeCronRoute } from "@/lib/cron/helpers";
import { computeTechnicalSnapshotsProcessor } from "@/worker/jobs/compute-technical-snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Hitung snapshot indikator teknikal semua emiten inline. Vercel Cron / superadmin. */
const run = makeCronRoute("technical-snapshots", computeTechnicalSnapshotsProcessor);
export const GET = run;
export const POST = run;
