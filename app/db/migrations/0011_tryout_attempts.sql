-- =============================================================================
-- Try Out WMI — riwayat pengerjaan. Idempotent.
--   psql "$DATABASE_URL" -f db/migrations/0011_tryout_attempts.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS tryout_attempts (
  id text PRIMARY KEY DEFAULT gen_ulid(),
  user_id text NOT NULL,
  package_slug text NOT NULL,
  total_questions integer NOT NULL,
  correct_count integer NOT NULL,
  score_pct integer NOT NULL,
  passed boolean NOT NULL,
  duration_sec integer,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tryout_attempts_user_idx ON tryout_attempts (user_id);
CREATE INDEX IF NOT EXISTS tryout_attempts_user_pkg_idx ON tryout_attempts (user_id, package_slug);
CREATE INDEX IF NOT EXISTS tryout_attempts_submitted_idx ON tryout_attempts (submitted_at);
ALTER TABLE tryout_attempts ALTER COLUMN id SET DEFAULT gen_ulid(); -- applied to prod 2026-05-31
