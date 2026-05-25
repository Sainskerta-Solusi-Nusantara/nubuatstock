# Market Data Service (Agent 5)

Adapter-pattern market data layer untuk Nubuat MVP. Default vendor: **Yahoo Finance** (gratis, real data, suffix `.JK` untuk IDX). Swap vendor via `app_config.market_data.default_vendor`.

## Public API

```ts
import {
  getQuote,
  getOhlcv,
  searchTickers,
  getBrokerSummary,
  getForeignFlowDaily,
  getForeignFlowIntraday,
  minTierForForeignFlowGranularity,
} from "@/lib/market-data";
```

| Function | Purpose | Source |
|---|---|---|
| `getQuote(code)` | Latest snapshot | Redis 30s cache → adapter → upsert EoD |
| `getOhlcv(code, { from, to, interval })` | OHLCV bars | DB first, backfill via adapter kalau gap |
| `searchTickers(q, limit)` | Search ticker | DB companies + adapter augment |
| `getBrokerSummary(code, opts)` | Bandarmology broker | DB only |
| `getForeignFlowDaily(code, opts)` | Net foreign harian | DB only |
| `getForeignFlowIntraday(code, opts)` | Net foreign intraday | DB only, tier-gated |

## Adapters

- `adapters/yahoo-finance.ts` — implementasi real terhadap endpoint `query1.finance.yahoo.com`. Tidak butuh API key.
- `adapters/invezgo.ts` — STUB. Aktif kalau secret `vendor.invezgo.api_key` di-set.
- `adapters/ohlc-dev.ts` — STUB. Aktif kalau secret `vendor.ohlc_dev.api_key` di-set.
- `adapters/factory.ts` — `getActiveAdapter()` baca config `market_data.default_vendor`.

Empty state: kalau adapter belum dikonfigurasi → service throw `ConfigurationError` (503), API balas pesan "admin perlu konfigurasi vendor di /admin/config".

## API Endpoints

| Method | Path | Tier |
|---|---|---|
| GET | `/api/market/quote/[code]` | free |
| GET | `/api/market/ohlcv/[code]?interval=&range=&from=&to=` | free |
| GET | `/api/market/search?q=&limit=` | free |
| GET | `/api/market/broker-summary/[code]?from=&to=&side=&limit=` | starter |
| GET | `/api/market/foreign-flow/[code]?granularity=&from=&to=` | granularity-based (`1d` free, `1h` starter, `15m`/`5m` pro) |

## Worker Jobs

- `worker/jobs/ingest-eod.ts` — queue `market.ingest.eod`. Cron dari config `market_data.eod_ingest_cron` (default `0 16 * * 1-5` WIB). Loop active companies, fetch OHLCV 5 hari, upsert.
- `worker/jobs/ingest-intraday.ts` — queue `market.ingest.intraday`. Interval `market_data.intraday_refresh_seconds` (default 60s). Hanya jalan saat jam bursa.

Wire processor di `worker/jobs/index.ts` (Agent 10):

```ts
import { ingestEodProcessor } from "./ingest-eod";
import { ingestIntradayProcessor } from "./ingest-intraday";

export const jobRegistry = {
  "market.ingest.eod": ingestEodProcessor,
  "market.ingest.intraday": ingestIntradayProcessor,
};
```

## Events

- **Emit** `market.eod.ingested` (after EoD ingest job)

Lihat `EVENTS.md` di folder ini.
