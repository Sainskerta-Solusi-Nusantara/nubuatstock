# Agent 6 — Watchlist & Alerts

## Files
- `db/schema/user-data.ts` — tabel `watchlists`, `watchlist_items`, `alerts`, `alert_triggers`.
- `lib/watchlist/**` — service watchlist (CRUD, reorder, quotes join).
- `lib/alerts/**` — service alerts (CRUD, evaluator, trigger).
- `lib/types/{watchlist,alerts}.ts` — Zod schemas + view types.
- `app/api/watchlist/**` — REST endpoints.
- `app/api/alerts/**` — REST endpoints.
- `app/(app)/{watchlist,alerts}/**` — pages.
- `components/{watchlist,alerts}/**` — UI components.
- `worker/jobs/check-alerts.ts` — cron job.

## API Summary
| Method | Path | Desc |
|---|---|---|
| GET | `/api/watchlist` | List user watchlists |
| POST | `/api/watchlist` | Create watchlist |
| GET | `/api/watchlist/[id]` | Detail + items + quotes |
| PATCH | `/api/watchlist/[id]` | Rename / change color |
| DELETE | `/api/watchlist/[id]` | Soft delete (kecuali default) |
| POST | `/api/watchlist/reorder` | Reorder list |
| POST | `/api/watchlist/[id]/items` | Add ticker |
| PATCH | `/api/watchlist/[id]/items/[itemId]` | Update item / move |
| DELETE | `/api/watchlist/[id]/items/[itemId]` | Remove |
| POST | `/api/watchlist/[id]/items/reorder` | Reorder items |
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts` | Create alert |
| PATCH | `/api/alerts/[id]` | Update alert |
| DELETE | `/api/alerts/[id]` | Delete (soft) |
| POST | `/api/alerts/[id]/pause` | Pause |
| POST | `/api/alerts/[id]/resume` | Resume |
| GET | `/api/alerts/[id]/triggers` | Trigger history |

## Dependencies (cross-agent contracts)
- `@/lib/auth.requireSession()` (Agent 3) — return `{ userId, role }`.
- `@/lib/billing.requireEntitlement(userId, key, predicate)` (Agent 4) — throws `QuotaExceededError` / `TierRequiredError`. Quota keys used: `watchlist.max_items`, `alerts.max_active`.
- `@/lib/market-data` (Agent 5):
  - `getQuote(code)` / `getQuotesBatch(codes)` → `WatchlistQuoteSnapshot`.
  - `getEvaluationContext(code)` → `AlertEvaluationContext` (last, prevClose, ma{}, rsi{}, volume avg, dll). Optional — bila tidak tersedia worker akan fallback ke quote-only.
- `@/lib/queue.publishEvent(topic, payload)` (Agent 10) — fire-and-forget event bus.
- `@/db/schema/companies.companies` (Agent 2) — read-only join untuk metadata emiten.

## Worker
Worker entry register `checkAlertsJob` di `worker/index.ts` (Agent 10):
```ts
import { checkAlertsJob } from "./jobs/check-alerts";
queue.add(checkAlertsJob.name, {}, { repeat: { every: 60_000 } });
```
Worker hanya berjalan di jam bursa (Agent 10 mengatur cron-conditional via `runtime.market.session.*` di DB).
