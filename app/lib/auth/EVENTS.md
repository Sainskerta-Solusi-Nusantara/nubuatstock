# Auth Events (Agent 3)

## Emit

- `user.created` — fired after signup (also persisted as audit `signup`). Consumer: Agent 4 (auto-create free tier subscription).

## Audit Log Events (table `auth_audit_log`)

- `signup`
- `login_success`
- `login_failed`
- `logout`
- `password_reset_requested`
- `password_reset_completed`
- `email_verified`
- `mfa_enabled`
- `mfa_disabled`
- `account_locked`
- `account_unlocked`

## Consume

(none currently — auth is source of identity.)

## Notes

- Event bus integration (`lib/queue/`) belum tersedia; emit `user.created`
  sementara hanya via audit log. Saat Agent 10 selesai, wire ke pub/sub di
  `databaseHooks.user.create.after`.
