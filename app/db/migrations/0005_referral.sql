-- =============================================================================
-- Referral program v1 — referral codes, attribution records, reward ledger
-- =============================================================================
--
-- DDL idempotent (CREATE TABLE/INDEX IF NOT EXISTS) yang MENCERMINKAN
-- db/schema/referral.ts. Aman dijalankan ulang.
--
-- Dependensi:
--   - gen_ulid()  (dibuat di BOOTSTRAP_SQL / db/migrate.ts)
--   - auth.users  (soft FK via user_id columns)
--   - Money disimpan sebagai INTEGER rupiah (amount_idr).
--
-- JALANKAN MANUAL — JANGAN otomatis di prod:
--     psql "$DATABASE_URL" -f db/migrations/0005_referral.sql
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS referral_rewards;
--   DROP TABLE IF EXISTS referrals;
--   DROP TABLE IF EXISTS referral_codes;
--   DROP TYPE IF EXISTS referral_reward_status;
--   DROP TYPE IF EXISTS referral_reward_type;
--   DROP TYPE IF EXISTS referral_status;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums (idempotent via DO block — CREATE TYPE tidak punya IF NOT EXISTS)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'qualified', 'rewarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE referral_reward_type AS ENUM ('credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE referral_reward_status AS ENUM ('granted', 'redeemed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- referral_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_codes (
  id          text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  user_id     text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_user_uq
  ON referral_codes (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_uq
  ON referral_codes (code);

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id                text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  referrer_user_id  text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  referred_user_id  text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code              text NOT NULL,
  status            referral_status NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  qualified_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_user_uq
  ON referrals (referred_user_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx
  ON referrals (status);
CREATE INDEX IF NOT EXISTS referrals_code_idx
  ON referrals (code);

-- ---------------------------------------------------------------------------
-- referral_rewards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_rewards (
  id           text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  user_id      text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  referral_id  text NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  type         referral_reward_type NOT NULL DEFAULT 'credit',
  amount_idr   integer NOT NULL,
  status       referral_reward_status NOT NULL DEFAULT 'granted',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_referral_uq
  ON referral_rewards (referral_id);
CREATE INDEX IF NOT EXISTS referral_rewards_user_idx
  ON referral_rewards (user_id);
CREATE INDEX IF NOT EXISTS referral_rewards_status_idx
  ON referral_rewards (status);
