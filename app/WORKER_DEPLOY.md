# Worker Deploy — Nubuat (BullMQ)

Worker (`worker/index.ts`) = proses **long-running** yang menjalankan job terjadwal:
ingest-eod, compute-technical-snapshots, ingest-news, score-news-sentiment,
generate-picks, evaluate-pick-outcomes, analyze-elliott, detect-patterns,
trial-drip, account-deletion-sweep, expire-trial, daily-digest, check-alerts.

⚠️ **Tidak bisa di Vercel** (serverless = tak ada proses persisten). Host terpisah,
sambungkan ke **Neon (DB) + Upstash (Redis)** yang SAMA dengan app Vercel.

Start command: **`npm run worker:prod`** (`tsx worker/index.ts` — env dari host, bukan `.env`).

---

## Opsi A — Railway (paling cepat)
1. railway.app → **New Project → Deploy from GitHub repo** → pilih `nubuatstock`.
2. Service settings:
   - **Root Directory**: `app`
   - **Start Command**: `npm run worker:prod`
   - (Build pakai Nixpacks otomatis — Node dari `.nvmrc`.)
3. **Variables** (samakan dengan Vercel — worker butuh ini):
   ```
   DATABASE_URL=postgresql://...ep-muddy-pond...-pooler.../neondb?sslmode=require
   DATABASE_URL_UNPOOLED=postgresql://...ep-muddy-pond.../neondb?sslmode=require
   REDIS_URL=rediss://...upstash.io:6379
   APP_MASTER_KEY=<sama dgn Vercel — WAJIB sama untuk decrypt secret>
   NODE_ENV=production
   ```
   (Kalau pakai integrasi, `POSTGRES_URL`/`KV_URL` juga di-fallback otomatis oleh `lib/env.ts`.)
4. Deploy. Cek log: "Worker bootstrap" + schedules loaded. Health app prod → `worker: ok`.

## Opsi B — Render
- New **Background Worker** → repo → Root `app` → Build `npm ci` → Start `npm run worker:prod` → env sama.

## Opsi C — Fly.io / VPS
- `fly launch` (atau VPS + pm2/systemd) jalankan `npm run worker:prod`, env via secrets.

---

## Verifikasi setelah worker hidup
- App prod `/api/health` → `worker.status: ok` (heartbeat masuk).
- Job terjadwal mulai mengisi DB: `quotes_eod` (16:00 WIB), `technical_snapshots`,
  `news_articles`, `daily_picks`, dll (lihat cron di `lib/queue/scheduler.ts`).
- Untuk isi awal (tanpa nunggu cron), trigger sekali via enqueue (atau panggil
  processor langsung seperti `worker/jobs/*`).

## Catatan
- **Satu** worker instance cukup (BullMQ pakai Redis untuk koordinasi).
- Bandarmology (broker/foreign flow) tetap kosong sampai **vendor data** dikontrak.
- Resource: ~512MB–1GB RAM cukup untuk worker.
