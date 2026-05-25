import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import { handleError, ok } from "@/lib/utils/api";
import { createQueue } from "@/lib/queue";
import { jobStateSchema, type JobState, type JobSummary } from "@/lib/types/audit";
import { NotFoundError } from "@/lib/errors";
import { auditLog } from "@/lib/observability/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  state: jobStateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

interface RouteParams {
  params: Promise<{ queue: string }>;
}

/**
 * GET /api/admin/jobs/[queue]?state=waiting|active|completed|failed|delayed&limit=&offset=
 *
 * List recent jobs di queue. Default tampilkan gabungan terbaru lintas state.
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { queue: queueName } = await params;
    if (!queueName) throw new NotFoundError("queue");

    const url = new URL(req.url);
    const query = querySchema.parse({
      state: url.searchParams.get("state") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });

    const q = createQueue(queueName);

    const states: JobState[] = query.state
      ? [query.state]
      : (["active", "waiting", "delayed", "failed", "completed"] as JobState[]);

    const start = query.offset;
    const end = query.offset + query.limit - 1;

    const jobsPerState = await Promise.all(
      states.map((s) => q.getJobs([s], start, end, false)),
    );
    const jobs = jobsPerState.flat();

    const summaries: JobSummary[] = await Promise.all(
      jobs.slice(0, query.limit).map(async (j) => ({
        id: String(j.id ?? ""),
        name: j.name,
        state: await j.getState(),
        data: j.data,
        progress: j.progress,
        attemptsMade: j.attemptsMade,
        failedReason: j.failedReason ?? null,
        timestamp: j.timestamp ?? null,
        processedOn: j.processedOn ?? null,
        finishedOn: j.finishedOn ?? null,
      })),
    );

    void auditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "admin.jobs.list_queue",
      targetType: "queue",
      targetId: queueName,
      metadata: { state: query.state, returned: summaries.length },
    });

    return ok({ queue: queueName, jobs: summaries });
  } catch (err) {
    return handleError(err);
  }
}
