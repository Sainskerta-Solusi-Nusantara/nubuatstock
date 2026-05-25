/**
 * Queue producer for outbound notification channel delivery.
 *
 * Stub: real BullMQ producer pending (Agent 10 — see comment in
 * `lib/notifications/dispatch.ts`). Exports the contract expected by
 * `dispatch.ts` so the dynamic `await import("@/lib/queue/notifications")`
 * resolves cleanly. Until the worker lands, `enqueueNotificationJob` is a
 * no-op; `dispatch.ts` already records a `notification_deliveries` row with
 * status="queued" before invoking this fn, so external channels remain
 * trackable in the DB.
 */

import type { NotificationChannel } from "@/lib/types/notifications";

export interface EnqueueNotificationJob {
  notificationId: string;
  channel: NotificationChannel;
  userId: string;
  templateKey: string;
  subject: string | null;
  body: string;
  isHtml: boolean;
  payload: Record<string, unknown>;
}

export async function enqueueNotificationJob(
  _job: EnqueueNotificationJob,
): Promise<void> {
  // Intentional no-op until BullMQ producer (Agent 10) is implemented.
}
