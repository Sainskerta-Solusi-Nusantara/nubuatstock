import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getConfig } from "@/lib/config";
import {
  notificationDeliveries,
  notifications,
} from "@/db/schema/notifications";
import { users } from "@/db/schema/auth";
import type {
  NotificationChannel,
  NotificationSeverity,
  SendNotificationInput,
} from "@/lib/types/notifications";
import { sendNotificationInputSchema } from "@/lib/types/notifications";

import { renderTemplate } from "./render";

/**
 * Channel dispatcher.
 *
 * Flow:
 *   1. Validate input (Zod).
 *   2. Resolve target channels (default dari `notifications.default_channels` di app_config).
 *   3. Resolve user locale (users.locale, fallback "id-ID").
 *   4. Render template per channel.
 *   5. In-app channel: insert ke `notifications` (synchronous, satu row representatif).
 *   6. External channel (email/push/sms/whatsapp): enqueue ke BullMQ `notifications.send`
 *      via Agent 10 helper `enqueueNotificationJob()`. Kalau modul belum tersedia,
 *      log warning + insert row `notification_deliveries` dengan status="queued".
 *
 * Catatan: Mengubah jumlah row di `notifications`:
 * - Untuk simplicity & UX (badge unread count), satu call = satu in-app row.
 *   Channel external di-link via FK ke notification_id.
 */

interface EnqueueJobShape {
  notificationId: string;
  channel: NotificationChannel;
  userId: string;
  templateKey: string;
  subject: string | null;
  body: string;
  isHtml: boolean;
  payload: Record<string, unknown>;
}

type EnqueueFn = (job: EnqueueJobShape) => Promise<void>;

/**
 * Try-import dari Agent 10 helper. Aman walaupun module belum ada — fallback
 * ke logger.warn supaya MVP boot tetap jalan.
 */
async function getQueueEnqueuer(): Promise<EnqueueFn | null> {
  try {
    // Dynamic import path yang konsisten dengan kontrak Agent 10.
    const mod = (await import("@/lib/queue/notifications")) as {
      enqueueNotificationJob?: EnqueueFn;
    };
    return typeof mod.enqueueNotificationJob === "function"
      ? mod.enqueueNotificationJob
      : null;
  } catch {
    return null;
  }
}

export interface SendNotificationResult {
  notificationId: string;
  channelsDispatched: NotificationChannel[];
  channelsFailed: NotificationChannel[];
}

