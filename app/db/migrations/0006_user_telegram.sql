-- =============================================================================
-- User contact — kolom telegram (handle/username Telegram, opsional)
-- =============================================================================
-- `phone` (WhatsApp) sudah ada sebelumnya. Hanya tambah `telegram`.
-- Idempotent: aman dijalankan berkali-kali.
--   psql "$DATABASE_URL" -f db/migrations/0006_user_telegram.sql
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram text;
