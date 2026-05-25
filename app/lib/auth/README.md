# Auth (Agent 3)

Better-Auth + Drizzle adapter. Email/password (Argon2id), Google OAuth (opt-in via DB), TOTP MFA.

## Public API

- `auth` — proxy to lazy-initialized Better-Auth instance.
- `getAuth()` — async fetch the instance (resolves DB-backed config first).
- `getSession()` — `AppSession | null` for current request.
- `requireSession()` — throws `UnauthorizedError` if no session.
- `requireRole(session, role)` — throws `ForbiddenError`.
- `requireAdmin()` — convenience.
- `recordAuthEvent({...})` — write to `auth_audit_log`.
- TOTP MFA: `startTotpEnrollment`, `confirmTotpEnrollment`, `verifyTotpForUser`, `disableMfa`.

## Routes

- `POST/GET /api/auth/[...all]` — Better-Auth catch-all (signin, signup, callback, etc).
- `POST /api/auth/mfa/confirm` — confirm TOTP enrollment (session required).
- `POST /api/auth/mfa/verify` — verify TOTP code (session required).
- `POST /api/auth/logout` — sign out + audit.

## Pages

- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`,
  `/mfa-setup`, `/mfa-verify`.

## DB-backed Config Keys

- `security.session.duration_seconds`
- `security.password.min_length`
- `app.name`, `runtime.locale_default`, `runtime.timezone`
- Secrets: `oauth.google.client_id`, `oauth.google.client_secret` (optional)

## Bootstrap Admin

User with email matching `ADMIN_BOOTSTRAP_EMAIL` env auto-promoted to `role=admin`
on signup. Sole permitted `process.env.*` read in auth context.

## Notes / Open Items

- `lib/auth/mfa.ts` implements TOTP RFC 6238 standalone — no extra deps required.
- QR rendering deferred (component shows secret + otpauth URL).
- Better-Auth's `additionalFields` map our `users.role`, `locale`, `timezone`, `mfaEnabled`.
- `oauth.google.client_id` / `oauth.google.client_secret` slots are NOT in
  scaffold's `secretSlots`. Admin must add via `/admin/config` UI (Agent 10).
  Scaffold-owner: please add these to `db/seed/config.ts` secretSlots OR
  document the convention.
