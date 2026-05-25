# AGENTS.md — Nubuat MVP Conventions

> **Setiap agent WAJIB membaca file ini sebelum menulis kode.**
> Pelanggaran konvensi → review diulang, pekerjaan ditolak.

---

## 1. Mission

Membangun **MVP Nubuat** — terminal analisis saham Indonesia berbasis Next.js 15 fullstack TypeScript. Target: bisa di-extend untuk fitur lanjutan tanpa rewrite, **zero hardcode**, **zero dummy data**, security-first.

---

## 2. Tech Stack (LOCKED — jangan ganti tanpa diskusi)

| Layer | Pilihan |
|---|---|
| Framework | **Next.js 15** (App Router, React 19, Turbopack) |
| Bahasa | **TypeScript 5.7+** strict mode |
| Database | **PostgreSQL 16** + extension **TimescaleDB** (hypertable untuk time-series) + **pgvector** (embeddings) |
| ORM | **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) |
| DB Driver | **`postgres`** (porsager/postgres.js) |
| Auth | **Better-Auth** (`better-auth`) |
| Cache & Queue | **Redis 7** (`ioredis`) + **BullMQ** untuk background job |
| AI | **DeepSeek API via `openai` SDK** (OpenAI-compatible base URL) — model `deepseek-v4-flash` default. Provider, base URL, model, & API key semua dari DB (`app_config` + `app_secrets`). Anthropic & OpenAI di-keep sebagai swap-able provider. |
| Validation | **Zod** + **drizzle-zod** |
| UI primitives | **shadcn/ui** + Radix UI |
| Styling | **Tailwind CSS v4** (CSS-based config via `@theme`) |
| Charts | **TradingView Lightweight Charts** (`lightweight-charts`) |
| State (client) | **TanStack Query** (server state) + **Zustand** (client state) + **nuqs** (URL state) |
| Forms | **React Hook Form** + Zod resolver |
| Logging | **Pino** (`pino`, `pino-pretty`) |
| Crypto | **Node `node:crypto`** (AES-256-GCM, Argon2 via dedicated lib kalau perlu) |
| i18n | **next-intl** (ID default, EN secondary) |
| ID generation | **ULID** (`ulid`) — bukan UUID, bukan auto-increment |
| Testing | **Vitest** (unit), **Playwright** (E2E) |

---

## 3. File Ownership Map (10 Agents)

**ATURAN MUTLAK:** Setiap agent HANYA boleh write di path yang menjadi miliknya. Path lain → READ ONLY. Kalau perlu modifikasi file milik agent lain, **tulis catatan di output report**, jangan touch.

| Agent | Domain | Path yang DIMILIKI |
|---|---|---|
| **1** | Reference Data | `db/schema/reference.ts`, `db/seed/reference.ts`, `lib/types/reference.ts` |
| **2** | Companies/Emiten | `db/schema/companies.ts`, `db/seed/companies.ts`, `lib/companies/**`, `app/api/companies/**`, `lib/types/companies.ts` |
| **3** | Auth System | `db/schema/auth.ts`, `lib/auth/**`, `app/(auth)/**`, `app/api/auth/**`, `components/auth/**`, `lib/types/auth.ts` |
| **4** | Subscription Tiering | `db/schema/billing.ts`, `db/seed/tiers.ts`, `lib/billing/**`, `app/(app)/subscription/**`, `app/api/billing/**`, `components/billing/**`, `lib/types/billing.ts` |
| **5** | Market Data Service | `db/schema/market.ts`, `lib/market-data/**`, `app/api/market/**`, `worker/jobs/ingest-*.ts`, `lib/types/market.ts` |
| **6** | Watchlist + Alerts | `db/schema/user-data.ts`, `lib/watchlist/**`, `lib/alerts/**`, `app/(app)/watchlist/**`, `app/(app)/alerts/**`, `app/api/watchlist/**`, `app/api/alerts/**`, `components/watchlist/**`, `components/alerts/**`, `lib/types/watchlist.ts`, `lib/types/alerts.ts` |
| **7** | AI Copilot | `db/schema/ai.ts`, `lib/ai/**`, `app/api/ai/**`, `app/(app)/copilot/**`, `components/ai/**` (kecuali yang sudah dibuat scaffold), `lib/types/ai.ts` |
| **8** | Daily Picks Engine | `db/schema/picks.ts`, `lib/picks/**`, `app/api/picks/**`, `app/(app)/picks/**`, `components/picks/**`, `worker/jobs/generate-picks.ts`, `lib/types/picks.ts` |
| **9** | Frontend Shell + Ticker | `components/ui/**`, `components/layout/**`, `components/navigation/**`, `components/chart/**`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `app/(app)/ticker/**`, `lib/types/ui.ts` |
| **10** | Admin + Worker + Observability | `db/schema/audit.ts`, `db/schema/feature-flags.ts`, `app/(admin)/**`, `app/api/admin/**`, `app/api/health/**`, `worker/index.ts`, `worker/jobs/index.ts`, `lib/queue/**`, `lib/observability/**`, `lib/feature-flags/**`, `lib/types/admin.ts` |

