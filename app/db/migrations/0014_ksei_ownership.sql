-- KSEI ownership composition (BalancePos / holding composition).
-- Sumber: web.ksei.co.id/archive_download/holding_composition (upload admin).

CREATE TABLE IF NOT EXISTS ksei_ownership (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  pos_date date NOT NULL,
  kode text NOT NULL,
  sec_type text NOT NULL DEFAULT 'EQUITY',
  sec_num bigint NOT NULL DEFAULT 0,
  price_idr bigint NOT NULL DEFAULT 0,
  local_total bigint NOT NULL DEFAULT 0,
  foreign_total bigint NOT NULL DEFAULT 0,
  foreign_pct real NOT NULL DEFAULT 0,
  local_pct real NOT NULL DEFAULT 0,
  local_comp jsonb NOT NULL,
  foreign_comp jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ksei_ownership_date_kode_uq ON ksei_ownership (pos_date, kode);
CREATE INDEX IF NOT EXISTS ksei_ownership_kode_idx ON ksei_ownership (kode);
CREATE INDEX IF NOT EXISTS ksei_ownership_date_idx ON ksei_ownership (pos_date);
CREATE INDEX IF NOT EXISTS ksei_ownership_foreign_pct_idx ON ksei_ownership (foreign_pct);

CREATE TABLE IF NOT EXISTS ksei_ownership_import (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  pos_date date NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  file_name text,
  actor_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ksei_ownership_import_date_uq ON ksei_ownership_import (pos_date);
