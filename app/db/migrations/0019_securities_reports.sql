-- Riset/insight dari sekuritas (agregator).
CREATE TABLE IF NOT EXISTS securities_reports (
  id text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  securities text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  category text,
  category_type text,
  published_at timestamptz,
  pdf_url text,
  thumbnail_url text,
  source_url text,
  is_member_only integer NOT NULL DEFAULT 0,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS securities_reports_uq ON securities_reports (securities, external_id);
CREATE INDEX IF NOT EXISTS securities_reports_pub_idx ON securities_reports (published_at);
CREATE INDEX IF NOT EXISTS securities_reports_sec_idx ON securities_reports (securities);