**Yang DIMILIKI SCAFFOLD (jangan touch oleh agent kecuali ditambahkan dengan persetujuan):**
- `package.json`, `tsconfig.json`, `next.config.ts`, `drizzle.config.ts`, `postcss.config.mjs`, `components.json`, `.env.example`
- `middleware.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `lib/env.ts`, `lib/db.ts`, `lib/crypto.ts`, `lib/config.ts`, `lib/logger.ts`, `lib/utils/cn.ts`
- `db/schema/_base.ts`, `db/schema/config.ts`, `db/schema/index.ts`
- `db/migrate.ts`, `db/seed/index.ts`

**Boleh agent TAMBAH dep ke `package.json`?** TIDAK. Tulis di output report dep yang dibutuhkan; scaffold-owner akan tambahkan setelah review.

---

## 4. ⛔ NO HARDCODE — Aturan Inti

Setiap nilai berikut **WAJIB datang dari database**, bukan literal di kode atau `.env`:

- ❌ JANGAN hardcode harga subscription, batas quota, fitur per tier → ada di `subscription_tiers` & `tier_entitlements`
- ❌ JANGAN hardcode CORS origins, rate limit, security headers config → ada di `app_config` (key `security.cors.allowed_origins`, dll)
- ❌ JANGAN hardcode API key AI (DeepSeek/Anthropic/OpenAI) / vendor data / payment gateway → ada di `app_secrets` (encrypted dengan master key). Provider aktif baca dari `ai.provider` di `app_config`.
- ❌ JANGAN hardcode list sektor IDX-IC, indeks, ticker, broker → ada di tabel `sectors`, `indices`, `companies`, `brokers`
- ❌ JANGAN hardcode model AI yang dipakai, system prompt, prompt cache settings → ada di `ai_models` & `ai_prompts`
- ❌ JANGAN hardcode bobot scoring Daily Picks → ada di `picks_scoring_weights`
- ❌ JANGAN hardcode feature flags / toggles → ada di `feature_flags`
- ❌ JANGAN hardcode email templates, notification text → ada di `notification_templates` (skip kalau di luar scope agent, tapi struktur harus accommodate)
- ❌ JANGAN hardcode timeout, retry, backoff → ada di `app_config` (key `runtime.*`)
- ❌ JANGAN buat dummy/mock data — kalau belum ada data, tampilkan **empty state yang jelas** ("Belum ada data — admin perlu konfigurasi vendor data feed") dengan link ke `/admin/config`. Jangan return `Math.random()`, jangan return array static.

**Yang BOLEH di `.env` (HANYA 3 hal):**
1. `DATABASE_URL` — koneksi Postgres
2. `REDIS_URL` — koneksi Redis
3. `APP_MASTER_KEY` — 32-byte hex untuk decrypt `app_secrets`

Selain itu? Database.

### Pattern Konfigurasi yang Benar
```ts
// ❌ SALAH
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const MAX_AI_QUERIES_PER_DAY = 50;
const CORS_ORIGINS = ["https://nubuat.id", "http://localhost:3000"];

// ✅ BENAR
import { getSecret, getConfig } from "@/lib/config";

