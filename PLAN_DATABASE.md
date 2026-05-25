# Plan Database — Nubuat

> **Dokumen:** Database Architecture & Data Layer Plan
> **Tanggal:** 11 Mei 2026
> **Owner Data Architect:** dobeon.com@gmail.com
> **Status:** v0.1 — Foundation Blueprint
> **Referensi utama:** `ANALISIS_APLIKASI_SAHAM.md` (section 4, 5, 6, 8.3, 9)

Dokumen ini adalah cetak biru *data layer* untuk Nubuat. Cakupan: pilihan datastore, skema relasional & time-series, embeddings, cache, partitioning, retention, backup, sizing, dan kepatuhan UU PDP. Tidak menyentuh API design BE maupun UI — strictly data engineering.

---

## Daftar Isi

1. Database Topology & Justifikasi
2. PostgreSQL Schema (OLTP) — DDL Representatif
3. QuestDB Schema (Time-Series)
4. ClickHouse Schema (Analytics Aggregates)
5. pgvector / Qdrant Schema (Embeddings)
6. Redis Namespace & Key Design
7. Entity-Relationship Diagram (ASCII)
8. Migration Strategy
9. Partitioning, Sharding & Archiving
10. Data Lifecycle & Retention (UU PDP)
11. Backup, DR & PITR
12. Data Quality & Validation
13. Indexing Strategy
14. Sizing & Growth Projection
15. Multi-Tenancy Consideration

---

## 1. Database Topology & Justifikasi

Nubuat memakai **polyglot persistence** karena beban kerja sangat heterogen: OLTP transaksional (subscription, watchlist), *ultra high-write* time-series (tick, OHLCV), *analytics aggregate* (backtest, behavior), full-text search, vector similarity (RAG), low-latency cache, dan object storage besar (PDF laporan).

### 1.1 Peta Store

| Store | Versi | Data Class | Justifikasi | Sizing M12 (est.) |
|---|---|---|---|---|
| **PostgreSQL 16** | 16.x | OLTP: users, auth, subscriptions, payments, companies, corporate actions, watchlist, alerts, portfolio, daily picks, research metadata, AI conversations, audit logs | ACID, FK enforcement, mature ecosystem, ekstensi (pgcrypto, pg_partman, pg_stat_statements, pgvector) | ~250 GB primary + 200 GB partitions |
| **QuestDB** | 7.x | Time-series: tick, OHLCV 1m/5m/15m/1h/1d, broker summary harian, foreign flow intraday, order book L1/L2, indices, makro | ASOF JOIN native, ingestion 4M rows/sec, partition by DAY otomatis, kolomnar | ~1.2 TB (tick+OHLCV+broker) |
| **ClickHouse** | 24.x | Analytics aggregates: backtest results, user behavior, daily picks track record, broker performance attribution | Window function & aggregation cepat, materialized view, kompresi 10–20× | ~150 GB |
| **Redis 7 Cluster** | 7.x | Cache hot quote, session, idempotency, rate limit token bucket, leaderboard, pub/sub fanout | RAM speed (<1ms), TTL native, cluster mode untuk HA | ~32 GB RAM total |
| **pgvector** (embedded di Postgres) | 0.7+ | Embeddings: research reports, news, AI context | Operasi tunggal w/ Postgres untuk skala moderat (<10jt vektor); pindah ke Qdrant kalau >10jt | ~30 GB |
| **Qdrant** (opsional M9+) | 1.10+ | Embeddings skala besar (>10jt vektor) bila pgvector mulai bottleneck | HNSW dedicated, filtering payload, scaling horizontal | TBD |
| **Meilisearch** | 1.9+ | Full-text: ticker, nama perusahaan, judul news, judul research | Setup ringan, typo-tolerance, indexing cepat. Alternatif Typesense (mirip). | ~5 GB |
| **Cloudflare R2** | — | Object: PDF laporan sekuritas, snapshot chart, export user (CSV/Parquet), backup dump | **No egress fee** (penting untuk distribusi PDF ke user), S3-compatible | ~500 GB |

### 1.2 Trade-off Penting

**Kenapa PostgreSQL + QuestDB, BUKAN PostgreSQL + TimescaleDB?**

- TimescaleDB menarik (single ecosystem) tetapi **2.5–40× lebih lambat** dibanding QuestDB untuk financial tick (ASOF JOIN 5-min OHLCV: QuestDB 25ms vs TimescaleDB 1021ms — referensi section 8.3 dokumen utama).
- Bandarmology & Daily Picks Engine sering query *latest tick* + *5-min bar synchronization* lintas ticker — *ASOF JOIN* native QuestDB krusial.
- Trade-off: ops overhead 2 sistem (Postgres + QuestDB), tetapi *separation of concerns* membuat OLTP tidak terganggu spike ingestion tick saat open/close.

**Kenapa QuestDB + ClickHouse, BUKAN QuestDB saja?**

- QuestDB unggul di **fast ingestion & low-latency ASOF JOIN** (workload "live").
- ClickHouse unggul di **heavy aggregation lintas dimensi besar** (backtest yang scan 5 tahun × 945 ticker × banyak parameter).
- Backtest jobs di-trigger ad-hoc; tidak ideal untuk QuestDB yang dioptimasi *streaming write*.

**Kenapa pgvector dulu, BUKAN Qdrant langsung?**

- M0–M9 vektor masih <10jt (research 50k laporan × 5 chunk + news 1jt × 1 chunk + context tiap user ~moderate). pgvector cukup, dan keep operations ringan.
- Migrasi ke Qdrant gampang kalau dibutuhkan (dump → re-embed → re-index); planning *single source of truth tetap di Postgres* (kolom `embedding`) untuk redundancy.

**Kenapa Cloudflare R2, BUKAN AWS S3?**

- PDF research dan export user **diakses berulang oleh user** — egress S3 mahal. R2 zero egress fee, S3-compatible API, latency ekuivalen di Indonesia (Cloudflare PoP Jakarta).
- Trade-off: ekosistem AWS lebih matang (lifecycle policy, Glacier). Mitigasi: tetap pakai S3 Glacier untuk cold archive (audit logs > 1 tahun, financial filings >5 tahun).

**Kenapa Meilisearch, BUKAN Elasticsearch?**

- Search use case sederhana (ticker autocomplete + news/research title search). Elasticsearch overkill, RAM-hungry, ops berat.
- Meilisearch single binary, sub-50ms response, typo-tolerance bawaan, lebih cocok untuk tim kecil M0–M12.

### 1.3 Hosting & Residency

Seluruh primary store dijalankan di **AWS ap-southeast-3 (Jakarta)** sesuai mandat UU 27/2022 (UU PDP). Backup R2 region SIN dengan *processing agreement*; backup S3 Glacier ap-southeast-3 untuk archive long-term.

---

## 2. PostgreSQL Schema (OLTP) — DDL Representatif

Schema dibagi ke **3 logical schema** dalam 1 database:

- `iam` — users, auth, oauth, mfa, sessions
- `billing` — subscriptions, payments, invoices, coupons, referrals
- `core` — companies, sectors, indices, corporate actions, financials, watchlist, alerts, portfolio, daily_picks, research, news, AI, audit
- `analytics` — feature flags, api_keys (read-only API tier Elite)

Konvensi:
- Snake_case, semua tabel punya `created_at TIMESTAMPTZ DEFAULT NOW()` & `updated_at TIMESTAMPTZ`.
- Primary key UUID v7 (sortable) untuk semua entitas user-facing → enkripsi-friendly & no enumeration attack.
- Soft delete pakai `deleted_at TIMESTAMPTZ` untuk entitas yang butuh recovery.
- Currency disimpan sebagai `BIGINT` (cents/rupiah) — hindari floating point untuk uang.

### 2.1 IAM Cluster

```sql
-- =====================================================
-- Schema: iam
-- =====================================================
CREATE SCHEMA IF NOT EXISTS iam;

-- ------- users -------
CREATE TABLE iam.users (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    email           CITEXT NOT NULL UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   TEXT,                       -- Argon2id; NULL kalau OAuth-only
    full_name       VARCHAR(120) NOT NULL,
    avatar_url      TEXT,
    kyc_status      VARCHAR(16) NOT NULL DEFAULT 'unverified',
                    -- 'unverified' | 'pending' | 'verified' | 'rejected'
    kyc_verified_at TIMESTAMPTZ,
    referral_code   VARCHAR(16) NOT NULL UNIQUE,
    referred_by     UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    locale          VARCHAR(8)  NOT NULL DEFAULT 'id-ID',
    timezone        VARCHAR(40) NOT NULL DEFAULT 'Asia/Jakarta',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_referred_by ON iam.users(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX idx_users_kyc_status  ON iam.users(kyc_status);
CREATE INDEX idx_users_active      ON iam.users(is_active) WHERE deleted_at IS NULL;

-- ------- user_profiles -------
CREATE TABLE iam.user_profiles (
    user_id           UUID PRIMARY KEY REFERENCES iam.users(id) ON DELETE CASCADE,
    risk_profile      VARCHAR(16),    -- 'conservative' | 'moderate' | 'aggressive'
    experience_level  VARCHAR(16),    -- 'beginner' | 'intermediate' | 'advanced' | 'pro'
    investment_goal   VARCHAR(32),    -- 'capital_growth' | 'income' | 'short_trade' | ...
    preferred_sectors TEXT[],         -- array of sector codes
    notif_channels    JSONB NOT NULL DEFAULT '{"in_app":true,"push":true,"email":true,"wa":false,"tg":false}',
    chart_preferences JSONB,          -- default timeframe, indikator default, dark/light
    onboarded_at      TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------- auth_sessions -------
CREATE TABLE iam.auth_sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id            UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,        -- SHA-256 hash, raw token never stored
    device_fingerprint TEXT,
    user_agent         TEXT,
    ip_address         INET,
    geo_country        VARCHAR(2),
    issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    last_used_at       TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_active ON iam.auth_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires     ON iam.auth_sessions(expires_at) WHERE revoked_at IS NULL;

-- ------- oauth_accounts -------
CREATE TABLE iam.oauth_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id             UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    provider            VARCHAR(32) NOT NULL,    -- 'google' | 'apple' | 'github' | 'facebook'
    provider_account_id VARCHAR(128) NOT NULL,
    access_token_enc    TEXT,                    -- pgcrypto encrypted
    refresh_token_enc   TEXT,
    expires_at          TIMESTAMPTZ,
    scope               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_oauth_user ON iam.oauth_accounts(user_id);

-- ------- mfa_factors -------
CREATE TABLE iam.mfa_factors (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id       UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    factor_type   VARCHAR(16) NOT NULL,    -- 'totp' | 'webauthn' | 'sms'
    secret_enc    TEXT,                    -- pgcrypto encrypted (TOTP seed) atau credential blob
    credential_id BYTEA,                   -- untuk WebAuthn
    public_key    BYTEA,                   -- untuk WebAuthn
    sign_count    BIGINT DEFAULT 0,
    label         VARCHAR(64),             -- "iPhone 15", "YubiKey home"
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at   TIMESTAMPTZ,
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_user ON iam.mfa_factors(user_id, is_active);
```

### 2.2 Billing Cluster