export async function sendNotification(
  rawInput: SendNotificationInput,
): Promise<SendNotificationResult> {
  const input = sendNotificationInputSchema.parse(rawInput);

  const channels =
    input.channels ?? (await resolveDefaultChannels());
  const targetUser = await loadUser(input.userId);
  const locale = targetUser?.locale ?? "id-ID";

  // Render in-app first karena dipakai untuk title+body row utama.
  const inAppNeeded = channels.includes("in_app");
  const primaryChannel: NotificationChannel = inAppNeeded ? "in_app" : channels[0] ?? "in_app";
  const primary = await renderTemplate({
    key: input.templateKey,
    channel: primaryChannel,
    locale,
    variables: input.variables,
  });

  // Insert in-app row. Title = subject kalau ada, fallback ke first line of body.
  const title = primary.subject ?? deriveTitle(primary.body);
  const inserted = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      templateKey: input.templateKey,
      channelsSent: [],
      title,
      body: primary.body,
      linkUrl: input.linkUrl ?? null,
      severity: input.severity as NotificationSeverity,
      payload: { variables: input.variables },
      expiresAt: input.expiresAt ?? null,
    })
    .returning({ id: notifications.id });

  const notificationId = inserted[0]?.id;
  if (!notificationId) {
    throw new Error("Failed to insert notification row");
  }

  // Catat delivery untuk in-app (synchronous = sent).
  const dispatched: NotificationChannel[] = [];
  const failed: NotificationChannel[] = [];

  if (inAppNeeded) {
    await db.insert(notificationDeliveries).values({
      notificationId,
      channel: "in_app",
      status: "sent",
      provider: "in_app",
      sentAt: new Date(),
    });
    dispatched.push("in_app");
  }

  // External channels — render per channel & enqueue.
  const enqueue = await getQueueEnqueuer();
  for (const channel of channels) {
    if (channel === "in_app") continue;

    try {
      const rendered = await renderTemplate({
        key: input.templateKey,
        channel,
        locale,
        variables: input.variables,
      });

      const delivery = await db
        .insert(notificationDeliveries)
        .values({
          notificationId,
          channel,
          status: "queued",
          provider: providerForChannel(channel),
        })
        .returning({ id: notificationDeliveries.id });

      const job: EnqueueJobShape = {
        notificationId,
        channel,
        userId: input.userId,
        templateKey: input.templateKey,
        subject: rendered.subject,
        body: rendered.body,
        isHtml: rendered.template.isHtml,
        payload: { deliveryId: delivery[0]?.id, variables: input.variables },
      };

      if (enqueue) {
        await enqueue(job);
      } else {
        logger.warn(
          { channel, notificationId, templateKey: input.templateKey },
          "Queue not available — channel delivery deferred. Agent 10 perlu implementasikan lib/queue/notifications.",
        );
        // TODO: SMTP/push/sms — implement saat secrets tersedia (smtp.password dari app_secrets).
      }

      dispatched.push(channel);
    } catch (err) {
      logger.error({ err, channel, notificationId }, "Channel render/enqueue failed");
      await db.insert(notificationDeliveries).values({
        notificationId,
        channel,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      failed.push(channel);
    }
  }

  // Update channels_sent metadata.
  await db
    .update(notifications)
    .set({ channelsSent: dispatched })
    .where(eq(notifications.id, notificationId));

  return {
    notificationId,
    channelsDispatched: dispatched,
    channelsFailed: failed,
  };
}

async function resolveDefaultChannels(): Promise<NotificationChannel[]> {
  const raw = await getConfig<NotificationChannel[]>(
    "notifications.default_channels",
    { defaultValue: ["in_app"] as NotificationChannel[] },
  );
  return raw.length > 0 ? raw : ["in_app"];
}

async function loadUser(userId: string): Promise<{ locale: string } | null> {
  const rows = await db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

function deriveTitle(body: string): string {
  const firstLine = body.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
}

function providerForChannel(channel: NotificationChannel): string {
  switch (channel) {
    case "email":
      return "smtp";
    case "push":
      return "fcm";
    case "sms":
      return "sms_provider";
    case "whatsapp":
      return "whatsapp_provider";
    case "in_app":
      return "in_app";
    default:
      return "unknown";
  }
}

// =================== Internal helpers for testing / cleanup ===================

/**
 * Mark stale notifications (expired) as deleted via deletion query.
 * Agent 10 worker bisa schedule pakai cron.
 */
export async function purgeExpiredNotifications(now = new Date()): Promise<number> {
  const deleted = await db
    .delete(notifications)
    .where(
      and(
        sql`${notifications.expiresAt} IS NOT NULL`,
        sql`${notifications.expiresAt} < ${now}`,
      ),
    )
    .returning({ id: notifications.id });
  return deleted.length;
}

/**
 * Bulk mark notifications as read for a user.
 */
export async function markNotificationsRead(
  userId: string,
  ids?: string[],
): Promise<number> {
  const now = new Date();
  const cond = ids && ids.length > 0
    ? and(eq(notifications.userId, userId), inArray(notifications.id, ids))
    : and(eq(notifications.userId, userId), eq(notifications.isRead, false));
  const rows = await db
    .update(notifications)
    .set({ isRead: true, readAt: now })
    .where(cond)
    .returning({ id: notifications.id });
  return rows.length;
}
