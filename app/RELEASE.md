# Release Runbook — Nubuat (prod)

Urutan rilis branch `feat/launch-blockers-elliott-screener-uiux` ke produksi.
Jalankan **berurutan**. Semua langkah idempotent (aman diulang).

> Prasyarat env di prod (Vercel → Settings → Environment Variables):
> `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `REDIS_URL`, `APP_MASTER_KEY`,
> `BLOB_READ_WRITE_TOKEN` (logo), `ALPHA_VANTAGE_API_KEY` (opsional, failover),
> `email.resend.api_key` & `ai.<provider>.api_key` (via /admin/config, di DB).

---

## 1. Pra-rilis (lokal, sebelum push)
```bash
cd app
npm run typecheck          # tsc 0 error
npm test                   # 374 test lulus
NODE_ENV=production DATABASE_URL=postgres://dummy:dummy@dummy.invalid:5432/dummy \
  DATABASE_URL_UNPOOLED=postgres://dummy:dummy@dummy.invalid:5432/dummy \
  REDIS_URL=redis://dummy.invalid:6379 \
  APP_MASTER_KEY=0000000000000000000000000000000000000000000000000000000000000000 \
  NEXT_PUBLIC_APP_URL=https://example.com npm run build   # build hijau
```

## 2. Push & deploy code
```bash
git push origin feat/launch-blockers-elliott-screener-uiux
```
- Buka PR → merge ke `main` (Vercel auto-deploy), ATAU set branch ini sebagai production branch.
- Pastikan **Vercel Framework Preset = Next.js**, Root Directory = `app` (akar masalah deploy lama).

## 3. Schema DB prod (SEBELUM trafik kena tabel/kolom baru)
```bash
cd app
npm run db:push            # drizzle-kit push → jawab "Yes" (buat glossary_terms,
                           # kolom users.deletion_requested_at/scheduled_deletion_at, dll)
psql "$DATABASE_URL" -f db/migrations/0000_audit_log_immutability.sql   # audit append-only
psql "$DATABASE_URL" -f db/migrations/0001_companies_trgm_search.sql    # pg_trgm + GIN index
```

## 4. Data (idempotent — satu perintah)
```bash
npm run post-deploy        # refresh copy (tagline/landing/legal jadi "kamu" + trial 7d Pro),
                           # re-seed tiers (Starter 99k/Pro 299k/Elite 899k) + glossary 64 istilah,
                           # grandfather user lama -> emailVerified=true
```

## 5. Logo emiten (self-host, lama ± belasan menit)
```bash
npm run logos:sync         # download → WebP 128px → Vercel Blob → companies.logoUrl
                           # prod punya data `website` → coverage ~980 emiten
```

## 6. Verifikasi (smoke test prod)
- Login (akun nyata) → masuk /dashboard (tidak ke-bounce ke /verify-email).
- `/pricing` (tanpa login) → harga benar (99k/299k/899k), tier Elite (bukan Enterprise).
- Tagline hero = "Nubuat 👍 - Nubie Berbuat..." ; copy pakai "kamu".
- `/glossary` (search jalan), `/about`, `/picks-archive`, `/status` → 200.
- Logo emiten muncul di homepage showcase & ticker.
- Worker jalan: cek cron (picks-evaluator 16:30, trial-drip 09:00, daily-digest, dll).

---

## Catatan
- **Vendor data bandarmology/real-time** belum dikontrak → Spike Detection, Broker
  Stalker, foreign-flow live menampilkan empty-state sampai data masuk.
- Setelah verifikasi prod mulus, baru buka **closed beta**.
- Untuk re-deploy berikutnya: ulangi 1→2→4 (skip 3 kalau tak ada perubahan schema;
  skip 5 kalau logo sudah ter-sync).
