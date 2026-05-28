import { db } from "@/lib/db";
import { auditLog as auditLogTable, systemEvents } from "@/db/schema/audit";
import { logger } from "@/lib/logger";
import {
  auditEntrySchema,
  systemEventInputSchema,
  type AuditEntry,
  type SystemEventInput,
} from "@/lib/types/audit";
import { redact } from "./redact";
import { getActor, getRequestId } from "./request-context";

/**
 * Audit log writer.
 *
 * APPEND-ONLY (IMPROVEMENT_PLAN §8.2): modul ini HANYA boleh meng-INSERT ke
 * `audit_log` / `system_events`. JANGAN PERNAH menambah fungsi update/delete di
 * sini — integritas forensik bergantung pada sifat append-only. Penegakan keras
 * ada di level DB (trigger RAISE EXCEPTION + REVOKE) lewat migration
 * db/migrations/0000_audit_log_immutability.sql; guard di app ini bersifat
 * dokumentatif/konvensi.
 *
 * - Auto-inject `requestId`, `actorUserId`, `actorRole` dari AsyncLocalStorage
 *   kalau caller tidak provide (lihat lib/observability/request-context.ts).
 * - Sensitive field di `before`, `after`, `metadata` di-redact (deep clone).
 * - Tidak throw — failure → log warning. Caller bebas await atau fire-and-forget.
 *
 * Sample pemakaian:
 *   await auditLog({ action: "config.update", targetType: "app_config", targetId: "ai.provider",
 *                    before: { value: "deepseek" }, after: { value: "anthropic" } });
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  const parsed = auditEntrySchema.safeParse(entry);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Invalid audit entry — dropping");
    return;
  }
  const e = parsed.data;
  const ctx = getActor();
  const requestId = e.requestId ?? getRequestId();

  try {
    await db.insert(auditLogTable).values({
      actorUserId: e.actorUserId ?? ctx?.userId ?? null,
      actorRole: e.actorRole ?? ctx?.role ?? null,
      action: e.action,
      targetType: e.targetType ?? null,
      targetId: e.targetId ?? null,
      before: e.before !== undefined ? redact(e.before) : null,
      after: e.after !== undefined ? redact(e.after) : null,
      ip: e.ip ?? null,
      userAgent: e.userAgent ?? null,
      metadata: e.metadata ? redact(e.metadata) : {},
      success: e.success ?? true,
      errorCode: e.errorCode ?? null,
      requestId: requestId ?? null,
    });
  } catch (err) {
    logger.warn({ err, action: e.action }, "Failed to write audit_log");
  }
}

/**
 * Fire-and-forget — tidak menunggu DB write. Tetap log error kalau gagal.
 * Cocok untuk hot path yang tidak mau ditahan oleh I/O audit.
 */
export function auditLogAsync(entry: AuditEntry): void {
  void auditLog(entry).catch((err) => {
    logger.warn({ err, action: entry.action }, "audit_log async insert failed");
  });
}

/**
 * Tulis system event (non-user actions: worker, scheduler, integration).
 */
export async function logSystemEvent(input: SystemEventInput): Promise<void> {
  const parsed = systemEventInputSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Invalid system_event input — dropping");
    return;
  }
  const e = parsed.data;
  try {
    await db.insert(systemEvents).values({
      source: e.source,
      level: e.level,
      eventType: e.eventType,
      message: e.message,
      metadata: e.metadata ? redact(e.metadata) : {},
    });
  } catch (err) {
    logger.warn({ err, source: e.source, eventType: e.eventType }, "Failed to write system_event");
  }
}

export function logSystemEventAsync(input: SystemEventInput): void {
  void logSystemEvent(input).catch((err) => {
    logger.warn({ err, source: input.source }, "system_event async insert failed");
  });
}
