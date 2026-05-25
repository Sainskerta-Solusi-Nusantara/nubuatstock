import { db } from "@/lib/db";
import { authAuditLog, type AuthAuditEvent } from "@/db/schema/auth";
import { logger } from "@/lib/logger";

/**
 * Tulis event auth ke `auth_audit_log`. Akan dimerge ke `audit_log` global
 * milik Agent 10/11 saat module mereka siap (sama struct columns).
 *
 * Tidak throw — failure log sebagai warning, jangan blok user flow.
 */
export interface AuthAuditPayload {
  actorUserId?: string | null;
  action: AuthAuditEvent;
  targetType?: string;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuthEvent(payload: AuthAuditPayload): Promise<void> {
  try {
    await db.insert(authAuditLog).values({
      actorUserId: payload.actorUserId ?? null,
      action: payload.action,
      targetType: payload.targetType ?? "user",
      targetId: payload.targetId ?? payload.actorUserId ?? null,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    logger.warn({ err, action: payload.action }, "Failed to record auth audit event");
  }
}