```sql
-- =====================================================
-- Schema: billing
-- =====================================================
CREATE SCHEMA IF NOT EXISTS billing;

-- ------- subscriptions -------
CREATE TABLE billing.subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id         UUID NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    tier            VARCHAR(16) NOT NULL,       -- 'free' | 'starter' | 'pro' | 'elite' | 'institutional'
    status          VARCHAR(16) NOT NULL,       -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
    billing_cycle   VARCHAR(8)  NOT NULL,       -- 'monthly' | 'annual' | 'lifetime'
    started_at      TIMESTAMPTZ NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    trial_ends_at   TIMESTAMPTZ,
    canceled_at     TIMESTAMPTZ,
    auto_renew      BOOLEAN NOT NULL DEFAULT TRUE,
    gateway         VARCHAR(16),                -- 'midtrans' | 'xendit' | 'stripe'
    gateway_sub_id  VARCHAR(128),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_user_status     ON billing.subscriptions(user_id, status);
CREATE INDEX idx_subs_period_end      ON billing.subscriptions(current_period_end) WHERE status IN ('active','trialing');
CREATE UNIQUE INDEX uniq_active_sub   ON billing.subscriptions(user_id)
    WHERE status IN ('trialing','active','past_due');

-- ------- subscription_history (audit) -------
CREATE TABLE billing.subscription_history (
    id               UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    subscription_id  UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    event_type       VARCHAR(32) NOT NULL,   -- 'created' | 'upgraded' | 'downgraded' | 'renewed' | 'canceled' | 'reactivated' | 'tier_change' | 'payment_failed'
    from_tier        VARCHAR(16),
    to_tier          VARCHAR(16),
    actor            VARCHAR(32),            -- 'user' | 'system' | 'admin:<email>'
    metadata         JSONB,
    occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subhist_sub  ON billing.subscription_history(subscription_id, occurred_at DESC);
CREATE INDEX idx_subhist_user ON billing.subscription_history(user_id, occurred_at DESC);

-- ------- invoices -------
CREATE TABLE billing.invoices (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    invoice_number  VARCHAR(32) NOT NULL UNIQUE,   -- INV-2026-000001
    user_id         UUID NOT NULL REFERENCES iam.users(id),
    subscription_id UUID REFERENCES billing.subscriptions(id),
    amount_cents    BIGINT NOT NULL,                -- IDR cents (×100)
    currency        CHAR(3) NOT NULL DEFAULT 'IDR',
    tax_cents       BIGINT NOT NULL DEFAULT 0,
    discount_cents  BIGINT NOT NULL DEFAULT 0,
    total_cents     BIGINT NOT NULL,
    status          VARCHAR(16) NOT NULL,           -- 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    pdf_url         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_user        ON billing.invoices(user_id, issued_at DESC);
CREATE INDEX idx_invoices_status_due  ON billing.invoices(status, due_at) WHERE status = 'open';

-- ------- payments -------
CREATE TABLE billing.payments (
    id                UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    invoice_id        UUID REFERENCES billing.invoices(id),
    user_id           UUID NOT NULL REFERENCES iam.users(id),
    gateway           VARCHAR(16) NOT NULL,        -- 'midtrans' | 'xendit' | 'stripe'
    gateway_payment_id VARCHAR(128) NOT NULL,
    gateway_method    VARCHAR(32),                  -- 'gopay' | 'ovo' | 'va_bca' | 'cc' | 'qris' | ...
    amount_cents      BIGINT NOT NULL,
    currency          CHAR(3) NOT NULL DEFAULT 'IDR',
    status            VARCHAR(16) NOT NULL,         -- 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partial_refund'
    failure_reason    TEXT,
    raw_response      JSONB,                        -- webhook payload mentah
    processed_at      TIMESTAMPTZ,
    refunded_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(gateway, gateway_payment_id)
) PARTITION BY RANGE (created_at);

-- monthly partitions, dibuat otomatis pakai pg_partman
CREATE INDEX idx_payments_invoice ON billing.payments(invoice_id);
CREATE INDEX idx_payments_user    ON billing.payments(user_id, created_at DESC);

-- ------- coupons -------
CREATE TABLE billing.coupons (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    description     TEXT,
    discount_type   VARCHAR(8) NOT NULL,      -- 'percent' | 'fixed'
    discount_value  INT NOT NULL,              -- percent (0–100) atau fixed cents
    applies_to      VARCHAR(32),               -- 'all' | 'starter' | 'pro' | 'elite' | 'annual_only'
    max_redemptions INT,                       -- NULL = unlimited
    redeem_count    INT NOT NULL DEFAULT 0,
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing.coupon_redemptions (
    id          UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    coupon_id   UUID NOT NULL REFERENCES billing.coupons(id),
    user_id     UUID NOT NULL REFERENCES iam.users(id),
    invoice_id  UUID REFERENCES billing.invoices(id),
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(coupon_id, user_id)         -- 1 user max 1× per coupon
);

-- ------- referrals -------
CREATE TABLE billing.referrals (
    id             UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    referrer_id    UUID NOT NULL REFERENCES iam.users(id),
    referee_id     UUID NOT NULL REFERENCES iam.users(id),
    reward_status  VARCHAR(16) NOT NULL DEFAULT 'pending',
                   -- 'pending' | 'qualified' | 'granted' | 'expired' | 'fraud'
    referee_paid_at TIMESTAMPTZ,         -- saat referee bayar paid tier (kualifikasi)
    granted_at     TIMESTAMPTZ,
    reward_value   JSONB,                 -- {"type":"free_month","tier":"pro","months":1}
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(referee_id)                    -- 1 user hanya bisa di-referred 1×
);

CREATE INDEX idx_referrals_referrer ON billing.referrals(referrer_id, reward_status);
```

### 2.3 Core: Companies, Sectors, Indices

```sql
-- =====================================================
-- Schema: core
-- =====================================================
CREATE SCHEMA IF NOT EXISTS core;

-- ------- sectors (IDX-IC 12) -------
CREATE TABLE core.sectors (
    code        VARCHAR(8) PRIMARY KEY,            -- 'A', 'B', ... atau 'ENERGY', 'BASIC_MAT'
    name_id     VARCHAR(80) NOT NULL,
    name_en     VARCHAR(80) NOT NULL,
    description TEXT,
    sort_order  INT
);

CREATE TABLE core.sub_sectors (
    code        VARCHAR(16) PRIMARY KEY,
    sector_code VARCHAR(8) NOT NULL REFERENCES core.sectors(code),
    name_id     VARCHAR(120) NOT NULL,
    name_en     VARCHAR(120) NOT NULL,
    sort_order  INT
);

CREATE TABLE core.industries (
    code            VARCHAR(16) PRIMARY KEY,
    sub_sector_code VARCHAR(16) NOT NULL REFERENCES core.sub_sectors(code),
    name_id         VARCHAR(160) NOT NULL,
    name_en         VARCHAR(160) NOT NULL
);

CREATE TABLE core.sub_industries (
    code         VARCHAR(16) PRIMARY KEY,
    industry_code VARCHAR(16) NOT NULL REFERENCES core.industries(code),
    name_id      VARCHAR(160) NOT NULL,
    name_en      VARCHAR(160) NOT NULL
);

-- ------- companies (emiten) -------
CREATE TABLE core.companies (
    ticker          VARCHAR(8) PRIMARY KEY,        -- "BBRI", "TLKM"
    name            VARCHAR(160) NOT NULL,
    legal_name      VARCHAR(200),
    sector_code     VARCHAR(8)  REFERENCES core.sectors(code),
    sub_sector_code VARCHAR(16) REFERENCES core.sub_sectors(code),
    industry_code   VARCHAR(16) REFERENCES core.industries(code),
    sub_industry_code VARCHAR(16) REFERENCES core.sub_industries(code),
    board           VARCHAR(16) NOT NULL,           -- 'utama' | 'pengembangan' | 'akselerasi' | 'ekonomi_baru' | 'pemantauan_khusus'
    ipo_date        DATE,
    listing_status  VARCHAR(16) NOT NULL DEFAULT 'active',
                                                    -- 'active' | 'suspended' | 'uma' | 'delisted'
    shares_outstanding BIGINT,
    free_float_pct  NUMERIC(6,4),
    market_cap_cents BIGINT,                       -- snapshot harian, di-update batch
    isin_code       VARCHAR(12),
    npwp            VARCHAR(20),
    website_url     TEXT,
    logo_url        TEXT,
    description     TEXT,
    headquarters_city VARCHAR(80),
    employees_count INT,
    fiscal_year_end CHAR(5) DEFAULT '12-31',       -- 'MM-DD'
    is_sharia       BOOLEAN NOT NULL DEFAULT FALSE,
    is_esg_index    BOOLEAN NOT NULL DEFAULT FALSE,
    risk_flags      TEXT[],                         -- ['governance','high_volatility','penny_stock']
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_sector ON core.companies(sector_code);
CREATE INDEX idx_companies_board  ON core.companies(board);
CREATE INDEX idx_companies_status ON core.companies(listing_status);
CREATE INDEX idx_companies_marketcap ON core.companies(market_cap_cents DESC) WHERE listing_status = 'active';
-- Trigram untuk fuzzy search nama
CREATE INDEX idx_companies_name_trgm ON core.companies USING GIN (name gin_trgm_ops);

-- ------- indices -------
CREATE TABLE core.indices (
    code         VARCHAR(16) PRIMARY KEY,   -- 'LQ45', 'IDX30', 'IDX80', 'KOMPAS100', 'JII70', ...
    name         VARCHAR(120) NOT NULL,
    description  TEXT,
    methodology  TEXT,
    base_date    DATE,
    base_value   NUMERIC(20,4),
    rebalance_schedule VARCHAR(40),         -- 'Feb,Aug' atau cron-like
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------- index_constituents (time-aware versioning) -------
CREATE TABLE core.index_constituents (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    index_code      VARCHAR(16) NOT NULL REFERENCES core.indices(code),
    ticker          VARCHAR(8)  NOT NULL REFERENCES core.companies(ticker),
    weight          NUMERIC(8,6),
    effective_from  DATE NOT NULL,
    effective_to    DATE,                          -- NULL = still in index
    source          VARCHAR(40),                   -- 'BEI Rebalance Aug 2026'
    UNIQUE(index_code, ticker, effective_from)
);

CREATE INDEX idx_idx_const_current ON core.index_constituents(index_code, ticker)
    WHERE effective_to IS NULL;
CREATE INDEX idx_idx_const_ticker  ON core.index_constituents(ticker, index_code);
```

### 2.4 Core: Corporate Actions, Financials, Shareholders

```sql
-- ------- corporate_actions -------
CREATE TABLE core.corporate_actions (
    id             UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    ticker         VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    action_type    VARCHAR(24) NOT NULL,
                   -- 'dividend' | 'stock_split' | 'reverse_split' | 'rights_issue' | 'bonus_share'
                   -- | 'm_and_a' | 'rups' | 'tender_offer' | 'spin_off' | 'name_change'
    announcement_date DATE NOT NULL,
    record_date    DATE,
    cum_date       DATE,
    ex_date        DATE,
    payment_date   DATE,
    ratio_from     INT,                            -- contoh split 1:2 → from=1, to=2
    ratio_to       INT,
    cash_amount_cents BIGINT,                      -- untuk dividend per share (cents IDR)
    currency       CHAR(3) DEFAULT 'IDR',
    description    TEXT,
    source_url     TEXT,
    status         VARCHAR(16) DEFAULT 'announced',  -- 'announced' | 'effective' | 'canceled'
    metadata       JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ca_ticker_date ON core.corporate_actions(ticker, ex_date DESC);
CREATE INDEX idx_ca_type        ON core.corporate_actions(action_type, ex_date);
CREATE INDEX idx_ca_upcoming    ON core.corporate_actions(ex_date) WHERE ex_date >= CURRENT_DATE;

-- ------- dividends (denormalized snapshot untuk query cepat) -------
CREATE TABLE core.dividends (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    ticker        VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    fiscal_year   INT NOT NULL,
    dividend_type VARCHAR(16) NOT NULL,        -- 'final' | 'interim' | 'special'
    cum_date      DATE,
    ex_date       DATE,
    payment_date  DATE,
    amount_per_share_cents BIGINT NOT NULL,
    payout_ratio  NUMERIC(8,4),
    yield_at_announce NUMERIC(8,4),
    corporate_action_id UUID REFERENCES core.corporate_actions(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticker, fiscal_year, dividend_type, ex_date)
);

CREATE INDEX idx_dividends_ticker_year ON core.dividends(ticker, fiscal_year DESC);

-- ------- financial_statements_meta -------
CREATE TABLE core.financial_statements_meta (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    ticker          VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    period_type     VARCHAR(8) NOT NULL,          -- 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY'
    fiscal_year     INT NOT NULL,
    period_end_date DATE NOT NULL,
    statement_type  VARCHAR(16) NOT NULL,         -- 'income' | 'balance' | 'cashflow' | 'equity_change'
    is_audited      BOOLEAN NOT NULL DEFAULT FALSE,
    is_restated     BOOLEAN NOT NULL DEFAULT FALSE,
    currency        CHAR(3) NOT NULL DEFAULT 'IDR',
    unit            VARCHAR(16) NOT NULL DEFAULT 'rupiah',  -- 'rupiah' | 'million' | 'billion'
    source_url      TEXT,
    filed_at        TIMESTAMPTZ,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticker, period_type, fiscal_year, statement_type, is_restated)
);

CREATE INDEX idx_fsmeta_ticker_period ON core.financial_statements_meta(ticker, fiscal_year DESC, period_type);

-- ------- financial_line_items (long/EAV model) -------
-- Trade-off: EAV (long) vs Wide.
-- Pilih EAV karena:
--   1. Item akun bervariasi per company (banking vs manufacturing punya line items berbeda)
--   2. Mudah extend tanpa ALTER TABLE
--   3. Common-size & ratio engine bisa pivot di Polars/DuckDB (analytics-side)
-- Trade-off: query "single statement full" perlu pivot. Mitigasi: materialized view atau cache.
CREATE TABLE core.financial_line_items (
    id           UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    statement_id UUID NOT NULL REFERENCES core.financial_statements_meta(id) ON DELETE CASCADE,
    line_code    VARCHAR(64) NOT NULL,
                 -- contoh 'revenue', 'cogs', 'gross_profit', 'opex', 'ebit', 'net_income',
                 -- 'total_assets', 'cash_eq', 'short_term_debt', 'equity', etc.
    line_label_id VARCHAR(160),                    -- "Pendapatan Bersih"
    line_label_en VARCHAR(160),                    -- "Net Revenue"
    parent_code  VARCHAR(64),                      -- untuk hierarchy
    value_cents  BIGINT,                           -- IDR cents
    value_raw    NUMERIC(28,4),                    -- raw nilai (untuk non-monetary kalau dipakai)
    is_common_size_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order   INT,
    UNIQUE(statement_id, line_code)
);

CREATE INDEX idx_fli_statement      ON core.financial_line_items(statement_id);
CREATE INDEX idx_fli_line_code      ON core.financial_line_items(line_code);
-- composite untuk query "ROE 10 tahun BBRI": join via statement_id, filter line_code in (...)

-- ------- shareholders (KSEI ≥5% holder snapshot per quarter) -------
CREATE TABLE core.shareholders (
    id           UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    ticker       VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    snapshot_date DATE NOT NULL,
    holder_name  VARCHAR(200) NOT NULL,
    holder_type  VARCHAR(32),               -- 'institution' | 'individual' | 'government' | 'foundation'
    is_foreign   BOOLEAN,
    shares_count BIGINT NOT NULL,
    ownership_pct NUMERIC(8,5) NOT NULL,
    source       VARCHAR(40),               -- 'KSEI' | 'IDX_Annual_Report' | 'Manual'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticker, snapshot_date, holder_name)
);

CREATE INDEX idx_shareholders_ticker ON core.shareholders(ticker, snapshot_date DESC);

-- ------- insider_transactions -------
CREATE TABLE core.insider_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    ticker          VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    insider_name    VARCHAR(200) NOT NULL,
    insider_role    VARCHAR(80),             -- 'Komisaris', 'Direktur Utama', dst.
    transaction_type VARCHAR(16) NOT NULL,   -- 'buy' | 'sell' | 'grant' | 'exercise'
    transaction_date DATE NOT NULL,
    reported_date    DATE,
    shares_count     BIGINT NOT NULL,
    price_per_share_cents BIGINT,
    total_value_cents BIGINT,
    ownership_pct_after NUMERIC(8,5),
    source_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insider_ticker_date ON core.insider_transactions(ticker, transaction_date DESC);
```

