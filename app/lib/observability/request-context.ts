import { AsyncLocalStorage } from "node:async_hooks";
import { ulid } from "ulid";

/**
 * AsyncLocalStorage untuk propagate request_id melalui async chain.
 *
 * Pemakaian (di middleware atau route handler):
 *
 *   import { runWithContext, getRequestId, newRequestId } from "@/lib/observability/request-context";
 *   const requestId = newRequestId();
 *   return runWithContext({ requestId }, async () => {
 *     // semua audit log di-tag dengan requestId
 *     return handler(req);
 *   });
 *
 * Jika tidak di-set, helper akan mengembalikan undefined — audit tetap berfungsi
 * tanpa request_id (untuk worker job & cron).
 */

export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function newRequestId(): string {
  return ulid();
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getActor(): { userId?: string; role?: string } | undefined {
  const ctx = storage.getStore();
  if (!ctx) return undefined;
  return { userId: ctx.userId, role: ctx.userRole };
}

export function setActor(userId: string, role?: string): void {
  const store = storage.getStore();
  if (!store) return;
  store.userId = userId;
  if (role) store.userRole = role;
}
