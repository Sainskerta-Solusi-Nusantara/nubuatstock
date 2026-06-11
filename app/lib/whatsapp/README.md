# WhatsApp Channel → Sinyal Internal (Mirae)

Ingest Daily Picks dari **WhatsApp Channel Mirae** via [Baileys](https://github.com/WhiskeySockets/Baileys) (userbot tidak resmi), diparse jadi **sinyal internal** dan disimpan ke `securities_picks` dengan label `Mirae Asset (WA · internal)`.

## Kebijakan (penting)

- **Bukan rebroadcast verbatim.** Tabel `securities_picks` sudah **superadmin-only** (tidak tampil ke user). Tujuan: input internal untuk metode kita, bukan klaim "Rekomendasi Mirae".
- **Risiko legal & ban.** Baileys melanggar ToS WhatsApp → **pakai nomor khusus** (bukan nomor pribadi), siap kalau di-banned. Nomor bot saat ini: `+6281284190511`.
- **Tidak jalan di Vercel.** Butuh koneksi WA persisten → **proses long-running di worker/VPS**. DORMANT sampai itu tersedia.

## Komponen

| File | Fungsi |
|---|---|
| `db/schema/wa-auth.ts` + migrasi `0021` | Auth-state Baileys persist ke Postgres (`wa_auth_state`) |
| `lib/whatsapp/auth-store.ts` | Adapter auth-state DB (pengganti `useMultiFileAuthState`) |
| `lib/whatsapp/client.ts` | `createWaSocket()` — socket + persist creds |
| `lib/whatsapp/ingest-mirae.ts` | Listener channel → `extractPicksFromText` (DeepSeek) → `addSecuritiesPick` (internal) |
| `scripts/wa-login.ts` (`npm run wa:login`) | Pairing nomor bot **sekali** (kode 8-karakter) |
| `worker/wa-mirae.ts` (`npm run wa:listen`) | Listener long-running + auto-reconnect |

## Cara aktivasi (saat worker/VPS sudah ada)

1. **Pairing nomor bot** (HP bot harus pegang nomor `+6281284190511`):
   ```bash
   npm run wa:login
   ```
   Cetak kode pairing → di HP bot: **WhatsApp → Setelan → Perangkat Tertaut → Tautkan dengan nomor telepon** → masukkan kode. Sesi tersimpan ke DB.

2. **Follow channel Mirae** dari nomor bot, lalu ambil **JID** channel (format `xxxxxxxxxxxxx@newsletter`).

3. **Set config** `whatsapp.mirae_channel_jid` = JID tersebut (via admin config / DB `app_config`).

4. **Jalankan listener** (proses tetap hidup di VPS, mis. via pm2/systemd):
   ```bash
   npm run wa:listen
   ```
   Pesan baru di channel → otomatis diekstrak & di-upsert ke `securities_picks` (idempoten per tanggal+kode).

## Catatan

- Ekstraksi AI memakai DeepSeek (config `ai.*`) — sama dengan auto-fetch Telegram.
- Jika nomor di-banned: ganti nomor, `wa:login` ulang dengan nomor baru.
- Versi Baileys: `7.0.0-rc13` (API newsletter bisa berubah antar versi — cek `node_modules/@whiskeysockets/baileys/lib/Socket/newsletter.js` kalau upgrade).
- **Roadmap fase 2:** alirkan sinyal ini sebagai faktor ke engine scoring Daily Picks (belum — sekarang baru tersimpan sebagai referensi internal).