### 2.5 Core: User Interaction (Watchlist, Alerts, Portfolio)

```sql
-- ------- watchlists -------
CREATE TABLE core.watchlists (
    id          UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id     UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    name        VARCHAR(80) NOT NULL,
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    color       VARCHAR(16),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_watchlists_user ON core.watchlists(user_id, sort_order);

-- ------- watchlist_items -------
CREATE TABLE core.watchlist_items (
    id           UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    watchlist_id UUID NOT NULL REFERENCES core.watchlists(id) ON DELETE CASCADE,
    ticker       VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    sort_order   INT NOT NULL DEFAULT 0,
    note         TEXT,
    added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(watchlist_id, ticker)
);

CREATE INDEX idx_watchlist_items_wl ON core.watchlist_items(watchlist_id, sort_order);

-- ------- alerts -------
CREATE TABLE core.alerts (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id         UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    ticker          VARCHAR(8) REFERENCES core.companies(ticker),
                    -- nullable: alert juga bisa untuk index atau global event
    alert_type      VARCHAR(32) NOT NULL,
                    -- 'price_above' | 'price_below' | 'pct_change' | 'volume_spike'
                    -- | 'rsi_cross' | 'ma_cross' | 'macd_signal'
                    -- | 'news_mention' | 'broker_accumulation' | 'fundamental_release'
    condition_json  JSONB NOT NULL,    -- {"operator":">","value":4500,"timeframe":"1d"} dst.
    channels        JSONB NOT NULL DEFAULT '["in_app","push"]',
    status          VARCHAR(16) NOT NULL DEFAULT 'active',
                    -- 'active' | 'paused' | 'triggered' | 'expired' | 'archived'
    trigger_once    BOOLEAN NOT NULL DEFAULT FALSE,
    cooldown_min    INT NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    trigger_count   INT NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_status ON core.alerts(user_id, status);
CREATE INDEX idx_alerts_ticker_active ON core.alerts(ticker, status) WHERE status = 'active';

-- ------- alert_triggers (history) -------
CREATE TABLE core.alert_triggers (
    id             UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    alert_id       UUID NOT NULL REFERENCES core.alerts(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL,
    triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger_value  JSONB,                    -- price / volume / news_id payload
    delivered_to   JSONB,                    -- ["in_app","push:firebase","wa"]
    delivery_status JSONB                    -- {"push":"sent","wa":"failed"}
) PARTITION BY RANGE (triggered_at);

CREATE INDEX idx_alerttrig_alert ON core.alert_triggers(alert_id, triggered_at DESC);
CREATE INDEX idx_alerttrig_user  ON core.alert_triggers(user_id, triggered_at DESC);

-- ------- portfolios -------
CREATE TABLE core.portfolios (
    id          UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id     UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    name        VARCHAR(80) NOT NULL,
    portfolio_type VARCHAR(16) NOT NULL DEFAULT 'manual',
                   -- 'manual' | 'paper' | 'broker_synced'
    base_currency CHAR(3) NOT NULL DEFAULT 'IDR',
    initial_cash_cents BIGINT NOT NULL DEFAULT 0,
    broker_account_ref VARCHAR(80),
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ------- portfolio_positions (current snapshot) -------
CREATE TABLE core.portfolio_positions (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    portfolio_id    UUID NOT NULL REFERENCES core.portfolios(id) ON DELETE CASCADE,
    ticker          VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    quantity        BIGINT NOT NULL,            -- lembar (1 lot = 100 lembar)
    avg_cost_cents  BIGINT NOT NULL,
    current_value_cents BIGINT,                  -- denormalized, refreshed batch
    unrealized_pnl_cents BIGINT,
    realized_pnl_cents BIGINT NOT NULL DEFAULT 0,
    first_buy_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(portfolio_id, ticker)
);

CREATE INDEX idx_positions_portfolio ON core.portfolio_positions(portfolio_id);

-- ------- portfolio_transactions -------
CREATE TABLE core.portfolio_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    portfolio_id    UUID NOT NULL REFERENCES core.portfolios(id) ON DELETE CASCADE,
    ticker          VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    txn_type        VARCHAR(16) NOT NULL,        -- 'buy' | 'sell' | 'dividend' | 'split_adj' | 'rights' | 'fee'
    quantity        BIGINT,
    price_cents     BIGINT,
    total_cents     BIGINT NOT NULL,
    fee_cents       BIGINT NOT NULL DEFAULT 0,
    tax_cents       BIGINT NOT NULL DEFAULT 0,
    executed_at     TIMESTAMPTZ NOT NULL,
    broker_code     VARCHAR(8),
    note            TEXT,
    source          VARCHAR(16) NOT NULL DEFAULT 'manual',  -- 'manual' | 'csv_import' | 'broker_sync'
    external_ref    VARCHAR(80),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pftxn_portfolio ON core.portfolio_transactions(portfolio_id, executed_at DESC);
CREATE INDEX idx_pftxn_ticker    ON core.portfolio_transactions(ticker, executed_at DESC);
```

### 2.6 Core: Daily Picks Engine

```sql
-- ------- daily_picks -------
CREATE TABLE core.daily_picks (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    pick_date       DATE NOT NULL,
    ticker          VARCHAR(8) NOT NULL REFERENCES core.companies(ticker),
    setup_type      VARCHAR(24) NOT NULL,
                    -- 'continuation' | 'reversal' | 'breakout' | 'pullback' | 'range'
    time_horizon    VARCHAR(16) NOT NULL,
                    -- 'intraday' | 'swing_3_5d' | 'swing_1_3w' | 'position_1_3m'
    entry_low_cents  BIGINT NOT NULL,
    entry_high_cents BIGINT NOT NULL,
    support_cents    BIGINT,
    resistance_cents BIGINT,
    stop_loss_cents  BIGINT NOT NULL,
    tp1_cents        BIGINT NOT NULL,
    tp2_cents        BIGINT,
    tp3_cents        BIGINT,
    reward_risk_ratio NUMERIC(6,3) NOT NULL,
    confidence_score NUMERIC(5,2),               -- 0–100
    score_breakdown  JSONB,                       -- {"technical":28,"bandar":22,...}
    regime_tag       VARCHAR(16),                 -- 'bull' | 'bear' | 'range'
    narrative_id     UUID,                        -- FK ke ai_messages atau dedicated narrative table
    narrative_text   TEXT,                        -- short blurb
    factor_tags      TEXT[],                      -- ['high_foreign_inflow','golden_cross','volume_spike']
    risk_flags       TEXT[],                      -- ['low_liquidity','earnings_in_3d']
    published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ,                 -- biasanya horizon-aware
    tier_visibility  VARCHAR(16) NOT NULL DEFAULT 'starter',
                                                  -- min tier yang boleh lihat
    UNIQUE(pick_date, ticker, setup_type)
);

CREATE INDEX idx_picks_date         ON core.daily_picks(pick_date DESC);
CREATE INDEX idx_picks_ticker_date  ON core.daily_picks(ticker, pick_date DESC);
CREATE INDEX idx_picks_setup_date   ON core.daily_picks(setup_type, pick_date DESC);
CREATE INDEX idx_picks_tier         ON core.daily_picks(tier_visibility, pick_date DESC);

-- ------- daily_pick_outcomes -------
CREATE TABLE core.daily_pick_outcomes (
    pick_id          UUID PRIMARY KEY REFERENCES core.daily_picks(id) ON DELETE CASCADE,
    t_plus_1_return  NUMERIC(8,5),
    t_plus_5_return  NUMERIC(8,5),
    t_plus_20_return NUMERIC(8,5),
    max_favorable_excursion NUMERIC(8,5),
    max_adverse_excursion   NUMERIC(8,5),
    hit_tp1          BOOLEAN,
    hit_tp2          BOOLEAN,
    hit_tp3          BOOLEAN,
    hit_sl           BOOLEAN,
    exit_reason      VARCHAR(24),    -- 'tp1' | 'tp2' | 'tp3' | 'sl' | 'time_out' | 'manual'
    exit_price_cents BIGINT,
    exit_at          TIMESTAMPTZ,
    realized_r       NUMERIC(6,3),    -- actual R multiple
    evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pickoutcome_eval ON core.daily_pick_outcomes(evaluated_at);

-- ------- picks_subscriptions (user push preferences) -------
CREATE TABLE core.picks_subscriptions (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id       UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    setup_types   TEXT[],         -- which setups they want pushed
    time_horizons TEXT[],
    min_confidence NUMERIC(5,2),
    channels      JSONB NOT NULL DEFAULT '["in_app","push"]',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);
```

### 2.7 Core: Research, News, AI