const provider = await getConfig<string>("ai.provider"); // "deepseek" | "anthropic" | "openai"
const apiKey = await getSecret(`ai.${provider}.api_key`);
const baseUrl = await getConfig<string>(`ai.${provider}.base_url`);
const model = await getConfig<string>(`ai.${provider}.default_model`);
const origins = await getConfig<string[]>("security.cors.allowed_origins");
```

### Bootstrap (saat DB kosong)
- Saat first run, `seed.ts` mengisi nilai default semua config dari `db/seed/*.ts`.
- Admin lalu login & ubah lewat `/admin/config` UI (Agent 10) → encrypt & simpan ke DB.
- Tanpa konfigurasi (mis. Anthropic key belum diisi), fitur AI tampilkan empty state: "Admin perlu konfigurasi API key di Settings".

---

## 5. DB & Schema Conventions

- **Primary key:** ULID (`text` column dengan default `gen_ulid()` SQL function — di-define di scaffold) — bukan int auto-increment, bukan UUID v4. Alasan: time-sortable, URL-safe, 26 char.
- **Timestamps:** semua tabel pakai mixin `withTimestamps` (`created_at`, `updated_at`) dari `db/schema/_base.ts`. Soft delete: `deleted_at nullable timestamp`.
- **Naming:** `snake_case` di SQL, `camelCase` di TS export. Drizzle handle mapping otomatis.
- **Index:** Setiap FK harus ada index. Setiap query pattern utama harus ada composite index — tulis di komentar Drizzle schema.
- **Migration:** Pakai `drizzle-kit generate`. JANGAN edit migration SQL manual. JANGAN `db push` di production.
- **Reference table:** semua reference data (sektor, indeks, papan) seed via `db/seed/*.ts`, BUKAN inline di kode app.
- **Audit:** mutasi sensitif (admin action, billing, secret change) WAJIB tulis ke `audit_log` (Agent 10).

---

## 6. API & Type Conventions

### Routing
- API route di `app/api/<domain>/<resource>/route.ts`
- Public route prefix `/api/public/*` (no auth)
- Authenticated `/api/*` (default — middleware check session)
- Admin `/api/admin/*` (middleware check admin role)

### Validation
- **Setiap request body & query param WAJIB validasi via Zod schema.**
- Schema di-export dari `lib/types/<domain>.ts` agar bisa dipakai FE+BE.
- Gunakan `drizzle-zod` untuk derive Zod schema dari Drizzle table kalau cocok.

### Response shape
```ts
// Success
{ ok: true, data: T }

// Error
{ ok: false, error: { code: string, message: string, details?: unknown } }
```
Helper di `lib/utils/api.ts` (boleh ditambahkan oleh scaffold). Jangan invent baru.

### Authentication helper
```ts
import { requireSession } from "@/lib/auth";
const session = await requireSession(); // throw 401 kalau no session
```

### Authorization (RBAC + tier check)
```ts
import { requireRole, requireTier } from "@/lib/auth";
await requireRole(session, "admin");
await requireTier(session, "pro"); // throws 403 with upgrade link
```

### Quota enforcement
```ts
import { consumeQuota } from "@/lib/billing";
await consumeQuota(session.userId, "ai.queries", { amount: 1 });
// throws QuotaExceededError → middleware return 429 + tier upgrade hint
```

---

## 7. Security Baseline (NON-NEGOTIABLE)

| Area | Aturan |
|---|---|
| **Secrets** | Hanya 3 env var. Sisanya di `app_secrets` (AES-256-GCM, master key dari env). |
| **Password** | Argon2id (via better-auth default config). Min 12 char. |
| **CSRF** | Better-Auth handle untuk credential flow. State+PKCE untuk OAuth. |
| **CORS** | Origin allowlist dari DB. Reject `*` di production. Diset di `middleware.ts` (scaffold). |
| **Headers** | CSP strict, HSTS preload, X-Frame-Options DENY, X-Content-Type-Options nosniff. Configurable via DB. |
| **Rate limit** | Per endpoint + per user via Redis. Default config di DB, override per tier. |
| **Input** | Semua via Zod. NEVER trust client. |
| **Output** | NEVER log password/token/PII. Pino redact paths configured. |
| **SQL injection** | Drizzle parameterized — JANGAN concatenate string SQL. |
| **PII logging** | NEVER log email full, NIK, no HP. Hash atau redact. |
| **Anthropic key** | Stored in `app_secrets`, decrypted at runtime in memory, never logged, never returned to client. |
| **AI prompt injection** | System prompt di DB, immutable hash check at load time. User input sanitized. |
| **AI cost guard** | Hard rate limit per user per tier (from `tier_entitlements`). Anomaly: per-user daily token cap → throw 429. |
| **Audit log** | Admin actions, secret access, billing event → `audit_log` table. |

---

## 8. Cross-Agent Contracts

Shared types & schemas di `lib/types/<domain>.ts`. Setiap agent EXPOSE type publiknya di sana, IMPORT type dari agent lain via path itu.

Cross-feature events via NATS-style topic (BullMQ pub/sub atau internal event bus di `lib/queue/`):
- `user.created` — Agent 3 emit, Agent 4 consume (auto-create free tier subscription)
- `subscription.changed` — Agent 4 emit, Agent 6/7/8 consume (re-cache entitlements)
- `picks.generated` — Agent 8 emit, Agent 10 emit notification
- `alert.triggered` — Agent 6 emit, Agent 10 emit notification
- `market.eod.ingested` — Agent 5 emit, Agent 8 consume (trigger pre-market picks gen)

Setiap agent dokumentasikan event yang di-emit & consume di file `EVENTS.md` masing-masing domain (di root agent's path).

---

## 9. Coding Conventions

- **No `any`** — pakai `unknown` + narrowing, atau define proper type. ESLint enforce.
- **No default exports** kecuali untuk Next.js page/route/component required signature.
- **Server vs Client component** — default Server. Tambah `"use client"` HANYA kalau perlu interactivity.
- **Server Action vs API Route** — Server Action untuk form mutation di UI, API Route untuk programmatic + WebSocket. Konsisten.
- **Error handling** — pakai custom error classes di `lib/errors.ts` (scaffold akan provide). Throw, jangan return `{ error }`.
- **Async/await everywhere** — no raw promise chain.
- **Import order** — node → external → `@/lib` → `@/db` → `@/components` → relative.
- **Tree shake friendly** — barrel files dibatasi; import langsung dari source file kalau bisa.
- **Comments** — minimal. Hanya untuk WHY non-obvious (constraint, workaround, surprise). JANGAN komentari WHAT yang sudah jelas dari nama.

---

## 10. Definition of Done (Per Agent)

Sebelum claim "selesai", verify checklist berikut:
- [ ] Semua file ada di path yang dimiliki agent — tidak melebar
- [ ] Drizzle schema compile (`tsc --noEmit` pass)
- [ ] Zod validation di semua API route
- [ ] Tidak ada hardcode (cek manual: grep ticker hardcode, harga literal, API key string, dll)
- [ ] Tidak ada `process.env.X` selain `DATABASE_URL`, `REDIS_URL`, `APP_MASTER_KEY`
- [ ] Tidak ada mock/dummy/random data
- [ ] Audit log call untuk action sensitif
- [ ] Tier/quota check di endpoint yang relevan
- [ ] README singkat di folder agent menjelaskan API + dependency
- [ ] EVENTS.md mendokumentasikan event emit/consume
- [ ] Tulis ringkasan ≤200 kata di akhir respons: file yang ditulis, dep yang dibutuhkan (untuk scaffold-owner), event yang di-emit, blocker.

---

## 11. Definisi "Real Data" untuk MVP

Karena belum ada API key vendor data berbayar saat MVP start:

1. **Market Data (Agent 5):** implementasikan **adapter pattern**. Default adapter: **Yahoo Finance unofficial endpoint** (`query1.finance.yahoo.com`) untuk ticker IDX dengan suffix `.JK` (mis. `BBRI.JK`) — gratis, real data, cukup untuk EoD & quote. Adapter alternatif (Invezgo, OHLC.dev) di-stub dengan interface yang sama; aktif kalau API key di-set di `/admin/config`.
2. **Companies (Agent 2):** seed dari list IDX80 dengan metadata nyata (nama emiten, sektor, papan) dari data publik. JANGAN nama palsu.
3. **AI (Agent 7):** Pakai `openai` SDK dengan `baseURL` dari `ai.<provider>.base_url` & `apiKey` dari `app_secrets` key `ai.<provider>.api_key`. Provider aktif dari `ai.provider` di `app_config` (default `deepseek`, model `deepseek-v4-flash`). Kalau key kosong → UI tampilkan "Setup required: admin add API key di /admin/config". JANGAN buat fake AI response.
4. **Daily Picks (Agent 8):** generate dari data market real yang sudah masuk DB. Kalau data belum ada → empty state.
5. **Research (post-MVP):** tidak include di MVP scope kecuali Agent 7 mau buat stub schema.

Empty state UI: jelas, action-oriented, link ke setup admin.

---

## 12. Master Encryption Key

**Format:** 64 hex char (32 byte raw).
**Generate:** `openssl rand -hex 32`
**Storage:** `.env` lokal saat dev. Produksi: secret manager (AWS Secrets Manager / GCP Secret Manager). NEVER commit.
**Algorithm:** AES-256-GCM, IV per-encryption (12 byte random), auth tag stored bersama ciphertext.
**Helper:** `lib/crypto.ts` provide `encryptSecret(plaintext)` dan `decryptSecret(ciphertext)`.
**Rotation:** schema accommodate `key_version` di `app_secrets`. Rotation procedure dokumentasi di Agent 10 admin panel.

---

## 13. Folder Structure (Reference)

```
app/                              # Next.js app root (working dir for all agents)
├── app/                          # Next.js App Router
│   ├── layout.tsx                # SCAFFOLD
│   ├── page.tsx                  # SCAFFOLD (landing)
│   ├── globals.css               # SCAFFOLD
│   ├── (auth)/                   # AGENT 3
│   ├── (app)/                    # AGENT 9 owns layout; sub-routes owned by 4/6/7/8
│   ├── (admin)/                  # AGENT 10
│   └── api/                      # split by agent
├── components/
│   ├── ui/                       # AGENT 9 (shadcn primitives)
│   ├── layout/                   # AGENT 9
│   ├── navigation/               # AGENT 9
│   ├── chart/                    # AGENT 9
│   ├── ai/                       # AGENT 7
│   ├── watchlist/                # AGENT 6
│   ├── alerts/                   # AGENT 6
│   ├── picks/                    # AGENT 8
│   ├── billing/                  # AGENT 4
│   ├── auth/                     # AGENT 3
│   └── forms/                    # shared, agent yang butuh add
├── lib/
│   ├── env.ts                    # SCAFFOLD
│   ├── db.ts                     # SCAFFOLD
│   ├── crypto.ts                 # SCAFFOLD
│   ├── config.ts                 # SCAFFOLD
│   ├── logger.ts                 # SCAFFOLD
│   ├── errors.ts                 # SCAFFOLD
│   ├── auth/                     # AGENT 3
│   ├── billing/                  # AGENT 4
│   ├── market-data/              # AGENT 5
│   ├── watchlist/                # AGENT 6
│   ├── alerts/                   # AGENT 6
│   ├── ai/                       # AGENT 7
│   ├── picks/                    # AGENT 8
│   ├── queue/                    # AGENT 10
│   ├── feature-flags/            # AGENT 10
│   ├── observability/            # AGENT 10
│   ├── types/                    # ALL — shared types
│   └── utils/                    # ALL — pure utils only
├── db/
│   ├── schema/
│   │   ├── _base.ts              # SCAFFOLD
│   │   ├── config.ts             # SCAFFOLD
│   │   ├── reference.ts          # AGENT 1
│   │   ├── companies.ts          # AGENT 2
│   │   ├── auth.ts               # AGENT 3
│   │   ├── billing.ts            # AGENT 4
│   │   ├── market.ts             # AGENT 5
│   │   ├── user-data.ts          # AGENT 6
│   │   ├── ai.ts                 # AGENT 7
│   │   ├── picks.ts              # AGENT 8
│   │   ├── audit.ts              # AGENT 10
│   │   ├── feature-flags.ts      # AGENT 10
│   │   └── index.ts              # SCAFFOLD (barrel — agents append exports)
│   ├── seed/
│   │   ├── index.ts              # SCAFFOLD (orchestrator)
│   │   ├── config.ts             # SCAFFOLD (default app_config & feature flags)
│   │   ├── reference.ts          # AGENT 1
│   │   ├── companies.ts          # AGENT 2
│   │   ├── tiers.ts              # AGENT 4
│   │   └── ...
│   ├── migrate.ts                # SCAFFOLD
│   └── migrations/               # auto-generated, JANGAN edit manual
├── worker/
│   ├── index.ts                  # AGENT 10
│   └── jobs/                     # per-agent
├── middleware.ts                 # SCAFFOLD
├── AGENTS.md                     # this file
└── README.md                     # SCAFFOLD
```

---

## 14. Definisi Selesai Global

MVP dianggap selesai kalau:
1. `npm install` sukses dari clean
2. `npm run db:migrate && npm run db:seed` sukses dari Postgres kosong
3. `npm run dev` jalan tanpa error
4. Login dengan email/password (signup → email verification dummy ok)
5. Admin (user pertama yang signup, atau via env `ADMIN_BOOTSTRAP_EMAIL`) bisa akses `/admin/config` dan set Anthropic API key
6. User bisa lihat list Top IDX80 di dashboard
7. User bisa add ticker ke watchlist
8. User bisa buka ticker page → lihat chart real data Yahoo Finance
9. User bisa chat dengan AI Copilot (setelah admin set key)
10. User bisa lihat Daily Picks (setelah worker pertama run)
11. Worker BullMQ jalan & memproses jobs scheduled
12. Tidak ada satupun hardcoded secret / config / tier / price / ticker / API key di code (grep audit)
