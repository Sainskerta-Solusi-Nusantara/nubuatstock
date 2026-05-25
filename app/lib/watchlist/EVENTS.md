# Watchlist Events

## Emits
- `watchlist.created` — payload `{ userId, watchlistId }`
- `watchlist.deleted` — payload `{ userId, watchlistId }`
- `watchlist.item_added` — payload `{ userId, watchlistId, companyKode }`
- `watchlist.item_removed` — payload `{ userId, watchlistId, companyKode }`

## Consumes
- `user.created` (Agent 3) → call `ensureDefaultWatchlist(userId)` untuk auto-create watchlist "Utama".
- `subscription.changed` (Agent 4) → invalidate cache entitlement (handled by billing module, no direct action di watchlist).
