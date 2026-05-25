# Deploy Guide — Nubuat

Pre-deploy checklist & Vercel config. Update ketika ada perubahan env var atau build setting.

---

## Pre-deploy validation (run lokal sebelum push)

```bash
# 1. Type check — sama dengan husky pre-commit
npx tsc --noEmit

# 2. Production build dengan dummy DB — mirror Vercel build sandbox
NODE_ENV=production \
DATABASE_URL="postgres://dummy:dummy@dummy.invalid:5432/dummy" \
DATABASE_URL_UNPOOLED="postgres://dummy:dummy@dummy.invalid:5432/dummy" \
REDIS_URL="redis://dummy.invalid:6379" \
APP_MASTER_KEY="0000000000000000000000000000000000000000000000000000000000000000" \
NEXT_PUBLIC_APP_URL="https://example.com" \
npm run build
```

Husky pre-push hook menjalankan kedua command di atas otomatis. Tidak perlu manual kecuali debugging.

---

## Vercel project settings

| Setting | Value |
|---|---|
| **Root Directory** | `app` (kalau repo punya folder `/app` sebagai Next.js root) |
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` (default — biarkan default) |
| **Install Command** | `npm install` (default) |
| **Node Version** | 22.x (match `.nvmrc`) |

### Environment Variables (Vercel Dashboard → Settings → Environment Variables)

**WAJIB — set untuk semua environment (Production/Preview/Development):**

| Key | Value | Catatan |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Connection pooler URL (Neon/Supabase/RDS) |
| `DATABASE_URL_UNPOOLED` | `postgresql://...` | Non-pooled URL (untuk migration) — opsional kalau pakai single DB |
| `REDIS_URL` | `redis://...` | Upstash Redis / managed Redis |
| `APP_MASTER_KEY` | 64 hex chars | Generate: `npm run generate:key`. **Generate ulang per environment.** |
| `NEXT_PUBLIC_APP_URL` | `https://...` | Domain Vercel atau custom domain |

**OPSIONAL:**

| Key | Value | Catatan |
|---|---|---|
| `ADMIN_BOOTSTRAP_EMAIL` | `superadmin@yourdomain.com` | Email yang otomatis dapat role superadmin saat signup pertama |
| `BOOTSTRAP_AI_DEEPSEEK_API_KEY` | `sk-...` | One-shot: hapus setelah `npm run db:seed` |

**⚠️ JANGAN set:**
- `NODE_ENV` — Vercel auto-set ke `production`. Override akan trigger warning "non-standard NODE_ENV".

---

## Troubleshooting common deploy errors

### `Error: <Html> should not be imported outside of pages/_document`

Misleading error message. Real cause biasanya:
1. **DB unreachable saat static prerender** → page throw → Next.js fallback ke Pages Router `_error` (yang punya `<Html>` import). Fix: pastikan `getConfig`/`getConfigs` di pages public pakai `defaultValue`, dan `lib/config.ts` punya try/catch fallback (sudah ada).
2. **No `app/not-found.tsx` / `app/global-error.tsx`** — keduanya wajib ada di App Router project (sudah ada).
3. **Force-dynamic di `not-found.tsx` atau root layout** — JANGAN — bikin not-found di-skip dari static gen, fallback ke Pages `_error`.

### `ERESOLVE could not resolve` saat `npm install`

Peer dependency conflict. `app/.npmrc` punya `legacy-peer-deps=true` — pastikan tidak terhapus.

### Pages auth-gated gagal prerender dengan `UnauthorizedError`

Pages di `(app)`, `(admin)`, `(auth)` pakai `requireSession()` — wajib `export const dynamic = "force-dynamic"` di layout masing-masing (sudah ada).

### Module not found `@sentry/nextjs` / `posthog-js`

Optional observability packages. Imports di `lib/observability/*` pakai `// @ts-expect-error optional-dep` — kalau mau aktifkan, `npm install @sentry/nextjs posthog-js @sentry/node` lalu hapus comment.

---

## Post-deploy verification

Setelah Vercel build hijau:

1. Buka `https://<deployment-url>/`
2. Test signup → harus arah ke `/dashboard` (atau onboarding)
3. Test `/login` dengan credential dari `CREDENTIALS.md` (kalau demo seed sudah dijalankan)
4. Cek `/admin` — superadmin pertama login pakai email `ADMIN_BOOTSTRAP_EMAIL`
5. Cek `/api/health` (kalau ada) — should return 200

---

## First-time deploy (dari nol)

1. Push repo ke GitHub
2. Import project ke Vercel → set Root Directory = `app`
3. Set env vars (lihat tabel di atas)
4. Trigger deploy → tunggu build hijau
5. Jalankan migrations: `vercel env pull && npx drizzle-kit push` atau via Vercel CLI
6. Seed demo data (opsional): `npm run db:seed-demo`
7. Login pakai `ADMIN_BOOTSTRAP_EMAIL` → role auto-promoted ke superadmin saat signup pertama
8. Hapus BOOTSTRAP_* env vars dari Vercel (sudah masuk DB encrypted via `app_secrets`)
