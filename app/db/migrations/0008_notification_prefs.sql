-- =============================================================================
-- Preferensi notifikasi per user + opt-in WhatsApp (anti-spam)
-- Idempotent: aman dijalankan berkali-kali.
--   psql "$DATABASE_URL" -f db/migrations/0008_notification_prefs.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  whatsapp_consent_at timestamptz,
  alerts_enabled boolean NOT NULL DEFAULT true,
  daily_picks_enabled boolean NOT NULL DEFAULT true,
  news_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start integer,
  quiet_hours_end integer,
  daily_cap integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_preferences_user_idx ON notification_preferences (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_uq ON notification_preferences (user_id);
