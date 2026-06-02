-- Rekomendasi harian dari sekuritas (agregator, atribusi sumber).
CREATE TABLE IF NOT EXISTS securities_picks (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  pick_date text NOT NULL,
  securities text NOT NULL,
  kode text NOT NULL,
  action text,
  entry_low real,
  entry_high real,
  support real,
  resistance real,
  target real,
  stop_loss real,
  rationale text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS securities_picks_uq ON securities_picks (pick_date, securities, kode);
CREATE INDEX IF NOT EXISTS securities_picks_date_idx ON securities_picks (pick_date);
CREATE INDEX IF NOT EXISTS securities_picks_kode_idx ON securities_picks (kode);
