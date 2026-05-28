-- =============================================================================
-- Audit log immutability (append-only) — IMPROVEMENT_PLAN §8.2
-- =============================================================================
--
-- Tujuan: tabel "audit_log" dan "system_events" HARUS append-only (insert + select
-- saja) untuk integritas forensik. Tidak boleh ada UPDATE / DELETE / TRUNCATE,
-- bahkan oleh admin/owner aplikasi.
--
-- Pendekatan (defense-in-depth, dua lapis):
--
--   1. TRIGGER yang RAISE EXCEPTION pada UPDATE / DELETE / TRUNCATE.
--      Dipilih (vs. `DO INSTEAD NOTHING` RULE) karena lebih EKSPLISIT untuk
--      forensik: operasi yang dilarang GAGAL secara nyata (error + rollback),
--      bukan diam-diam di-no-op. Ini mencegah false sense of "berhasil hapus".
--      Trigger berlaku untuk SEMUA role (termasuk superuser tabel), kecuali
--      trigger di-disable secara eksplisit — yang itu sendiri membutuhkan hak
--      DDL dan akan terlihat di audit infrastruktur.
--
--   2. REVOKE UPDATE, DELETE, TRUNCATE dari PUBLIC (defense-in-depth lapis kedua,
--      di level privilege). Idempoten & aman walau role aplikasi tidak diketahui
--      di sini. Lihat catatan role di bawah kalau ingin REVOKE per-role.
--
-- CATATAN NEON / postgres-js:
--   - Trigger PL/pgSQL didukung penuh di Neon (Postgres standar). Tidak perlu
--     ekstensi tambahan.
--   - File ini SENGAJA standalone (folder db/migrations belum punya journal
--     drizzle). JALANKAN MANUAL — JANGAN otomatis. Contoh:
--         psql "$DATABASE_URL" -f db/migrations/0000_audit_log_immutability.sql
--     atau melalui pipeline drizzle-kit yang dipakai tim.
--
-- ROLLBACK (kalau benar-benar perlu, mis. maintenance terkontrol):
--   DROP TRIGGER audit_log_no_mutate ON audit_log;
--   DROP TRIGGER audit_log_no_truncate ON audit_log;
--   DROP TRIGGER system_events_no_mutate ON system_events;
--   DROP TRIGGER system_events_no_truncate ON system_events;
--   DROP FUNCTION audit_reject_mutation();
-- =============================================================================

-- statement_timeout 0: pembuatan trigger ringan, tapi pastikan tidak ke-timeout
-- di pooled connection.
SET statement_timeout = 0;

-- ---------------------------------------------------------------------------
-- 1) Fungsi penolak mutasi (dipakai bersama oleh kedua tabel)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'append-only table "%": % is not permitted (audit immutability, IMPROVEMENT_PLAN §8.2)',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege',
          HINT = 'Audit records are immutable. Inserts only; corrections must be new rows.';
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Trigger pada audit_log
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_log_no_mutate ON audit_log;
CREATE TRIGGER audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_reject_mutation();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_reject_mutation();

-- ---------------------------------------------------------------------------
-- 3) Trigger pada system_events (event sistem juga bukti forensik)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS system_events_no_mutate ON system_events;
CREATE TRIGGER system_events_no_mutate
  BEFORE UPDATE OR DELETE ON system_events
  FOR EACH ROW
  EXECUTE FUNCTION audit_reject_mutation();

DROP TRIGGER IF EXISTS system_events_no_truncate ON system_events;
CREATE TRIGGER system_events_no_truncate
  BEFORE TRUNCATE ON system_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_reject_mutation();

-- ---------------------------------------------------------------------------
-- 4) REVOKE privilege (defense-in-depth, lapis kedua)
-- ---------------------------------------------------------------------------
-- Cabut hak mutasi dari PUBLIC. INSERT & SELECT tetap diizinkan.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log     FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON system_events FROM PUBLIC;

-- OPSIONAL — kalau role aplikasi spesifik diketahui (mis. "nubuat_app"),
-- tambahkan REVOKE eksplisit per-role + GRANT insert/select:
--   REVOKE UPDATE, DELETE, TRUNCATE ON audit_log     FROM nubuat_app;
--   REVOKE UPDATE, DELETE, TRUNCATE ON system_events FROM nubuat_app;
--   GRANT  INSERT, SELECT            ON audit_log     TO   nubuat_app;
--   GRANT  INSERT, SELECT            ON system_events TO   nubuat_app;
