# 🔑 Demo Credentials — Nubuat (Development Only)

> ⚠️ **HANYA UNTUK DEVELOPMENT/STAGING.** Password ini dummy & terdokumentasi. JANGAN dipakai di production. Ganti `.env ADMIN_BOOTSTRAP_EMAIL` ke akun real saat deploy ke production, hapus demo users.

---

## Demo Users (run `npm run db:seed-demo`)

| Email | Password | Role | Akses |
|---|---|---|---|
| `user@nubuat.local` | `NubuatUser2026!` | `user` | Dashboard standar (watchlist, picks, AI, alerts, subscription) |
| `admin@nubuat.local` | `NubuatAdmin2026!` | `admin` | + `/admin/*` (config, secrets, users, audit, jobs, pricing, AI prompts) |
| `superadmin@nubuat.local` | `NubuatSuper2026!` | `superadmin` | + `/superadmin/*` (landing CMS, role assignment, growth/revenue analytics) |

**Login:** http://localhost:3000/login

---

## Bootstrap Superadmin Otomatis

`.env` default punya `ADMIN_BOOTSTRAP_EMAIL=admin@nubuat.local`. **Ubah ke `superadmin@nubuat.local`** supaya akun pertama yang signup (manual lewat /signup atau via seed script) otomatis dapat role `superadmin`.

Atau pakai `npm run db:seed-demo` — script ini akan:
1. Buat 3 demo user lewat Better-Auth (idempotent — skip kalau sudah ada)
2. UPDATE role mereka langsung di DB
3. Email auto-verify (skip email verification flow untuk demo)

---

## Workflow Login per Role

### User biasa
1. Login → redirect `/dashboard`
2. Akses watchlist, alerts, picks, copilot, subscription
3. Tier default: **Free** (10 watchlist, 5 AI/hari, quote delayed 15m)
4. Bisa upgrade ke Starter/Pro/Elite via `/subscription`

### Admin
1. Login → redirect `/dashboard` (same as user)
2. Bisa akses `/admin` di topbar avatar dropdown
3. Bisa edit `app_config`, set secrets (API key, dll), manage tier pricing, view audit log
4. TIDAK BISA edit landing page atau assign role

### Super Admin
1. Login → redirect `/dashboard`
2. Bisa akses `/admin` DAN `/superadmin` di topbar dropdown
3. Power tambahan: landing CMS editor, growth analytics, revenue dashboard, role assignment
4. Bisa promote/demote user lain ke admin/superadmin
5. TIDAK BISA demote diri sendiri (anti-lockout)

---

## Trial 3 Hari (untuk user baru via landing)

User signup lewat link `/signup?trial=starter`:
1. Setelah signup sukses, frontend call `/api/billing/start-trial`
2. Backend create `user_subscriptions` row dengan:
   - `tier_kode = "starter"` (atau dari `app_config.trial.default_tier`)
   - `status = "trialing"`
   - `trial_ends_at = NOW() + 3 days` (atau dari `app_config.trial.duration_days`)
3. Setelah expire → auto-downgrade ke `free` (worker job atau lazy-check saat akses)

Untuk demo user, semua trial sudah skip — role-based access overrides tier.

---

## Reset Demo Users

```bash
# Hapus demo users dari DB
psql $DATABASE_URL -c "DELETE FROM users WHERE email LIKE '%@nubuat.local';"

# Re-seed
npm run db:seed-demo
```

Atau via Drizzle Studio: `npm run db:studio` → table users → filter & delete.

---

## ⚠️ Production Checklist (sebelum deploy)

- [ ] Hapus seluruh demo user dari DB
- [ ] Hapus baris `BOOTSTRAP_AI_DEEPSEEK_API_KEY` dari `.env` (nilai sudah di `app_secrets`)
- [ ] Ubah `ADMIN_BOOTSTRAP_EMAIL` ke email founder real
- [ ] Generate `APP_MASTER_KEY` baru via `npm run generate:key` (jangan reuse dev key)
- [ ] Aktifkan production-grade Redis (Upstash atau ElastiCache, bukan localhost)
- [ ] Set `NODE_ENV=production`
- [ ] Verify `security.cors.allowed_origins` di DB sudah include domain produksi
- [ ] Verify TLS, HSTS, CSP headers via `/admin/config security.*`
- [ ] Setup proper backup schedule untuk Postgres
- [ ] Enable Vercel/Cloudflare WAF + rate limit
- [ ] Run `npm run db:seed-demo` HANYA di staging, JANGAN di production
