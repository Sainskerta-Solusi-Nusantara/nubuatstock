# ROLES.md — Sistem Role Nubuat

> **3-tier role:** `user` → `admin` → `superadmin`
> Hierarchy: `superadmin` > `admin` > `user`. `requireAdmin` mengizinkan admin **atau** superadmin (admin = subset superadmin).

---

## Ringkas Per Role

| Role | Siapa | Akses Dashboard | Akses Admin | Akses Superadmin |
|---|---|---|---|---|
| **user** | Trader retail | ✅ `/(app)/*` | ❌ | ❌ |
| **admin** | Ops staff | ✅ + ✅ `/(admin)/*` | ✅ | ❌ |
| **superadmin** | Founder/CTO | ✅ + ✅ + ✅ `/(admin)/superadmin/*` | ✅ | ✅ |

---

## Breakdown Fitur per Role

### 🧑‍💼 USER — `/(app)/*`

Default semua user yang sign up. Akses fitur yang tier-gated berdasarkan `subscription_tiers` (Free / Starter / Pro / Elite).

| Halaman | Fitur |
|---|---|
| `/dashboard` | Daily Brief, top 5 picks, watchlist preview, market overview IHSG + sektor, recent AI conversations |
| `/watchlist` | CRUD watchlist & items, real-time quote refresh tiap 30s, add ticker via combobox |
| `/alerts` | CRUD alerts (price, % change, volume spike, MA cross, RSI threshold), history triggers |
| `/picks` | Daily Picks list dengan SR/SL/TP, detail per pick + chart overlay + factor breakdown + narrative AI |
| `/copilot` | AI chat (DeepSeek), conversation history, tool use (get_quote, get_ohlcv, get_company_info, compute_indicators, search_companies, get_user_watchlist, get_daily_picks) |
| `/ticker/[code]` | Detail ticker 8 tab (Overview / Technical / Fundamental / Bandarmology / Brokermology / News / Research / AI) |
| `/subscription` | Pricing comparison, manage plan, billing history, cancel |
| `/settings` | Profile, preferences (locale, timezone, density), MFA, sessions |

**Tier gating:**
- Free: 10 watchlist, 3 alerts, 1 Daily Pick visible, 5 AI queries/day, quote delayed 15m
- Starter: unlimited watchlist, 20 alerts, 3 picks, 50 AI/day, real-time quote, foreign flow daily
- Pro: unlimited alerts, 10 picks + intraday refresh, 500 AI/day, broker summary full, foreign flow 1h
- Elite: 10 picks, AI unlimited + deep mode (Opus), foreign flow 5m intraday, paper trading, strategy marketplace, API access

---

### 🛡️ ADMIN — `/(admin)/*`

Ops staff yang manage konfigurasi & moderasi. **TIDAK punya akses ke Superadmin** (landing CMS, role assignment, deep stats).

| Halaman | Fitur |
|---|---|
| `/admin` | Overview: total users by tier, MRR estimate, today's signups, AI usage today, picks generated today |
| `/admin/config` | Edit `app_config` per category. Diff preview sebelum save. Audit log otomatis. |
| `/admin/secrets` | Set/rotate API keys (AI, vendor, payment, SMTP). **Hanya status "✓ Configured" / "○ Not Set" — ciphertext tidak ditampilkan.** |
| `/admin/feature-flags` | Toggle flags, edit rollout strategy (all/percentage/tier_min/user_list/role) |
| `/admin/users` | List users, suspend/unsuspend, force logout, view detail (subscription, usage, audit) |
| `/admin/audit` | Viewer audit log dengan filter actor/action/date |
| `/admin/jobs` | BullMQ queue status — waiting/active/completed/failed, retry, remove |
| `/admin/pricing` | Manage `subscription_tiers` + `tier_entitlements` — edit harga, fitur, quota |
| `/admin/ai-prompts` | Manage system prompts (versioned). Set active version. |

**Admin TIDAK BISA:**
- Edit landing page content
- Promote user ke admin/superadmin (hanya superadmin yang bisa)
- Akses deep growth/revenue analytics
- Modify role assignment

---

### 👑 SUPERADMIN — `/(admin)/superadmin/*`

