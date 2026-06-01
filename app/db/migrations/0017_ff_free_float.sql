-- Status pemenuhan Free Float BEI per emiten (sumber: ff.klinikpenyesalan.com).
CREATE TABLE IF NOT EXISTS ff_free_float (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  snapshot_date text NOT NULL,
  kode text NOT NULL,
  name text NOT NULL DEFAULT '',
  board text,
  market_cap bigint NOT NULL DEFAULT 0,
  shareholders integer NOT NULL DEFAULT 0,
  free_float_pct real NOT NULL DEFAULT 0,
  required_pct real NOT NULL DEFAULT 0,
  status text,
  rank integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ff_free_float_date_kode_uq ON ff_free_float (snapshot_date, kode);
CREATE INDEX IF NOT EXISTS ff_free_float_kode_idx ON ff_free_float (kode);
CREATE INDEX IF NOT EXISTS ff_free_float_board_idx ON ff_free_float (board);
CREATE INDEX IF NOT EXISTS ff_free_float_ff_idx ON ff_free_float (free_float_pct);
