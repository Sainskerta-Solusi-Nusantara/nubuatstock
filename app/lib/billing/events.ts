import { logger } from "../logger";
import type { TierKode } from "../types/billing";
import { invalidateUserCache } from "./entitlements";

/**
 * Event emitter stub untuk billing.
 *
 * Agent 11 (queue) belum tersedia, jadi MVP pakai in-process event bus
 * sederhana. Saat queue datang, ganti `emitSubscriptionChanged` & `emitUserCreated`
 * dengan publish ke BullMQ topic.
 *
 * Consumer pattern (untuk Agent 6/7/8):
 *   onSubscriptionChanged(async ({ userId }) => { invalidateMyCache(userId); });
 */

export interface SubscriptionChangedEvent {
  userId: string;
  subscriptionId: string;
  fromTier: TierKode | null;
  toTier: TierKode;
  action: "created" | "upgraded" | "downgraded" | "cancelled" | "renewed" | "expired";
  at?: Date;
}

export interface UserCreatedEvent {
  userId: string;
  email: string;
  at?: Date;
}

type SubscriptionChangedHandler = (event: SubscriptionChangedEvent) => Promise<void> | void;
type UserCreatedHandler = (event: UserCreatedEvent) => Promise<void> | void;

const subscriptionChangedHandlers: SubscriptionChangedHandler[] = [];
const userCreatedHandlers: UserCreatedHandler[] = [];

export function onSubscriptionChanged(handler: SubscriptionChangedHandler): () => void {
  subscriptionChangedHandlers.push(handler);
  return () => {
    const idx = subscriptionChangedHandlers.indexOf(handler);
    if (idx >= 0) subscriptionChangedHandlers.splice(idx, 1);
  };
}

export function onUserCreated(handler: UserCreatedHandler): () => void {
  userCreatedHandlers.push(handler);
  return () => {
    const idx = userCreatedHandlers.indexOf(handler);
    if (idx >= 0) userCreatedHandlers.splice(idx, 1);
  };
}

export async function emitSubscriptionChanged(
  event: SubscriptionChangedEvent,
): Promise<void> {
  const payload = { ...event, at: event.at ?? new Date() };
  logger.info({ event: "subscription.changed", ...payload }, "Emit subscription.changed");
  invalidateUserCache(payload.userId);
  for (const handler of subscriptionChangedHandlers) {
    try {
      await handler(payload);
    } catch (err) {
      logger.error({ err, handler: handler.name }, "subscription.changed handler failed");
    }
  }
}

export async function emitUserCreated(event: UserCreatedEvent): Promise<void> {
  const payload = { ...event, at: event.at ?? new Date() };
  // PII: jangan log email full di production. Di sini dev-only debug.
  logger.info(
    { event: "user.created", userId: payload.userId },
    "Emit user.created",
  );
  for (const handler of userCreatedHandlers) {
    try {
      await handler(payload);
    } catch (err) {
      logger.error({ err, handler: handler.name }, "user.created handler failed");
    }
  }
}
