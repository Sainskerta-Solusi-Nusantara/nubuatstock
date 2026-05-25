# Picks Domain — Events

Agent 8 (Daily Picks Engine).

## Emitted

| Topic | When | Payload |
|---|---|---|
| `picks.generated` | Setiap kali worker `generate-picks.ts` selesai sukses | `{ runId, tradeDate, picksGenerated, universeSize, durationMs }` |
| `picks.outcome_evaluated` | (future) setiap kali pick_outcomes row di-update | `{ pickId, evaluationAt, statusAtEvaluation }` |

## Consumed

| Topic | From | Action |
|---|---|---|
| `market.eod.ingested` | Agent 5 | Trigger pre-market `generate-picks` untuk trade_date berikutnya |
| `subscription.changed` | Agent 4 | Invalidate per-user entitlement cache (`picks.daily_visible`) |

## Cross-agent dependencies (lihat `cross-deps.ts`)

- `@/lib/auth` → `requireSession`
- `@/lib/billing` → `resolveEntitlement(userId, "picks.daily_visible")`
- `@/lib/ai` → `generatePickNarrative(input)` (optional, return null = skip)
- `@/lib/queue` → `publishEvent(topic, payload)`
- `@/lib/market-data` → `getOhlcv(code, opts)` untuk chart overlay (UI only)

Semua dependency optional (graceful degradation kalau modul belum landing).
