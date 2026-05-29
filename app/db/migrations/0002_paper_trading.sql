-- =============================================================================
-- Paper Trading — virtual portfolio + Hall of Fame leaderboard
-- =============================================================================
--
-- DDL idempotent (CREATE TABLE IF NOT EXISTS) yang MENCERMINKAN
-- db/schema/paper-trading.ts. Aman dijalankan ulang.
--
-- Dependensi:
--   - gen_ulid()  (dibuat di BOOTSTRAP_SQL / db/migrate.ts)
--   - Money disimpan sebagai NUMERIC (rupiah, presisi tinggi).
--
-- JALANKAN MANUAL — JANGAN otomatis di prod:
--     psql "$DATABASE_URL" -f db/migrations/0002_paper_trading.sql
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS paper_leaderboard_snapshots;
--   DROP TABLE IF EXISTS paper_trades;
--   DROP TABLE IF EXISTS paper_positions;
--   DROP TABLE IF EXISTS paper_portfolios;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- paper_portfolios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_portfolios (
  id                   text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  user_id              text NOT NULL,
  name                 text NOT NULL,
  cash_balance_idr     numeric(24, 2) NOT NULL,
  initial_capital_idr  numeric(24, 2) NOT NULL DEFAULT '100000000',
  buy_fee_pct          numeric(6, 5) NOT NULL DEFAULT '0.0015',
  sell_fee_pct         numeric(6, 5) NOT NULL DEFAULT '0.0025',
  is_default           text NOT NULL DEFAULT 'false',
  description          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

CREATE INDEX IF NOT EXISTS paper_portfolios_user_idx
  ON paper_portfolios (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS paper_portfolios_user_name_uq
  ON paper_portfolios (user_id, name);

-- ---------------------------------------------------------------------------
-- paper_positions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_positions (
  id                  text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  portfolio_id        text NOT NULL,
  company_kode        text NOT NULL,
  quantity            integer NOT NULL,
  avg_buy_price_idr   numeric(18, 4) NOT NULL,
  realized_pnl_idr    numeric(24, 2) NOT NULL DEFAULT '0',
  first_bought_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS paper_positions_portfolio_kode_uq
  ON paper_positions (portfolio_id, company_kode);
CREATE INDEX IF NOT EXISTS paper_positions_portfolio_idx
  ON paper_positions (portfolio_id);

-- ---------------------------------------------------------------------------
-- paper_trades
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_trades (
  id                text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  portfolio_id      text NOT NULL,
  company_kode      text NOT NULL,
  side              text NOT NULL,
  quantity          integer NOT NULL,
  price_idr         numeric(18, 4) NOT NULL,
  total_value_idr   numeric(24, 2) NOT NULL,
  fee_idr           numeric(24, 2) NOT NULL DEFAULT '0',
  realized_pnl_idr  numeric(24, 2),
  executed_at       timestamptz NOT NULL DEFAULT now(),
  source            text NOT NULL DEFAULT 'manual',
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paper_trades_portfolio_idx
  ON paper_trades (portfolio_id, executed_at);
CREATE INDEX IF NOT EXISTS paper_trades_kode_idx
  ON paper_trades (company_kode);

-- ---------------------------------------------------------------------------
-- paper_leaderboard_snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_leaderboard_snapshots (
  id                    text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  portfolio_id          text NOT NULL,
  snapshot_date         date NOT NULL,
  cash_balance_idr      numeric(24, 2) NOT NULL,
  positions_value_idr   numeric(24, 2) NOT NULL,
  total_value_idr       numeric(24, 2) NOT NULL,
  return_pct            numeric(8, 4) NOT NULL,
  rank_weekly           integer,
  rank_monthly          integer,
  rank_all_time         integer,
  metadata              jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS paper_leaderboard_uq
  ON paper_leaderboard_snapshots (portfolio_id, snapshot_date);
CREATE INDEX IF NOT EXISTS paper_leaderboard_date_value_idx
  ON paper_leaderboard_snapshots (snapshot_date, total_value_idr);
