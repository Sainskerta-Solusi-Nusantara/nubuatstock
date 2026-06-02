import { makeCronRoute } from "@/lib/cron/helpers";
import { paperLeaderboardProcessor } from "@/worker/jobs/paper-leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Snapshot ranking Paper Trading (mark-to-market) inline. Vercel Cron / superadmin. */
const run = makeCronRoute("paper-leaderboard", paperLeaderboardProcessor);
export const GET = run;
export const POST = run;
