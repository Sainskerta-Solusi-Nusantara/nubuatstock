-- Data perubahan antar-periode (changelog) dari klinikpenyesalan — disimpan RAW.
CREATE TABLE IF NOT EXISTS ownership_1pct_changelog (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  "current_date" text NOT NULL,
  prev_date text,
  raw jsonb NOT NULL,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ownership_1pct_changelog_date_uq ON ownership_1pct_changelog ("current_date");
