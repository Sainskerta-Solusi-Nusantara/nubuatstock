import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { jsonbT, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * Saved Custom Screens — user simpan filter combo dengan named alias.
 * Optional alert mode: kalau enabled, worker run daily dan notify saat result berubah.
 */
export const savedScreens = pgTable(
  "saved_screens",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    name: text("name").notNull(),
    description: text("description"),
    /** Serialized ScreenerFilters (JSON dari /screener URL params) */
    filters: jsonbT<Record<string, unknown>>("filters").notNull(),
    isAlert: boolean("is_alert").notNull().default(false),
    lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: "date" }),
    lastResultCount: text("last_result_count"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("saved_screens_user_name_uq").on(t.userId, t.name),
    index("saved_screens_user_idx").on(t.userId),
    index("saved_screens_alert_idx").on(t.isAlert),
  ],
);
