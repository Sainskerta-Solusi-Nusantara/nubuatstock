-- =============================================================================
-- Typo-tolerant ticker search (pg_trgm) — IMPROVEMENT_PLAN §8.4 #26
-- =============================================================================
--
-- Tujuan: search emiten tahan-typo. Contoh kasus nyata:
--   "BBR"      → BBRI   (prefix/typo pada kode)
--   "TLKOM"    → TLKM   (typo pada kode)
--   "bank bca" → BBCA   (fuzzy pada nama_perusahaan)
--
-- Pendekatan: PostgreSQL extension `pg_trgm` (trigram similarity). Query search
-- (lihat lib/market-data/searchTickers & lib/companies/searchCompanies) tetap
-- memprioritaskan exact + prefix match (rank teratas), lalu fallback ke trigram
-- similarity untuk toleransi typo, di-ORDER BY similarity DESC.
--
-- INDEX: GIN trigram index pada companies.kode & companies.nama_perusahaan agar
-- operator `%` (similarity) dan `ILIKE '%...%'` tetap cepat di tabel besar.
--
-- CATATAN NEON / postgres-js:
--   - `pg_trgm` tersedia & didukung penuh di Neon (extension standar Postgres).
--   - File ini standalone (folder db/migrations belum punya journal drizzle).
--     JALANKAN MANUAL — JANGAN otomatis. Contoh:
--         psql "$DATABASE_URL" -f db/migrations/0001_companies_trgm_search.sql
--     atau melalui pipeline drizzle-kit yang dipakai tim.
--   - CREATE INDEX (non-concurrent) mengunci tabel untuk write singkat. Tabel
--     `companies` kecil (~900 emiten IDX) → aman. Untuk tabel besar pertimbangkan
--     CREATE INDEX CONCURRENTLY (tidak bisa di dalam transaksi).
--
-- ROLLBACK (kalau benar-benar perlu):
--   DROP INDEX IF EXISTS companies_kode_trgm_idx;
--   DROP INDEX IF EXISTS companies_nama_trgm_idx;
--   -- (extension pg_trgm sengaja TIDAK di-drop; mungkin dipakai fitur lain)
-- =============================================================================

-- 1) Extension trigram. Idempoten.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) GIN trigram index pada kode (ticker). Mendukung `kode % q` (similarity)
--    dan `kode ILIKE '%q%'`. Prefix `kode LIKE 'Q%'` tetap dilayani unique index
--    yang sudah ada (companies_kode_uq).
CREATE INDEX IF NOT EXISTS companies_kode_trgm_idx
  ON companies USING gin (kode gin_trgm_ops);

-- 3) GIN trigram index pada nama_perusahaan (fuzzy match "bank bca" → BBCA).
CREATE INDEX IF NOT EXISTS companies_nama_trgm_idx
  ON companies USING gin (nama_perusahaan gin_trgm_ops);
