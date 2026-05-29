-- =============================================================================
-- AI Buddy v2 — inline citations (AI Copilot)
-- =============================================================================
--
-- Tujuan: simpan "sumber" yang dipakai assistant saat menjawab (hasil tool call),
-- supaya UI bisa render daftar chip "Sumber:" di bawah jawaban dan jawaban
-- ter-grounding ke data (anti-halusinasi).
--
-- Bentuk data (jsonb array): setiap elemen kira-kira:
--   { "tool": "get_quote", "label": "Harga BBRI", "kode": "BBRI" }
--   { "tool": "get_recent_news", "label": "CNBC: ...", "url": "https://...", "kode": "BBRI" }
--   { "tool": "search_research", "label": "Banking outlook 2026", "researchId": "..." }
-- Detail field opsional — UI hanya butuh `label` + (opsional) `url`.
--
-- Idempotent: aman dijalankan berkali-kali (ADD COLUMN IF NOT EXISTS).
--
-- CATATAN NEON / postgres-js:
--   - jsonb didukung penuh di Neon (Postgres standar).
--   - File ini standalone — JALANKAN MANUAL, JANGAN otomatis. Contoh:
--         psql "$DATABASE_URL" -f db/migrations/0004_ai_citations.sql
--
-- ROLLBACK (kalau benar-benar perlu):
--   ALTER TABLE ai_messages DROP COLUMN IF EXISTS citations;
-- =============================================================================

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS citations jsonb NOT NULL DEFAULT '[]'::jsonb;
