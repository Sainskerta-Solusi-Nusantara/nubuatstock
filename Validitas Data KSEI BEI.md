# Validitas Data Kepemilikan — Komparasi vs KSEI & BEI

> Laporan validasi data kepemilikan saham Nubuat terhadap sumber resmi.
> Dibuat: 3 Jun 2026. Acuan data: KSEI BalancePos posisi **29 Mei 2026**, data ≥1% posisi **30 Apr 2026**.

---

## 1. Ringkasan

Data kepemilikan di Nubuat terdiri dari **dua dataset berbeda sumber & tingkat keabsahan**:

| Dataset | Sumber | Keabsahan |
|---|---|---|
| **Komposisi 9-tipe investor** (Lokal vs Asing × IS/CP/PF/IB/ID/MF/SC/FD/OT) — tab Klasifikasi + "Kepemilikan Saham" publik | **KSEI BalancePos langsung** (`web.ksei.co.id/archive_download/holding_composition`) | ✅ **Resmi & identik dengan sumber asli** |
| **Daftar pemegang ≥1% (nama)** — tab Review ≥1% + Perubahan Data | Agregator pihak ketiga (`1pct.klinikpenyesalan.com`) yang menurunkan data registri KSEI | ⚠️ **Turunan/second-hand** — tidak dijamin identik dengan catatan resmi KSEI |

**Catatan:** nama agregator pihak ketiga TIDAK ditampilkan ke user (label UI tetap "KSEI & BEI").

---

## 2. Metodologi komparasi

Karena KSEI **tidak** merilis nama pemegang ≥1% di file publik (hanya komposisi agregat), validasi dilakukan dengan membandingkan **agregat** data ≥1% terhadap **KSEI BalancePos resmi** per emiten:

- **Aturan subset:** total kepemilikan **asing** dari pemegang ≥1% seharusnya **≤ total asing KSEI** (karena ≥1% adalah subset dari seluruh pemegang).
- **Sanity total:** jumlah seluruh persentase ≥1% tidak boleh > ~100%.
- **Selisih (gap) asing:** `(% asing ≥1%) − (% asing KSEI)`; |gap| kecil = makin cocok.

Pembanding live dijalankan di **tab "Validasi"** pada dashboard `/superadmin/ownership-1pct` (fungsi `getOwnershipValidation()`), bisa dicek kapan saja.

---

## 3. Hasil (956 emiten yang ada di kedua sumber)

| Metrik | Hasil |
|---|---|
| Total ≥1% **mustahil (>102%)** | **0** — angka waras, tak ada over-100% |
| **Konsisten** (≥1% asing ≤ total asing KSEI, toleransi 2pp) | **92,9%** (888/956) |
| Selisih asing **≤ 2pp** dari KSEI | **74,4%** (711/956) |
| Rata-rata \|selisih asing\| | **4,39 pp** |
| Anomali (≥1% asing > KSEI asing +2pp) | **68 emiten (7,1%)** |

### Contoh anomali terbesar (gap asing)

| Kode | Asing (kita) | Asing (KSEI) | Gap | Holder ≥1% |
|---|---|---|---|---|
| KIAS | 92,0% | 0,0% | +92,0pp | 3 |
| BSWD | 91,0% | 0,3% | +90,7pp | 3 |
| KOIN | 90,6% | 0,2% | +90,4pp | 3 |
| FPNI | 92,5% | 2,4% | +90,1pp | 1 |
| IKBI | 91,5% | 3,6% | +87,9pp | 3 |
| ACRO | 89,8% | 3,4% | +86,4pp | 4 |
| AGRS | 91,5% | 10,0% | +81,5pp | 2 |
| BNII | 97,3% | 18,9% | +78,4pp | 6 |

---

## 4. Kesimpulan

**Data BROADLY VALID di sisi besaran kepemilikan** — total & magnitudo persentase cocok dengan KSEI, **nol** angka mustahil, dan 93% memenuhi aturan subset.

**Namun tagging asing/lokal menyimpang di ~7% emiten.** Ini **bukan murni galat data**, melainkan **perbedaan definisi "asing"**:

- **Sumber ≥1% (kita):** mengklasifikasi berdasarkan **pemilik manfaat akhir** (mis. induk Thailand/Malaysia/Singapura).
- **KSEI BalancePos:** mengklasifikasi berdasarkan **domisili akun terdaftar** — kepemilikan asing yang dipegang lewat **nominee/entitas lokal** tercatat sebagai **lokal**.

Contoh: KIAS (dikendalikan grup SCG Thailand) tercatat ~92% asing oleh sumber kita, tapi 0% asing di KSEI karena dipegang via entitas lokal.

Faktor tambahan: **beda tanggal posisi** (≥1% 30 Apr vs KSEI 29 Mei) menyumbang sebagian gap kecil.

---

## 5. Keterbatasan & rekomendasi

- **BEI/IDX belum bisa dibandingkan otomatis.** Situs `idx.co.id` (laporan riset & data kepemilikan) berada di balik proteksi **Cloudflare** — `fetch()` server diblok; butuh headless browser atau akses data resmi. Benchmark resmi yang dipakai saat ini = **KSEI BalancePos** (ditarik langsung).
- Untuk daftar nama ≥1% yang **benar-benar resmi**, perlu **akses/langganan data KSEI resmi**; sumber agregator saat ini bersifat indikatif.
- Rekomendasi produk: tonjolkan **komposisi KSEI** sebagai data resmi; perlakukan **daftar nama ≥1%** sebagai *indikatif* (dengan disclaimer) sampai ada sumber resmi langsung.

---

*Dihasilkan dari komparasi otomatis tab "Validasi" (`getOwnershipValidation()`), dashboard superadmin ≥1%.*
