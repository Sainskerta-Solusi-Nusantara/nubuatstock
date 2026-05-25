import { db } from "../../lib/db";
import { appConfig } from "../schema/config";
import { logger } from "../../lib/logger";

/**
 * Seed konten legal (Privacy Policy, Terms of Service, Disclaimer) ke app_config.
 *
 * STATUS: TEMPLATE STARTER — wajib di-review oleh legal counsel pasar modal
 * Indonesia (Hadiputranto, Assegaf, Makarim & Taira, atau setara) sebelum
 * launch publik. Pasal-pasal harus disesuaikan dengan:
 *   - UU 27/2022 (Perlindungan Data Pribadi)
 *   - POJK 32/2025 (fintech payment)
 *   - OJK Bapepam V.C.1 (Penasihat Investasi)
 *   - UU 11/2008 jo. UU 19/2016 (ITE)
 *
 * Superadmin edit live via /superadmin/legal (jika dibuat) atau /admin/config
 * filter category="legal".
 */

const legalContent: Array<{
  key: string;
  value: string;
  description: string;
}> = [
  {
    key: "legal.privacy.last_updated",
    value: "2026-05-11",
    description: "Tanggal update terakhir Privacy Policy (format YYYY-MM-DD).",
  },
  {
    key: "legal.privacy.body_md",
    description: "Privacy Policy body dalam Markdown. Wajib UU PDP 27/2022 compliant.",
    value: `# Kebijakan Privasi

**Berlaku sejak:** 11 Mei 2026

Kebijakan Privasi ini menjelaskan bagaimana **Nubuat** ("kami", "platform") mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda sesuai dengan **Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**.

## 1. Data yang Kami Kumpulkan

### 1.1 Data yang Anda berikan langsung
- Email, nama lengkap, nomor telepon (saat registrasi)
- Password (disimpan terhenkripsi Argon2id, tidak pernah dalam bentuk plain text)
- Preferensi: bahasa, timezone, watchlist, alerts, riwayat AI chat
- Data pembayaran (kartu, e-wallet) — diproses oleh penyedia layanan pembayaran (Midtrans/Xendit), kami **tidak menyimpan** nomor kartu

### 1.2 Data yang dikumpulkan otomatis
- Alamat IP, user-agent, device fingerprint (untuk keamanan & deteksi fraud)
- Log aktivitas (login, view ticker, query AI, download riset)
- Cookies session & preferensi tampilan

### 1.3 Data dari pihak ketiga
- Data harga & fundamental emiten dari Yahoo Finance, IDX, KSEI (data publik, bukan data pribadi)
- Email verifikasi dari penyedia OAuth (Google) kalau Anda login pakai Google

## 2. Dasar Hukum & Tujuan Pemrosesan

| Tujuan | Dasar Hukum (UU PDP Ps. 20) |
|---|---|
| Penyediaan layanan analisa saham | Pelaksanaan perjanjian (Pasal 20 ayat 2 huruf b) |
| Pengiriman email/push notification kritis | Pelaksanaan perjanjian |
| Marketing email & analytics produk | Persetujuan eksplisit (Anda bisa opt-out) |
| Keamanan, deteksi fraud, audit | Kepentingan sah pengendali data (Pasal 20 ayat 2 huruf f) |
| Kepatuhan regulasi (OJK, AML/PPATK) | Pelaksanaan kewajiban hukum |

## 3. Penyimpanan & Lokasi Data

- Data PII (email, nama, nomor telepon) disimpan terenkripsi
- Server utama di **AWS Jakarta (ap-southeast-3)** atau **Neon US-East dengan Transfer Agreement** sesuai PP 71/2019
- Backup terenkripsi AES-256, retensi 90 hari hot + 7 tahun cold storage
- Secret (API key, password) terenkripsi AES-256-GCM dengan master key terisolasi

## 4. Pembagian Data ke Pihak Ketiga

Kami **TIDAK menjual** data pribadi Anda. Data hanya dibagikan ke:

- **Penyedia layanan pembayaran** (Midtrans, Xendit) — hanya saat transaksi
- **Penyedia infrastruktur cloud** (AWS, Neon, Upstash, Cloudflare) — dengan Data Processing Agreement
- **Penyedia AI** (DeepSeek, Anthropic, OpenAI) — query AI Anda dikirim untuk diproses. **PII Anda di-redact** sebelum dikirim. Penyedia diwajibkan tidak menyimpan/melatih ulang model dari query.
- **Regulator** (OJK, PPATK, Kepolisian) — kalau ada permintaan resmi sesuai hukum

## 5. Hak Anda sebagai Subjek Data (UU PDP Ps. 5-12)

Anda berhak untuk:
1. **Akses** seluruh data pribadi Anda di akun
2. **Mengubah** data yang tidak akurat
3. **Menghapus** akun & seluruh data terkait
4. **Portabilitas** — export data dalam format JSON
5. **Membatasi** atau menolak pemrosesan untuk marketing
6. **Menarik persetujuan** kapan saja
7. **Mengajukan keberatan** ke Komisi Pelindungan Data Pribadi

Untuk eksekusi hak di atas: email **support@nubuat.id** dengan subject "Permintaan PDP". Kami akan respon dalam 30 hari.

## 6. Cookie & Tracking

Kami pakai cookie untuk:
- **Esensial**: session login, CSRF protection (tidak bisa di-opt-out)
- **Analitik**: PostHog (anonymous, kalau diaktifkan)
- **Tidak ada cookie marketing/iklan pihak ketiga**

## 7. Retensi Data

| Kategori | Retensi |
|---|---|
| Data akun aktif | Selama akun aktif |
| Data akun dihapus | 30 hari (untuk recovery), lalu dihapus permanen |
| Log audit | 7 tahun (compliance OJK) |
| Riwayat transaksi & invoice | 10 tahun (UU Pajak) |
| Backup terenkripsi | 90 hari hot + 7 tahun cold |

## 8. Insiden Data

Kalau terjadi pelanggaran data yang berisiko tinggi terhadap subjek data, kami akan:
- Lapor ke Komisi PDP dalam **3 × 24 jam** (UU PDP Ps. 46)
- Notifikasi subjek data terdampak dalam **3 × 24 jam**
- Publikasikan ringkasan post-mortem di blog

## 9. Anak di Bawah Umur

Layanan ini **tidak diperuntukkan untuk anak di bawah 17 tahun**. Kami tidak sengaja mengumpulkan data anak. Jika Anda mengetahui adanya akun anak, hubungi support@nubuat.id.

## 10. Perubahan Kebijakan

Perubahan material akan diberitahukan via email 14 hari sebelum berlaku. Versi terbaru selalu tersedia di halaman ini.

---

**Pengendali Data (Data Controller):** PT Nubuat Sains Indonesia (TBD setelah pendirian)
**Data Protection Officer (DPO):** dpo@nubuat.id (TBD)
**Komisi PDP RI:** https://www.kpdp.go.id

> ⚠️ *Dokumen ini adalah template starter dan akan disesuaikan setelah review final oleh legal counsel pasar modal Indonesia.*`,
  },
  {
    key: "legal.terms.last_updated",
    value: "2026-05-11",
    description: "Tanggal update terakhir Terms of Service.",
  },
  {
    key: "legal.terms.body_md",
    description: "Terms of Service body Markdown.",
    value: `# Syarat & Ketentuan Layanan

**Berlaku sejak:** 11 Mei 2026

Dokumen ini ("Syarat") mengatur hubungan antara Anda ("Pengguna") dengan **Nubuat** ("Platform", "Kami") dalam penggunaan layanan analisa saham berbasis subscription.

Dengan menggunakan Platform, Anda setuju terikat oleh Syarat ini. Jika tidak setuju, jangan gunakan Platform.

## 1. Sifat Layanan

1.1 Nubuat adalah **platform analytics & informasi**, **BUKAN perusahaan efek**. Kami tidak melakukan eksekusi transaksi efek atas nama Anda.

1.2 Seluruh analisa, daily picks, rekomendasi, riset, dan konten AI bersifat **informatif dan edukatif**. **Bukan saran investasi yang disesuaikan untuk situasi finansial pribadi Anda**.

1.3 Anda tetap eksekusi order di broker pilihan Anda yang berizin OJK. Nubuat tidak menerima komisi dari broker manapun (no kickback).

## 2. Pendaftaran & Akun

2.1 Anda wajib berusia ≥17 tahun dan punya KTP/identitas valid.

2.2 Anda bertanggung jawab penuh atas:
- Keamanan kredensial (password, MFA, session)
- Akurasi data yang Anda berikan
- Aktivitas yang terjadi di akun Anda

2.3 Satu orang = satu akun. Akun tidak boleh disewakan, dipinjamkan, atau dishare.

## 3. Tier Berbayar & Pembayaran

3.1 Tier subscription: Free (selamanya gratis), Starter, Pro, Elite. Detail fitur & harga di https://nubuat.id/subscription.

3.2 Pembayaran via Midtrans/Xendit (penyedia berizin OJK). Auto-renewal aktif kecuali Anda nonaktifkan minimal 24 jam sebelum tanggal renewal.

3.3 Refund hanya untuk kasus error sistem yang kami akui. Tidak ada refund pro-rata untuk perubahan keputusan.

3.4 Trial 7 hari tier Starter — tanpa kartu kredit, otomatis turun ke Free setelah trial habis kalau tidak upgrade.

## 4. Penggunaan yang Diizinkan

Anda BOLEH:
- Menggunakan analisa untuk keputusan investasi pribadi Anda
- Download laporan riset untuk referensi pribadi
- Share insight di media sosial dengan atribusi

Anda TIDAK BOLEH:
- Scrape, reverse-engineer, atau replikasi platform
- Pakai bot otomatis terhadap API kami tanpa izin
- Jual ulang akses atau konten berbayar Anda
- Publikasi pump-and-dump menggunakan data kami
- Manipulasi pasar (front-running rekomendasi, dll)

## 5. Konten Pengguna

5.1 Konten yang Anda buat (catatan watchlist, AI chat, dll) tetap milik Anda.

5.2 Anda memberikan kami lisensi non-eksklusif untuk menyimpan, memproses, dan menampilkan konten Anda untuk operasional Platform.

5.3 Konten yang berpotensi pump-dump, fitnah emiten, atau melanggar hukum akan dihapus tanpa pemberitahuan.

## 6. Hak Kekayaan Intelektual

6.1 Branding, kode, design, dan agregasi data unik milik Nubuat.

6.2 Data harga & fundamental emiten = fakta publik (tidak dapat di-claim oleh siapapun).

6.3 Laporan riset yang dibuat oleh analis Nubuat = copyrighted milik kami. Untuk redistribusi komersial, perlu lisensi tertulis.

## 7. Disclaimer Pasar Modal

LIHAT HALAMAN DISCLAIMER LENGKAP DI **/disclaimer**. Singkat: semua informasi di Platform untuk edukasi, **bukan ajakan jual/beli efek tertentu**. Risiko investasi sepenuhnya tanggung jawab Anda.

## 8. Pembatasan Tanggung Jawab

8.1 Platform disediakan **"AS IS"**. Kami tidak menjamin:
- Akurasi 100% data harga/fundamental (sumber pihak ketiga)
- Hit-rate Daily Picks (track record historis ≠ jaminan masa depan)
- Ketersediaan 100% (target SLA 99.9% jam bursa, tidak garansi)

8.2 Tanggung jawab maksimum kami terhadap Anda adalah **total yang Anda bayar selama 12 bulan terakhir** atau **Rp 5.000.000**, mana yang lebih kecil. Kerugian investasi pasar saham tidak masuk klaim.

## 9. Penangguhan & Penghentian Akun

Kami berhak suspend/terminate akun tanpa refund jika Anda:
- Melanggar Syarat ini
- Pump-and-dump, fraud, atau manipulasi
- Pembayaran chargeback berulang
- Tidak aktif >12 bulan (dengan notifikasi)

Anda boleh tutup akun kapan saja dari Settings. Data dihapus permanen setelah 30 hari (kecuali audit log retention 7 tahun untuk compliance).

## 10. Hukum yang Berlaku

10.1 Syarat ini tunduk pada hukum Republik Indonesia.

10.2 Sengketa diselesaikan via mediasi terlebih dahulu (BANI). Jika tidak tercapai, Pengadilan Negeri Jakarta Selatan punya yurisdiksi eksklusif.

## 11. Perubahan Syarat

Kami dapat update Syarat ini. Perubahan material akan diumumkan via email 14 hari sebelumnya. Lanjut menggunakan setelah update = setuju versi baru.

## 12. Kontak

- Email umum: **support@nubuat.id**
- Legal: **legal@nubuat.id**
- DPO (Privacy): **dpo@nubuat.id**

---

> ⚠️ *Dokumen ini template starter — final clauses akan disesuaikan setelah review legal counsel.*`,
  },
  {
    key: "legal.disclaimer.last_updated",
    value: "2026-05-11",
    description: "Tanggal update terakhir Disclaimer.",
  },
  {
    key: "legal.disclaimer.body_md",
    description: "Disclaimer pasar modal Indonesia (OJK-aware).",
    value: `# Disclaimer

**Berlaku sejak:** 11 Mei 2026

## Ringkasan Tegas

Seluruh informasi, analisa, daily picks, rekomendasi, riset, dan output AI di platform **Nubuat** disediakan untuk **tujuan edukasi dan informasi semata**.

**Bukan ajakan, undangan, saran, atau rekomendasi** untuk membeli, menjual, atau menahan efek tertentu yang disesuaikan dengan profil finansial atau situasi personal Anda.

## 1. Status Regulasi

1.1 Nubuat **BUKAN Perusahaan Efek** dan tidak melakukan eksekusi order saham atas nama Anda.

1.2 Nubuat saat ini positioning sebagai **platform analytics & edukasi**. Izin Penasihat Investasi OJK (jika diperlukan untuk fitur tertentu) sedang dalam proses pengajuan sesuai Bapepam V.C.1 dan SEOJK 7/SEOJK.04/2017.

1.3 Sampai izin terbit, **Daily Picks dan output AI bersifat informasi pasar umum, BUKAN saran personal**.

## 2. Tidak Ada Jaminan

2.1 Hit-rate historis Daily Picks **TIDAK menjamin** hit-rate masa depan.

2.2 Target price riset adalah **opinion of analyst** berdasarkan asumsi tertentu — bisa salah.

2.3 Data harga, fundamental, dan analitik bisa **tidak akurat, delay, atau mengandung error**. Sumber data pihak ketiga (Yahoo Finance, IDX, vendor) bisa rusak sewaktu-waktu.

2.4 AI Copilot bisa **hallucinate** — selalu verifikasi klaim faktual sebelum bertindak.

## 3. Risiko Pasar Modal

Investasi saham mengandung risiko:
- **Kehilangan modal** sebagian atau seluruhnya
- **Volatilitas harga** — fluktuasi tajam dalam waktu singkat
- **Risiko suspensi & delisting** — efek bisa ditangguhkan/dihapus dari bursa
- **Risiko likuiditas** — tidak semua saham bisa dijual cepat
- **Risiko fundamental** — kinerja emiten bisa memburuk drastis
- **Risiko sistemik** — krisis ekonomi global/lokal
- **Risiko regulatori** — aturan OJK/pajak bisa berubah

**Hanya investasikan dana yang Anda mampu rugi sepenuhnya.**

## 4. Tanggung Jawab Pribadi

Keputusan investasi sepenuhnya **tanggung jawab Anda pribadi**:
- Lakukan due diligence sendiri
- Pahami profil risiko & horizon Anda
- Konsultasi penasihat investasi berlisensi OJK untuk advice personal
- Diversifikasi portfolio Anda
- Catat semua entry/exit Anda untuk learning

## 5. Bukan Saran Pajak / Hukum

Nubuat tidak memberikan saran perpajakan, hukum, atau akuntansi. Konsultasi profesional berlisensi untuk aspek tersebut.

## 6. Kinerja Masa Lalu

Frasa **"kinerja masa lalu bukan jaminan kinerja masa depan"** berlaku untuk:
- Backtest hasil strategi
- Track record Daily Picks
- Historical chart pattern
- Performance emiten historis

## 7. Konflik Kepentingan

7.1 Analis & karyawan Nubuat **DILARANG**:
- Trading saham yang sedang di-cover ±5 hari sebelum/sesudah publikasi riset
- Front-running Daily Picks
- Akses non-publik insider information

7.2 Nubuat **TIDAK MENERIMA**:
- Pembayaran dari emiten untuk rekomendasi tertentu
- Komisi dari broker (no kickback)
- Insentif untuk "pom-pom" saham spesifik

Pelanggaran karyawan = pemutusan kerja + laporan ke OJK.

## 8. Konten Pihak Ketiga

Riset/konten dari sumber eksternal (sekuritas, media) yang di-link/aggregate di Platform tetap milik penulisnya. Kami hanya menyajikan ringkasan & link — bukan endorsement.

## 9. AI Output

Output AI Copilot (DeepSeek/Anthropic/OpenAI):
- Berdasarkan training data yang bisa **outdated**
- Bisa **fabrikasi angka atau nama** (hallucination)
- Selalu menyertakan disclaimer di tail output
- Untuk klaim faktual penting, verifikasi via sumber primer (laporan keuangan emiten di IDX)

## 10. Anti Pump-and-Dump

Nubuat **MENOLAK** dan **MELAPORKAN** ke OJK setiap aktivitas:
- Manipulasi harga (wash trading, layering, spoofing)
- Pump-and-dump terkoordinasi
- Pomposing/promosi saham di komunitas/Discord/Telegram

Akun terlibat = banned permanent + laporan otoritas.

## 11. Kontak

- Pertanyaan: support@nubuat.id
- Pengaduan: legal@nubuat.id
- OJK Konsumen: 157 atau https://www.ojk.go.id

---

**Dengan menggunakan layanan Nubuat, Anda menyatakan TELAH MEMBACA, MEMAHAMI, dan SETUJU dengan Disclaimer di atas.**

> ⚠️ *Dokumen ini template starter. Final akan disesuaikan setelah review legal counsel pasar modal Indonesia.*`,
  },
];

export async function seedLegalContent() {
  logger.info("Seeding legal content (Privacy/ToS/Disclaimer)...");
  for (const entry of legalContent) {
    await db
      .insert(appConfig)
      .values({
        key: entry.key,
        scope: {},
        value: entry.value,
        type: entry.key.endsWith("_md") ? "string" : "string",
        category: "legal",
        description: entry.description,
        isSensitive: false,
      })
      .onConflictDoUpdate({
        target: [appConfig.key, appConfig.scope],
        set: { value: entry.value, description: entry.description, updatedAt: new Date() },
      });
  }
  logger.info(`Seeded ${legalContent.length} legal CMS keys`);
}
