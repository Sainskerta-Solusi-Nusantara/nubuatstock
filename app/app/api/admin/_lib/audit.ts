import { headers } from "next/headers";
import { auditLog } from "@/lib/observability/audit";

/**
 * Wrapper khusus admin API → delegasi ke `auditLog` (Agent 11).
 *
 * - Inject IP & user agent dari Next request headers.
 * - Helper observability sudah handle redaction (sensitive fields) + AsyncLocalStorage
 *   actor/requestId context.
 */

export interface AdminAuditPayload {
  actorUserId: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorCode?: string | null;
}

export async function adminAudit(payload: AdminAuditPayload): Promise<void> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    undefined;
  const userAgent = hdrs.get("user-agent") ?? undefined;
  const requestId = hdrs.get("x-request-id") ?? undefined;

  await auditLog({
    actorUserId: payload.actorUserId,
    actorRole: payload.actorRole ?? "admin",
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId ?? undefined,
    before: payload.before,
    after: payload.after,
    metadata: payload.metadata,
    success: payload.success ?? true,
    errorCode: payload.errorCode ?? undefined,
    ip,
    userAgent,
    requestId,
  });
}