Founder/CTO level. Akses penuh semua admin power **+** exclusive superadmin features.

| Halaman | Fitur |
|---|---|
| `/superadmin` | Overview dashboard: 4 KPI cards (Total Users, MRR, Paying Users, Active 7d), 30-day growth chart (signups & active), tier breakdown bar chart, revenue health (new/churned MRR), system health (AI cost burn, queries, picks, alerts, conversion %) |
| `/superadmin/growth` | Deep growth analytics — cohort retention, funnel signup→activation→paid, channel attribution |
| `/superadmin/revenue` | MRR waterfall, expansion/contraction, LTV per cohort, payment failures, refunds |
| `/superadmin/landing` | **CMS landing page** — edit semua text (headline, subheadline, painpoints, fitur, FAQ, emiten showcase, footer). Live preview via ISR revalidate. Audit log tiap save. |
| `/superadmin/users` | Promote/demote role (user ↔ admin ↔ superadmin). Self-demotion locked (anti-lockout). Audit log tiap perubahan. |
| `/superadmin/system` | DB latency, Redis health, AI cost forecast, worker heartbeat, error rate breakdown |

**Superadmin EXCLUSIVE:**
- Landing CMS edit (admin tidak bisa)
- Role assignment (admin tidak bisa)
- Deep growth/revenue analytics (admin tidak bisa)
- System health detail (admin lihat ringkasan saja)
- Dangerous ops: bulk operations, data export, force migrations

---

## Bootstrap & Promosi Role

### Bootstrap superadmin pertama
Saat seed pertama:
1. Set env `ADMIN_BOOTSTRAP_EMAIL=founder@nubuat.id` di `.env`
2. Founder signup pakai email tersebut
3. Better-Auth signup hook (Agent 3) detect match → set `users.role = "superadmin"`

### Promosi staff ke admin
Superadmin login → `/superadmin/users` → search email staff → klik icon Shield (admin) → konfirmasi → audit log otomatis.

### Demote / lockout protection
- Superadmin **tidak bisa demote diri sendiri** (anti-lockout — kalau dia sendirian).
- API endpoint `/api/superadmin/users/[id]/role` enforce ini di backend.
- Frontend tetap show button supaya superadmin lain bisa demote.

---

## Implementasi Helper

### `lib/auth/roles.ts`
```ts
import { requireRoleAtLeast, requireAdminOrHigher, requireSuperadmin } from "@/lib/auth/roles";

// User route
const session = await getSession();
if (!session) throw new UnauthorizedError();

// Admin route (admin atau superadmin OK)
await requireAdminOrHigher(session);

// Superadmin-only route
await requireSuperadmin(session);

// Custom level
await requireRoleAtLeast(session, "admin");
```

### Layout gating
- `app/(admin)/layout.tsx` → `requireAdminOrHigher` (Agent 10)
- `app/(admin)/superadmin/layout.tsx` → `requireSuperadmin` (file `superadmin/layout.tsx`)

### API endpoints
- `/api/admin/**` → `requireAdminOrHigher`
- `/api/superadmin/**` → `requireSuperadmin`
- `/api/superadmin/users/[id]/role` → `requireSuperadmin` + self-demote check

---

## Audit Log (untuk role changes)

Setiap perubahan role tercatat di `audit_log` dengan:
```json
{
  "action": "user.role_change",
  "actor_user_id": "<superadmin_id>",
  "actor_role": "superadmin",
  "target_type": "user",
  "target_id": "<target_user_id>",
  "before": { "role": "user" },
  "after": { "role": "admin" },
  "metadata": { "targetEmail": "staff@nubuat.id" },
  "ip": "...",
  "user_agent": "...",
  "request_id": "..."
}
```

Audit log immutable (append-only) — dipakai untuk forensic & compliance.

---

## Schema Note

`users.role` di-store sebagai text column (bukan PostgreSQL enum) untuk fleksibilitas tambah role baru tanpa migration. Valid values di-enforce di application layer via `isValidRole()`.

Future role expansion candidate:
- `analyst` — content/research team yang bisa publish picks manual + research report
- `support` — read-only access ke user info + impersonation untuk debugging
- `auditor` — read-only access ke audit log dan compliance reports
