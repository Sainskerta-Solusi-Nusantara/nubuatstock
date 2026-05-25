# Nubuat — MVP

[![CI](https://github.com/ifaalifwork/nubuatstock/actions/workflows/ci.yml/badge.svg)](https://github.com/ifaalifwork/nubuatstock/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

Aplikasi analisis saham Indonesia berbasis subscription B2C. Next.js 15 fullstack TypeScript.

> Dokumen produk & desain ada di parent folder `/Users/haimac/nubuat/`:
> - `ANALISIS_APLIKASI_SAHAM.md` — analisis lengkap
> - `PLAN_BACKEND.md`, `PLAN_FRONTEND.md`, `PLAN_DATABASE.md`, `PLAN_SECURITY.md`, `PLAN_UIUX_WIREFRAME.md`
> - `PROGRESS_REPORT.md`
> Konvensi build di-document di `AGENTS.md`.

---

## Prinsip Inti

1. **Zero hardcode.** Semua config (CORS, rate limit, tier pricing, scoring weights, API keys) di database. Hanya 3 env var: `DATABASE_URL`, `REDIS_URL`, `APP_MASTER_KEY`.
2. **Zero dummy data.** Semua data dari DB. Yahoo Finance (gratis, real) sebagai vendor default; admin bisa swap ke Invezgo/OHLC.dev di `/admin/config`.
3. **Security-first.** Secrets encrypted AES-256-GCM (master key dari env, ciphertext di DB), Argon2id password, audit log, rate limit, Zod validation di semua input.
4. **Extensible.** Modular by domain, event-driven cross-feature, ULID PKs (time-sortable), feature flags DB-driven.

---

## Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 16 dengan extension `timescaledb`, `pgvector`, `pgcrypto`
- Redis 7
- (Opsional) Docker untuk run DB + Redis lokal

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate master encryption key
npm run generate:key
# Copy output → paste sebagai APP_MASTER_KEY di .env

# 3. Buat .env dari template
cp .env.example .env
# Edit: isi DATABASE_URL, REDIS_URL, APP_MASTER_KEY, ADMIN_BOOTSTRAP_EMAIL

# 4. Migration: extensions + tables
npm run db:migrate

# 5. Seed: default config + reference data + tier definitions
npm run db:seed

# 6. Jalankan dev server
npm run dev

# 7. Di terminal lain, jalankan background worker
npm run worker
```

Akses:
- App: http://localhost:3000
- Admin: http://localhost:3000/admin (login dengan ADMIN_BOOTSTRAP_EMAIL)
- Setup API keys (Anthropic, vendor data, payment) di `/admin/config`

---

## Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC, Turbopack)                │
│  ├── app/(auth)        → Agent 3                         │
│  ├── app/(app)         → Agent 9 (layout), 4/6/7/8 (subs)│
│  ├── app/(admin)       → Agent 10                        │
│  └── app/api/*         → split per domain                │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼─────┐         ┌─────▼──────┐
   │ Postgres │         │   Redis    │
   │ + Timescale       │ + BullMQ   │
   │ + pgvector│        │            │
   └────┬─────┘         └────────────┘
        │
   ┌────▼───────────────────────────┐
   │ External (called via lib/*):    │
   │ • Anthropic (key from app_secrets)│
   │ • Yahoo Finance / Invezgo (data)│
   │ • Midtrans / Xendit (billing)   │
   └─────────────────────────────────┘
```

---

## Struktur Folder

Lihat `AGENTS.md` §13 untuk peta lengkap & file ownership per agent.

---

## Database

Single PostgreSQL 16 instance dengan extensions:
- **TimescaleDB** — hypertable untuk `market_quotes_ohlcv`, `market_ticks`, `broker_summary_daily`
- **pgvector** — embeddings untuk RAG (research, news)
- **pgcrypto** — `gen_random_bytes()` untuk ULID generator

Schema in `db/schema/*.ts`. Migrations auto-generated dari Drizzle. Reference data di-seed dari `db/seed/*.ts`.

---

## Testing

```bash
npm run typecheck       # tsc --noEmit
npm test                # vitest unit
npm run test:e2e        # playwright
```

---

## Build & Deploy

```bash
npm run build
npm start              # production server
npm run worker         # background worker (deploy terpisah)
```

Recommended platform:
- App: Vercel atau Fly.io (Jakarta region)
- DB: Neon (serverless Postgres + Timescale extension) atau Supabase atau self-managed RDS Jakarta
- Redis: Upstash atau ElastiCache Jakarta

---

## Compliance & Security

- Lihat `PLAN_SECURITY.md` untuk threat model, IAM, UU PDP, OJK regulation, SOC 2 roadmap.
- Disclaimer wajib (`app.disclaimer_text` di DB) ditampilkan di setiap Daily Pick & rekomendasi.
- Audit log: `audit_log` table (Agent 10) untuk admin action, billing event, secret access.

---

## Roadmap

Lihat `ANALISIS_APLIKASI_SAHAM.md` §12 dan `PROGRESS_REPORT.md`. MVP scope = M0–M3 (closed beta IDX80, 500 users).

---

## Tech Stack

- Next.js 15 (App Router, Turbopack) + React 19
- TypeScript strict mode
- PostgreSQL (Neon serverless) + Drizzle ORM + pgvector
- BullMQ + Upstash Redis for background jobs
- Better-Auth for authentication
- Tailwind v4 + shadcn/ui primitives
- DeepSeek for AI Copilot
