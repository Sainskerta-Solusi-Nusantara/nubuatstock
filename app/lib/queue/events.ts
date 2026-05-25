import { z } from "zod";
import { logger } from "@/lib/logger";
import { eventChannels, type EventChannel } from "@/lib/types/audit";
import {
  getPublisherConnection,
  getSubscriberConnection,
} from "./connection";

/**
 * Lightweight pub/sub event bus on top of Redis channels.
 *
 * Bukan persistent (kalau subscriber down → event hilang). Pakai BullMQ queue
 * untuk job persistent. Event bus dipakai untuk cross-feature signal:
 *   - user.created → Agent 4 auto-create free tier subscription
 *   - subscription.changed → Agent 6/7/8 re-cache entitlements
 *   - market.eod.ingested → Agent 8 trigger pre-market picks
 *   - picks.generated → Agent 10 send notification
 *   - alert.triggered → Agent 10 send notification
 *   - secret.rotated → Agent 7 invalidate AI client cache
 *
 * Type safety: setiap channel punya Zod payload schema. publish dan subscribe
 * memvalidasi payload sebelum kirim/proses.
 */

const CHANNEL_PREFIX = "nubuat:event:";

function channelKey(name: string): string {
  return `${CHANNEL_PREFIX}${name}`;
}

// =================== Payload Schemas ===================

export const userCreatedSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.string(),
});
export type UserCreatedPayload = z.infer<typeof userCreatedSchema>;

export const userDeletedSchema = z.object({
  userId: z.string(),
  deletedAt: z.string(),
});
export type UserDeletedPayload = z.infer<typeof userDeletedSchema>;

export const subscriptionChangedSchema = z.object({
  userId: z.string(),
  previousTier: z.string().nullable(),
  newTier: z.string(),
  changedAt: z.string(),
  reason: z.string().optional(),
});
export type SubscriptionChangedPayload = z.infer<typeof subscriptionChangedSchema>;

export const marketEodIngestedSchema = z.object({
  tradingDate: z.string(),
  ingestedCount: z.number(),
  vendor: z.string(),
  ingestedAt: z.string(),
});
export type MarketEodIngestedPayload = z.infer<typeof marketEodIngestedSchema>;

export const picksGeneratedSchema = z.object({
  tradingDate: z.string(),
  count: z.number(),
  generatedAt: z.string(),
  runId: z.string().optional(),
});
export type PicksGeneratedPayload = z.infer<typeof picksGeneratedSchema>;

export const alertTriggeredSchema = z.object({
  alertId: z.string(),
  userId: z.string(),
  companyKode: z.string(),
  conditionSummary: z.string(),
  triggeredAt: z.string(),
});
export type AlertTriggeredPayload = z.infer<typeof alertTriggeredSchema>;

export const secretRotatedSchema = z.object({
  key: z.string(),
  keyVersion: z.number(),
  rotatedAt: z.string(),
  rotatedBy: z.string().optional(),
});
export type SecretRotatedPayload = z.infer<typeof secretRotatedSchema>;

// =================== Event Map ===================

export const eventPayloadSchemas = {
  "user.created": userCreatedSchema,
  "user.deleted": userDeletedSchema,
  "subscription.changed": subscriptionChangedSchema,
  "market.eod.ingested": marketEodIngestedSchema,
  "picks.generated": picksGeneratedSchema,
  "alert.triggered": alertTriggeredSchema,
  "secret.rotated": secretRotatedSchema,
} as const satisfies Record<EventChannel, z.ZodTypeAny>;

export type EventPayloadMap = {
  [K in EventChannel]: z.infer<(typeof eventPayloadSchemas)[K]>;
};

// =================== Subscriber Registry ===================

type Handler<C extends EventChannel> = (payload: EventPayloadMap[C]) => void | Promise<void>;
type AnyHandler = (payload: unknown) => void | Promise<void>;

const handlerRegistry = new Map<string, Set<AnyHandler>>();
let subscriberInitialized = false;

function ensureSubscriberAttached(): void {
  if (subscriberInitialized) return;
  const sub = getSubscriberConnection();
  sub.on("messageBuffer", (channel: Buffer, message: Buffer) => {
    const channelStr = channel.toString("utf8");
    if (!channelStr.startsWith(CHANNEL_PREFIX)) return;
    const eventName = channelStr.slice(CHANNEL_PREFIX.length);
    const handlers = handlerRegistry.get(eventName);
    if (!handlers || handlers.size === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(message.toString("utf8"));
    } catch (err) {
      logger.warn({ err, channel: eventName }, "Event payload not JSON");
      return;
    }

    const schema = (eventPayloadSchemas as Record<string, z.ZodTypeAny>)[eventName];
    let safePayload: unknown = parsed;
    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        logger.warn(
          { channel: eventName, issues: result.error.issues },
          "Invalid event payload — handlers skipped",
        );
        return;
      }
      safePayload = result.data;
    }

    for (const h of handlers) {
      Promise.resolve()
        .then(() => h(safePayload))
        .catch((err) => {
          logger.error({ err, channel: eventName }, "Event handler error");
        });
    }
  });
  subscriberInitialized = true;
}

// =================== Public API ===================

export async function publishEvent<C extends EventChannel>(
  channel: C,
  payload: EventPayloadMap[C],
): Promise<void> {
  const schema = eventPayloadSchemas[channel];
  const result = schema.safeParse(payload);
  if (!result.success) {
    logger.error(
      { channel, issues: result.error.issues },
      "Refusing to publish invalid event payload",
    );
    throw new Error(`Invalid event payload for channel ${channel}`);
  }
  const pub = getPublisherConnection();
  await pub.publish(channelKey(channel), JSON.stringify(result.data));
  logger.debug({ channel }, "Event published");
}

export async function subscribeEvent<C extends EventChannel>(
  channel: C,
  handler: Handler<C>,
): Promise<() => Promise<void>> {
  ensureSubscriberAttached();
  const sub = getSubscriberConnection();

  let handlers = handlerRegistry.get(channel);
  if (!handlers) {
    handlers = new Set();
    handlerRegistry.set(channel, handlers);
    await sub.subscribe(channelKey(channel));
  }
  handlers.add(handler as AnyHandler);

  return async () => {
    const set = handlerRegistry.get(channel);
    if (!set) return;
    set.delete(handler as AnyHandler);
    if (set.size === 0) {
      handlerRegistry.delete(channel);
      try {
        await sub.unsubscribe(channelKey(channel));
      } catch (err) {
        logger.warn({ err, channel }, "Unsubscribe failed");
      }
    }
  };
}

export function listEventChannels(): readonly EventChannel[] {
  return eventChannels;
}

/**
 * Re-export `getQueue` here for convenience — beberapa subscriber lookup
 * queue setelah menerima event tanpa harus dual-import dari `@/lib/queue`.
 * Hindari circular import dengan dynamic import.
 */
export async function getQueue<DataT = unknown, ReturnT = unknown>(
  name: string,
): Promise<import("bullmq").Queue<DataT, ReturnT>> {
  const { getQueue: getQueueImpl } = await import("./index");
  return getQueueImpl<DataT, ReturnT>(name);
}
