/**
 * Public barrel untuk lib/billing.
 *
 * Cross-agent contract: agent lain WAJIB import dari `@/lib/billing` (bukan
 * dari file internal `@/lib/billing/foo`) supaya struktur internal bisa
 * berubah tanpa mempengaruhi caller.
 */

export {
  getAllEntitlements,
  getEntitlement,
  getTierEntitlements,
  getUserTier,
  invalidateAllEntitlementsCache,
  invalidateUserCache,
  isUnlimited,
  listPublicTiers,
  requireEntitlement,
  requireTier,
} from "./entitlements";

export {
  consumeQuota,
  getAllUsage,
  getDailyWindowKey,
  getMonthlyWindowKey,
  getRemainingQuota,
  resetQuota,
} from "./quota";

export {
  activatePaidSubscription,
  setUserTierByAdmin,
  cancelSubscription,
  createPendingUpgrade,
  ensureFreeSubscription,
  getActiveSubscription,
  listUserInvoices,
  startTrialSubscription,
} from "./subscriptions";

export {
  emitSubscriptionChanged,
  emitUserCreated,
  onSubscriptionChanged,
  onUserCreated,
  type SubscriptionChangedEvent,
  type UserCreatedEvent,
} from "./events";

export {
  assertSupportedProvider,
  createTransaction,
  getPaymentRedirectUrls,
  mapMidtransStatus,
  mapXenditStatus,
  verifyMidtransSignature,
  verifyXenditSignature,
} from "./providers";
