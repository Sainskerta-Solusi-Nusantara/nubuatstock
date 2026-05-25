# PLAN BACKEND — Nubuat

> **Companion document:** `ANALISIS_APLIKASI_SAHAM.md` (baseline produk & arsitektur global)
> **Scope:** Backend services, API, real-time, event bus, data pipeline, ML/AI orchestration, observability, deployment, capacity planning
> **Out of scope (lihat dok lain):** Frontend, DB schema fisik, security audit detail, UI/UX, marketing
> **Tanggal:** 11 Mei 2026 — v0.1
> **Owner:** dobeon.com@gmail.com

---

## Daftar Isi

1. [Service Decomposition](#1-service-decomposition)
2. [REST API Surface (per service)](#2-rest-api-surface)
3. [WebSocket Protocol](#3-websocket-protocol)
4. [Event Bus / Message Queue Topology](#4-event-bus--message-queue-topology)
5. [Daily Picks Engine Pipeline](#5-daily-picks-engine-pipeline)
6. [AI Copilot Orchestration](#6-ai-copilot-orchestration)
7. [Research Aggregator Pipeline](#7-research-aggregator-pipeline)
8. [Background Job System](#8-background-job-system)
9. [Caching Strategy](#9-caching-strategy)
10. [Rate Limiting](#10-rate-limiting)
11. [Authentication & Session](#11-authentication--session)
12. [Webhook System](#12-webhook-system)
13. [Observability](#13-observability)
14. [Deployment Topology](#14-deployment-topology)
15. [Error Handling](#15-error-handling)
16. [Versioning & Backward Compatibility](#16-versioning--backward-compatibility)
17. [Performance Targets](#17-performance-targets)
18. [Capacity Planning](#18-capacity-planning)

---

## 1. Service Decomposition

Pendekatan: **modular monolith first** untuk M0–M3 (semua service hidup di K8s namespace yang sama, terpisah biner tapi sharing infra), lalu **gradual extraction** untuk M3+ ketika throughput justify horizontal split. Setiap service punya owner team, repo terpisah, dan SLO independen.

### 1.1 Ringkasan Service

| Service | Bahasa | Framework | Tier kritikalitas | Replica target (M6) |
|---|---|---|---|---|
| `core-api` | Go 1.23 | Fiber v3 + sqlc | P0 | 4–8 |
| `market-data-ingestor` | Rust (Tokio) | axum (admin) + custom feed handler | P0 | 2 (active-passive per feed) |
| `realtime-hub` | Go 1.23 | nhooyr.io/websocket + NATS JS client | P0 | 4–12 (sticky session) |
| `analytics-engine` | Python 3.12 | FastAPI + Polars + DuckDB + Temporal worker | P1 | 4 |
| `ai-copilot` | Python 3.12 | FastAPI + Anthropic SDK + LangGraph | P1 | 4 |
| `research-aggregator` | Python 3.12 | Celery + Playwright + pdfplumber | P2 | 2 + N workers |
| `billing` | Go 1.23 | Fiber v3 | P0 (revenue) | 2 |
| `notification` | Go 1.23 | Fiber + worker | P1 | 2 + N workers |

### 1.2 Detail per Service

#### 1.2.1 `core-api` — System of Record untuk User Domain

- **Tanggung jawab:** auth, user profile, subscription state, watchlist, alerts CRUD, screener saved-query, portfolio metadata, ticker metadata (emiten master), referral, feature flag resolution.
- **Tidak menangani:** quote real-time fanout (delegasi ke `realtime-hub`), heavy aggregate (delegasi ke `analytics-engine`), LLM call (delegasi ke `ai-copilot`).
- **Dependency hulu:** Postgres (OLTP), Redis (cache + session), NATS (publish event), `analytics-engine` (HTTP), `billing` (HTTP), Meilisearch (ticker lookup).
- **Dependency hilir:** API Gateway, mobile/web clients.
- **Komunikasi:** sinkron HTTP/JSON via gateway; asinkron via NATS subject `core.user.*`.
- **SLO:**
  - p50 latency: 50 ms / p95: 200 ms / p99: 500 ms (untuk endpoint read-mostly tanpa external dep).
  - Throughput: 2.000 RPS sustained per replica.
  - Uptime: 99.95% bulanan (jam bursa 09:00–15:30 WIB), 99.9% di luar jam bursa.
  - Error budget: 0.05% 5xx rolling 30 hari.

#### 1.2.2 `market-data-ingestor` — Pipeline Tick → Persist + Fanout

- **Tanggung jawab:** konsumsi feed vendor (Invezgo, OHLC.dev, iTick) atau IDX direct; normalize ke schema kanonik; deduplikasi; persist ke QuestDB (OHLCV + tick); publish ke NATS subject `market.tick.*` dan `market.eod.*`; checksum & gap detection.
- **Tidak menangani:** business logic, user-facing API.
- **Bahasa Rust dipilih karena:** zero-copy parsing FIX/binary, predictable latency (no GC), throughput tinggi (~500k msg/s/core target).
- **Dependency hulu:** vendor WSS/REST, Postgres (emiten master untuk validation), NATS JetStream.
- **Dependency hilir:** QuestDB (write), `realtime-hub` (consume via NATS), `analytics-engine` (consume).
- **SLO:**
  - End-to-end latency (vendor receive → NATS publish): p50 < 20 ms, p95 < 80 ms, p99 < 200 ms.
  - Throughput: 200.000 tick/s sustained per replica (M6 target dengan 945 ticker × ~200 update/min).
  - Uptime: 99.99% selama jam bursa (active-passive failover < 10 detik).
  - Gap rate: < 0.001% (≤ 1 dari 100k pesan hilang sebelum recovery).

#### 1.2.3 `realtime-hub` — WebSocket Fanout Gateway

- **Tanggung jawab:** terminate WSS dari client; authenticate via JWT short-lived; subscribe/unsubscribe per channel; consume NATS subject ke broadcast; backpressure handling; heartbeat; rate limit subscription per tier.
- **Tidak menangani:** persistence, business compute.
- **Dependency hulu:** NATS JetStream (consumer), Redis (rate limit + session-presence).
- **Dependency hilir:** client (WSS).
- **Sticky session:** gunakan consistent hashing per `user_id` (via ALB/Envoy) supaya rebalance tidak bikin ribuan reconnect.
- **SLO:**
  - End-to-end (NATS receive → client send): p50 < 30 ms, p95 < 100 ms, p99 < 300 ms.
  - Throughput per replica: 10.000 concurrent WS connection; 50.000 outbound msg/s.
  - Uptime: 99.99% jam bursa.
  - Reconnect rate: < 0.5% per hari (indikator stabilitas).

#### 1.2.4 `analytics-engine` — Compute Heavy + Daily Picks + Backtest

- **Tanggung jawab:** indikator teknikal batch & on-demand; Bandarmology aggregate (broker net flow, foreign flow); Brokermology (lead-lag, concentration HHI, performance track record); Daily Picks scoring; backtest engine; pattern recognition ML inference; screener execution.
- **Eksekusi job:** Temporal worker (untuk workflow scheduled & retry-aware); FastAPI untuk sync request dari `core-api` (mis. evaluate screener saved-query).
- **Dependency hulu:** QuestDB (read OHLCV + tick), Postgres (emiten + screener meta), Redis (cache hasil indikator), NATS (consume `market.eod.*`).
- **Dependency hilir:** `core-api`, `ai-copilot` (sebagai tool), `notification`.
- **SLO:**
  - Daily Picks pipeline E2E (07:30 WIB): selesai < 5 menit untuk universe 945 ticker.
  - Backtest 5 tahun, 1 strategy, 945 ticker: < 30 detik.
  - Screener query ad-hoc (filter 945 ticker dengan 10 kondisi): p95 < 800 ms.
  - Uptime: 99.9%.

#### 1.2.5 `ai-copilot` — LLM Orchestration

- **Tanggung jawab:** terima query natural language → RAG retrieve → tool-use loop ke `analytics-engine` & `core-api` → LLM call ke Anthropic (Sonnet 4.6 default, Opus 4.7 untuk deep mode) → stream balik ke client (via `realtime-hub` atau SSE direct).
- **Framework:** LangGraph untuk state machine; Anthropic SDK native; Pydantic untuk structured output.
- **Dependency hulu:** Anthropic API, pgvector (RAG), `analytics-engine`, Redis (prompt cache fingerprint), Postgres (rate-limit counter, audit log).
- **Dependency hilir:** `core-api` (proxy ke client) atau langsung ke `realtime-hub`.
- **SLO:**
  - Time-to-first-token (TTFT): p50 < 1.5 s, p95 < 3 s.
  - Full response (typical 300 token, non-thinking): p95 < 8 s.
  - Tool-use round-trip (call internal API): p95 < 400 ms per tool.
  - Cost per active user/hari: target $0.03–0.05 (lihat §6 cost guardrail).
  - Uptime: 99.5% (acceptable degradation ke "AI unavailable, retry").

#### 1.2.6 `research-aggregator` — Scraper + PDF + NER + Embed

- **Tanggung jawab:** scheduled crawl (sekuritas, media, IDX filing); HTML/PDF parse; NER (ticker, rating, TP, period); embed ke pgvector/Qdrant; dedup via SimHash; summarize via Claude Sonnet.
- **Eksekusi:** Celery worker (compatible existing PyData stack) + Beat untuk schedule + Playwright pool untuk dynamic HTML.
- **Dependency hulu:** sumber eksternal (HTTP/Playwright), `ai-copilot` (summarize), Anthropic (embed via Voyage atau OpenAI text-embedding-3-large jika lebih murah).
- **Dependency hilir:** Postgres (relational meta), Vector DB, Meilisearch (full-text), S3/R2 (raw PDF), NATS (`research.published`).
- **SLO:**
  - End-to-end (crawl → searchable) untuk 1 dokumen baru: median < 5 menit.
  - Crawler success rate: > 98% per source per hari.
  - Dedup false-positive rate: < 1%.
  - Uptime: 99.0% (non-critical untuk jam bursa; bisa catch-up).

#### 1.2.7 `billing` — Subscription State Machine

- **Tanggung jawab:** create/upgrade/downgrade/cancel subscription; invoice generation; payment webhook receiver (Midtrans, Xendit, Stripe); retry logic untuk failed payment; proration; refund; tax (PPN 11%).
- **Bahasa:** Go (sama dengan core-api supaya bisa share library auth).
- **State machine:** `pending → active → past_due → grace → suspended → cancelled` (lihat §12 untuk webhook flow).
- **Dependency hulu:** Postgres (subscription, invoice, payment), Redis (idempotency key), NATS (`billing.event.*`).
- **Dependency hilir:** payment gateway, `core-api` (entitlement check), `notification`.
- **SLO:**
  - Webhook ack p95: < 500 ms (gateway requirement).
  - Idempotency: 100% (no double-charge tolerasi).
  - Uptime: 99.95%.

#### 1.2.8 `notification` — Multi-channel Dispatcher

- **Tanggung jawab:** consume event dari NATS, fan-out ke channel: in-app (via `realtime-hub`), push (FCM/APNs), email (SES/Resend), WhatsApp (WA Business API), Telegram bot.
- **Templating:** Liquid template, version-controlled di repo.
- **Rate limit per user:** anti-spam (max 20 push/jam, max 5 email/hari kecuali kritikal).
- **Dependency hulu:** NATS (`alert.triggered`, `picks.generated`, `billing.event.*`, `research.published`), Postgres (user preference, template).
- **Dependency hilir:** FCM/APNs, Resend/SES, WA API, Telegram Bot API.
- **SLO:**
  - In-app delivery: p95 < 500 ms dari event publish.
  - Push delivery (FCM): p95 < 3 s.
  - Email: p95 < 30 s.
  - Uptime: 99.9%.

---

## 2. REST API Surface

Semua endpoint berada di belakang gateway dengan prefix `/v1/`. Schema request/response menggunakan camelCase JSON. Authentication via `Authorization: Bearer <jwt>` kecuali endpoint public (auth, health, billing webhook). Tier ditandai sebagai: `PUB` (public), `AUTH` (semua user login), `STARTER+`, `PRO+`, `ELITE+`, `ADMIN`.

### 2.1 Auth Service Endpoints (`core-api`)

| # | Method | Path | Tier | Request (ringkas) | Response (ringkas) |
|---|---|---|---|---|---|
| 1 | POST | `/v1/auth/register` | PUB | `{email, password, name, refCode?}` | `{userId, jwt, refreshToken}` |
| 2 | POST | `/v1/auth/login` | PUB | `{email, password, deviceFingerprint}` | `{jwt, refreshToken, mfaRequired?}` |
| 3 | POST | `/v1/auth/login/oauth/google` | PUB | `{idToken, deviceFingerprint}` | sama 1.2 |
| 4 | POST | `/v1/auth/login/oauth/apple` | PUB | `{idToken, deviceFingerprint}` | sama 1.2 |
| 5 | POST | `/v1/auth/refresh` | PUB | `{refreshToken}` | `{jwt, refreshToken}` |
| 6 | POST | `/v1/auth/logout` | AUTH | `{refreshToken}` | `204` |
| 7 | POST | `/v1/auth/mfa/setup` | AUTH | `{method: "totp"\|"sms"}` | `{secret, qrUri}` |
| 8 | POST | `/v1/auth/mfa/verify` | AUTH | `{code}` | `{verified: true}` |
| 9 | POST | `/v1/auth/password/forgot` | PUB | `{email}` | `204` |
| 10 | POST | `/v1/auth/password/reset` | PUB | `{token, newPassword}` | `204` |

### 2.2 User & Profile (`core-api`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 11 | GET | `/v1/me` | AUTH | — | `{user, tier, entitlements, prefs}` |
| 12 | PATCH | `/v1/me` | AUTH | `{name?, avatar?, locale?, prefs?}` | `{user}` |
| 13 | GET | `/v1/me/devices` | AUTH | — | `[{id, name, lastSeen, current}]` |
| 14 | DELETE | `/v1/me/devices/{id}` | AUTH | — | `204` |
| 15 | GET | `/v1/me/api-keys` | ELITE+ | — | `[{id, prefix, scopes, createdAt}]` |
| 16 | POST | `/v1/me/api-keys` | ELITE+ | `{name, scopes[]}` | `{key, prefix, secret}` (secret 1x) |

### 2.3 Ticker & Market Metadata (`core-api`, baca dari Postgres + cache)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 17 | GET | `/v1/tickers` | AUTH | `?board=&sector=&q=&limit=&cursor=` | `{items[], nextCursor}` |
| 18 | GET | `/v1/tickers/{code}` | AUTH | — | `{code, name, sector, board, marketCap, freeFloat, indexMembership[]}` |
| 19 | GET | `/v1/tickers/{code}/profile` | AUTH | — | `{description, businessSegments, management, shareholders5pct[]}` |
| 20 | GET | `/v1/tickers/search` | AUTH | `?q=` | `[{code, name, score}]` (Meilisearch) |
| 21 | GET | `/v1/sectors` | AUTH | — | `[{code, name, subsectors[]}]` |
| 22 | GET | `/v1/indices` | AUTH | — | `[{code, name, lastValue, change}]` |
| 23 | GET | `/v1/indices/{code}/members` | AUTH | — | `[{ticker, weight}]` |

### 2.4 Chart Data & Quote (`core-api` → QuestDB via `analytics-engine`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 24 | GET | `/v1/quote/{code}` | AUTH | — | `{last, change, pct, bid, ask, volume, ts}` (Free: delayed 15m) |
| 25 | GET | `/v1/quote/batch` | AUTH | `?codes=BBRI,BBCA,...` (≤50) | `[{code, ...quote}]` |
| 26 | GET | `/v1/chart/{code}/ohlcv` | AUTH | `?tf=1D&from=&to=&limit=` | `[{ts, o, h, l, c, v}]` |
| 27 | GET | `/v1/chart/{code}/indicator` | STARTER+ | `?tf=&name=rsi&params={}` | `[{ts, value}]` |
| 28 | GET | `/v1/chart/{code}/patterns` | PRO+ | `?tf=1D&minConfidence=0.7` | `[{type, from, to, confidence}]` |
| 29 | GET | `/v1/orderbook/{code}` | PRO+ (L1) / ELITE+ (L2) | — | `{bids[10], asks[10], ts}` |

### 2.5 Broker Summary & Bandarmology (`analytics-engine`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 30 | GET | `/v1/broker-summary/{code}` | STARTER+ | `?date=&topN=10` | `{buyers[], sellers[]}` |
| 31 | GET | `/v1/broker-summary/{code}/rolling` | PRO+ | `?window=5\|10\|20` | `{netByBroker[]}` |
| 32 | GET | `/v1/foreign-flow/{code}` | STARTER+ | `?tf=1D&from=&to=` | `[{ts, netForeign, totalValue}]` |
| 33 | GET | `/v1/foreign-flow/{code}/intraday` | PRO+ (15m) / ELITE+ (5m) | `?date=&granularity=5m` | `[{ts, netForeign}]` |
| 34 | GET | `/v1/bandarmology/{code}` | STARTER+ | — | `{phase, accumulationScore, foreignNet, volumeZScore, signals[]}` |
| 35 | GET | `/v1/brokermology/network` | PRO+ | `?date=&minR2=0.5` | `{edges[{broker, ticker, weight, r2}]}` |
| 36 | GET | `/v1/brokermology/broker/{brokerCode}/performance` | PRO+ | `?window=20d` | `{trackRecord[{ticker, action, t5Return}]}` |

### 2.6 Fundamental (`analytics-engine`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 37 | GET | `/v1/fundamental/{code}/financials` | STARTER+ | `?type=income\|balance\|cashflow&period=Q\|Y&from=` | `[{period, items{}}]` |
| 38 | GET | `/v1/fundamental/{code}/ratios` | STARTER+ | `?as_of=` | `{roe, roa, der, per, pbv, ...}` |
| 39 | POST | `/v1/fundamental/{code}/dcf` | PRO+ | `{wacc, growth, terminalGrowth, years}` | `{fairValue, sensitivityMatrix}` |
| 40 | GET | `/v1/fundamental/{code}/peers` | PRO+ | `?metric=PER&limit=10` | `[{code, metric, percentile}]` |
| 41 | GET | `/v1/fundamental/{code}/earnings` | STARTER+ | — | `[{period, eps, consensus, surprise}]` |
| 42 | GET | `/v1/fundamental/{code}/dividends` | STARTER+ | — | `[{cumDate, exDate, amount, yield}]` |

### 2.7 Daily Picks (`analytics-engine` publish, `core-api` serve)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 43 | GET | `/v1/picks/daily` | AUTH (Free: top 1) | `?date=` | `[{code, setup, entry, sl, tp1, tp2, tp3, rr, horizon, score, narrative}]` |
| 44 | GET | `/v1/picks/daily/{pickId}` | AUTH | — | `{... full pick + factor breakdown}` |
| 45 | GET | `/v1/picks/history` | PRO+ | `?from=&to=&ticker=` | `[{... pick + realized outcome}]` |
| 46 | GET | `/v1/picks/track-record` | AUTH | `?setup=&horizon=` | `{hitRate, avgRR, winLoss}` |

### 2.8 Watchlist & Alerts (`core-api`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 47 | GET | `/v1/watchlists` | AUTH | — | `[{id, name, count}]` |
| 48 | POST | `/v1/watchlists` | AUTH | `{name, parentId?}` | `{watchlist}` |
| 49 | PATCH | `/v1/watchlists/{id}` | AUTH | `{name?}` | `{watchlist}` |
| 50 | DELETE | `/v1/watchlists/{id}` | AUTH | — | `204` |
| 51 | GET | `/v1/watchlists/{id}/items` | AUTH | — | `[{code, addedAt, note}]` |
| 52 | POST | `/v1/watchlists/{id}/items` | AUTH | `{code, note?}` | `{item}` |
| 53 | DELETE | `/v1/watchlists/{id}/items/{code}` | AUTH | — | `204` |
| 54 | GET | `/v1/alerts` | AUTH | `?status=` | `[{id, ...}]` |
| 55 | POST | `/v1/alerts` | AUTH | `{code, type, condition{}, channels[]}` | `{alert}` |
| 56 | PATCH | `/v1/alerts/{id}` | AUTH | `{enabled?, condition?}` | `{alert}` |
| 57 | DELETE | `/v1/alerts/{id}` | AUTH | — | `204` |
| 58 | GET | `/v1/alerts/{id}/triggers` | AUTH | — | `[{ts, payload}]` |

### 2.9 Research (`research-aggregator` → `core-api`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 59 | GET | `/v1/research` | PRO+ | `?ticker=&source=&from=&to=&q=&cursor=` | `{items[], nextCursor}` |
| 60 | GET | `/v1/research/{id}` | PRO+ | — | `{title, source, date, rating, tp, summary, originalUrl, body?}` |
| 61 | GET | `/v1/research/consensus/{code}` | PRO+ | — | `{rating, tpMedian, tpMin, tpMax, analystCount, distribution{}}` |
| 62 | GET | `/v1/research/synthesis/{code}` | PRO+ | — | `{aiSummary, citations[]}` |
| 63 | GET | `/v1/news` | STARTER+ | `?ticker=&source=&from=&cursor=` | `{items[], nextCursor}` |
| 64 | GET | `/v1/news/{id}` | STARTER+ | — | `{...}` |

### 2.10 AI Copilot (`ai-copilot`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 65 | POST | `/v1/ai/chat` | AUTH | `{conversationId?, message, mode: "fast"\|"deep", context{}}` | SSE stream of tokens + tool events |
| 66 | GET | `/v1/ai/conversations` | AUTH | `?limit=&cursor=` | `[{id, title, lastMessageAt}]` |
| 67 | GET | `/v1/ai/conversations/{id}` | AUTH | — | `{messages[], usage}` |
| 68 | DELETE | `/v1/ai/conversations/{id}` | AUTH | — | `204` |
| 69 | POST | `/v1/ai/chat/{id}/feedback` | AUTH | `{messageId, rating: -1\|1, reason?}` | `204` |
| 70 | GET | `/v1/ai/usage` | AUTH | — | `{used, quota, resetAt, costEstimateUsd}` |

### 2.11 Screener & Backtest (`analytics-engine`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 71 | POST | `/v1/screener/run` | STARTER+ | `{filters[{field, op, value}], orderBy, limit}` | `{results[], stats}` |
| 72 | GET | `/v1/screener/saved` | AUTH | — | `[{id, name, filters}]` |
| 73 | POST | `/v1/screener/saved` | AUTH | `{name, filters}` | `{savedQuery}` |
| 74 | POST | `/v1/backtest/run` | PRO+ | `{strategy, universe, from, to, capital}` | `{jobId}` (async) |
| 75 | GET | `/v1/backtest/{jobId}` | PRO+ | — | `{status, progress, result?{equity, trades, metrics}}` |
| 76 | GET | `/v1/backtest/history` | PRO+ | — | `[{jobId, name, summary}]` |

### 2.12 Portfolio & Paper Trading (`core-api`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 77 | GET | `/v1/portfolios` | AUTH | — | `[{id, name, type: "live"\|"paper"}]` |
| 78 | POST | `/v1/portfolios` | AUTH | `{name, type}` | `{portfolio}` |
| 79 | GET | `/v1/portfolios/{id}/positions` | AUTH | — | `[{code, qty, avgPrice, marketValue, pnl}]` |
| 80 | POST | `/v1/portfolios/{id}/transactions` | AUTH | `{code, side, qty, price, ts, fee?}` | `{txn}` |
| 81 | POST | `/v1/paper/order` | ELITE+ | `{code, side, qty, type, price?, tif}` | `{orderId}` |
| 82 | GET | `/v1/paper/orders` | ELITE+ | `?status=` | `[{order}]` |

### 2.13 Billing (`billing`)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 83 | GET | `/v1/billing/plans` | PUB | — | `[{id, name, price, features}]` |
| 84 | GET | `/v1/billing/subscription` | AUTH | — | `{plan, status, currentPeriodEnd, paymentMethod}` |
| 85 | POST | `/v1/billing/checkout` | AUTH | `{planId, period, couponCode?}` | `{checkoutUrl, sessionId}` |
| 86 | POST | `/v1/billing/portal` | AUTH | — | `{portalUrl}` |
| 87 | POST | `/v1/billing/cancel` | AUTH | `{reason?}` | `{status, effectiveAt}` |
| 88 | POST | `/v1/billing/resume` | AUTH | — | `{subscription}` |
| 89 | GET | `/v1/billing/invoices` | AUTH | `?limit=&cursor=` | `[{id, amount, status, pdfUrl}]` |
| 90 | POST | `/v1/billing/webhook/midtrans` | PUB (HMAC) | Midtrans payload | `{ok: true}` |
| 91 | POST | `/v1/billing/webhook/xendit` | PUB (HMAC) | Xendit payload | `{ok: true}` |
| 92 | POST | `/v1/billing/webhook/stripe` | PUB (HMAC) | Stripe payload | `{ok: true}` |

### 2.14 Admin / Internal (`core-api` admin namespace)

| # | Method | Path | Tier | Request | Response |
|---|---|---|---|---|---|
| 93 | POST | `/v1/admin/picks/republish` | ADMIN | `{date}` | `{count}` |
| 94 | POST | `/v1/admin/research/reingest` | ADMIN | `{sourceId, from}` | `{jobId}` |
| 95 | GET | `/v1/admin/users/{id}/audit` | ADMIN | — | `[{action, ts, ip}]` |
| 96 | POST | `/v1/admin/feature-flags` | ADMIN | `{key, rules[]}` | `{flag}` |

> **Catatan:** total > 96 endpoint terdaftar. Detail schema lengkap (OpenAPI 3.1) di-generate dari kode dan dipublish ke `/v1/openapi.json` (PUB).

---

## 3. WebSocket Protocol

### 3.1 Endpoint & Handshake

- **URL:** `wss://stream.nubuat.id/v1/ws`
- **Subprotocol:** `nubuat.v1` (di-negotiate via `Sec-WebSocket-Protocol`).
- **Auth:** query param `?token=<short-lived-ws-jwt>` (TTL 5 menit, di-issue via endpoint `POST /v1/auth/ws-token` setelah login). Token JWT memuat `userId`, `tier`, `entitlements[]`.
- **Compression:** `permessage-deflate` aktif.

### 3.2 Channel Naming Convention

Format: `<domain>:<resource>[:scope]`

| Channel | Tier minimum | Sumber | Frekuensi |
|---|---|---|---|
| `quote:<TICKER>` | Free (delayed 15m) / Starter+ (RT) | NATS `market.tick.<TICKER>` | per tick (~100–1000 ms) |
| `quote:bulk:<WATCHLIST_ID>` | AUTH | aggregator | digabung 250 ms window |
| `orderbook:<TICKER>` | Pro+ (L1) / Elite+ (L2) | NATS `market.book.<TICKER>` | per update |
| `flow:<TICKER>` | Starter+ | NATS `market.flow.<TICKER>` | 5 s window |
| `bandarmology:<TICKER>` | Starter+ | analytics-engine push | 1 menit |
| `news:user:<USER_ID>` | AUTH | notification fanout | event-driven |
| `picks:daily` | AUTH | analytics-engine | 1x pre-market + 4x intraday |
| `alert:user:<USER_ID>` | AUTH | notification | event-driven |
| `ai:stream:<CONVERSATION_ID>` | AUTH | ai-copilot | token stream |
| `index:<INDEX_CODE>` | AUTH | market-data-ingestor | 1 s |

### 3.3 Message Format (JSON, all messages)

**Client → Server**

```json
{
  "id": "c-uuid-v7",
  "op": "subscribe" | "unsubscribe" | "ping" | "auth_refresh",
  "channels": ["quote:BBRI", "orderbook:BBRI"],
  "params": { "depth": 10 }
}
```

**Server → Client**

```json
{
  "id": "s-uuid-v7",
  "type": "ack" | "event" | "error" | "pong" | "rekey",
  "channel": "quote:BBRI",
  "ts": 1715404800123,
  "seq": 8423901,
  "data": { "last": 5475, "bid": 5470, "ask": 5475, "vol": 12500 }
}
```

### 3.4 Subscribe / Unsubscribe Semantics

- `op: "subscribe"` mengembalikan satu `type: "ack"` per channel; jika tier tidak cukup → `type: "error"` dengan code `E_TIER_INSUFFICIENT`.
- Limit subscribe per koneksi: Free 20, Starter 100, Pro 500, Elite 2000. Diukur per koneksi, dicatat di Redis `ws:subs:<userId>` (TTL = umur koneksi).
- **Snapshot semantics:** untuk `quote:*` dan `orderbook:*`, server kirim 1 snapshot event saat subscribe, lalu delta. Snapshot punya `seq=0`; delta selanjutnya `seq` increment.
- **Resume:** client bisa kirim `op: "subscribe"` dengan `params.lastSeq` untuk replay (best-effort, max 60 s buffer di JetStream).

### 3.5 Heartbeat

- Server kirim `type: "pong"` tiap 25 s jika tidak ada traffic.
- Client wajib kirim `op: "ping"` tiap 30 s. Jika server tidak terima ping > 60 s → close dengan code 4001.
- Application-level ping ini di atas WebSocket ping/pong frame standard (yang juga aktif).

### 3.6 Backpressure Handling

- **Per-connection send buffer:** 256 KB. Jika penuh > 2 s → drop koneksi dengan close code 4008 (`backpressure`).
- **Per-channel coalescing:** untuk channel high-rate (mis. `quote:*` saat market hectic), `realtime-hub` melakukan **last-write-wins coalescing** dalam window 100 ms jika client lag terdeteksi (`bufferedAmount > 64 KB`).
- **Server-side fairness:** token bucket per koneksi (lihat §10) — kalau client lambat consume, channel low-priority (mis. `bandarmology:*`) di-drop duluan, channel kritikal (`alert:user:*`) tidak.
- **Close codes custom:**
  - `4000` rate limit subscribe exceeded
  - `4001` heartbeat timeout
  - `4002` auth expired (client harus refresh token + reconnect)
  - `4003` tier downgrade — channel premium di-revoke
  - `4008` backpressure drop
  - `4010` server-initiated rebalance (client retry dengan exponential backoff jittered 1–10 s)

### 3.7 Reconnect Strategy (Client-side, codified in SDK)

- Exponential backoff: base 500 ms, factor 2, max 30 s, jitter ±20%.
- Setelah reconnect, client kirim subscribe ulang dengan `lastSeq` per channel.
- Maks 10 reconnect berturut-turut → tampilkan UI "connection lost, refresh page".

---

## 4. Event Bus / Message Queue Topology

### 4.1 Pilihan Teknologi

- **Primary:** **NATS JetStream** — ringan, latency rendah, built-in replay, fan-out via subject wildcards, ack semantics, KV + Object Store extension. Cocok untuk M0–M12.
- **Pertimbangan upgrade Kafka:** kalau lalu lintas tick > 1M msg/s sustained atau perlu integrasi data warehouse (Debezium CDC) — direncanakan paling cepat M18.

### 4.2 Subject Hierarchy

| Subject | Producer | Consumer(s) | Retention | Replay |
|---|---|---|---|---|
| `market.tick.<TICKER>` | market-data-ingestor | realtime-hub, analytics-engine | 60 s (memory) | last 60 s |
| `market.book.<TICKER>` | market-data-ingestor | realtime-hub | 30 s (memory) | last 30 s |
| `market.flow.<TICKER>` | analytics-engine | realtime-hub, notification | 24 h (file) | last 24 h |
| `market.eod.<TICKER>` | market-data-ingestor | analytics-engine, research-aggregator | 7 hari (file) | full |
| `market.index.<INDEX>` | market-data-ingestor | realtime-hub | 60 s | last 60 s |
| `research.published` | research-aggregator | core-api, notification, ai-copilot (embed) | 30 hari (file) | full |
| `research.embedded` | ai-copilot | core-api | 7 hari | full |
| `picks.generated` | analytics-engine | notification, core-api | 7 hari | full |
| `picks.intraday.update` | analytics-engine | realtime-hub, notification | 24 h | last 24h |
| `alert.triggered` | analytics-engine, core-api | notification | 7 hari | full |
| `billing.event.<TYPE>` | billing | core-api, notification | 90 hari (file) | full |
| `core.user.<TYPE>` | core-api | notification, ai-copilot | 30 hari | full |
| `audit.log` | semua | log shipper | 30 hari | hot+cold |

**Naming rules:**
- Lowercase, dot-separated.
- `<TICKER>` uppercase 4-letter IDX code, `<INDEX>` uppercase index code, `<TYPE>` snake_case event type.
- Wildcard subscribe diizinkan: `market.tick.*` dipakai analytics-engine untuk semua ticker.

### 4.3 Stream & Consumer Mapping

```text
STREAM "MARKET_TICKS"
  subjects: market.tick.*, market.book.*, market.index.*
  storage: memory, replicas: 3, max_age: 60s, max_bytes: 4GB
  consumers:
    - realtime-hub-tick-fanout  (push, queue, delivery: instant, ack_wait: 5s)
    - analytics-engine-tick-agg (push, queue, ack_wait: 30s, max_deliver: 3)

STREAM "MARKET_EOD"
  subjects: market.eod.*, market.flow.*
  storage: file, replicas: 3, max_age: 7d
  consumers:
    - analytics-engine-eod (pull, max_deliver: 5)
    - research-aggregator-eod (pull)

STREAM "BUSINESS_EVENTS"
  subjects: research.*, picks.*, alert.*, core.user.*, billing.event.*
  storage: file, replicas: 3, max_age: 30d, max_bytes: 100GB
  consumers:
    - notification-fanout (push, queue, max_deliver: 10, backoff: exp 1s..1h)
    - core-api-projector (push, queue, ack_wait: 10s)
    - ai-copilot-embedder (pull, batch: 50)

STREAM "AUDIT"
  subjects: audit.log
  storage: file, replicas: 3, max_age: 30d
  consumers:
    - log-shipper-loki (push)
    - log-shipper-s3-archive (pull, batch: 1000)
```

### 4.4 Replay Strategy

- **Live consumers:** subscribe `deliver_policy: new`.
- **Replay (on incident):** create ephemeral consumer dengan `deliver_policy: by_start_time` atau `by_start_sequence`. Dipanggil via admin endpoint `/v1/admin/replay`.
- **Idempotency:** producer wajib set `Nats-Msg-Id` (UUIDv7 dari deterministic source mis. `tick:<ticker>:<exchange_seq>`). Consumer wajib dedup via Redis SET `dedup:<stream>:<msgId>` TTL 24 jam.

### 4.5 DLQ

- Setiap consumer punya `max_deliver` finite. Setelah exceeded, message diteruskan ke stream `DLQ.<consumer_name>` dengan original headers + `x-failure-reason`.
- DLQ di-monitor; alert ke ops jika ingest > 0.1% selama 5 menit rolling.

---

## 5. Daily Picks Engine Pipeline

### 5.1 Eksekutor: Temporal

Dipilih dibanding Airflow karena (a) durable execution dengan retry built-in, (b) kode workflow sebagai Python class (tipe-checked), (c) visibilitas baik, (d) cocok untuk pipeline yang punya step ML + LLM yang bisa gagal partial.

Cron-style scheduling tetap pakai Temporal Schedule, bukan crontab eksternal.

### 5.2 Workflow `DailyPicksWorkflow`

**Trigger:** Temporal Schedule, cron `30 7 * * 1-5 Asia/Jakarta` (07:30 WIB hari kerja, libur BEI ditangani via calendar check).

**Step (semua adalah Temporal Activity, idempotent):**

```text
[01] PreflightCheck
     - cek libur bursa (BEI calendar di Postgres)
     - cek data freshness (EOD D-1 sudah landing di QuestDB)
     - jika gagal: abort + alert (no pick hari ini)

[02] LoadUniverse
     - query Postgres + QuestDB: 945 ticker
     - filter likuiditas avg value 20D > Rp 1 Mrd
     - exclude suspended, UMA, Papan Pemantauan Khusus high-risk
     - output: universe list (cached 24h di Redis "picks:universe:<date>")

[03] ComputeFactorsParallel  (fanout activity: 1 per ticker, parallelism 32)
     - per ticker fetch 60D OHLCV + 20D broker summary + foreign flow
     - kompute factor:
        technical_score (0-100), bandar_score, broker_score, fundamental_score,
        sentiment_score, macro_score, risk_score
     - persist intermediate ke Postgres table `factor_snapshot`

[04] RegimeDetect
     - panggil model HMM untuk IHSG dan 12 sector
     - hasil: {bull, bear, range} → menentukan bobot factor

[05] AggregateScore
     - weighted sum dengan bobot regime-adaptive
     - rank desc

[06] SetupClassify
     - rule-based: breakout / pullback / reversal / continuation / range
     - hanya pick dengan classification valid

[07] DefineZones
     - entry: supply/demand zone via volume profile + fib confluence
     - SL: min(swing_low_20D, entry - 1.5 * ATR14) clipped ke nearest support
     - TP1 = entry + 1R, TP2 = entry + 2R, TP3 = next resistance via pivot
     - reward/risk filter ≥ 1.5; reject < 1.5

[08] HorizonTag
     - intraday / swing 3-5d / swing 1-3w / position 1-3m
     - dari ADX + ATR + volume profile

[09] TopNSelect (N = 10 default)

[10] NarrativeGeneration  (per pick, parallel 5)
     - panggil ai-copilot tool /v1/internal/picks-narrative
     - Claude Sonnet 4.6, prompt-cached system prompt (universe meta)
     - output: ringkasan 80-120 kata bahasa Indonesia + citation

[11] Persist
     - tulis ke Postgres tabel `daily_picks` dengan kolom JSONB factor_breakdown
     - tulis ke QuestDB `picks_history` untuk track record

[12] Publish
     - NATS publish `picks.generated`
     - WS channel `picks:daily` di-broadcast
     - notification fanout untuk user yang opt-in

[13] PostPublishVerify
     - QA check: tidak ada duplicate ticker, tidak ada price stale > 1h
     - emit metric `picks.published.count`
```

**Total budget:** 5 menit. Jika exceed → alert; pipeline tetap publish hasil partial (≥3 pick) dengan flag `partial=true`.

### 5.3 Intraday Refresh Workflow

**Trigger:** Temporal Schedule, cron `*/15 9-15 * * 1-5 Asia/Jakarta` (tiap 15 menit, 09:00–15:30 WIB).

**Step:**

1. `LoadActivePicks` — pick dengan `status = active` hari ini.
2. `RefreshPrice` — fetch quote terbaru per ticker.
3. `EvaluateExits` — cek apakah SL hit, TP1 hit, TP2 hit, atau time-stop hit.
4. `UpdateScore` — re-score (intraday flow + price change); tag `weakening` jika score turun > 15.
5. `PersistUpdate` — Postgres + QuestDB.
6. `PublishUpdate` — NATS `picks.intraday.update` → WS channel `picks:daily` → notification trigger untuk SL hit & TP hit.

**Budget:** 90 detik. Idempotency key: `intraday:<date>:<HHMM>`.

### 5.4 Failure Recovery

- **Activity level:** Temporal retry default exponential 1s → 60s, max 5 attempts. Custom per activity berdasarkan idempotensi.
- **Workflow level:** kalau gagal complete dalam 30 menit → trigger `FallbackPicksWorkflow` (publish rule-only picks tanpa LLM narrative).
- **Data freshness fail:** kalau EOD belum landing → schedule retry tiap 5 menit hingga 09:00; jika tetap kosong → skip hari + ops alert.

### 5.5 Output Schema (canonical)

```json
{
  "pickId": "pk_01HXY...",
  "date": "2026-05-12",
  "ticker": "BBRI",
  "setup": "pullback_to_ma20",
  "horizon": "swing_3_5d",
  "entry": { "low": 5400, "high": 5450 },
  "stopLoss": 5280,
  "takeProfit": [5570, 5680, 5800],
  "rewardRisk": 2.15,
  "score": 78.4,
  "factorBreakdown": {
    "technical": 82, "bandar": 75, "broker": 70,
    "fundamental": 80, "sentiment": 65, "macro": 70, "riskPenalty": 5
  },
  "regime": "bull",
  "narrative": "BBRI menunjukkan ...",
  "citations": [{ "source": "research:R_01HX...", "snippet": "..." }],
  "publishedAt": "2026-05-12T00:35:00Z",
  "status": "active",
  "model": { "version": "picks-v1.4.2" }
}
```

---

## 6. AI Copilot Orchestration

### 6.1 Architecture (LangGraph state machine)

```text
[Input] → ClassifyIntent → RetrieveContext (RAG) → Plan
       → ToolLoop (≤ 8 iter) → Synthesize → ValidateGuardrail → Stream
```

Setiap node adalah node LangGraph, state shared: `{messages, retrievedDocs, toolCalls, usage, mode}`.

### 6.2 RAG Pipeline

- **Index:** pgvector di Postgres (kolom `embedding vector(1536)`) untuk skala M0–M12; migrasi ke Qdrant kalau corpus > 10M chunk.
- **Embedding model:** OpenAI `text-embedding-3-small` (atau Voyage `voyage-2`) — chunk 512 token, overlap 64.
- **Sumber index:** research reports, news, IDX filing, ticker description, macroeconomic snapshot mingguan.
- **Retrieval:** hybrid (BM25 via Meilisearch + cosine vector top-20) → rerank dengan cross-encoder lokal (bge-reranker-base) → ambil top-5.

### 6.3 Tool Definitions

Setiap tool punya JSON Schema, dipanggil LLM via Anthropic native tool use. Internal endpoint ada di `analytics-engine` dan `core-api` (prefix `/v1/internal/...`, hanya callable dari `ai-copilot` via service mesh mTLS).

| Tool | Signature ringkas | Tier minimum efek |
|---|---|---|
| `get_quote` | `(ticker: string) → {last, change, vol, ts}` | Free |
| `get_ohlcv` | `(ticker, tf, from, to) → bars[]` | Free |
| `get_indicator` | `(ticker, tf, name, params) → series[]` | Free |
| `get_broker_summary` | `(ticker, date, topN=10) → buyers, sellers` | Starter |
| `get_foreign_flow` | `(ticker, tf, from, to) → series[]` | Starter |
| `get_bandarmology` | `(ticker) → phase, score, signals[]` | Starter |
| `get_brokermology_network` | `(date, minR2=0.5) → graph` | Pro |
| `get_fundamentals` | `(ticker, type, period) → items[]` | Starter |
| `compute_dcf` | `(ticker, wacc, growth, terminal, years) → fairValue` | Pro |
| `run_screener` | `(filters[], orderBy, limit≤50) → results[]` | Starter |
| `get_news` | `(ticker?, from, to, limit) → items[]` | Free |
| `get_research_consensus` | `(ticker) → rating, tp, distribution` | Pro |
| `get_macro_snapshot` | `(date) → {biRate, cpi, usd_idr, ...}` | Free |
| `get_index_member` | `(indexCode) → tickers[]` | Free |
| `get_user_watchlist` | `(userId, listId?) → tickers[]` | AUTH |
| `get_daily_picks` | `(date) → picks[]` | AUTH |
| `submit_alert` | `(userId, code, type, condition) → alertId` | AUTH (write) |
| `compute_relative_valuation` | `(ticker, peers[], metric) → table` | Pro |
| `lookup_ticker` | `(query) → top5 matches` | Free |

**Catatan keamanan tool:** semua tool yang side-effect (`submit_alert`) memerlukan konfirmasi eksplisit user di UI sebelum LLM diizinkan invoke (UI menampilkan dialog confirm; LLM hanya bisa "propose").

### 6.4 Prompt Caching Strategy

- **Cached blocks (TTL 1 jam, Anthropic ephemeral cache):**
  1. System prompt master (8–12k token): persona, guardrail, format rules, IDX taxonomy reference.
  2. Universe metadata snapshot (4–8k token): list 945 ticker + sektor + index membership.
  3. Tool schema definitions (2–4k token).
- **Non-cached:** user message + retrieved RAG context + tool result.
- **Target cache hit rate:** > 85% di queri kedua dan seterusnya. Cost saving ekspektasi 80–90% pada read cache.

### 6.5 Model & Mode Routing

| Mode | Model | Use case | Max output | Thinking |
|---|---|---|---|---|
| `fast` (default) | Claude Sonnet 4.6 | Q&A umum, ringkas, single-step | 1024 token | off |
| `deep` | Claude Opus 4.7 | Multi-step research, valuation deep dive | 4096 token | extended 8k |
| `narrative` (internal) | Claude Sonnet 4.6 | Daily Picks narrative (system batch) | 512 token | off |

**Fallback chain:** Sonnet 4.6 → (timeout/5xx) → Sonnet 4.5 → (rate limit) → cached canned response "AI sedang sibuk, coba lagi 30 detik."

### 6.6 Rate Limit per Tier

| Tier | Query/hari | Token/hari (input+output) | Deep mode |
|---|---|---|---|
| Free | 5 | 20.000 | tidak |
| Starter | 50 | 200.000 | tidak |
| Pro | 500 | 2.000.000 | 10/hari |
| Elite | unlimited (soft cap 5000) | 20.000.000 | 100/hari |

Diukur via Redis counter, reset 00:00 WIB. Endpoint kembalikan header `X-AI-Quota-Remaining`.

### 6.7 Cost Guardrail

- **Hard cap global** $X per hari (configurable). Jika exceed → degrade ke cached-only response untuk Free tier, lalu Starter, kemudian alert ops.
- **Per-user cap:** stop processing kalau monthly cost user > `tier_max_cost_usd` (Free $0.30, Starter $3, Pro $30, Elite $300).
- **Cost log:** setiap LLM call dicatat di Postgres `ai_usage_log` (userId, model, inputTokens, outputTokens, cacheRead, cacheWrite, costUsd, durationMs) untuk billing & analisis.

### 6.8 Structured Output Schema

Untuk task UI card (mis. ticker analysis), gunakan response prefill + JSON mode:

```json
{
  "summary": "string (≤ 200 kata)",
  "signals": [
    { "category": "technical|fundamental|bandar|broker|sentiment|macro",
      "label": "string", "polarity": "bullish|bearish|neutral", "strength": 0..1,
      "evidence": "string (≤ 100 kata)", "citations": ["res_id_or_url"] }
  ],
  "recommendation": {
    "action": "watch|consider_buy|consider_sell|avoid",
    "confidence": 0..1,
    "disclaimer": "Bukan ajakan jual/beli."
  }
}
```

---

## 7. Research Aggregator Pipeline

### 7.1 Komponen

```text
SourceRegistry (Postgres) → Scheduler (Celery Beat)
   ↓
CrawlerPool (Celery worker + Playwright pool)
   ↓
PreflightFilter (robots.txt cache, rate-limit per host)
   ↓
DocumentStore (S3/R2 raw + checksum)
   ↓
ParserDispatcher
    ├─ HTMLParser (readability + trafilatura)
    └─ PDFParser (pdfplumber + Tesseract fallback + Camelot tables)
   ↓
EnrichmentPipeline
    ├─ NER (custom IndoBERT fine-tuned model)
    ├─ ClassifierRating (rule + LLM cross-check)
    ├─ TPExtractor (regex + LLM validation)
   ↓
Dedup (SimHash 64-bit, hamming ≤ 3 = dup)
   ↓
Embed (batched, 50 chunk/batch)
   ↓
Persist (Postgres meta + pgvector + Meilisearch + R2 PDF)
   ↓
Summarize (Claude Sonnet) → store ai_summary
   ↓
NATS publish research.published
```

### 7.2 SourceRegistry Schema (logical)

```text
source_id, name, type (html|pdf|api), base_url, robots_check_at, schedule_cron,
ua_string, headers_json, throttle_rps, parser_profile, status (active|paused|legal_review)
```

### 7.3 Crawler Architecture

- **Playwright pool:** 8 browser context per worker, recycled tiap 100 request.
- **Stealth:** rotate UA dari pool curated, residential proxy (Bright Data atau Smartproxy) hanya untuk source publik yang block datacenter IP, **tidak digunakan untuk bypass paywall**.
- **Politeness:** respect robots.txt (cache 24h), per-host rate limit di-enforce via Redis `crawler:rate:<host>` token bucket.
- **Schedule:** Celery Beat trigger per source; high-frequency (news) 5 menit, low-frequency (sekuritas weekly report) 1 jam.

### 7.4 PDF Parsing Flow

1. Pdfplumber extract teks per halaman.
2. Tabel via Camelot lattice + stream mode; fallback ke LLM table extraction (Claude vision via Anthropic) jika confidence low.
3. OCR (Tesseract `ind+eng`) untuk image-only PDF.
4. Validasi: cek apakah ticker valid IDX (cross-ref Postgres emiten master).

### 7.5 NER Extraction

- **Fine-tuned model:** IndoBERT-base + CRF head, label: `TICKER`, `RATING`, `TARGET_PRICE`, `PERIOD`, `ANALYST_NAME`, `SECURITIES`.
- **Cross-validation:** LLM call ke Sonnet 4.6 untuk dokumen low-confidence (< 0.85) — sample 5% untuk QA.
- **Training data:** start dengan 500 dokumen yang di-label manual (M0–M3), incremental fine-tune setiap kuartal.

### 7.6 Embedding Strategy

- Chunking: header-aware (split per section di laporan sekuritas; per paragraf di artikel news).
- Chunk size: 512 token, overlap 64.
- Metadata stored bareng vector: `{sourceId, docId, ticker[], publishedAt, type, rating, tp}` untuk filter di RAG.
- Embedding batch 50 dokumen, async via Celery.

### 7.7 Dedup

- **L1:** URL hash + first-1KB SHA256 (instant block dup).
- **L2:** SimHash 64-bit text content, hamming ≤ 3 marks as duplicate; keep earlier `publishedAt`.
- **L3:** semantic dup (cosine > 0.97 di chunk pertama) — flag untuk human review, tidak auto-drop.

### 7.8 Legal-Safe Ingestion Policy

Codified policy di `policy.yaml` per-source:

```yaml
- source: brights.id
  policy: public_domain
  attribution: required
  store_full_text: true
  redistribute: link_back_with_summary
- source: most.co.id_riset
  policy: public_with_login
  store_full_text: false
  redistribute: snippet_only
  fields_extracted: [ticker, rating, target_price, date]
- source: client_only_pdf_leak
  policy: forbidden
  status: paused
```

Compliance enforcement:
- Crawler refuse jalan kalau `policy: forbidden` atau `legal_review`.
- Endpoint `/v1/research/{id}` cek `policy.redistribute` sebelum kembali `body`.
- Quarterly legal audit dokumen sample.

---

## 8. Background Job System

### 8.1 Pilihan Orkestrator

| Job Class | Tool | Alasan |
|---|---|---|
| Long-running ML / picks pipeline | **Temporal** | durable, retry-aware, multi-step |
| Scheduled scraping / parsing | **Celery Beat + worker** | Python native ke research-aggregator |
| Lightweight cron (cache warmer, cleanup) | **River** (Go) di core-api / billing | local di service |

### 8.2 Job Catalog

| Job | Schedule (WIB) | Runner | Retry Policy | DLQ |
|---|---|---|---|---|
| `daily_picks_generate` | 07:30 Mon-Fri | Temporal | activity retry exp 1s-60s × 5 | yes |
| `daily_picks_intraday` | */15min 09:00-15:30 Mon-Fri | Temporal | exp 1s-30s × 3 | yes |
| `eod_data_ingest` | 17:30 Mon-Fri | Temporal | exp 5s-300s × 10 | yes |
| `eod_data_qa` | 18:00 Mon-Fri | Temporal | × 3 | yes |
| `factor_snapshot_compute` | 18:30 Mon-Fri | Temporal | × 3 | yes |
| `research_crawl_news` | */5min 24/7 | Celery Beat | × 5 exp 30s-30min | yes |
| `research_crawl_sekuritas` | 0 7,12,17 Mon-Fri | Celery Beat | × 3 exp 5min-1h | yes |
| `research_pdf_parse` | event-driven | Celery worker | × 3 exp 1min-30min | yes |
| `research_embed_batch` | */10min | Celery | × 5 | yes |
| `research_summarize` | event-driven (after parse) | Celery | × 3 | yes |
| `news_sentiment_score` | event-driven | Celery | × 3 | yes |
| `cache_warmer_quotes` | */1min 09:00-15:30 | River | × 2 | no |
| `cache_warmer_picks` | 07:35, 07:45 | River | × 3 | yes |
| `session_cleanup` | 0 3 * * * | River | × 3 | no |
| `subscription_dunning` | 0 9 * * * | River (billing) | × 5 | yes |
| `subscription_renewal_charge` | per-subscription, cron-style | River (billing) | × 10 (backoff hours-days) | yes |
| `audit_log_archive` | 0 4 * * * | River | × 3 | no |
| `vector_index_optimize` | 0 2 * * 0 | River | × 1 | no |
| `model_retrain_regime` | 0 1 1 * * (monthly) | Temporal | manual approval | yes |
| `model_retrain_picks` | 0 1 1 */3 * (quarterly) | Temporal | manual approval | yes |
| `track_record_compute` | 0 22 * * 1-5 | Temporal | × 5 | yes |
| `notification_digest_morning` | 0 6 * * * | Celery | × 3 | yes |
| `corporate_action_sync` | 0 18 * * * | Celery | × 5 | yes |
| `index_membership_sync` | 0 18 1 * * (monthly) | Celery | × 3 | yes |
| `ksei_5pct_holder_sync` | 0 18 1 1,4,7,10 * (quarterly) | Celery | × 3 | yes |

### 8.3 Retry Policy Defaults

```text
exponential: base = 1s, factor = 2, max = 3600s, jitter = 20%
max_attempts: classified per job class
on_final_failure: push ke DLQ NATS subject "dlq.<job_name>"
DLQ retention: 30 hari, manual replay via admin UI
```

### 8.4 Monitoring

- Setiap job emit metric: `job.duration_seconds`, `job.success_total`, `job.failure_total`, `job.dlq_total`.
- Alert kalau `job.failure_rate > 5%` 15-min window, atau job critical (picks_generate) tidak complete 30 menit setelah expected.

---

## 9. Caching Strategy

### 9.1 Redis Cluster Layout

- **Cluster:** Redis 7, 3 master + 3 replica, deployed di K8s via Bitnami chart.
- **Eviction:** `allkeys-lru` di node yang mostly cache; `noeviction` di node yang juga jadi session store.
- **Namespacing convention:** `<service>:<domain>:<id>[:variant]`. Tiap key punya prefix service supaya cleanup mudah.

### 9.2 Key Catalog & TTL

| Pattern | Value | TTL | Invalidasi |
|---|---|---|---|
| `core:user:<id>` | user profile JSON | 5 menit | on PATCH /me |
| `core:entitlement:<userId>` | tier + features | 1 menit | on billing webhook |
| `core:ticker:<code>` | metadata | 24 jam | on emiten sync |
| `core:index:<code>:members` | array | 24 jam | manual + monthly job |
| `mkt:quote:<ticker>` | last quote JSON | 2 detik | event-driven (push) |
| `mkt:quote:delayed:<ticker>` | delayed 15m snapshot | 60 detik | scheduled |
| `mkt:ohlcv:<ticker>:<tf>:<range>` | candle array | 30 detik (intraday tf) / 6 jam (1D+) | event on new bar |
| `mkt:indicator:<ticker>:<tf>:<name>:<paramsHash>` | series | 60 detik | event on new bar |
| `mkt:broker-summary:<ticker>:<date>` | top buyers/sellers | 12 jam (D-1), 60 s (D) | event on new tick |
| `mkt:foreign-flow:<ticker>:<tf>:<date>` | flow array | 60 detik | event |
| `analytics:bandarmology:<ticker>` | computed metrics | 5 menit | event |
| `analytics:screener:<queryHash>` | result array | 30 detik | by version bump |
| `picks:daily:<date>` | array of picks | 24 jam | event on republish |
| `picks:track-record:<setup>:<horizon>` | aggregate | 1 jam | manual |
| `fund:financials:<ticker>:<type>:<period>` | statement | 24 jam | manual on filing |
| `fund:ratios:<ticker>` | ratio bundle | 6 jam | event on filing |
| `research:item:<id>` | full item | 1 jam | event on update |
| `research:consensus:<ticker>` | consensus | 1 jam | event on new research |
| `news:list:<ticker>:<cursor>` | page | 60 detik | event |
| `ai:ratelimit:<userId>:<window>` | counter | window TTL | natural |
| `ai:promptcache:fp:<hash>` | fingerprint of cached block | 1 jam | natural |
| `auth:session:<refreshTokenHash>` | session state | 30 hari | on logout |
| `auth:ws:token:<jti>` | revocation | 5 menit | natural |
| `ratelimit:<endpoint>:<userId>:<minute>` | counter | 60 detik | natural |
| `idem:<source>:<key>` | response cache | 24 jam | natural |
| `crawler:rate:<host>` | token bucket | 60 detik | natural |

### 9.3 Invalidation Rules

- **Event-driven (preferred):** subscribe ke NATS `core.user.*`, `market.eod.*`, `research.published` → service yang punya cache delete key.
- **TTL-only:** untuk data yang volatilitas rendah dan tidak punya event source.
- **Versioned:** ad-hoc keys yang sulit di-invalidate (mis. screener result) di-namespace dengan `:v<schema_version>` — bump version untuk invalidasi massal.

### 9.4 Cache-Aside Pattern

Standar:

```text
1. baca key dari Redis
2. jika miss: query source, set Redis dengan TTL jitter (±15%), return
3. jika hit: return
on write: write-through ke source, lalu DEL key (atau publish event)
```

### 9.5 Anti Cache Stampede

- **SWR (stale-while-revalidate)** untuk endpoint hot: tampilkan stale ≤ 2× TTL sambil background refresh.
- **Lock pattern:** untuk recompute mahal (mis. `analytics:bandarmology:*`), pakai Redis SET NX `lock:recompute:<key>` TTL 10 detik supaya hanya 1 worker recompute.

---

## 10. Rate Limiting

### 10.1 Layer

1. **Edge (Cloudflare):** WAF + bot mitigation + DDoS — coarse, 1000 req/IP/menit baseline.
2. **Gateway (Kong):** per-API-key + per-user JWT, default policy per route.
3. **Service-internal:** untuk endpoint yang costly (LLM, backtest), redo di service.

### 10.2 Algorithm

**Token bucket** (alasan: bursty traffic friendly, smooth refill). Implementasi via Redis script Lua:

```text
key: ratelimit:<scope>:<id>
fields: tokens (float), last_refill_ms (int)

on request:
  load tokens, last_refill
  elapsed = now - last_refill
  refill = elapsed * refill_per_ms
  tokens = min(capacity, tokens + refill)
  if tokens >= cost:
    tokens -= cost
    persist, allow
  else:
    persist, deny, retry_after_ms = (cost - tokens) / refill_per_ms
```

Header response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` (saat 429).

### 10.3 Limit Matrix (per endpoint kategori × tier)

| Category | Free | Starter | Pro | Elite | Cost unit |
|---|---|---|---|---|---|
| Auth (login, refresh) | 10/min | 20/min | 20/min | 20/min | 1 |
| Read user/watchlist/alert | 60/min | 300/min | 1000/min | 3000/min | 1 |
| Quote single | 60/min | 600/min | 2000/min | 6000/min | 1 |
| Quote batch (≤50) | 30/min | 200/min | 600/min | 2000/min | 5 |
| Chart OHLCV | 30/min | 200/min | 600/min | 1500/min | 2 |
| Indicator | 0 | 100/min | 500/min | 2000/min | 2 |
| Broker / Foreign flow | 0 | 60/min | 300/min | 1000/min | 3 |
| Fundamental statement | 0 | 100/min | 500/min | 2000/min | 2 |
| DCF compute | 0 | 0 | 30/jam | 200/jam | 50 (CPU) |
| Screener run | 5/jam | 60/jam | 600/jam | 3000/jam | 10 |
| Backtest run | 0 | 0 | 5/jam | 50/jam | 200 (heavy) |
| Daily picks read | 60/min | 200/min | 600/min | 2000/min | 1 |
| Research read | 0 | 0 | 200/min | 1000/min | 2 |
| AI chat (lihat §6.6) | 5/hari | 50/hari | 500/hari | unlimited soft | tokens |
| WS subscribe count | 20 | 100 | 500 | 2000 | per channel |
| Webhook (admin) | 0 | 0 | 0 | 30/min | 1 |

### 10.4 Per-IP Floor

Anti-abuse: per-IP global bucket 600 req/menit ditegakkan di gateway terlepas dari user yang login (untuk antisipasi credential stuffing & enum).

### 10.5 429 Behavior

- Response body: `{ "error": { "code": "E_RATE_LIMITED", "retryAfterMs": 4500 } }`.
- WS: kirim `type: "error"` dengan `code: "E_RATE_LIMITED"`, lalu close 4000 jika exceeded subscribe budget.

---

## 11. Authentication & Session

### 11.1 JWT Structure (Access Token)

- **Algoritma:** EdDSA (Ed25519) — kunci di Vault, rotation otomatis 90 hari dengan dual-issuer (JWKS).
- **TTL:** 15 menit (access), 30 hari (refresh).
- **Claims:**

```json
{
  "iss": "auth.nubuat.id",
  "sub": "usr_01HXY...",
  "aud": ["api.nubuat.id", "stream.nubuat.id"],
  "iat": 1715404800,
  "exp": 1715405700,
  "jti": "jwt_01HXY...",
  "tier": "pro",
  "ent": ["bandarmology", "research", "ai_deep"],
  "device": "dev_01HXY...",
  "amr": ["pwd", "totp"],
  "ver": 1
}
```

### 11.2 Refresh Token

- Opaque, random 32-byte base64url. Disimpan hashed (SHA-256) di Postgres `auth_session` + Redis `auth:session:<hash>` untuk fast revoke.
- Rotation tiap refresh (single-use). Reuse detection (token lama dipakai 2x) → revoke seluruh chain + force logout user + alert.
- Bound ke `deviceFingerprint` (UA hash + canvas + audio fingerprint dari client SDK) untuk mitigasi token theft.

### 11.3 OAuth Provider

- **Google:** OIDC code flow + PKCE. Client di iOS/Android pakai native SDK; web pakai `One Tap`.
- **Apple:** Sign in with Apple, JWT id_token verify pakai Apple JWKS, cache 24 jam.
- **Linking:** user bisa link multi-provider; primary email unique constraint.

### 11.4 2FA / MFA

- **TOTP (default):** RFC 6238, 30s window, 6 digit. Backup codes 10 buah, hashed.
- **SMS OTP (fallback):** via Vonage / Twilio; rate-limited (3 SMS/jam/nomor).
- **WebAuthn (M9+):** passkey support.
- **Mandatory** untuk Elite tier dan admin.

### 11.5 Device Fingerprint

- Client SDK kumpulin (UA + screen + timezone + canvas hash + audio fingerprint) → SHA-256 → dikirim saat login.
- Disimpan per device: `dev_<id>, userId, fingerprint, lastSeenIp, lastSeenAt, name`.
- Login dari device baru → email notifikasi + opsi force-logout-all.

### 11.6 Session Store

- **Source of truth:** Postgres `auth_session` (audit-able).
- **Hot path:** Redis `auth:session:<hash>` mirror untuk revoke check < 1ms.
- **Logout:** delete keduanya + JWT `jti` masuk denylist Redis TTL 15 menit (matches access TTL).

### 11.7 Brute Force Protection

- 5 failed login dalam 15 menit → lockout 15 menit per akun + per IP.
- Setelah 3 lockout cycle → require captcha + email confirm.

---

## 12. Webhook System

### 12.1 Inbound (billing webhooks)

#### 12.1.1 Midtrans

- **Endpoint:** `POST /v1/billing/webhook/midtrans`.
- **Signature verify:** header `X-Signature` = SHA512(orderId + statusCode + grossAmount + serverKey). Reject if mismatch.
- **Body example:**

```json
{
  "transaction_status": "settlement",
  "order_id": "nbt-sub-01HXY...",
  "status_code": "200",
  "gross_amount": "299000.00",
  "payment_type": "gopay",
  "transaction_id": "..."
}
```

- **Idempotency:** key = `transaction_id`. Cek `idem:midtrans:<txnId>` di Redis (TTL 7 hari) → kalau ada, return 200 OK tanpa proses ulang.
- **Processing:**
  1. Verify signature.
  2. Set idempotency key.
  3. Load subscription via `order_id`.
  4. Apply state transition:

```text
transaction_status → state
  capture/settlement → active (or extend)
  pending           → pending
  deny/expire/cancel → suspended
  refund            → cancelled + refund event
```

  5. Publish `billing.event.settled` ke NATS.
  6. Respond 200 dalam < 500 ms.

#### 12.1.2 Xendit

- Endpoint `POST /v1/billing/webhook/xendit`. Verify via `X-CALLBACK-TOKEN` header constant (Xendit pattern). Body parse mirip; states mapped sama.

#### 12.1.3 Stripe

- Endpoint `POST /v1/billing/webhook/stripe`. Verify via `Stripe-Signature` HMAC-SHA256 + timestamp tolerance ±5 menit.

### 12.2 Outbound (Elite Tier API webhooks)

Elite user bisa daftar webhook untuk event tertentu (mis. alert triggered, daily picks published).

- **Registration:** `POST /v1/me/webhooks { url, events[], secret }`.
- **Delivery:**
  - POST JSON event payload + header `X-Nubuat-Signature: t=<unix>,v1=<hmacSha256(t.body, secret)>`.
  - Retry: exp 30s-1h × 8 attempts. Setelah final fail → mark webhook `suspended`, email user.
  - Timeout: 5 s.
- **Replay protection:** payload include `id` (UUIDv7) — user wajib dedup.

### 12.3 Webhook Audit

- Setiap inbound + outbound delivery dicatat di Postgres `webhook_log` (incl. status, latency, signature_valid, body_hash) untuk forensic.

---

## 13. Observability

### 13.1 Logs

- **Format:** JSON line, schema versioned.
- **Required fields:** `ts (RFC3339 ms)`, `level`, `service`, `version`, `traceId`, `spanId`, `userId?`, `requestId`, `route?`, `method?`, `status?`, `latencyMs?`, `err?{code,msg,stack}`, `msg`.
- **PII handling:** email/phone → hash. Token never logged. Sentry scrubber + service log filter middleware.
- **Storage:** Loki (hot 14 hari) + S3/R2 archive (cold 1 tahun).

### 13.2 Metrics (Prometheus)

Naming convention: `nubuat_<service>_<noun>_<unit>` (RED + USE).

| Metric | Type | Labels |
|---|---|---|
| `nubuat_core_api_http_requests_total` | counter | method, route, status |
| `nubuat_core_api_http_duration_seconds` | histogram | method, route |
| `nubuat_core_api_http_inflight` | gauge | route |
| `nubuat_realtime_ws_connections` | gauge | tier |
| `nubuat_realtime_ws_messages_sent_total` | counter | channel_class |
| `nubuat_realtime_ws_send_duration_seconds` | histogram | channel_class |
| `nubuat_market_ingest_ticks_total` | counter | ticker, source |
| `nubuat_market_ingest_gap_total` | counter | ticker, source |
| `nubuat_market_ingest_lag_seconds` | gauge | source |
| `nubuat_nats_consumer_lag` | gauge | stream, consumer |
| `nubuat_nats_dlq_total` | counter | stream, consumer |
| `nubuat_analytics_pipeline_duration_seconds` | histogram | pipeline |
| `nubuat_analytics_picks_published_total` | counter | date |
| `nubuat_ai_llm_requests_total` | counter | model, mode, status |
| `nubuat_ai_llm_tokens_total` | counter | model, kind(input\|output\|cache_read\|cache_write) |
| `nubuat_ai_llm_cost_usd_total` | counter | model |
| `nubuat_db_pg_pool_inuse` | gauge | db |
| `nubuat_db_questdb_query_duration_seconds` | histogram | query_class |
| `nubuat_redis_cmd_duration_seconds` | histogram | cmd |
| `nubuat_billing_webhook_total` | counter | gateway, status |
| `nubuat_jobs_runs_total` | counter | job, status |
| `nubuat_jobs_duration_seconds` | histogram | job |

### 13.3 Tracing

- **OpenTelemetry SDK** di semua service. Sampler: parent-based + ratio 5% (head sample) untuk hot path, 100% untuk error spans.
- **Propagation:** W3C `traceparent` header end-to-end (HTTP, gRPC, NATS messages punya header).
- **Span naming:** `<service>.<operation>` mis. `core-api.GET /v1/quote/{code}`.
- **Backend:** Tempo (kompatibel Grafana).

### 13.4 Alert Rules (samples)

| Alert | Condition | Severity |
|---|---|---|
| Market ingest gap | `rate(nubuat_market_ingest_gap_total[5m]) > 10` | P1 |
| Picks pipeline missed | no `nubuat_analytics_picks_published_total` increment by 07:36 | P0 |
| WS error spike | `rate(... close_code{class=server}[5m]) > 100` | P1 |
| LLM cost burn | `nubuat_ai_llm_cost_usd_total` daily > budget | P2 |
| Billing webhook fail | `rate(...status="error"[10m]) > 5` | P0 |
| HTTP 5xx | `rate(...status=~"5..")[5m] > 1%` per service | P1 |
| Postgres pool saturation | `inuse / max > 0.9` 5m | P1 |
| NATS consumer lag | `nubuat_nats_consumer_lag > 10000` 2m | P1 |
| Uptime < SLO | error budget burn rate fast | P0 |

---

## 14. Deployment Topology

### 14.1 Kubernetes Layout

- **Cluster:** EKS di `ap-southeast-3` (Jakarta), 3 AZ.
- **Namespace per env:** `prod`, `staging`, `qa`, `dev`. + namespaces sistem: `ingress`, `observability`, `data` (Postgres operator, Redis operator, NATS).
- **Node groups:**
  - `general-spot` (m6i.large mix) — stateless services
  - `general-od` (m6i.large on-demand) — control plane / billing
  - `compute-heavy` (c7i.2xlarge) — analytics-engine
  - `ai-cpu` (c7i.4xlarge) — ai-copilot, research-aggregator
  - `data-od` (r6i.2xlarge) — Postgres, QuestDB, Redis (kalau self-managed)

### 14.2 HPA Targets

| Service | Metric | Min | Max | Target |
|---|---|---|---|---|
| core-api | CPU 60% + RPS custom | 4 | 24 | scale ratio aware |
| realtime-hub | active_ws_connections per pod | 4 | 32 | 8000/pod |
| analytics-engine | queue depth (Temporal task queue) | 2 | 16 | < 30 backlog |
| ai-copilot | inflight LLM req per pod | 2 | 12 | 8 inflight |
| research-aggregator workers | Celery queue length | 2 | 20 | < 100 backlog |
| billing | CPU 60% | 2 | 8 | — |
| notification | queue length | 2 | 16 | < 200 backlog |
| market-data-ingestor | manual (active-passive) | 2 | 4 | — |

### 14.3 PDB

```yaml
PDB rule: minAvailable = max(2, replicas - 1)
during deploy maxUnavailable = 25%
```

### 14.4 Network Policy

- Default deny ingress per namespace.
- `realtime-hub` only accepts from `ingress` namespace.
- `analytics-engine` accepts from `core-api`, `ai-copilot`, `notification`.
- mTLS via Linkerd between service pods (M6+).

### 14.5 Secrets Management

- **HashiCorp Vault** sebagai source of truth (KV v2 + transit untuk PII encryption).
- **External Secrets Operator** sync ke K8s Secret.
- **SOPS** + age key untuk file IaC (Terraform tfvars).
- Rotasi DB password 90 hari otomatis via Vault DB engine.
- API key vendor (Anthropic, Midtrans, Xendit, Stripe) rotated quarterly atau on-incident.

### 14.6 Multi-Env Promotion

```text
dev → staging (auto on merge main) → qa (on tag rc-*) → prod (manual approve)
```

ArgoCD ApplicationSet per env. Helm chart per service. Image promoted by digest, bukan tag.

### 14.7 Database Topology

- **Postgres:** primary + 2 standby (sync 1, async 1). PgBouncer pooler. PITR via WAL ke S3, retention 30 hari.
- **QuestDB:** clustered (sharded by ticker prefix); cold tier ke S3 parquet > 1 tahun.
- **Redis:** 3 master/3 replica cluster mode, persistence AOF every-sec.
- **NATS JetStream:** 3-node cluster.
- **pgvector:** co-located di Postgres yang sama atau standalone replica untuk query offload.

---

## 15. Error Handling

### 15.1 Response Envelope

```json
{
  "error": {
    "code": "E_VALIDATION",
    "message": "ticker code not found",
    "details": [
      { "field": "code", "issue": "not_in_universe" }
    ],
    "requestId": "req_01HXY...",
    "traceId": "0af7651916cd43dd...",
    "retryable": false,
    "retryAfterMs": null,
    "docsUrl": "https://docs.nubuat.id/errors/E_VALIDATION"
  }
}
```

### 15.2 Error Code Taxonomy

| Code | HTTP | Class | Retryable |
|---|---|---|---|
| `E_VALIDATION` | 400 | client | no |
| `E_UNAUTHENTICATED` | 401 | client | no |
| `E_TOKEN_EXPIRED` | 401 | client | refresh |
| `E_FORBIDDEN` | 403 | client | no |
| `E_TIER_INSUFFICIENT` | 403 | client | upgrade |
| `E_NOT_FOUND` | 404 | client | no |
| `E_CONFLICT` | 409 | client | no |
| `E_PRECONDITION_FAILED` | 412 | client | no |
| `E_RATE_LIMITED` | 429 | client | yes |
| `E_PAYLOAD_TOO_LARGE` | 413 | client | no |
| `E_INTERNAL` | 500 | server | yes |
| `E_UPSTREAM_TIMEOUT` | 504 | server | yes |
| `E_UPSTREAM_UNAVAILABLE` | 503 | server | yes |
| `E_MAINTENANCE` | 503 | server | yes |
| `E_FEATURE_OFF` | 503 | server | no |
| `E_AI_CAPACITY` | 503 | server (LLM) | yes |
| `E_PAYMENT_REQUIRED` | 402 | client | no |
| `E_DATA_STALE` | 409 | client | yes |
| `E_DEPENDENCY_CIRCUIT_OPEN` | 503 | server | yes |

### 15.3 Mapping Internal Exception → Code

Library shared (`/pkg/errors` di Go, `nubuat_errors` di Python) menyediakan:
- `NotFoundError(field, value)` → `E_NOT_FOUND`
- `ValidationError(field, issue)` → `E_VALIDATION`
- `TierError(required)` → `E_TIER_INSUFFICIENT`
- `UpstreamError(service, cause)` → `E_UPSTREAM_*`

Setiap service WAJIB pakai library ini untuk konsistensi.

---

## 16. Versioning & Backward Compatibility

### 16.1 API Version

- **URL versioning:** `/v1/...`, `/v2/...`.
- **Major bump trigger:** breaking changes — field rename, type change, removal, semantic change.
- **Minor changes** (additive field, new endpoint, new optional param) tetap di major version aktif.
- **Sunsetting:** announce minimum 6 bulan sebelum sunset, header `Sunset: <date>` + `Deprecation: true` di response.

### 16.2 Schema Evolution

- **Postgres:** migrations via `golang-migrate` (Go services) / `alembic` (Python). Backward-compatible per release (add column nullable, deprecate, drop next release after no read).
- **Event payload (NATS):** Protobuf dengan field reserved + numbering aturan; never reuse field number.
- **JSON API:** clients must ignore unknown fields (Postel principle); server must accept missing optional fields.

### 16.3 Deprecation Policy

| Stage | Duration | Action |
|---|---|---|
| `announced` | 6 bulan minimum | header `Deprecation: true`, blog post, dashboard email |
| `sunset` | hari H | endpoint kembalikan 410 Gone dengan link migrasi |
| `removed` | hari H+30 | code removed |

### 16.4 WebSocket Subprotocol

- `nubuat.v1` (initial), `nubuat.v2` (future). Server support multiple subprotocol parallel.

### 16.5 Internal Service Contracts

- Setiap perubahan tool schema di ai-copilot tools → bump tool version (`get_quote_v1`, `get_quote_v2`). Tetap pertahankan v1 selama 1 quarter setelah v2 stabil.

---

## 17. Performance Targets

Target diukur via Prometheus histogram, dilaporkan harian di SLO dashboard.

### 17.1 REST Endpoint Latency

| Category | p50 | p95 | p99 | Contoh endpoint |
|---|---|---|---|---|
| Auth | 80 ms | 250 ms | 500 ms | login, refresh |
| Metadata read (cached) | 20 ms | 80 ms | 200 ms | /tickers/{code}, /sectors |
| Quote single (cached hot) | 15 ms | 60 ms | 150 ms | /quote/{code} |
| Quote batch (50) | 40 ms | 150 ms | 400 ms | /quote/batch |
| Chart OHLCV (1D, 5y) | 80 ms | 300 ms | 700 ms | /chart/{code}/ohlcv |
| Indicator on-demand | 100 ms | 400 ms | 900 ms | /chart/{code}/indicator |
| Bandarmology aggregate | 120 ms | 500 ms | 1200 ms | /bandarmology/{code} |
| Fundamental statement | 60 ms | 250 ms | 600 ms | /fundamental/{code}/financials |
| DCF compute | 200 ms | 800 ms | 1800 ms | POST /fundamental/.../dcf |
| Screener run (ad-hoc) | 200 ms | 800 ms | 1500 ms | POST /screener/run |
| Daily picks list | 30 ms | 120 ms | 300 ms | /picks/daily |
| Research search | 80 ms | 350 ms | 900 ms | /research |
| AI chat TTFT | 1000 ms | 3000 ms | 6000 ms | POST /ai/chat |
| Backtest enqueue | 50 ms | 200 ms | 500 ms | POST /backtest/run |

### 17.2 WebSocket Latency

- Tick fanout (NATS receive → client receive): p50 30 ms, p95 100 ms, p99 300 ms.
- Subscribe ack: p95 < 80 ms.

### 17.3 Pipeline Throughput

- Market data ingest: 200k tick/s peak (M6), 1M tick/s (M24).
- Daily picks pipeline: < 5 menit untuk 945 ticker.
- Research embed: 500 dokumen/jam.

### 17.4 Availability

- API: 99.9% bulanan global; 99.95% jam bursa.
- WS: 99.95% jam bursa.
- AI: 99.5%.
- Billing webhook receive: 99.99% (revenue critical).

---

## 18. Capacity Planning

Asumsi proyeksi user dari §10.4 dokumen utama: M6 (5.290 user, 290 paid), M12 (27.180 user, 2.180 paid), M24 (87.850 user, 7.850 paid).

### 18.1 QPS Estimate

Asumsi rasio active concurrent: 10% pada jam bursa puncak.

| Milestone | Concurrent users | API RPS peak | WS conn peak | Tick ingest |
|---|---|---|---|---|
| M6 | 530 | ~150 (rata-rata 0.3 RPS/user) | ~530 | 50k/s |
| M12 | 2.700 | ~800 | ~2.700 | 100k/s |
| M24 | 8.800 | ~2.600 | ~8.800 | 200k/s |

### 18.2 Storage Growth

| Store | M6 | M12 | M24 |
|---|---|---|---|
| QuestDB (tick) | 1 TB | 6 TB | 25 TB |
| QuestDB (OHLCV + downsampled) | 200 GB | 700 GB | 2 TB |
| Postgres (OLTP) | 80 GB | 350 GB | 1.5 TB |
| pgvector (research embeddings) | 30 GB | 150 GB | 600 GB |
| Redis | 16 GB | 64 GB | 192 GB |
| S3 (PDF, snapshots, exports) | 500 GB | 3 TB | 15 TB |
| Logs (Loki + cold) | 1 TB hot / 5 TB cold | 5 TB / 30 TB | 20 TB / 120 TB |

Tick storage growth ~70 GB/bulan di M6, terus naik. Cold tier ke parquet di S3 dipindah tiap 90 hari untuk control biaya.

### 18.3 Scaling Trigger

| Tanda | Aksi |
|---|---|
| `core-api` CPU > 60% 15 min | tambah replica via HPA (otomatis) |
| Postgres CPU > 70% sustained | tambah read replica + redirect read traffic via PgBouncer |
| Postgres write IOPS > 80% baseline | upgrade instance class + tune autovacuum |
| QuestDB query p95 > target | partition shard tambahan / move cold data |
| Redis memory > 75% | tambah shard, re-shard via slot migration |
| NATS consumer lag > 10k sustained | tambah consumer worker replica |
| LLM cost > daily budget 80% | enforce stricter rate limit Free tier + cache fallback |
| WS active conn > 80% pod capacity | scale realtime-hub HPA |
| Job DLQ > 100 dalam 1 jam | ops investigate + manual replay |

### 18.4 Cost Envelope (rough, USD/bulan)

| Pos | M6 | M12 | M24 |
|---|---|---|---|
| Compute (EKS) | $3.000 | $9.000 | $28.000 |
| Postgres (RDS) | $700 | $2.500 | $8.000 |
| QuestDB (self-managed EC2) | $1.200 | $4.000 | $14.000 |
| Redis (Elasticache) | $400 | $1.500 | $5.000 |
| S3/R2 | $200 | $800 | $3.000 |
| Bandwidth (Cloudflare egress) | $300 | $1.200 | $5.000 |
| LLM (Anthropic) | $1.000 | $5.000 | $20.000 |
| Vendor market data | $1.500 (vendor) | $8.000 (IDX direct) | $15.000 |
| Observability (Loki/Tempo/Prom) | $500 | $1.500 | $4.000 |
| **Total** | **~$8.800** | **~$33.500** | **~$102.000** |

Gross margin target ≥ 70% berdasarkan revenue di §10.4 — sesuai ambang sehat SaaS.

### 18.5 DR & RPO/RTO

| Tier | RPO | RTO |
|---|---|---|
| Billing | 1 menit | 15 menit |
| Core OLTP (user, watchlist) | 5 menit | 30 menit |
| QuestDB | 15 menit | 1 jam |
| Research + Vector | 1 jam | 2 jam |
| Caches (Redis) | best-effort | menit (cold start ok) |

Backup: continuous WAL → S3 (Postgres), nightly snapshot (QuestDB + parquet), Vault snapshot 4x/hari.

---

## Disclaimer

Dokumen ini adalah **PLAN BACKEND v0.1** — baseline tingkat arsitektur. Setiap section (mis. *Daily Picks Engine pipeline*, *AI Copilot orchestration*, *Authentication & Session*, *WebSocket protocol*, *Caching strategy*, *Capacity planning*) akan **dipecah menjadi RFC terpisah** dengan detail implementasi, spike & POC, threat model, dan rencana migrasi sebelum eksekusi engineering. Angka SLO, performance target, dan estimasi kapasitas masih bersifat asumsi dan akan dikalibrasi dengan benchmark internal di fase M0–M3.

— end of PLAN_BACKEND.md —
