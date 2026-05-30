import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, ulidRef } from "./_base";

/**
 * Langganan Web Push (PWA) per device/browser user.
 * endpoint unik per langganan (dari PushSubscription browser).
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("push_subscriptions_user_idx").on(t.userId),
    uniqueIndex("push_subscriptions_endpoint_uq").on(t.endpoint),
  ],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
