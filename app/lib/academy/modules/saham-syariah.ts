// Modul Saham Syariah — Academy Nubuat.
import type { AcademyModule } from "../content";

export const sahamSyariahModule: AcademyModule = {
  slug: "saham-syariah",
  title: "Saham Syariah",
  icon: "ShieldCheck",
  level: "Pemula",
  description:
    "Investasi saham sesuai prinsip syariah di IDX: kriteria & screening DES-OJK, indeks ISSI/JII, beda dengan konvensional, dan cara mulainya.",
  lessons: [
    {
      slug: "sy-prinsip-dasar",
      title: "Prinsip Dasar Saham Syariah",
      readMinutes: 6,
      summary: "Apa yang membuat sebuah saham 'syariah', dan kenapa banyak diminati di Indonesia.",
      body: `## Apa itu saham syariah?

**Saham syariah** adalah saham perusahaan yang kegiatan usaha dan struktur keuangannya **tidak bertentangan dengan prinsip syariah**. Kepemilikannya tetap sama seperti saham biasa — kamu jadi pemilik sebagian perusahaan — bedanya ada **saringan (screening)** yang harus dilewati.

## Tiga hal yang dilarang

1. **Riba** (bunga) — perusahaan tidak boleh bisnis utamanya berbasis bunga (mis. bank konvensional).
2. **Gharar** (ketidakpastian/spekulasi berlebihan) — mis. judi, asuransi konvensional.
3. **Maysir** (judi) & usaha haram — alkohol, babi, rokok (sebagian ulama), hiburan tidak sesuai syariah.

## Kenapa diminati di Indonesia?

- Mayoritas penduduk Muslim → permintaan instrumen sesuai syariah besar.
- Screening juga sering menyaring perusahaan dengan **utang terlalu besar** → secara tidak langsung memilih emiten dengan neraca lebih sehat.
- Bukan cuma untuk Muslim — siapa pun boleh; banyak yang suka karena disiplin rasio keuangannya.

> **Penting:** "Syariah" menyaring **jenis bisnis & rasio keuangan**, BUKAN jaminan harga naik. Saham syariah tetap bisa rugi — risiko pasar sama saja. Tetap analisis & kelola risiko.

## Di Nubuat

Kamu bisa pakai **Screener** untuk memfilter emiten, lalu cek status syariah lewat daftar resmi (lihat lesson screening). Status syariah bisa berubah tiap periode review.`,
    },
    {
      slug: "sy-screening-des",
      title: "Screening: DES, ISSI & JII",
      readMinutes: 7,
      summary: "Bagaimana OJK menyaring saham syariah, dan beda indeks ISSI vs JII.",
      body: `## Daftar Efek Syariah (DES)

**DES** adalah daftar resmi efek syariah yang diterbitkan **OJK** (lewat Dewan Pengawas Syariah). Direview & diperbarui **dua kali setahun** (biasanya Mei & November). Saham yang masuk DES = dianggap syariah untuk periode itu.

![Dua tahap screening saham syariah: screening bisnis lalu screening keuangan, menghasilkan Daftar Efek Syariah](/academy/syariah/screening.svg)

## Dua tahap screening

1. **Screening bisnis (kualitatif)** — usaha utama tidak termasuk yang dilarang (riba, judi, alkohol, dll).
2. **Screening keuangan (kuantitatif)** — rasio keuangan dibatasi, antara lain:
   - **Total utang berbasis bunga / total aset < 45%**
   - **Pendapatan non-halal (bunga, dll) / total pendapatan < 10%**

Kalau lolos keduanya → masuk DES.

> Karena di-review berkala, sebuah saham **bisa keluar-masuk** status syariah. Selalu cek daftar terbaru sebelum mengklaim sebuah emiten syariah.

## Indeks saham syariah

- **ISSI (Indonesia Sharia Stock Index)** — berisi **SELURUH** saham syariah yang tercatat (anggota DES). Cerminan pasar syariah secara luas.
- **JII (Jakarta Islamic Index)** — **30 saham syariah paling likuid & berkapitalisasi besar**. Mirip "LQ45 versi syariah".
- **JII70** — versi 70 saham.

> Buat pemula: **JII/JII70** = saham syariah blue-chip yang likuid; **ISSI** = semesta lengkap untuk eksplorasi lebih luas.

## Praktis

Cek daftar DES/ISSI di situs OJK/IDX, atau gunakan **akun saham syariah (SOTS)** dari sekuritas yang otomatis membatasi transaksi ke saham syariah saja.`,
    },
    {
      slug: "sy-syariah-vs-konvensional",
      title: "Beda Investasi Syariah vs Konvensional",
      readMinutes: 6,
      summary: "Mekanisme transaksi, SOTS, dan hal yang perlu dihindari.",
      body: `## Apa yang sama, apa yang beda?

**Sama:** cara beli/jual, lot (100 lembar), analisis fundamental/teknikal, risiko pasar, dividen.

**Beda (di akun syariah / SOTS):**
- **Hanya boleh transaksi saham yang masuk DES.**
- **Tidak boleh** transaksi yang mengandung unsur dilarang, mis:
  - **Short selling** (jual saham yang belum dimiliki) — dilarang.
  - **Margin trading berbasis bunga** — dilarang.
  - **Transaksi spekulatif berlebihan** (gharar).
- Penyelesaian transaksi tetap T+2 seperti biasa.

## SOTS (Sharia Online Trading System)

Banyak sekuritas menyediakan **akun syariah (SOTS)** — aplikasi trading yang **otomatis**:
- Hanya menampilkan & mengizinkan saham DES.
- Tidak ada fitur margin berbunga / short sell.

Jadi kamu tidak perlu hafal daftar DES manual — sistemnya yang menjaga.

## "Pembersihan" (cleansing)

Kalau ada sedikit pendapatan non-halal pada perusahaan (mis. bunga deposito kas), sebagian investor melakukan **cleansing**: menyisihkan porsi kecil dividen yang berasal dari pendapatan non-halal untuk disedekahkan. Ini praktik kehati-hatian, opsional sesuai keyakinan.

## Tetap analisis

Status syariah ≠ saham bagus. Sektor batu bara/CPO/telco banyak yang syariah, tapi tetap siklikal & berisiko. Gabungkan dengan modul **Fundamental**, **Valuasi**, dan **Manajemen Risiko**.

> Ini edukasi, bukan fatwa atau ajakan jual/beli. Untuk kepastian hukum syariah, rujuk DSN-MUI/OJK.`,
    },
  ],
};