```sql
-- ------- research_reports -------
CREATE TABLE core.research_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    source_securities   VARCHAR(80) NOT NULL,    -- 'BRI Danareksa' | 'Mandiri Sekuritas' | ...
    ticker              VARCHAR(8) REFERENCES core.companies(ticker),
    title               VARCHAR(400) NOT NULL,
    rating              VARCHAR(16),              -- 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
    target_price_cents  BIGINT,
    previous_target_price_cents BIGINT,
    period_horizon      VARCHAR(16),              -- '12m' | '6m' | '24m'
    report_date         DATE NOT NULL,
    published_at        TIMESTAMPTZ NOT NULL,
    analyst_name        VARCHAR(120),
    pdf_url             TEXT,                     -- public source URL
    storage_url         TEXT,                     -- Cloudflare R2 path
    summary_id          TEXT,                     -- bahasa Indonesia summary (LLM)
    summary_en          TEXT,
    key_thesis          JSONB,                    -- structured bullet list
    key_risks           JSONB,
    raw_text_hash       CHAR(64),                 -- SHA-256 untuk dedup
    legal_status        VARCHAR(16) NOT NULL DEFAULT 'public',
                        -- 'public' | 'licensed' | 'partner' | 'restricted'
    is_published        BOOLEAN NOT NULL DEFAULT TRUE,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata            JSONB
);

CREATE INDEX idx_research_ticker_date ON core.research_reports(ticker, published_at DESC) WHERE is_published;
CREATE INDEX idx_research_source_date ON core.research_reports(source_securities, published_at DESC);
CREATE INDEX idx_research_rating      ON core.research_reports(rating, published_at DESC);
CREATE UNIQUE INDEX uniq_research_hash ON core.research_reports(raw_text_hash) WHERE raw_text_hash IS NOT NULL;

-- ------- research_consensus (denormalized per ticker, refreshed daily) -------
CREATE TABLE core.research_consensus (
    ticker             VARCHAR(8) PRIMARY KEY REFERENCES core.companies(ticker),
    consensus_rating   NUMERIC(3,2),       -- 1.00 (strong sell) – 5.00 (strong buy)
    count_strong_buy   INT NOT NULL DEFAULT 0,
    count_buy          INT NOT NULL DEFAULT 0,
    count_hold         INT NOT NULL DEFAULT 0,
    count_sell         INT NOT NULL DEFAULT 0,
    count_strong_sell  INT NOT NULL DEFAULT 0,
    target_price_median_cents BIGINT,
    target_price_mean_cents   BIGINT,
    target_price_min_cents    BIGINT,
    target_price_max_cents    BIGINT,
    target_price_stddev       NUMERIC(20,4),
    analyst_count      INT NOT NULL DEFAULT 0,
    last_report_at     TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------- news_articles -------
CREATE TABLE core.news_articles (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    source          VARCHAR(80) NOT NULL,       -- 'Kontan' | 'Bisnis.com' | 'CNBC Indonesia' | ...
    source_article_id VARCHAR(128),
    url             TEXT NOT NULL,
    title           VARCHAR(400) NOT NULL,
    author          VARCHAR(160),
    body_storage_url TEXT,                       -- R2 path (full body, kalau diizinkan)
    summary_id      TEXT,
    ticker_mentions TEXT[],                      -- ['BBRI','BMRI']
    sector_mentions TEXT[],
    sentiment_score NUMERIC(5,3),                -- -1.000 to +1.000
    sentiment_label VARCHAR(16),                 -- 'very_negative'...'very_positive'
    relevance_score NUMERIC(4,3),
    category        VARCHAR(40),                  -- 'corporate' | 'macro' | 'commodity' | ...
    language        CHAR(2) NOT NULL DEFAULT 'id',
    published_at    TIMESTAMPTZ NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    url_hash        CHAR(64) NOT NULL,
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(url_hash)
);

CREATE INDEX idx_news_published    ON core.news_articles(published_at DESC) WHERE is_published;
CREATE INDEX idx_news_tickers_gin  ON core.news_articles USING GIN(ticker_mentions);
CREATE INDEX idx_news_source       ON core.news_articles(source, published_at DESC);
CREATE INDEX idx_news_sentiment    ON core.news_articles(sentiment_label, published_at DESC);

-- ------- ai_conversations -------
CREATE TABLE core.ai_conversations (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id       UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    title         VARCHAR(200),
    model_default VARCHAR(40) NOT NULL DEFAULT 'claude-sonnet-4-6',
    context_tags  TEXT[],                       -- ['ticker:BBRI','setup:fundamental']
    is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_user ON core.ai_conversations(user_id, updated_at DESC) WHERE NOT is_archived;

-- ------- ai_messages (partitioned by month) -------
CREATE TABLE core.ai_messages (
    id                 UUID NOT NULL DEFAULT gen_uuid_v7(),
    conversation_id    UUID NOT NULL REFERENCES core.ai_conversations(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL,
    role               VARCHAR(16) NOT NULL,      -- 'user' | 'assistant' | 'system' | 'tool'
    content            TEXT NOT NULL,
    content_structured JSONB,                      -- structured output (card, chart annotation)
    model              VARCHAR(40),
    prompt_tokens      INT,
    completion_tokens  INT,
    cached_tokens      INT,                        -- prompt cache hit
    cost_micro_usd     BIGINT,                     -- USD micros (1USD = 1_000_000)
    citations          JSONB,                      -- [{"source_type":"research","id":"..."}]
    parent_message_id  UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_aimsg_conv  ON core.ai_messages(conversation_id, created_at);
CREATE INDEX idx_aimsg_user  ON core.ai_messages(user_id, created_at DESC);

-- ------- ai_tool_calls -------
CREATE TABLE core.ai_tool_calls (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    message_id      UUID NOT NULL,
    message_created_at TIMESTAMPTZ NOT NULL,
    tool_name       VARCHAR(80) NOT NULL,    -- 'get_quote' | 'screen_stocks' | ...
    arguments       JSONB,
    result          JSONB,
    duration_ms     INT,
    status          VARCHAR(16) NOT NULL,    -- 'success' | 'error' | 'timeout'
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aitool_message ON core.ai_tool_calls(message_id);
CREATE INDEX idx_aitool_name    ON core.ai_tool_calls(tool_name, created_at DESC);
```

### 2.8 Core: Backtest, Strategies, Notifications, Audit

```sql
-- ------- strategies (no-code & scripted) -------
CREATE TABLE core.strategies (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id       UUID REFERENCES iam.users(id) ON DELETE CASCADE,
                  -- NULL = strategi publik milik tim
    name          VARCHAR(120) NOT NULL,
    description   TEXT,
    definition_json JSONB NOT NULL,    -- DSL graph / atau pine-like serialized
    script_language VARCHAR(16),         -- 'no_code' | 'pine_like' | 'python'
    script_source TEXT,
    visibility    VARCHAR(16) NOT NULL DEFAULT 'private',  -- 'private' | 'shared' | 'marketplace'
    is_published  BOOLEAN NOT NULL DEFAULT FALSE,
    version       INT NOT NULL DEFAULT 1,
    parent_id     UUID REFERENCES core.strategies(id),    -- fork lineage
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategies_user      ON core.strategies(user_id);
CREATE INDEX idx_strategies_marketpl  ON core.strategies(visibility) WHERE visibility = 'marketplace';

-- ------- backtests -------
CREATE TABLE core.backtests (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id         UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    strategy_id     UUID REFERENCES core.strategies(id),
    name            VARCHAR(160),
    params_json     JSONB NOT NULL,    -- universe, timeframe, fees, slippage
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    universe        TEXT[],             -- ticker list / 'IDX80' / 'ALL'
    initial_capital_cents BIGINT NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'queued',
                    -- 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    results_summary JSONB,    -- {"cagr":...,"sharpe":...,"max_dd":...,"win_rate":...,"trades":120}
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtests_user ON core.backtests(user_id, created_at DESC);
CREATE INDEX idx_backtests_strat ON core.backtests(strategy_id);

-- ------- notifications -------
CREATE TABLE core.notifications (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id       UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    channel       VARCHAR(16) NOT NULL,    -- 'in_app' | 'push' | 'email' | 'wa' | 'tg'
    notif_type    VARCHAR(40) NOT NULL,    -- 'alert' | 'pick' | 'news' | 'billing' | 'system'
    title         VARCHAR(200) NOT NULL,
    body          TEXT,
    payload       JSONB,                    -- deeplink, ticker, etc
    status        VARCHAR(16) NOT NULL DEFAULT 'pending',
                  -- 'pending' | 'sent' | 'failed' | 'delivered' | 'read'
    provider_ref  VARCHAR(160),              -- e.g. Firebase msg ID, Twilio SID
    sent_at       TIMESTAMPTZ,
    delivered_at  TIMESTAMPTZ,
    read_at       TIMESTAMPTZ,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_notif_user_unread ON core.notifications(user_id) WHERE read_at IS NULL AND channel='in_app';
CREATE INDEX idx_notif_user_recent ON core.notifications(user_id, created_at DESC);

-- ------- audit_logs (compliance) -------
CREATE TABLE core.audit_logs (
    id            UUID NOT NULL DEFAULT gen_uuid_v7(),
    actor_type    VARCHAR(16) NOT NULL,    -- 'user' | 'admin' | 'system'
    actor_id      UUID,
    action        VARCHAR(80) NOT NULL,    -- 'login' | 'subscription.upgrade' | 'export.portfolio' | ...
    entity_type   VARCHAR(40),
    entity_id     VARCHAR(64),
    ip_address    INET,
    user_agent    TEXT,
    metadata      JSONB,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX idx_audit_actor    ON core.audit_logs(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_action   ON core.audit_logs(action, occurred_at DESC);
CREATE INDEX idx_audit_entity   ON core.audit_logs(entity_type, entity_id);
```

### 2.9 Analytics: Feature Flags, API Keys

```sql
CREATE SCHEMA IF NOT EXISTS analytics;

-- ------- feature_flags_user_overrides -------
CREATE TABLE analytics.feature_flags_user_overrides (
    id           UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id      UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    flag_key     VARCHAR(80) NOT NULL,
    value        JSONB NOT NULL,
    reason       VARCHAR(160),
    created_by   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ,
    UNIQUE(user_id, flag_key)
);

-- ------- api_keys (Tier Elite read-only API) -------
CREATE TABLE analytics.api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id       UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    key_hash      CHAR(64) NOT NULL UNIQUE,    -- SHA-256 of raw key
    key_prefix    CHAR(8) NOT NULL,              -- first 8 chars for display
    name          VARCHAR(80),
    scopes        TEXT[] NOT NULL,                 -- ['read:quotes','read:fundamentals']
    rate_limit_per_min INT NOT NULL DEFAULT 60,
    last_used_at  TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apikeys_user ON analytics.api_keys(user_id) WHERE revoked_at IS NULL;
```

---

## 3. QuestDB Schema (Time-Series)

QuestDB tabel pakai `PARTITION BY` & `DEDUP UPSERT KEYS` (deduplikasi native). Untuk financial tick, kunci umum: `(ts, ticker)` atau `(ts, ticker, broker_code)`.

### 3.1 Tick & OHLCV

```sql
-- ------- quotes_tick (Level-1 trade tick) -------
CREATE TABLE quotes_tick (
    ts          TIMESTAMP,
    ticker      SYMBOL CAPACITY 1024 CACHE INDEX,
    price       DOUBLE,
    volume      LONG,
    side        SYMBOL CAPACITY 4 CACHE,   -- 'buy' | 'sell' | 'auction' | 'cross'
    bid         DOUBLE,
    ask         DOUBLE,
    bid_size    LONG,
    ask_size    LONG,
    seq         LONG,
    vendor      SYMBOL CAPACITY 8 CACHE     -- 'invezgo' | 'ohlc' | 'idx'
) TIMESTAMP(ts) PARTITION BY DAY WAL DEDUP UPSERT KEYS(ts, ticker, seq);

-- ------- quotes_ohlcv_1m -------
CREATE TABLE quotes_ohlcv_1m (
    ts          TIMESTAMP,
    ticker      SYMBOL CAPACITY 1024 CACHE INDEX,
    open        DOUBLE, high DOUBLE, low DOUBLE, close DOUBLE,
    volume      LONG,
    value       DOUBLE,             -- nilai Rp (volume × harga rata-rata)
    trade_count INT,
    vwap        DOUBLE
) TIMESTAMP(ts) PARTITION BY DAY WAL DEDUP UPSERT KEYS(ts, ticker);

CREATE TABLE quotes_ohlcv_5m  (LIKE quotes_ohlcv_1m, TIMESTAMP(ts)) PARTITION BY DAY WAL DEDUP UPSERT KEYS(ts, ticker);
CREATE TABLE quotes_ohlcv_15m (LIKE quotes_ohlcv_1m, TIMESTAMP(ts)) PARTITION BY WEEK WAL DEDUP UPSERT KEYS(ts, ticker);
CREATE TABLE quotes_ohlcv_1h  (LIKE quotes_ohlcv_1m, TIMESTAMP(ts)) PARTITION BY MONTH WAL DEDUP UPSERT KEYS(ts, ticker);
CREATE TABLE quotes_ohlcv_1d  (LIKE quotes_ohlcv_1m, TIMESTAMP(ts)) PARTITION BY YEAR WAL DEDUP UPSERT KEYS(ts, ticker);
```

**Catatan downsampling:** ingestor menerima `quotes_tick`, lalu *aggregation job* (Polars worker tiap menit) produce `quotes_ohlcv_1m`; 1m→5m→15m→1h→1d secara *cascade*. Alternatif: QuestDB *materialized views* (jika versi mendukung).

### 3.2 Broker & Foreign Flow

```sql
-- ------- broker_summary_daily -------
CREATE TABLE broker_summary_daily (
    ts            TIMESTAMP,             -- date (UTC 00:00 of trading day)
    ticker        SYMBOL CAPACITY 1024 CACHE INDEX,
    broker_code   SYMBOL CAPACITY 256  CACHE INDEX,
    side          SYMBOL CAPACITY 2 CACHE,    -- 'buy' | 'sell'
    volume        LONG,
    value         DOUBLE,
    avg_price     DOUBLE,
    trade_count   INT,
    is_foreign    BOOLEAN
) TIMESTAMP(ts) PARTITION BY MONTH WAL DEDUP UPSERT KEYS(ts, ticker, broker_code, side);

-- ------- foreign_flow_intraday (resolusi 5m / 15m / 1h) -------
CREATE TABLE foreign_flow_intraday (
    ts          TIMESTAMP,
    ticker      SYMBOL CAPACITY 1024 CACHE INDEX,
    granularity SYMBOL CAPACITY 8 CACHE,    -- '5m' | '15m' | '1h'
    net_value   DOUBLE,
    buy_value   DOUBLE,
    sell_value  DOUBLE,
    net_volume  LONG
) TIMESTAMP(ts) PARTITION BY DAY WAL DEDUP UPSERT KEYS(ts, ticker, granularity);

-- ------- foreign_flow_daily -------
CREATE TABLE foreign_flow_daily (
    ts          TIMESTAMP,
    ticker      SYMBOL CAPACITY 1024 CACHE INDEX,
    net_value   DOUBLE,
    buy_value   DOUBLE,
    sell_value  DOUBLE,
    net_volume  LONG,
    cumulative_5d  DOUBLE,
    cumulative_20d DOUBLE
) TIMESTAMP(ts) PARTITION BY YEAR WAL DEDUP UPSERT KEYS(ts, ticker);
```

