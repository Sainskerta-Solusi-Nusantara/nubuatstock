import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, ulidRef, withTimestamps } from "./_base";
import { users } from "./auth";

/**
 * Feature flag system (Agent 10).
 *
 * - `feature_flags` adalah master definition: default value, rollout strategy, kategori.
 * - `user_flag_overrides` adalah override per-user yang mengalahkan rollout strategy.
 *
 * Rollout strategy contoh (jsonb):
 *   { type: "all" }                                  // selalu on
 *   { type: "off" }                                  // selalu off
 *   { type: "percentage", value: 25 }                // 25% user (hash userId stable)
 *   { type: "tier_min", value: "pro" }               // hanya tier pro+
 *   { type: "user_list", value: ["userId1", ...] }   // explicit allowlist
 *   { type: "role", value: "admin" }                 // hanya admin
 *
 * Value bisa boolean, string, atau JSON arbitrary (mis. config object kalau flag bertipe variant).
 */

export type RolloutStrategy =
  | { type: "all" }
  | { type: "off" }
  | { type: "percentage"; value: number }
  | { type: "tier_min"; value: string }
  | { type: "user_list"; value: string[] }
  | { type: "role"; value: "user" | "admin" };

export const featureFlags = pgTable(
  "feature_flags",
  {
    key: text("key").primaryKey().notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("general"),
    defaultValue: jsonbT<unknown>("default_value").notNull(),
    rolloutStrategy: jsonbT<RolloutStrategy>("rollout_strategy")
      .notNull()
      .default(sql`'{"type":"all"}'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    index("feature_flags_category_idx").on(t.category),
    index("feature_flags_active_idx").on(t.isActive),
  ],
);

export const userFlagOverrides = pgTable(
  "user_flag_overrides",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    flagKey: text("flag_key")
      .notNull()
      .references(() => featureFlags.key, { onDelete: "cascade", onUpdate: "cascade" }),
    value: jsonbT<unknown>("value").notNull(),
    reason: text("reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdByAdminId: text("created_by_admin_id"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("user_flag_overrides_user_flag_uq").on(t.userId, t.flagKey),
    index("user_flag_overrides_flag_idx").on(t.flagKey),
    index("user_flag_overrides_expires_idx").on(t.expiresAt),
  ],
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type UserFlagOverride = typeof userFlagOverrides.$inferSelect;
export type NewUserFlagOverride = typeof userFlagOverrides.$inferInsert;
