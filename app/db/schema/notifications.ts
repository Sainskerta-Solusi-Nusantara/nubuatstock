import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jsonbT, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * Notification domain (Agent 12).
 *
 * Tiga tabel:
 * 1. `notification_templates` — multi-channel, multi-locale template per event key.
 * 2. `notifications` — feed in-app per user (sumber tunggal untuk badge & list).
 * 3. `notification_deliveries` — log per-channel attempt (audit & retry).
 *
 * Konvensi:
 * - Semua PK ULID. Lihat _base.ts.
 * - `template.key` namespaced dot-style (e.g., "auth.email_verification").
 * - `variables` di template = JSON schema-ish: `{ "name": "string", "amount": "number" }`.
 * - In-app channel WAJIB punya row di `notifications` (synchronous insert).
 *   Email/push/sms/whatsapp di-enqueue ke worker (BullMQ — Agent 11/10).
 */

// =================== Channels ===================

export const notificationChannelValues = [
  "email",
  "in_app",
  "push",
  "sms",
  "whatsapp",
] as const;
export type NotificationChannel = (typeof notificationChannelValues)[number];

export const notificationSeverityValues = [
  "info",
  "success",
  "warning",
  "error",
] as const;
export type NotificationSeverity = (typeof notificationSeverityValues)[number];

export const notificationDeliveryStatusValues = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "bounced",
] as const;
export type NotificationDeliveryStatus =
  (typeof notificationDeliveryStatusValues)[number];

// =================== notification_templates ===================

/**
 * Variable spec example:
 *   { "name": { "type": "string", "required": true } }
 * Renderer reject jika required var tidak di-pass.
 */
export interface NotificationVariableSpec {
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
  description?: string;
}

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: ulid(),
    key: text("key").notNull(),
    channel: text("channel").$type<NotificationChannel>().notNull(),
    locale: text("locale").notNull().default("id-ID"),
    subject: text("subject"),
    body: text("body").notNull(),
    isHtml: boolean("is_html").notNull().default(false),
    variables: jsonbT<Record<string, NotificationVariableSpec>>("variables")
      .notNull()
      .default({}),
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    description: text("description"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("notification_templates_key_channel_locale_version_uq").on(
      t.key,
      t.channel,
      t.locale,
      t.version,
    ),
    index("notification_templates_key_idx").on(t.key),
    index("notification_templates_active_idx").on(t.isActive),
  ],
);

// =================== notifications (user feed) ===================

export const notifications = pgTable(
  "notifications",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    templateKey: text("template_key").notNull(),
    channelsSent: jsonbT<NotificationChannel[]>("channels_sent")
      .notNull()
      .default([]),
    title: text("title").notNull(),
    body: text("body").notNull(),
    linkUrl: text("link_url"),
    severity: text("severity")
      .$type<NotificationSeverity>()
      .notNull()
      .default("info"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    payload: jsonbT<Record<string, unknown>>("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.isRead),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
    index("notifications_template_key_idx").on(t.templateKey),
    index("notifications_expires_at_idx").on(t.expiresAt),
  ],
);

// =================== notification_deliveries (log) ===================

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: ulid(),
    notificationId: ulidRef("notification_id"),
    channel: text("channel").$type<NotificationChannel>().notNull(),
    status: text("status")
      .$type<NotificationDeliveryStatus>()
      .notNull()
      .default("queued"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    errorMessage: text("error_message"),
    attempt: integer("attempt").notNull().default(1),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    deliveredAt: timestamp("delivered_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("notification_deliveries_notification_idx").on(t.notificationId),
    index("notification_deliveries_channel_status_idx").on(t.channel, t.status),
    index("notification_deliveries_created_idx").on(t.createdAt),
  ],
);

// =================== Drizzle inferred types ===================

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
