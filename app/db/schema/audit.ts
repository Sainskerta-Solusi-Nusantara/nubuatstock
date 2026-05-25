import {
  boolean,
  index,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * Audit schema (Agent 11) — global audit log + system events.
 *
 * - `audit_log` mencatat aksi yang berasal dari user/admin (atau system action) — verb_object
 *   action (e.g. `config.update`, `secret.rotate`, `user.login_success`, `billing.upgrade`).
 *   Field `before`/`after` JSON di-redact sensitif sebelum simpan (lihat lib/observability/audit.ts).
 * - `system_events` mencatat event yang dipancarkan oleh sistem (worker, scheduler, integrasi)
 *   yang BUKAN aksi user. Level info/warn/error dipakai untuk filtering admin UI.
 *
 * Catatan IP:
 * - Kolom `ip` pakai `text` (bukan `inet`) supaya kompatibel dengan IPv6 mapping dari
 *   reverse-proxy header dan tidak gagal saat IP unknown. Validasi format di app layer.
 */

// =================== audit_log ===================

export const auditLog = pgTable(
  "audit_log",
  {
    id: ulid(),
    actorUserId: text("actor_user_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    before: jsonbT<unknown>("before"),
    after: jsonbT<unknown>("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonbT<Record<string, unknown>>("metadata").notNull().default({}),
    success: boolean("success").notNull().default(true),
    errorCode: text("error_code"),
    requestId: text("request_id"),
    ...withTimestamps,
  },
  (t) => [
    index("audit_log_created_at_idx").on(t.createdAt.desc()),
    index("audit_log_actor_created_idx").on(t.actorUserId, t.createdAt.desc()),
    index("audit_log_target_created_idx").on(t.targetType, t.targetId, t.createdAt.desc()),
    index("audit_log_action_idx").on(t.action),
    index("audit_log_request_id_idx").on(t.requestId),
  ],
);

// =================== system_events ===================

export const systemEventLevels = ["info", "warn", "error"] as const;
export type SystemEventLevel = (typeof systemEventLevels)[number];

export const systemEvents = pgTable(
  "system_events",
  {
    id: ulid(),
    source: text("source").notNull(),
    level: text("level").$type<SystemEventLevel>().notNull().default("info"),
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    metadata: jsonbT<Record<string, unknown>>("metadata").notNull().default({}),
    ...withTimestamps,
  },
  (t) => [
    index("system_events_created_at_idx").on(t.createdAt.desc()),
    index("system_events_source_idx").on(t.source),
    index("system_events_level_idx").on(t.level),
    index("system_events_event_type_idx").on(t.eventType),
  ],
);

// =================== Drizzle inferred types ===================

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type SystemEvent = typeof systemEvents.$inferSelect;
export type NewSystemEvent = typeof systemEvents.$inferInsert;
