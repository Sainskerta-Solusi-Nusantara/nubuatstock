# AI Copilot — EVENTS

## Consume
- `subscription.changed` (dari Agent 4) — invalidate cache entitlement `ai.queries_per_day`
  agar quota berubah segera setelah upgrade tier. (Hook implementasi by-need; saat ini
  tidak ada listener karena consumeQuota selalu read fresh dari billing layer.)

## Emit
Tidak ada event yang di-emit oleh AI Copilot saat ini.

Future:
- `ai.usage.high` — kalau user mendekati batas harian (90%) untuk notifikasi nudge upgrade.
- `ai.error.provider_down` — kalau detect provider 5xx series untuk alerting Agent 10.
