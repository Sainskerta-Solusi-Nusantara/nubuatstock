import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { handleError, ok } from "@/lib/utils/api";
import {
  createQueue,
  ensureCommonQueues,
  listRegisteredQueues,
} from "@/lib/queue";
import { queueNames, type QueueCounts } from "@/lib/types/audit";
import { auditLog } from "@/lib/observability/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/jobs — list semua queue dengan counts (waiting/active/completed/failed/delayed/paused).
 * Require role=admin.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    ensureCommonQueues();

    // Combine official queues + dynamically registered ones (dedupe).
    const all = new Set<string>([...queueNames, ...listRegisteredQueues()]);

    const result: QueueCounts[] = await Promise.all(
      Array.from(all).map(async (name) => {
        const q = createQueue(name);
        const counts = await q.getJobCounts(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
          "paused",
        );
        const isPaused = await q.isPaused();
        return {
          name,
          counts: {
            waiting: Number(counts.waiting ?? 0),
            active: Number(counts.active ?? 0),
            completed: Number(counts.completed ?? 0),
            failed: Number(counts.failed ?? 0),
            delayed: Number(counts.delayed ?? 0),
            paused: Number(counts.paused ?? 0),
          },
          isPaused,
        };
      }),
    );

    void auditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "admin.jobs.list",
      targetType: "queues",
      metadata: { count: result.length },
    });

    return ok({ queues: result });
  } catch (err) {
    return handleError(err);
  }
}
