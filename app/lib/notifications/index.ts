/**
 * Public surface untuk modul notifications.
 *
 * Event yang di-emit (BullMQ topic via Agent 10):
 *   - `notifications.send` — payload `EnqueueJobShape` di dispatch.ts
 *
 * Event yang di-consume (di-dispatch oleh agent lain via `sendNotification`):
 *   - `auth.email_verification`     (Agent 3)
 *   - `auth.password_reset`         (Agent 3)
 *   - `auth.mfa_enabled`            (Agent 3)
 *   - `alert.price_triggered`       (Agent 6)
 *   - `picks.daily_ready`           (Agent 8)
 *   - `billing.invoice_paid`        (Agent 4)
 *   - `billing.subscription_expired`(Agent 4)
 */

export { renderTemplate, applyTemplate } from "./render";
export {
  sendNotification,
  purgeExpiredNotifications,
  markNotificationsRead,
} from "./dispatch";
