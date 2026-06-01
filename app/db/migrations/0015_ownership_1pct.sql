-- Kepemilikan >=1% per emiten (sumber: 1pct.klinikpenyesalan.com, olahan KSEI).
-- Untuk review di superadmin (pembanding dengan komposisi KSEI resmi).

CREATE TABLE IF NOT EXISTS ownership_1pct_emiten (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  kode text NOT NULL,
  issuer_name text NOT NULL DEFAULT '',
  sector text,
  industry text,
  holder_count integer NOT NULL DEFAULT 0,
  pct_sum real NOT NULL DEFAULT 0,
  free_float real NOT NULL DEFAULT 0,
  cr1 real NOT NULL DEFAULT 0,
  cr3 real NOT NULL DEFAULT 0,
  hhi real NOT NULL DEFAULT 0,
  ccs real NOT NULL DEFAULT 0,
  ownership_type text,
  has_scrip_data integer NOT NULL DEFAULT 0,
  snapshot_date text,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ownership_1pct_emiten_kode_uq ON ownership_1pct_emiten (kode);
CREATE INDEX IF NOT EXISTS ownership_1pct_emiten_ff_idx ON ownership_1pct_emiten (free_float);
CREATE INDEX IF NOT EXISTS ownership_1pct_emiten_ccs_idx ON ownership_1pct_emiten (ccs);
CREATE INDEX IF NOT EXISTS ownership_1pct_emiten_sector_idx ON ownership_1pct_emiten (sector);

CREATE TABLE IF NOT EXISTS ownership_1pct_holder (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  kode text NOT NULL,
  investor_name text NOT NULL DEFAULT '',
  investor_type text,
  local_foreign text,
  nationality text,
  domicile text,
  holdings_scripless bigint NOT NULL DEFAULT 0,
  holdings_scrip bigint NOT NULL DEFAULT 0,
  total_shares bigint NOT NULL DEFAULT 0,
  percentage real NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ownership_1pct_holder_kode_idx ON ownership_1pct_holder (kode);
CREATE INDEX IF NOT EXISTS ownership_1pct_holder_name_idx ON ownership_1pct_holder (investor_name);
CREATE INDEX IF NOT EXISTS ownership_1pct_holder_pct_idx ON ownership_1pct_holder (percentage);
