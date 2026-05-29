-- 0007_support_tickets.sql
-- Idempotent support tables. supportTickets & supportMessages mungkin SUDAH ada
-- di DB (schema lama di db/schema/support.ts) — CREATE TABLE IF NOT EXISTS bikin
-- statement ini no-op kalau table sudah ada. supportFeedback adalah table baru.

-- ============ support_tickets (no-op kalau sudah ada) ============
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  "user_id" text NOT NULL,
  "user_email" text NOT NULL,
  "subject" text NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "priority" text NOT NULL DEFAULT 'normal',
  "status" text NOT NULL DEFAULT 'open',
  "context_url" text,
  "metadata" jsonb,
  "assigned_admin_id" text,
  "first_replied_at" timestamptz,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_tickets_user_idx" ON "support_tickets" ("user_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status");
CREATE INDEX IF NOT EXISTS "support_tickets_priority_idx" ON "support_tickets" ("priority");
CREATE INDEX IF NOT EXISTS "support_tickets_created_idx" ON "support_tickets" ("created_at");

-- ============ support_messages (no-op kalau sudah ada) ============
CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  "ticket_id" text NOT NULL,
  "author_user_id" text NOT NULL,
  "author_role" text NOT NULL DEFAULT 'user',
  "content" text NOT NULL,
  "is_internal" text NOT NULL DEFAULT 'false',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_messages_ticket_idx" ON "support_messages" ("ticket_id", "created_at");

-- ============ support_feedback (BARU) ============
CREATE TABLE IF NOT EXISTS "support_feedback" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_ulid(),
  "user_id" text NOT NULL,
  "user_email" text NOT NULL,
  "category" text NOT NULL DEFAULT 'feedback',
  "message" text NOT NULL,
  "rating" integer,
  "context_url" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_feedback_user_idx" ON "support_feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "support_feedback_created_idx" ON "support_feedback" ("created_at");