### 3.3 Order Book

```sql
-- ------- order_book_l1 (best bid/ask snapshot) -------
CREATE TABLE order_book_l1 (
    ts         TIMESTAMP,
    ticker     SYMBOL CAPACITY 1024 CACHE INDEX,
    bid        DOUBLE, bid_size LONG,
    ask        DOUBLE, ask_size LONG,
    spread     DOUBLE
) TIMESTAMP(ts) PARTITION BY DAY WAL;

-- ------- order_book_l2_snapshots (sampled, Pro+) -------
-- Disimpan tiap 1 detik atau saat ada perubahan signifikan (top 10 level)
CREATE TABLE order_book_l2_snapshots (
    ts         TIMESTAMP,
    ticker     SYMBOL CAPACITY 1024 CACHE INDEX,
    bid_prices  DOUBLE[],   -- 10 best bids
    bid_sizes   LONG[],
    ask_prices  DOUBLE[],   -- 10 best asks
    ask_sizes   LONG[],
    imbalance   DOUBLE      -- (sum_bid_size - sum_ask_size) / total
) TIMESTAMP(ts) PARTITION BY DAY WAL;
-- Catatan: array kolom dipakai untuk efisiensi storage (1 row vs 20 row)
```

### 3.4 Indices & Macro

```sql
-- ------- index_values -------
CREATE TABLE index_values (
    ts         TIMESTAMP,
    index_code SYMBOL CAPACITY 64 CACHE INDEX,
    value      DOUBLE,
    change_pct DOUBLE,
    volume     LONG,
    market_cap DOUBLE
) TIMESTAMP(ts) PARTITION BY MONTH WAL DEDUP UPSERT KEYS(ts, index_code);

-- ------- macro_indicators -------
CREATE TABLE macro_indicators (
    ts          TIMESTAMP,
    indicator   SYMBOL CAPACITY 64 CACHE INDEX,
                -- 'bi_rate' | 'cpi_yoy' | 'usdidr' | 'dxy' | 'us10y' | 'crude_brent' | 'cpo' | ...
    value       DOUBLE,
    unit        SYMBOL CAPACITY 16 CACHE,
    source      SYMBOL CAPACITY 16 CACHE
) TIMESTAMP(ts) PARTITION BY YEAR WAL DEDUP UPSERT KEYS(ts, indicator);
```

### 3.5 ASOF JOIN Use Cases

QuestDB *killer feature* untuk Nubuat:

- **Sinkronisasi tick lintas ticker** (untuk pair trading, sector heatmap intraday):
  ```sql
  SELECT a.ts, a.ticker, a.price AS bbri_price, b.price AS bmri_price
  FROM   (quotes_tick WHERE ticker='BBRI') a
  ASOF JOIN (quotes_tick WHERE ticker='BMRI') b;
  ```
- **Foreign flow saat tick terjadi**:
  ```sql
  SELECT t.ts, t.ticker, t.price, f.net_value
  FROM quotes_tick t
  ASOF JOIN foreign_flow_intraday f
       ON (t.ticker, f.granularity='5m');
  ```
- **Broker summary nyusul ke harga close-of-day** untuk Bandarmology.

### 3.6 Retention QuestDB

| Tabel | Hot retention | Archive (ke R2 Parquet) |
|---|---|---|
| `quotes_tick` | 90 hari | seterusnya (cold) |
| `quotes_ohlcv_1m` | 1 tahun | seterusnya |
| `quotes_ohlcv_5m` | 2 tahun | seterusnya |
| `quotes_ohlcv_15m` | 3 tahun | seterusnya |
| `quotes_ohlcv_1h` | 5 tahun | full |
| `quotes_ohlcv_1d` | 15+ tahun | full (semua) |
| `broker_summary_daily` | 5 tahun | seterusnya |
| `foreign_flow_intraday` | 1 tahun | seterusnya |
| `foreign_flow_daily` | 10+ tahun | full |
| `order_book_l1` | 30 hari | seterusnya |
| `order_book_l2_snapshots` | 14 hari | seterusnya |
| `index_values` | full | full |
| `macro_indicators` | full | full |

Archive job: nightly DETACH partition lama → upload ke R2 sebagai Parquet → DELETE FROM QuestDB → restore on-demand via DuckDB query saat backtest butuh historical jauh.

---

## 4. ClickHouse Schema (Analytics Aggregates)

ClickHouse dipakai untuk **read-heavy aggregation** yang tidak cocok di QuestDB (kompleks group-by lintas dimensi) dan **lebih murah** dari menjalankan agregasi langsung di OLTP.

```sql
-- ------- backtest_trades (per trade detail) -------
CREATE TABLE ch.backtest_trades (
    backtest_id  UUID,
    user_id      UUID,
    strategy_id  UUID,
    ticker       LowCardinality(String),
    side         LowCardinality(String),
    entry_ts     DateTime64(3, 'Asia/Jakarta'),
    exit_ts      DateTime64(3, 'Asia/Jakarta'),
    entry_price  Float64,
    exit_price   Float64,
    quantity     Int64,
    pnl_cents    Int64,
    return_pct   Float64,
    holding_days UInt16
) ENGINE = MergeTree
ORDER BY (backtest_id, entry_ts);

-- ------- backtest_summary_mv (materialized view) -------
CREATE MATERIALIZED VIEW ch.backtest_summary_mv
ENGINE = AggregatingMergeTree
ORDER BY (backtest_id) AS
SELECT
    backtest_id,
    countState()                                  AS trades_state,
    sumState(pnl_cents)                           AS pnl_state,
    avgState(return_pct)                          AS avg_return_state,
    sumState(if(pnl_cents > 0, 1, 0))             AS wins_state
FROM ch.backtest_trades
GROUP BY backtest_id;

-- ------- user_behavior_events -------
CREATE TABLE ch.user_behavior_events (
    event_id       UUID,
    user_id        UUID,
    session_id     UUID,
    event_type     LowCardinality(String),  -- 'view_ticker' | 'add_watchlist' | 'set_alert' | 'ai_query' | ...
    ticker         LowCardinality(String),
    surface        LowCardinality(String),  -- 'web' | 'ios' | 'android' | 'desktop'
    payload        String,                   -- JSON
    occurred_at    DateTime64(3, 'Asia/Jakarta')
) ENGINE = MergeTree
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at)
TTL occurred_at + INTERVAL 13 MONTH;

-- ------- engagement_per_ticker_mv -------
CREATE MATERIALIZED VIEW ch.engagement_per_ticker_mv
ENGINE = SummingMergeTree
ORDER BY (ticker, toDate(occurred_at)) AS
SELECT
    ticker,
    toDate(occurred_at) AS day,
    countIf(event_type='view_ticker')   AS views,
    countIf(event_type='add_watchlist') AS adds,
    countIf(event_type='ai_query')      AS ai_queries,
    uniqExact(user_id)                  AS unique_users
FROM ch.user_behavior_events
GROUP BY ticker, day;

-- ------- daily_picks_performance (track record per setup type) -------
CREATE TABLE ch.daily_picks_performance (
    pick_id      UUID,
    pick_date    Date,
    ticker       LowCardinality(String),
    setup_type   LowCardinality(String),
    time_horizon LowCardinality(String),
    confidence   Float32,
    t_plus_1     Float32,
    t_plus_5     Float32,
    t_plus_20    Float32,
    hit_tp1      UInt8,
    hit_sl       UInt8,
    realized_r   Float32
) ENGINE = MergeTree
PARTITION BY toYYYYMM(pick_date)
ORDER BY (setup_type, pick_date, ticker);

CREATE MATERIALIZED VIEW ch.daily_picks_hitrate_mv
ENGINE = AggregatingMergeTree
ORDER BY (setup_type, time_horizon, toYearMonth(pick_date)) AS
SELECT
    setup_type, time_horizon, toYearMonth(pick_date) AS ym,
    countState()                       AS picks_state,
    avgState(realized_r)               AS avg_r_state,
    sumState(toFloat32(hit_tp1))       AS hits_state,
    avgState(t_plus_5)                 AS avg_t5_state
FROM ch.daily_picks_performance
GROUP BY setup_type, time_horizon, ym;

-- ------- broker_performance_attribution -------
CREATE TABLE ch.broker_performance_attribution (
    broker_code  LowCardinality(String),
    ticker       LowCardinality(String),
    flow_date    Date,
    net_value    Float64,
    fwd_return_5d  Float32,
    fwd_return_20d Float32,
    is_lead_indicator UInt8
) ENGINE = MergeTree
PARTITION BY toYYYYMM(flow_date)
ORDER BY (broker_code, flow_date);
```

**Pipeline:** QuestDB → nightly export → ClickHouse via S3 Parquet + `INSERT INTO ... SELECT FROM s3(...)`. User behavior dialirkan langsung via Kafka/NATS → ClickHouse `Kafka` engine.

---

## 5. pgvector / Qdrant Schema (Embeddings)

Embeddings disimpan **bersama metadata di Postgres** (pgvector) sampai >10jt vector, lalu migrate ke Qdrant.

