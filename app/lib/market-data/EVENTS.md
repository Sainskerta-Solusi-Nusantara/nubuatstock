# Market Data Events

## Emitted

### `market.eod.ingested`

Emitted oleh job `ingest-eod` setelah loop semua emiten selesai (sukses sebagian boleh, total failure throws).

Payload (per `lib/queue/events.ts` schema `marketEodIngestedSchema`):

```ts
{
  tradingDate: string;   // "YYYY-MM-DD"
  ingestedCount: number; // jumlah company berhasil
  vendor: string;        // mis. "yahoo_finance"
  ingestedAt: string;    // ISO timestamp
}
```

**Consumers (expected):**

- Agent 8 (Daily Picks) — subscribe untuk trigger pre-market picks generation.
- Agent 10 — notification fan-out kalau dibutuhkan.

## Consumed

Market Data tidak meng-consume event lain di MVP scope.
