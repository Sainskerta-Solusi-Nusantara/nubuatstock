import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, softDelete, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * User-data domain (Agent 6) — Watchlist & Alerts.
 *
 * Konvensi:
 * - PK ULID (text) konsisten dengan _base.ts.
 * - FK `user_id` → `auth.users.id` (Agent 3) — soft reference (text→text) untuk hindari
 *   cyclic import schema; integrity ditegakkan via Drizzle relations + app layer.
 * - FK `company_kode` → `companies.kode` (Agent 2) — soft reference.
 *
 * Index patterns:
 * - Watchlists list per user (sort by sort_order) → idx (user_id, sort_order).
 * - Watchlist items list per watchlist (sort by sort_order) → idx (watchlist_id, sort_order).
 * - Cumulative item count per user → idx (user_id) di watchlist_items via JOIN watchlists.
 * - Active alerts grouped per company untuk worker batching → idx (company_kode, status).
 * - Alert triggers history per alert (recent first) → idx (alert_id, triggered_at DESC).
 */

// =================== Watchlists ===================

export const watchlists = pgTable(
  "watchlists",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    colorHex: text("color_hex"),
    isDefault: text("is_default", { enum: ["true", "false"] })
      .notNull()
      .default("false"),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    index("watchlists_user_idx").on(t.userId),
    index("watchlists_user_sort_idx").on(t.userId, t.sortOrder),
    uniqueIndex("watchlists_user_name_uq").on(t.userId, t.name),
  ],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: ulid(),
    watchlistId: ulidRef("watchlist_id"),
    companyKode: text("company_kode").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    note: text("note"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("watchlist_items_unique_uq").on(t.watchlistId, t.companyKode),
    index("watchlist_items_watchlist_idx").on(t.watchlistId),
    index("watchlist_items_company_idx").on(t.companyKode),
    index("watchlist_items_watchlist_sort_idx").on(t.watchlistId, t.sortOrder),
  ],
);

// =================== Alerts ===================

/**
 * `alerts.condition` — discriminated union JSON divalidasi oleh Zod di lib/types/alerts.ts.
 *
 * Bentuk umum:
 *   { type: "price_above", params: { value: 1500 } }
 *   { type: "price_below", params: { value: 1200 } }
 *   { type: "pct_change", params: { window: "1d", changePct: 5, direction: "up" } }
 *   { type: "volume_spike", params: { multiple: 2, lookback: 20 } }
 *   { type: "ma_cross", params: { fast: 20, slow: 50, direction: "golden" } }
 *   { type: "rsi_threshold", params: { period: 14, threshold: 70, direction: "above" } }
 *
 * `channels` JSON array dari "in_app" | "email" | "push".
 * `status` enum text — "active" | "paused" | "triggered" | "expired".
 */
export type AlertConditionDb = {
  type: string;
  params: Record<string, unknown>;
};

export type AlertChannelDb = "in_app" | "email" | "push";

export const alerts = pgTable(
  "alerts",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    companyKode: text("company_kode").notNull(),
    name: text("name").notNull(),
    condition: jsonbT<AlertConditionDb>("condition").notNull(),
    status: text("status", {
      enum: ["active", "paused", "triggered", "expired"],
    })
      .notNull()
      .default("active"),
    channels: jsonbT<AlertChannelDb[]>("channels").notNull().default(["in_app"]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true, mode: "date" }),
    triggerCount: integer("trigger_count").notNull().default(0),
    repeatable: text("repeatable", { enum: ["true", "false"] })
      .notNull()
      .default("false"),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    index("alerts_user_idx").on(t.userId),
    index("alerts_company_idx").on(t.companyKode),
    index("alerts_status_idx").on(t.status),
    index("alerts_company_status_idx").on(t.companyKode, t.status),
    index("alerts_user_status_idx").on(t.userId, t.status),
  ],
);

export const alertTriggers = pgTable(
  "alert_triggers",
  {
    id: ulid(),
    alertId: ulidRef("alert_id"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true, mode: "date" })
      .notNull(),
    snapshot: jsonbT<Record<string, unknown>>("snapshot").notNull(),
    notifiedChannels: jsonbT<AlertChannelDb[]>("notified_channels").notNull().default([]),
    sequenceNo: bigint("sequence_no", { mode: "number" }),
    ...withTimestamps,
  },
  (t) => [
    index("alert_triggers_alert_idx").on(t.alertId),
    index("alert_triggers_alert_time_idx").on(t.alertId, t.triggeredAt),
  ],
);

// =================== Drizzle inferred types ===================

export type Watchlist = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type NewWatchlistItem = typeof watchlistItems.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

export type AlertTrigger = typeof alertTriggers.$inferSelect;
export type NewAlertTrigger = typeof alertTriggers.$inferInsert;