**Embedding model:** `text-embedding-3-small` (OpenAI) atau `voyage-3-lite` (1024 dim) — disesuaikan harga & quality. **Default: 1024 dim**, distance metric **cosine**.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- ------- research_embeddings -------
CREATE TABLE core.research_embeddings (
    id           UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    report_id    UUID NOT NULL REFERENCES core.research_reports(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    chunk_text   TEXT NOT NULL,
    embedding    vector(1024) NOT NULL,
    token_count  INT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(report_id, chunk_index)
);

CREATE INDEX idx_research_emb_hnsw ON core.research_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ------- news_embeddings -------
CREATE TABLE core.news_embeddings (
    id           UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    article_id   UUID NOT NULL REFERENCES core.news_articles(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL DEFAULT 0,
    chunk_text   TEXT NOT NULL,
    embedding    vector(1024) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,        -- duplikat untuk filter cepat
    ticker_mentions TEXT[],
    UNIQUE(article_id, chunk_index)
);

CREATE INDEX idx_news_emb_hnsw ON core.news_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_news_emb_published ON core.news_embeddings(published_at DESC);

-- ------- ai_context_embeddings (user-specific context, RAG memory) -------
CREATE TABLE core.ai_context_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id         UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES core.ai_conversations(id) ON DELETE CASCADE,
    source_type     VARCHAR(24) NOT NULL,   -- 'message_summary' | 'user_pref' | 'watchlist_context'
    source_ref      VARCHAR(64),
    chunk_text      TEXT NOT NULL,
    embedding       vector(1024) NOT NULL,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aictx_user_hnsw ON core.ai_context_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_aictx_user_exp ON core.ai_context_embeddings(user_id) WHERE expires_at IS NULL OR expires_at > NOW();
```

**HNSW params justification:**
- `m=16` — koneksi per node, balance recall vs memory (default umumnya 16).
- `ef_construction=64` — bangun graf lebih akurat; query time set `SET hnsw.ef_search = 100` untuk recall ~0.97 di 10jt vektor.
- **Cosine** dipilih karena embedding text biasanya normalized; lebih intuitif.

**Migrasi ke Qdrant** (trigger): saat dataset >10jt vector ATAU p95 query >150ms. Collection per use case (`research`, `news`, `ai_context`), payload include `ticker_mentions`, `published_at`, `report_id` untuk filtering server-side.

---

## 6. Redis Namespace & Key Design

Redis dipakai untuk **low-latency cache, rate limiting, session, idempotency, leaderboard, pub/sub fanout**. Single Redis Cluster (6 node, 3 master + 3 replica) di Jakarta, max-memory policy `allkeys-lru` untuk cache namespace, `noeviction` untuk session/idempotency.

### 6.1 Key Map

| Namespace | Key pattern | TTL | Eviction | Use case |
|---|---|---|---|---|
| **Session** | `sess:{user_id}:{session_id}` → Hash | 30d sliding | noeviction | server-side session metadata (refresh token meta, device) |
| **Auth refresh** | `rt:{token_hash}` → user_id | 30d | noeviction | refresh token reverse-lookup |
| **Hot quote (last price)** | `q:last:{ticker}` → Hash{price,ts,bid,ask,volume_today} | 5s (refresh continuously) | allkeys-lru | quote serving sub-10ms |
| **Quote snapshot OHLCV 1m** | `q:1m:{ticker}` → list (ring buffer 240) | 1h | allkeys-lru | intraday chart bootstrap |
| **Watchlist quote bundle** | `wl:bundle:{watchlist_id}` → Hash{ticker→price_json} | 10s | allkeys-lru | serve seluruh watchlist sekali request |
| **Rate limit (per user)** | `rl:user:{user_id}:{endpoint}:{minute_bucket}` → counter | 60s | allkeys-lru | sliding window rate limiter |
| **Rate limit AI** | `rl:ai:{user_id}:{day}` → counter (max tier-based) | 26h | noeviction | enforce AI query quota |
| **Token bucket** | `tb:{user_id}:{resource}` → Hash{tokens, last_refill} | 1h | noeviction | smooth rate limit |
| **Idempotency** | `idem:{key}` → Hash{status, response_hash} | 24h | noeviction | payment / write idempotency |
| **Leaderboard** | `lb:paper:roi:{period}` → ZSet (member=user_id, score=roi_bps) | 7d | noeviction | paper trading leaderboard |
| **Daily picks cache** | `picks:{date}:{tier}` → JSON string | until next pick batch | allkeys-lru | serve sama untuk semua user tier |
| **Sentiment cache** | `sent:{ticker}:24h` → JSON | 5m | allkeys-lru | aggregated news sentiment |
| **AI prompt cache key** | `aipc:{template_version}:{ticker}` → cache_ref_id | 12h | allkeys-lru | bantu Anthropic prompt cache reuse logic |
| **WebSocket subscriber map** | `ws:subs:{ticker}` → Set of session_id | session lifetime | noeviction | fanout pub/sub broadcast |
| **Pub/Sub channel** | `chan:tick:{ticker}` (pub/sub) | — | — | real-time push ke WS Hub |
| **Lock (distributed)** | `lock:{resource}` → owner | 30s (renew) | noeviction | Redlock untuk job exclusivity |
| **Feature flag (eval cache)** | `ff:{user_id}` → Hash{flag→value} | 5m | allkeys-lru | sebelum hit Postgres |
| **Search ticker cache** | `search:ticker:{q}` → JSON | 1h | allkeys-lru | autocomplete result |
| **Onboarding state** | `onb:{user_id}` → Hash | 7d | allkeys-lru | wizard progress |
| **OTP** | `otp:{phone_hash}` → code | 5m | noeviction | login/MFA SMS |

### 6.2 Konvensi
- Prefiks pendek (`q:`, `rl:`) untuk hemat memory karena cluster mode.
- Hash daripada flat keys di mana banyak field saling terkait → save RAM via *ziplist* encoding.
- ZSet untuk leaderboard & top-mover (`top:movers:1d` updated tiap 5m via job).
- Pub/Sub *fan-out only* (tidak persistent) — yang persistent pakai Redis Streams (`stream:ticks`) untuk konsumsi delayed.

### 6.3 Eviction Policy per DB
Redis Cluster di-set logical separation pakai **prefix** (bukan multi-DB karena cluster mode tidak support `SELECT`). Two cluster instances:
- **Cluster A (volatile cache):** policy `allkeys-lru`, max 24GB.
- **Cluster B (durable session/idempotency):** policy `noeviction`, max 8GB, AOF every-sec.

---

## 7. Entity-Relationship Diagram (ASCII)

Notasi cardinality: `||--o{` = one to many, `||--||` = one to one, `}o--o{` = many to many (via junction).

### 7.1 Cluster A — User / Auth / Subscription / Billing

```
                                                  ┌──────────────────────┐
                                                  │ iam.oauth_accounts   │
                                                  │ (id, user_id PK→users│
                                                  │  provider,           │
                                                  │  provider_acct_id)   │
                                                  └────────▲─────────────┘
                                                           │ N
                                                           │ 1
                ┌──────────────────────┐         ┌─────────┴──────────┐
                │ iam.user_profiles    │ 1     1 │   iam.users         │ 1
                │ (user_id PK→users)   ├─────────┤   id (UUIDv7)       ├──────┐
                │  risk_profile,       │         │   email (uniq)      │      │ N
                │  experience_level,   │         │   referral_code     │      │
                │  notif_channels JSON │         │   referred_by ────┐ │      │
                └──────────────────────┘         └─────────┬──────────┘ │      │
                                                           │ 1          │      │
                                              ┌────────────┤            │ N    │
                                              │ N          │ N          │      │ N
                                  ┌───────────┴────────┐ ┌─┴──────────┐ │ ┌────┴───────────────┐
                                  │ iam.auth_sessions  │ │iam.mfa_    │ │ │ billing.referrals  │
                                  │ refresh_token_hash │ │  factors   │ │ │ referrer_id  ─────┘
                                  │ device_fingerprint │ │ totp/      │ │ │ referee_id  (uniq)│
                                  │ ip, expires_at     │ │ webauthn   │ │ │ reward_status     │
                                  └────────────────────┘ └────────────┘ │ └───────────────────┘
                                                                        │
                                                                        │ 1
                                                                        │
                                                                ┌───────▼───────────────────┐
                                                                │ billing.subscriptions      │ 1
                                                                │ tier, status, period_*     ├───┐
                                                                │ gateway_sub_id             │   │ N
                                                                │ UNIQUE active per user     │   │
                                                                └───────┬───────────────────┘   │
                                                                        │ 1                     │
                                                                        │ N                     │
                                                                ┌───────▼───────────┐           │
                                                                │ billing.subscription_history │ │
                                                                │ event_type, from→to tier     │ │
                                                                └──────────────────────────────┘ │
                                                                                                 │
                                                                ┌────────────────────────────────┘
                                                                │
                                                                │ 1
                                                                │ N
                                                        ┌───────▼─────────────┐
                                                        │ billing.invoices    │ 1
                                                        │ invoice_number(uniq)│
                                                        │ status, total_cents ├───┐
                                                        └─────────┬───────────┘   │ N
                                                                  │ 1             │
                                                                  │ N             │
                                                          ┌───────▼─────────┐    │
                                                          │ billing.payments │   │
                                                          │ gateway, status, │   │
                                                          │ raw_response JSONB│  │
                                                          └──────────────────┘  │
                                                                                │
                                                                                │
                                                ┌──────────────────┐ N      N   │
                                                │ billing.coupons  │◄───────────┤
                                                │ code (uniq),     │            │
                                                │ discount_type    │            │
                                                └────────┬─────────┘            │
                                                         │ 1                    │
                                                         │ N                    │
                                              ┌──────────▼────────────────┐    │
                                              │ billing.coupon_redemptions ├───┘
                                              │ coupon_id × user_id (uniq)│
                                              │ invoice_id                │
                                              └───────────────────────────┘
```

### 7.2 Cluster B — Market Data / Companies / Corporate Actions

```
   ┌──────────────────┐ 1       N ┌──────────────────────┐ 1     N ┌──────────────────────┐
   │ core.sectors     ├───────────┤ core.sub_sectors      ├─────────┤ core.industries       │
   │ code (PK)        │           │ code, sector_code     │         │ code, sub_sector_code │
   │ name_id, name_en │           └──────────────────────┘         └───────────┬──────────┘
   └─────────┬────────┘                                                         │ 1
             │                                                                  │ N
             │ N                                                       ┌────────▼──────────┐
             │                                                         │ core.sub_industries│
             │                                                         │ code, industry_cd │
             │                                                         └────────┬──────────┘
             │                                                                  │ N
             └─────────────────────┐    ┌─────────────────────────┐   ┌─────────▼───────────────┐
                                   ▼ N  │ 1     N                 │   │                          │
                              ┌─────────┴──────┐  ┌───────────────┴───┘                          │
                              │ core.companies  │◄────────────────────────────────────────────────┘
                              │ ticker (PK)     │
                              │ name, sector_cd │ 1
                              │ board, ipo_date │
                              │ market_cap_cents│─────┐
                              └─────┬──┬────────┘     │
                                    │  │              │ N
                                    │  │              │
                       ┌────────────┘  │              ▼
                       │ 1             │ 1     ┌─────────────────────────────┐
                       │ N             │ N     │ core.index_constituents     │
                       ▼               ▼       │ (index_code, ticker,        │
              ┌──────────────────┐  ┌──────────┴──────────┐ effective_from)    │
              │ core.corporate_  │  │ core.financial_     │ effective_to       │
              │   actions        │  │ statements_meta     │ weight             │
              │ action_type,     │  │ period_type, year,  │                    │
              │ ex_date,         │  │ statement_type,     │                    │
              │ ratio, cash_amt  │  │ is_audited          │                    │
              └─────┬────────────┘  └─────────┬───────────┘                    │
                    │ 1                       │ 1                              │
                    │ N                       │ N                              │
                    ▼                         ▼                                ▼
              ┌──────────────────┐  ┌──────────────────────┐         ┌──────────────────┐
              │ core.dividends   │  │ core.financial_      │         │ core.indices     │
              │ fiscal_year,     │  │   line_items (EAV)   │         │ code (PK)        │
              │ amount_per_share │  │ line_code, value_cents│         │ LQ45, IDX30, ...│
              │ corporate_action │  │ parent_code (hierar) │         └──────────────────┘
              └──────────────────┘  └──────────────────────┘

   ┌──────────────────────┐ N    1  ┌──────────────────┐ 1   N  ┌──────────────────────┐
   │ core.shareholders    ├─────────┤ core.companies   ├────────┤ core.insider_trans   │
   │ snapshot_date,       │         │ (ticker PK)      │        │ insider_name, role,  │
   │ holder_name,         │         └──────────────────┘        │ transaction_type     │
   │ ownership_pct        │                                     └──────────────────────┘
   └──────────────────────┘

   ┌────────────────────────────────────┐
   │ QuestDB (separate cluster)         │
   │ ─ quotes_tick      (ts, ticker)    │  ← references companies.ticker by symbol
   │ ─ quotes_ohlcv_*   (ts, ticker)    │
   │ ─ broker_summary_  (ts, ticker, brk│
   │ ─ foreign_flow_*   (ts, ticker)    │
   │ ─ order_book_l*    (ts, ticker)    │
   │ ─ index_values     (ts, index_code)│
   │ ─ macro_indicators (ts, indicator) │
   └────────────────────────────────────┘
```

### 7.3 Cluster C — User Interaction (Watchlist, Alerts, Portfolio, Picks, AI)

```
                                  ┌──────────────────────┐
                                  │   iam.users          │ 1
                                  │   (id PK)            ├──────────────────┐
                                  └────────┬─────────────┘                  │
                                           │ 1                              │
        ┌──────────────────────────────────┼──────────────────────┐         │
        │ N                                │ N                    │ N       │ N
┌───────▼─────────┐               ┌────────▼─────────┐    ┌──────▼────────┐│
│ core.watchlists │ 1             │ core.alerts      │ 1  │ core.portfolios││
│ name, sort_order├───┐           │ ticker, type,    ├──┐ │ name, type    ││
└─────────────────┘   │ N         │ condition_json   │  │ │               ││
                      │           │ status           │  │ └──────┬────────┘│
                      ▼           └────────┬─────────┘  │        │ 1       │
              ┌────────────────┐           │ 1          │        │ N       │
              │ core.watchlist_│           │ N          │ ┌──────▼─────────┴┐
              │   items        │   ┌───────▼──────────┐ │ │ core.portfolio_ │
              │ watchlist_id,  │   │core.alert_triggers│ │ │  positions      │
              │ ticker (FK→co) │   │ triggered_at,    │ │ │ ticker, quantity│
              └────────────────┘   │ payload          │ │ │ avg_cost_cents  │
                                   └──────────────────┘ │ └─────────────────┘
                                                        │
                                                        │ N
                                                ┌───────▼────────────────┐
                                                │ core.portfolio_        │
                                                │   transactions         │
                                                │ txn_type, qty, price   │
                                                └────────────────────────┘

                                                        ┌──────────────────────────┐
        ┌───────────────────────────────────────────────┤ iam.users (id PK)        │
        │ N                                             └───────┬──────────────────┘
        │                                                       │ 1
┌───────▼──────────────┐                                        │ N
│ core.daily_picks     │ 1     1 ┌────────────────────────┐     │
│ pick_date, ticker,   ├─────────┤ core.daily_pick_       │     │
│ setup_type,          │         │   outcomes             │     │
│ entry/SR/SL/TP,      │         │ pick_id (PK→picks),    │     │
│ rr, confidence       │         │ hit_tp1, hit_sl,       │     │
│ tier_visibility      │         │ realized_r             │     │
└──────────┬───────────┘         └────────────────────────┘     │
           │ N                                                   │
           │ 1                                                   │
           ▼                                                     │
   ┌────────────────────┐                                        │
   │ core.companies     │                                        │
   │ (ticker PK)        │                                        │
   └────────────────────┘                                        │
                                                                 │
                                  ┌──────────────────────────────┘
                                  │ 1
                                  │ N
                          ┌───────▼──────────────┐ 1     N  ┌──────────────────────┐
                          │ core.ai_             │          │ core.ai_messages     │
                          │   conversations      ├──────────┤ (partitioned monthly)│
                          │ title, model_default │          │ role, content,       │
                          │ context_tags         │          │ tokens, cost_micro$  │
                          └──────────────────────┘          └──────────┬───────────┘
                                                                       │ 1
                                                                       │ N
                                                              ┌────────▼───────────┐
                                                              │ core.ai_tool_calls │
                                                              │ tool_name, args,   │
                                                              │ result, status     │
                                                              └────────────────────┘

  ┌────────────────────────────┐ N    1  ┌──────────────────────┐
  │ core.research_reports      ├─────────┤ core.companies       │
  │ source_securities, rating  │         │ (ticker PK)          │
  │ target_price_cents         │         └──────────────────────┘
  └─────────┬──────────────────┘
            │ 1
            │ N
   ┌────────▼────────────────────┐         ┌──────────────────────────────┐
   │ core.research_embeddings    │         │ core.research_consensus      │
   │ chunk_text, vector(1024)    │         │ ticker (PK), median_TP,      │
   │ HNSW(cosine)                │         │ consensus_rating             │
   └─────────────────────────────┘         └──────────────────────────────┘

   ┌────────────────────────────┐
   │ core.news_articles         │ 1     N  ┌──────────────────────────────┐
   │ ticker_mentions[],         ├──────────┤ core.news_embeddings         │
   │ sentiment_score            │          │ chunk_text, vector(1024) HNSW│
   └────────────────────────────┘          └──────────────────────────────┘
```

---

## 8. Migration Strategy

### 8.1 Tooling

| Store | Tool | Rationale |
|---|---|---|
| **PostgreSQL** | **Atlas** (HCL/SQL declarative) + **golang-migrate** (versioned migration files) | Atlas untuk drift detection & diff; golang-migrate untuk migration run di CI/CD (matang, runtime-agnostic). |
| **QuestDB** | Hand-rolled SQL via internal `schema_versions` table | QuestDB lebih sederhana; tidak banyak schema change |
| **ClickHouse** | **clickhouse-migrations** (TS) atau golang-migrate driver CH | DDL via versioned files |
| **Redis** | — | Schemaless; key-namespace versioning di kode (`q:v2:last:{ticker}`) |
| **pgvector** | Sama dengan Postgres (Atlas) | extension migration di-track |

### 8.2 Konvensi Versioning

- Folder `db/migrations/postgres/` versi `NNNN_description.up.sql` & `.down.sql`.
- Versi monotonic 4 digit (`0001`, `0002`, …) — bukan timestamp, untuk merge-friendly.
- Setiap PR yang ubah skema **wajib** ada migration up + down + test (apply→rollback→apply ulang).
- CI step: `atlas migrate lint` + run migration di ephemeral DB.

### 8.3 Zero-Downtime: Expand-Contract Pattern

1. **Expand** — tambah kolom/tabel baru (nullable, default). Deploy.
2. **Backfill** — job nullable→populated. Pakai chunked update + `vacuum analyze`.
3. **Dual-write** — app code tulis ke kolom lama & baru.
4. **Switch reads** — code baca dari kolom baru.
5. **Contract** — drop kolom lama setelah retention check.

Untuk **rename kolom**: pakai view alias selama transisi (alternative: tambah kolom baru + trigger sync, deprecate lama).

### 8.4 Seed Data

- `db/seeds/00_sectors.sql` — 12 IDX-IC sektor + sub-sektor + industri (idempotent UPSERT).
- `db/seeds/01_indices.sql` — LQ45, IDX30, IDX80, KOMPAS100, JII70, dst.
- `db/seeds/02_companies_seed.sql` — IDX80 ticker dasar (M0); full universe ingested via batch job dari IDX file.
- `db/seeds/10_feature_flags.sql` — default flags.
- `db/seeds/dev/99_test_users.sql` — hanya dev environment.

Seed dipisah per environment (`prod_seeds/`, `dev_seeds/`); CI prevent dev seeds di prod.

---

## 9. Partitioning, Sharding & Archiving

### 9.1 Tabel yang Wajib Partition

| Tabel | Strategi | Partition unit | Tool |
|---|---|---|---|
| `billing.payments` | RANGE | monthly | pg_partman |
| `core.ai_messages` | RANGE | monthly | pg_partman |
| `core.notifications` | RANGE | monthly | pg_partman |
| `core.alert_triggers` | RANGE | monthly | pg_partman |
| `core.audit_logs` | RANGE | monthly | pg_partman |
| `ch.user_behavior_events` | RANGE | monthly (ClickHouse) | native |
| `quotes_tick`, `quotes_ohlcv_*` | partition DAY/MONTH/YEAR | native QuestDB | native |

**Retention attach/detach:** partisi lama (>13 bulan untuk operasional, >7 tahun untuk audit) di-`DETACH` lalu di-export ke R2 Parquet via `COPY ... TO PROGRAM 'aws s3 cp ...'` (atau pakai `pg_parquet` extension v0.2+).

### 9.2 Sharding (Future)

- **Citus** dipertimbangkan kalau `core.companies` × `daily_picks` × `audit_logs` melewati 1TB primary.
- Sharding key kandidat: `user_id` (untuk OLTP user-bound) — distribusi rata.
- M0–M24 belum perlu. Postgres single-node (db.r6g.4xlarge atau ekuivalen) dengan read replica cukup.

### 9.3 Tier Hot / Warm / Cold

| Tier | Lokasi | Latency target | Contoh |
|---|---|---|---|
| **Hot** | Postgres + QuestDB live, Redis | <100ms | last 90 hari tick, 13 bulan operasional |
| **Warm** | Postgres detached partition di same DB (read-only) atau ClickHouse | <2s | 1–3 tahun data |
| **Cold** | R2 Parquet, S3 Glacier | seconds–minutes | >3 tahun, audit >7 tahun |

Archive job nightly:
- `quotes_tick` partition > 90d → R2 (compressed Parquet, partitioned by date+ticker_bucket).
- `audit_logs` partition > 13m → R2 + index manifest.
- Restore on-demand: DuckDB `read_parquet('s3://...')` untuk backtest historical.

---

## 10. Data Lifecycle & Retention (UU PDP)

UU 27/2022 (Pelindungan Data Pribadi) mensyaratkan:
- Data pribadi disimpan **selama purpose masih berlaku** + retention bisnis/audit.
- Subject access right: user bisa minta **export** & **delete**.
- Cross-border transfer butuh *binding corporate rules* / persetujuan eksplisit.

### 10.1 Matriks Retention

| Data class | Tabel utama | Retention aktif | Setelah user delete account | Anonymize? | Justifikasi |
|---|---|---|---|---|---|
| **PII identitas** | `iam.users`, `user_profiles` | sepanjang akun aktif | hard-delete 30 hari setelah request | N/A | UU PDP right-to-erasure |
| **Auth session** | `iam.auth_sessions` | 30 hari (sliding) | langsung hapus | N/A | minimisasi |
| **OAuth tokens** | `iam.oauth_accounts` | sepanjang akun | hapus saat unlink | N/A | minimisasi |
| **MFA secrets** | `iam.mfa_factors` | sepanjang akun | hapus saat akun ditutup | N/A | minimisasi |
| **Transaksi pembayaran** | `billing.payments`, `invoices` | 10 tahun | **retain** (kewajiban pajak) | ya — user_id → `user_id_anon` hash | UU Pajak butuh 10 tahun |
| **Subscription history** | `billing.subscription_history` | 10 tahun | retain anonymized | ya | audit revenue |
| **Watchlist, alerts, portfolio** | `core.watchlists`, dst. | sepanjang akun | hapus saat akun ditutup | N/A | user content |
| **AI conversations** | `core.ai_conversations`, `ai_messages` | 24 bulan default; user bisa hapus | hapus saat akun ditutup | N/A | privasi tinggi (bisa berisi PII) |
| **AI context embeddings** | `core.ai_context_embeddings` | 6 bulan + TTL | hapus saat akun ditutup | N/A | privasi |
| **Audit logs** | `core.audit_logs` | 7 tahun (compliance) | retain anonymized | ya — `actor_id` → hash | OJK compliance + forensik |
| **Notifications** | `core.notifications` | 90 hari | hapus | N/A | minimisasi |
| **Behavior events** | `ch.user_behavior_events` | 13 bulan (TTL) | hapus + anonymize | ya | analytics |
| **Market data** | QuestDB | per section 3.6 | — (bukan PII) | N/A | data publik |
| **News & research** | `core.news_articles`, `research_reports` | tanpa batas (publik) | — | N/A | data publik |

### 10.2 Anonymization Procedure

- `iam.users` row di-replace dengan `email = 'deleted+<random>@nubuat.local'`, `phone = NULL`, `full_name = 'Deleted User'`.
- FK reference (`payments.user_id`, `audit_logs.actor_id`) ditahan TAPI di-hash dengan **app-level pepper** sehingga tidak reversible (`SHA-256(user_id || pepper)`).
- Job nightly `pii_anonymizer` scan request queue (`gdpr_delete_requests` table) → eksekusi.

### 10.3 Data Subject Rights

Tabel kontrol:
```sql
CREATE TABLE iam.gdpr_requests (
    id          UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    user_id     UUID NOT NULL REFERENCES iam.users(id),
    request_type VARCHAR(16) NOT NULL,    -- 'export' | 'delete' | 'rectify'
    status      VARCHAR(16) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    export_url   TEXT,                     -- R2 signed URL (24h)
    note         TEXT
);
```

**Export bundle:** ZIP berisi profile JSON, watchlist CSV, portfolio CSV, AI conversations JSON, payment history CSV. Disimpan di R2 dengan `Content-Disposition: attachment` dan signed URL 24 jam.

### 10.4 Data Residency

- Primary store: **AWS ap-southeast-3 (Jakarta)** — Postgres, QuestDB, ClickHouse, Redis.
- Cloudflare R2: pilih region **SIN** (Singapore) atau **HKG**; karena raw PII tidak disimpan di R2 (hanya PDF research, export bundle yang dienkripsi user-side), cross-border acceptable dengan *Data Processing Agreement*.
- DPO (Data Protection Officer) wajib dicantumkan; akan didaftarkan resmi M3.

---

## 11. Backup, DR & PITR

### 11.1 Target RPO/RTO

| Data class | RPO | RTO | Justifikasi |
|---|---|---|---|
| Postgres OLTP (users, billing) | **5 menit** | **30 menit** | Data uang & akun, critical |
| QuestDB market data | **15 menit** | **2 jam** | Bisa re-fetch dari vendor untuk hari berjalan |
| ClickHouse analytics | **1 jam** | **4 jam** | Derived data, bisa rebuild |
| Redis cache | **N/A** (eph) | **5 menit** (cold start) | Cache, bisa rebuild |
| Redis session (Cluster B) | **15 menit** | **30 menit** | AOF + replica |
| R2 object | **24 jam** | **1 jam** | Versioning |
| pgvector | bersama Postgres | bersama Postgres | re-embed kalau hilang (mahal tapi possible) |

### 11.2 Backup Strategy

**PostgreSQL:**
- **Continuous WAL archive** ke S3 (`wal-g` atau AWS DMS) untuk **PITR** any second within 35 days.
- **Base backup** harian, retention 7 daily + 4 weekly + 12 monthly.
- **Logical dump** (`pg_dump --format=directory`) mingguan ke R2 (untuk migration/dev parity).
- **Cross-region replica** (read-only) di AWS Singapore (ap-southeast-1) — async streaming replication.

**QuestDB:**
- **WAL** native + filesystem snapshot harian (EBS snapshot).
- Partition lama (cold) sudah di R2 sebagai Parquet — secara efektif sudah backed up.
- Re-ingest fallback: vendor (Invezgo/OHLC.dev) bisa replay 7 hari terakhir kalau loss.

**ClickHouse:**
- `BACKUP TABLE ... TO S3(...)` mingguan + incremental harian.

**Redis:**
- Cluster B (durable): AOF `appendfsync everysec` + RDB snapshot tiap 1 jam → S3.
- Cluster A (cache): no backup needed.

**R2:**
- Versioning aktif (retention 30 hari).
- Cross-region replica ke S3 ap-southeast-3 untuk research PDF (asset rare-loss tolerance).

### 11.3 Restore Drill

- **Quarterly** restore drill ke staging environment:
  - PITR Postgres ke titik T-1 jam, validate row count + checksum sample.
  - QuestDB restore from R2 Parquet, run smoke query.
  - ClickHouse restore latest backup, run aggregation.
- Hasil drill di-log di `audit_logs` dengan tag `dr.drill`.

### 11.4 Disaster Recovery Plan

- **AZ failure (Jakarta multi-AZ):** auto failover via Postgres streaming + Patroni; RTO <5 menit.
- **Region failure:** promote SG replica → manual DNS switch (Cloudflare); RTO <30 menit.
- **Total data loss:** rebuild from latest base backup + WAL; RTO ~2 jam untuk Postgres.

---

## 12. Data Quality & Validation

### 12.1 Schema Drift Detection

- **Atlas migrate diff** dijalankan di CI tiap PR; gagal jika ada drift di staging.
- **Datadog DB Monitoring** untuk Postgres — alert kalau ada DDL ad-hoc di prod.

### 12.2 Anomaly Detection (Tick & OHLCV)

Pipeline ingest QuestDB:
1. **Sanity check tier 1 (synchronous, reject)**:
   - Harga ≤ 0, volume < 0 → reject.
   - Tick price moves > 35% intraday (UMA threshold) → flag + send to dead-letter queue.
   - Timestamp outside trading hour (09:00–15:30 WIB ± auction) → reject untuk regular tick.
2. **Sanity check tier 2 (async, anomaly flag)**:
   - Volume spike z-score > 6 vs rolling 20d → tag `unusual_volume`, surface ke ops dashboard.
   - Bid > Ask (crossed) sustained >5 detik → flag potential vendor bug.
   - OHLCV reconciliation: aggregated tick vs vendor's own OHLC bar — diff > 0.5% → alert.

### 12.3 Cross-Vendor Reconciliation

Multi-vendor strategy (Invezgo + OHLC.dev) menjadi sumber redundansi:
- Job `vendor_recon_daily`: bandingkan EoD close per ticker antar vendor + IDX official EoD file.
- Diff > 5 bps → alert PagerDuty.
- "Source of truth" untuk historical: **IDX official EoD**; intraday: vendor primer (Invezgo); kalau primer down: failover ke OHLC.dev secara otomatis (circuit breaker).

### 12.4 Data Contracts

Setiap source data punya **schema contract** (Avro/JSON Schema versioned). Producer (vendor adapter) wajib validate; konsumen reject bila tidak valid.

```
contracts/
  ├─ market_data/
  │    ├─ tick.v1.json
  │    ├─ ohlcv.v1.json
  │    └─ broker_summary.v1.json
  ├─ corporate_actions/
  │    └─ corporate_action.v1.json
  └─ news/
       └─ news_article.v1.json
```

### 12.5 dbt Tests (untuk Analytics)

- `not_null` di kolom kritis (ticker, ts, value).
- `unique` di PK.
- `accepted_values` untuk enum-like (`board`, `status`).
- Custom test: `picks_outcome_evaluation_complete` (semua pick > T+20 punya outcome).

### 12.6 Anti Pump-Dump Signal

Job harian deteksi:
- Spike volume di ticker papan pemantauan khusus + sosial media mention burst → flag → manual review sebelum tampil di Daily Picks.
- Bandar concentration > 80% top-1 broker → flag.
- Coordinated activity ke broker tunggal lintas ticker grup → cluster analysis.

---

## 13. Indexing Strategy

### 13.1 Postgres Index Inventaris (Highlight)

| Tabel | Index | Rationale |
|---|---|---|
| `iam.users` | UNIQUE(email), UNIQUE(referral_code), idx(referred_by) | login + referral |
| `iam.auth_sessions` | UNIQUE(refresh_token_hash), partial idx(user_id) WHERE revoked_at IS NULL | login flow |
| `billing.subscriptions` | partial UNIQUE(user_id) WHERE status IN ('active','trialing') | enforce 1 active sub |
| `billing.payments` (partitioned) | idx(invoice_id), idx(user_id, created_at DESC) | invoice lookup |
| `core.companies` | idx(sector_code), idx(board), GIN trgm(name) | screener, fuzzy search |
| `core.daily_picks` | idx(pick_date DESC), idx(ticker, pick_date), idx(setup_type, pick_date) | dashboard daily, history per ticker |
| `core.watchlist_items` | idx(watchlist_id, sort_order) | ordered render |
| `core.alerts` | partial idx(ticker, status) WHERE status='active' | hot evaluation loop |
| `core.research_reports` | partial idx(ticker, published_at DESC) WHERE is_published | per-ticker view |
| `core.news_articles` | GIN(ticker_mentions), idx(published_at DESC) | feed |
| `core.ai_messages` (partitioned) | idx(conversation_id, created_at), idx(user_id, created_at DESC) | conversation render |
| `core.audit_logs` (partitioned) | idx(actor_id, occurred_at DESC), idx(action) | forensik |
| `core.shareholders` | idx(ticker, snapshot_date DESC) | latest holders |
| `core.financial_line_items` | idx(statement_id), idx(line_code), composite via JOIN | ratio engine |
| `core.research_embeddings` | HNSW(embedding vector_cosine_ops) m=16 ef_construction=64 | semantic search |
| `core.news_embeddings` | HNSW + idx(published_at DESC) | recency-weighted RAG |

### 13.2 Composite Index Penting (Query-Pattern Driven)

```sql
-- Daily picks "today + setup" (homepage)
CREATE INDEX idx_picks_date_setup_conf ON core.daily_picks(pick_date DESC, setup_type, confidence_score DESC);

-- Watchlist render bundle (sorted, ordered) — sudah ada
-- Already have idx_watchlist_items_wl

-- Alerts hot loop: by ticker + active + last_triggered cooldown
CREATE INDEX idx_alerts_ticker_eval ON core.alerts(ticker, last_triggered_at)
    WHERE status = 'active';

-- Research consensus latest
CREATE INDEX idx_research_consensus_updated ON core.research_consensus(updated_at DESC);

-- AI message conversation render (already covered by partition + idx)
```

### 13.3 Index Hygiene

- `pg_stat_user_indexes` monthly review — drop unused (idx_scan = 0 selama 30 hari).
- `pg_stat_statements` review p95 query > 500ms → tambah index atau rewrite.
- BRIN index untuk tabel append-only besar yang sudah partitioned (e.g., `audit_logs(occurred_at)`).

---

## 14. Sizing & Growth Projection

Asumsi user growth (dari section 10.4 dokumen utama): M6 5k free + 290 paid; M12 25k + 2.2k paid; M24 80k + 8k paid.

### 14.1 Postgres Sizing

| Tabel grup | Row/user (rata-rata) | M6 size | M12 size | M24 size |
|---|---|---|---|---|
| users + profiles + auth | small | 50 MB | 250 MB | 800 MB |
| billing (payments, invoices, history) | 50 row/year | 200 MB | 1 GB | 4 GB |
| companies + sectors + indices + CA + financials | static-ish | 2 GB | 4 GB | 6 GB |
| watchlist + items | 30 items/user | 300 MB | 1.5 GB | 5 GB |
| alerts + triggers | active 5 alerts/user; triggers 50/month | 1 GB | 5 GB | 20 GB |
| portfolio + positions + txns | active 100 txn/year/user | 500 MB | 3 GB | 12 GB |
| daily_picks + outcomes | 10/day × 365 = 3650/y | 200 MB | 500 MB | 1.5 GB |
| research_reports | 50k reports total | 5 GB | 12 GB | 25 GB |
| news_articles | 500/day → ~180k/year | 2 GB | 5 GB | 12 GB |
| ai_conversations + messages | 50 msg/active/month | 5 GB | 30 GB | 120 GB |
| audit_logs | 20 events/user/day | 8 GB | 35 GB | 130 GB |
| embeddings (pgvector) | research + news + ctx | 5 GB | 25 GB | 80 GB |
| **Total Postgres** | | **~25 GB** | **~120 GB** | **~420 GB** |

Recommended instance: M6 db.r6g.xlarge (32GB RAM); M12 db.r6g.2xlarge (64GB); M24 db.r6g.4xlarge (128GB) + read replica.

### 14.2 QuestDB Sizing

Asumsi 945 ticker × 1 tick/sec rata-rata jam bursa (6 jam × 60 × 60 = 21,600 tick/ticker/hari) × ~50 byte raw = **1 GB/hari tick raw**, kompresi 4× → ~250 MB/hari hot.

- 90 hari hot tick = ~22 GB.
- OHLCV 1m: 945 × 360 bar/day × 60 byte = ~20 MB/day → 1 tahun = ~7 GB.
- OHLCV 1d (15 tahun): 945 × 15 × 365 × 60 byte = ~310 MB.
- Broker summary daily: 945 × ~100 broker/ticker × 365 = ~35M row/year × 80 byte = ~3 GB/year.
- Foreign flow intraday 5m: 945 × 72 bar/day × 365 = 25M row/year × 60 byte = ~1.5 GB/year.

| | M6 | M12 | M24 |
|---|---|---|---|
| QuestDB total | ~80 GB | ~250 GB | ~600 GB |

Hot SSD NVMe; cold ke R2 Parquet.

### 14.3 ClickHouse Sizing

User behavior (M12: 25k user × 5 event/day × 365 = ~45M event/year × 200 byte = ~9 GB compressed). Backtest detail + picks performance ~30 GB M12, ~100 GB M24.

### 14.4 Redis Sizing

| Use | M6 | M12 | M24 |
|---|---|---|---|
| Cluster A (cache) | 8 GB | 16 GB | 32 GB |
| Cluster B (session/idem) | 2 GB | 4 GB | 8 GB |

### 14.5 R2 / Object

| | M6 | M12 | M24 |
|---|---|---|---|
| Research PDF | 50 GB | 150 GB | 400 GB |
| Tick archive Parquet | 30 GB | 200 GB | 700 GB |
| User export bundles | 5 GB | 20 GB | 80 GB |
| Audit cold | 10 GB | 60 GB | 250 GB |
| **Total** | ~95 GB | ~430 GB | ~1.4 TB |

### 14.6 Cost Ballpark (USD/bulan, AWS ap-southeast-3)

| | M6 | M12 | M24 |
|---|---|---|---|
| Postgres (RDS Multi-AZ) | 450 | 900 | 1,800 |
| QuestDB (EC2 c6id.2xlarge + EBS) | 400 | 800 | 1,600 |
| ClickHouse (managed/Altinity) | 200 | 500 | 1,200 |
| Redis (ElastiCache cluster) | 200 | 400 | 800 |
| R2 storage + ops | 5 | 25 | 75 |
| Backup (S3 + Glacier) | 50 | 150 | 400 |
| Meilisearch | 50 | 100 | 200 |
| **Total infra DB** | **~1.4k** | **~2.9k** | **~6.1k** |

---

## 15. Multi-Tenancy Consideration

### 15.1 Default: Single-Tenant per User

User adalah tenant. Tidak butuh row-level security karena setiap query selalu filter `WHERE user_id = $current_user` di layer aplikasi. Postgres **RLS** sebagai *defense-in-depth* tetap diaktifkan di tabel sensitif:

```sql
ALTER TABLE core.watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY watchlist_isolation ON core.watchlists
    USING (user_id = current_setting('app.current_user_id')::uuid);
-- App membakar SET app.current_user_id = '<uuid>' per session
```

Dipasang juga di: `core.alerts`, `core.portfolios`, `core.ai_conversations`, `core.notifications`, `billing.invoices`.

### 15.2 Institutional / Team Tier (M12+)

Saat tier Institutional muncul (lihat section 10.1 dokumen utama, "Multi-seat, white-label"):

**Opsi A — Shared schema + tenant_id (REKOMENDASI awal):**
- Tambah `workspace_id` di entitas team-shared (watchlist, alerts, portfolios, strategies, ai_conversations).
- Tabel baru:
  ```sql
  CREATE TABLE iam.workspaces (
      id          UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
      name        VARCHAR(120) NOT NULL,
      plan        VARCHAR(16),
      seats_max   INT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE iam.workspace_members (
      workspace_id UUID NOT NULL REFERENCES iam.workspaces(id),
      user_id      UUID NOT NULL REFERENCES iam.users(id),
      role         VARCHAR(16) NOT NULL,    -- 'owner' | 'admin' | 'analyst' | 'viewer'
      joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (workspace_id, user_id)
  );
  ```
- RLS extended ke `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ...)`.
- Trade-off: schema simple, sharing kemudian gampang, tapi noisy-neighbor (1 client besar bisa buat tabel berat). Mitigasi: monitor query, isolasi via read replica per workspace kalau perlu.

**Opsi B — Schema-per-tenant:**
- Hanya bila ada *enterprise client besar* yang minta isolasi fisik (white-label sekuritas).
- Each workspace = schema (`tenant_<workspace_id>`) dengan tabel paralel.
- Trade-off: ops berat (migration × N tenants), tapi isolasi nyata.

**Rekomendasi:** mulai Opsi A; pindah ke Opsi B hanya untuk klien enterprise/white-label by request (jadi feature paid).

### 15.3 RLS untuk Defense-in-Depth

Setiap connection app set:
```sql
SET LOCAL app.current_user_id = '<uuid>';
SET LOCAL app.current_workspace_id = '<uuid or null>';
```

Policy menggunakan dua setting tersebut. Bila ada SQL injection di app layer yang lolos filter, RLS tetap mencegah lintas user/workspace read.

---

## Penutup

Plan ini adalah **baseline data architecture** untuk Nubuat. Setiap section akan diturunkan menjadi:
- **RFC per data store** (Postgres setup, QuestDB sizing, ClickHouse cluster).
- **DDL versioned** di `db/migrations/`.
- **Runbook** restore/DR drill, anonymization, GDPR delete.
- **Data contracts** versioned per source.

Trade-off utama (PG+QuestDB+ClickHouse polyglot vs simpler stack) diambil **demi performa financial workload yang superior** dan **separation of concerns** — yang akan terbayar saat user base & data volume tumbuh. Single ecosystem (Postgres + Timescale) lebih simple tapi gagal di benchmark ASOF JOIN, dan QuestDB sudah terbukti di banyak fintech.

Catatan kepatuhan UU PDP & residency Indonesia melekat di setiap keputusan: primary store di Jakarta, anonymization procedure clear, audit trail 7 tahun, data subject right tooling siap.

— *end of document* —
