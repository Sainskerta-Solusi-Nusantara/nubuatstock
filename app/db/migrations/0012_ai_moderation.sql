-- 0012_ai_moderation.sql
-- Kolom moderasi keamanan untuk ai_messages (flag prompt-injection/jailbreak).
-- Idempotent: aman dijalankan ulang.

ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS injection_risk text;
ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS flag_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ai_messages_injection_idx ON ai_messages (injection_risk);
