import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { handleError, ok } from "@/lib/utils/api";
import { createQueue } from "@/lib/queue";
import { NotFoundError } from "@/lib/errors";
import { auditLog } from "@/lib/observability/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ queue: string; jobId: string }>;
}

/**
 * POST /api/admin/jobs/[queue]/[jobId]/remove
 *
 * Hapus job dari queue (admin action). Audit logged.
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
    const before = {
      id: job.id,
      name: job.name,
      state,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    };

    await job.remove();

    void auditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "admin.jobs.remove",
      targetType: "job",
      targetId: `${queueName}:${jobId}`,
      before,
      after: null,
      metadata: { queue: queueName, jobId, previousState: state },
    });

    return ok({ removed: true, jobId, queue: queueName });
  } catch (err) {
    return handleError(err);
  }
}
