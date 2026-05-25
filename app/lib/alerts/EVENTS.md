# Alert Events

## Emits
- `alert.created` — payload `{ alertId, userId, companyKode }`
- `alert.triggered` — payload `AlertTriggeredEvent` (lihat lib/types/alerts.ts)
- `alert.paused` — payload `{ alertId, userId }`
- `alert.resumed` — payload `{ alertId, userId }`

## Consumes
- `market.eod.ingested` (Agent 5) → tidak langsung; worker `check-alerts` polling tiap 1 menit di jam bursa.
- `subscription.changed` (Agent 4) → kalau downgrade, agen billing perlu pause alert melebihi limit baru. Cara koordinasi: Agent 4 panggil `listAlerts(userId, {status:"active"})` + `pauseAlert` untuk surplus (kontrak service kami menyediakan API ini).
