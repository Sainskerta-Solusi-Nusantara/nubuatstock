import { makeCronRoute } from "@/lib/cron/helpers";
import { ingestEodProcessor } from "@/worker/jobs/ingest-eod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Ingest EOD OHLCV semua emiten aktif inline. Vercel Cron / superadmin. */
const run = makeCronRoute("ingest-eod", ingestEodProcessor);
export const GET = run;
export const POST = run;
