import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { handleError, ok } from "@/lib/utils/api";
import { createQueue } from "@/lib/queue";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/observability/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ queue: string; jobId: string }>;
}

/**
 * POST /api/admin/jobs/[queue]/[jobId]/retry
 *
 * Retry job yang failed. Kalau job belum failed → error.
 */
export async function POST(_: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { queue: queueName, jobId } = await params;
    if (!queueName || !jobId) throw new NotFoundError("job");

    const q = createQueue(queueName);
    const job = await q.getJob(jobId);
    if (!job) throw new NotFoundError("job");

    const state = await job.getState();
    if (state !== "failed") {
      throw new ValidationError(`Job state '${state}' tidak bisa di-retry. Hanya 'failed' yang bisa.`, {
        state,
      });
    }

    await job.retry();

    void auditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "admin.jobs.retry",
      targetType: "job",
      targetId: `${queueName}:${jobId}`,
      metadata: { queue: queueName, jobId, previousState: state },
    });

    return ok({ retried: true, jobId, queue: queueName });
  } catch (err) {
    return handleError(err);
  }
}
