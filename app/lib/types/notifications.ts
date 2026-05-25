import { z } from "zod";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";

import {
  notificationChannelValues,
  notificationDeliveries,
  notificationDeliveryStatusValues,
  notificationSeverityValues,
  notificationTemplates,
  notifications,
} from "@/db/schema/notifications";

// =================== Re-export DB types ===================

export type {
  NewNotification,
  NewNotificationDelivery,
  NewNotificationTemplate,
  Notification,
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationSeverity,
  NotificationTemplate,
  NotificationVariableSpec,
} from "@/db/schema/notifications";

// =================== Drizzle-zod schemas ===================

export const notificationTemplateSelectSchema = createSelectSchema(
  notificationTemplates,
);
export const notificationTemplateInsertSchema = createInsertSchema(
  notificationTemplates,
);
export const notificationSelectSchema = createSelectSchema(notifications);
export const notificationDeliverySelectSchema =
  createSelectSchema(notificationDeliveries);

// =================== Enums ===================

export const notificationChannelSchema = z.enum(notificationChannelValues);
export const notificationSeveritySchema = z.enum(notificationSeverityValues);
export const notificationDeliveryStatusSchema = z.enum(
  notificationDeliveryStatusValues,
);

// =================== Input schemas (API) ===================

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

export interface NotificationFeedItem {
  id: string;
  templateKey: string;
  title: string;
  body: string;
  linkUrl: string | null;
  severity: import("@/db/schema/notifications").NotificationSeverity;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  payload: Record<string, unknown>;
}

export interface NotificationFeedResponse {
  items: NotificationFeedItem[];
  nextCursor: string | null;
  unreadCount: number;
}

// =================== Dispatcher input ===================

export const sendNotificationInputSchema = z.object({
  userId: z.string().min(1),
  templateKey: z.string().min(1),
  variables: z.record(z.string(), z.unknown()).default({}),
  channels: z.array(notificationChannelSchema).optional(),
  severity: notificationSeveritySchema.default("info"),
  linkUrl: z.string().url().optional(),
  expiresAt: z.date().optional(),
});

export type SendNotificationInput = z.infer<typeof sendNotificationInputSchema>;
