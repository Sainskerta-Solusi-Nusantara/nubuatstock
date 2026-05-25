import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * Customer Support — ticket queue.
 *
 * Workflow:
 *   1. User submit ticket via modal "Hubungi Support" di footer
 *   2. Admin di /admin/support lihat queue, assign, reply
 *   3. Notification email ke user saat ada reply
 *   4. Close saat resolved
 *
 * Categories: bug | feature_request | account | billing | trading | other
 */
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    /** Snapshot email user saat submit (untuk reply meski user di-delete) */
    userEmail: text("user_email").notNull(),
    subject: text("subject").notNull(),
    category: text("category", { enum: ["bug", "feature_request", "account", "billing", "trading", "other"] })
      .notNull()
      .default("other"),
    priority: text("priority", { enum: ["low", "normal", "high", "urgent"] })
      .notNull()
      .default("normal"),
    status: text("status", { enum: ["open", "in_progress", "waiting_user", "resolved", "closed"] })
      .notNull()
      .default("open"),
    /** Snapshot URL context (mis. ticker page user terbuka saat submit) */
    contextUrl: text("context_url"),
    /** Optional metadata: browser, OS, user-agent untuk debugging */
    metadata: jsonbT<Record<string, unknown>>("metadata"),
    assignedAdminId: text("assigned_admin_id"),
    firstRepliedAt: timestamp("first_replied_at", { withTimezone: true, mode: "date" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [
    index("support_tickets_user_idx").on(t.userId),
    index("support_tickets_status_idx").on(t.status),
    index("support_tickets_priority_idx").on(t.priority),
    index("support_tickets_created_idx").on(t.createdAt),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: ulid(),
    ticketId: ulidRef("ticket_id"),
    /** Author user id (user atau admin) */
    authorUserId: ulidRef("author_user_id"),
    authorRole: text("author_role", { enum: ["user", "admin", "superadmin", "system"] })
      .notNull()
      .default("user"),
    content: text("content").notNull(),
    /** Internal note (admin only, hidden from user) */
    isInternal: text("is_internal", { enum: ["true", "false"] }).notNull().default("false"),
    ...withTimestamps,
  },
  (t) => [
    index("support_messages_ticket_idx").on(t.ticketId, t.createdAt),
  ],
);
