/**
 * Public surface untuk modul auth.
 *
 * Server-side helpers di-export dari sini. Client-side helpers harus diimport
 * langsung dari `@/lib/auth/client` untuk menghindari bundling postgres + drizzle
 * ke client.
 */
export {
  auth,
  getAuth,
  getSession,
  requireAdmin,
  requireRole,
  requireSession,
} from "./server";
// Note: `auth` adalah alias dari `getAuth` (async). Pakai `const a = await auth();`.

export { recordAuthEvent } from "./audit";
export {
  getAppName,
  getDefaultLocale,
  getDefaultTimezone,
  getGoogleOAuthCreds,
  getPasswordMinLength,
  getSessionDurationSeconds,
} from "./config";
export {
  assertMfaEnabled,
  confirmTotpEnrollment,
  disableMfa,
  startTotpEnrollment,
  userRequiresMfa,
  verifyTotpCode,
  verifyTotpForUser,
} from "./mfa";
