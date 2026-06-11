-- Auth-state Baileys (sesi WhatsApp bot) dipersist ke Postgres.
-- creds + signal keys, satu baris per key, namespaced per `account` (nomor bot).
CREATE TABLE IF NOT EXISTS "wa_auth_state" (
  "account" text NOT NULL DEFAULT 'mirae',
  "key" text NOT NULL,
  "data" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "wa_auth_state_pk" PRIMARY KEY ("account", "key")
);
