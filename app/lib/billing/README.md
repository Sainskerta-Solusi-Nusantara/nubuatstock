# lib/billing (Agent 4)

DB-backed tiering, entitlements, quota, and subscription lifecycle.

## Public API

Import only from `@/lib/billing`:

```ts
import {
  // tier & entitlements
  getUserTier,
  getEntitlement,
  getAllEntitlements,
  getTierEntitlements,
  listPublicTiers,
  requireTier,
  requireEntitlement,
  invalidateUserCache,

  // quota
  consumeQuota,
  getRemainingQuota,
  resetQuota,
  getDailyWindowKey,

  // subscription lifecycle
  ensureFreeSubscription,
  getActiveSubscription,
  createPendingUpgrade,
  activatePaidSubscription,
  cancelSubscription,
  listUserInvoices,

  // events
  emitSubscriptionChanged,
  emitUserCreated,
  onSubscriptionChanged,
  onUserCreated,

  // providers
  createTransaction,
  verifyMidtransSignature,
  verifyXenditSignature,
  mapMidtransStatus,
  mapXenditStatus,
} from "@/lib/billing";
```

## Hardcode Audit

- Price/feature list lives in `db/seed/tiers.ts` → upserts to `subscription_tiers`
  + `tier_entitlements`. No literal Rp values inside `lib/billing/**`.
- Counter→entitlement map is in `lib/types/billing.ts` (static, not pricing).
- Payment gateway secrets read via `getSecret("payment.<provider>.<key>")`.

## Quota Model

```
Redis key:  quota:{userId}:{counterKey}:{YYYY-MM-DD}  TTL 36h
Postgres:   usage_counters (user_id, counter_key, period_window) unique
```

Redis is source-of-truth at runtime (atomic INCR via Lua). Postgres mirror is
best-effort for audit + survival. Daily reset via key rotation (window changes
→ new key). No cron needed.

## Cross-Agent Contract

Agent 3 (auth) must call `ensureFreeSubscription({ userId })` from its signup
callback (or emit `user.created` which Agent 4 consumes — see EVENTS.md).

Agent 6/7/8 consume `subscription.changed` to invalidate their per-user
entitlement caches (event handler auto-invalidates Agent 4's own cache).

## Dependencies

Uses existing `ioredis` (in package.json), `ulid`, `drizzle-orm`, `zod`. No
new package required.
