import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ulid, ulidRef, withTimestamps } from "./_base";

/**
 * Preferensi notifikasi per user — kanal aktif, opt-in WhatsApp (consent),
 * tipe notifikasi, quiet hours, dan daily cap (anti-spam).
 *
 * Satu row per user (user_id unik). Default aman: in-app & email aktif,
 * WhatsApp NONAKTIF sampai user opt-in eksplisit (consent_at di-set).
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: ulid(),
    userId: ulidRef("user_id"),

    // Kanal aktif
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
    /** Timestamp consent opt-in WhatsApp (null = belum opt-in). Wajib untuk kirim WA. */
    whatsappConsentAt: timestamp("whatsapp_consent_at", { withTimezone: true, mode: "date" }),

    // Tipe notifikasi yang diinginkan
    alertsEnabled: boolean("alerts_enabled").notNull().default(true),
    dailyPicksEnabled: boolean("daily_picks_enabled").notNull().default(true),
    newsEnabled: boolean("news_enabled").notNull().default(false),

    // Quiet hours (jam WIB 0-23). Kalau start==end → tidak aktif.
    quietHoursStart: integer("quiet_hours_start"),
    quietHoursEnd: integer("quiet_hours_end"),

    // Anti-spam: maksimal notifikasi WA per hari (0 = tanpa batas).
    dailyCap: integer("daily_cap").notNull().default(10),

    ...withTimestamps,
  },
  (t) => [index("notification_preferences_user_idx").on(t.userId)],
);

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
