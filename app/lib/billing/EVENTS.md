# Billing Events (Agent 4)

## Emit

| Event | Trigger | Payload | Consumer(s) |
|---|---|---|---|
| `subscription.changed` | created, upgraded, downgraded, cancelled, renewed, expired | `{ userId, subscriptionId, fromTier, toTier, action, at }` | Agent 6 (re-cache entitlements), Agent 7 (re-cache quota), Agent 8 (re-cache picks visibility), Agent 10 (audit log + notification) |

## Consume

| Event | Source | Handler | Notes |
|---|---|---|---|
| `user.created` | Agent 3 (signup callback) | `ensureFreeSubscription({ userId })` | Direct DB write at signup callback; queue (Agent 11) optional |

## Integration Pattern

Until BullMQ queue (Agent 11) is wired up, billing uses an in-process bus
(`lib/billing/events.ts`). Handlers register via:

```ts
import { onSubscriptionChanged } from "@/lib/billing";
onSubscriptionChanged(async (e) => { /* invalidate cache, etc */ });
```

When queue ships, replace `emitSubscriptionChanged` body with
`queue.publish("subscription.changed", payload)`. Consumer signatures stay
unchanged.

## Cache Invalidation

`emitSubscriptionChanged` automatically calls `invalidateUserCache(userId)` in
the entitlements module — caller does not need to do it manually.

## Audit Trail

All emits result in a `subscription_history` row written by the subscription
mutation functions (`createPendingUpgrade`, `activatePaidSubscription`,
`cancelSubscription`, `ensureFreeSubscription`).
