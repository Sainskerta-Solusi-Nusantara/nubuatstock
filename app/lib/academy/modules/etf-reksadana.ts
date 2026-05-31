// Modul ETF & Reksa Dana — Academy Nubuat.
import type { AcademyModule } from "../content";

export const etfReksadanaModule: AcademyModule = {
  slug: "etf-reksadana",
  title: "ETF & Reksa Dana",
  icon: "Layers",
  level: "Pemula",
  description:
    "Instrumen selain beli saham satuan: ETF di IDX & reksa dana — cara kerja, biaya, diversifikasi instan, dan kapan lebih cocok dipakai.",
  lessons: [
    {
      slug: "er-kenapa-bukan-saham-satuan",
      title: "Kenapa Tidak Selalu Beli Saham Satuan?",
      readMinutes: 6,
      summary: "Diversifikasi instan tanpa harus menganalisis puluhan emiten satu per satu.",
      body: `## Masalah beli saham satuan

Beli saham individual butuh waktu: analisis tiap emiten, pantau berita, atur diversifikasi. Buat pemula atau yang sibuk, ini berat. Salah pilih 1-2 emiten bisa bikin portofolio jeblok.

## Solusi: beli "keranjang" saham

**ETF** dan **Reksa Dana** memungkinkan kamu membeli **satu produk** yang isinya **banyak saham sekaligus** → diversifikasi instan.

Contoh: 1 lot ETF yang melacak LQ45 = kamu sudah punya eksposur ke 45 saham terbesar IDX dalam satu transaksi.

## Dua instrumen utama

| | **ETF** | **Reksa Dana** |
|---|---|---|
| Beli di | Bursa (seperti saham, via sekuritas) | Manajer Investasi / platform (Bibit, Bareksa, dll) |
| Harga | Real-time saat jam bursa | NAB/unit, dihitung 1× per hari |
| Likuiditas | Jual kapan saja saat market buka | Redemption, cair beberapa hari kerja |
| Minimal | 1 lot (relatif terjangkau) | Bisa mulai Rp10.000–100.000 |

## Kapan pakai?

- Belum percaya diri pilih saham sendiri → mulai dari sini.
- Mau "nabung rutin" otomatis (DCA) → reksa dana sangat cocok.
- Mau eksposur tema/indeks (mis. LQ45, syariah) sekali beli → ETF.

> Banyak investor pakai **kombinasi**: inti portofolio di reksa dana indeks (auto-pilot) + sebagian kecil saham pilihan sendiri (eksplorasi).`,
    },
    {
      slug: "er-jenis-reksadana",
      title: "Jenis Reksa Dana & Risikonya",
      readMinutes: 6,
      summary: "Pasar uang, pendapatan tetap, campuran, saham — pilih sesuai tujuan & jangka waktu.",
      body: `## Empat jenis utama (dari paling aman → paling berisiko)

1. **Reksa Dana Pasar Uang (RDPU)** — isi deposito & obligasi <1 tahun. Sangat stabil, return kecil. Untuk **dana darurat / jangka pendek (<1 tahun)**.
2. **Reksa Dana Pendapatan Tetap (RDPT)** — mayoritas obligasi. Return lebih tinggi dari RDPU, risiko sedang. Untuk **1–3 tahun**.
3. **Reksa Dana Campuran** — mix saham + obligasi + pasar uang. Risiko menengah. Untuk **3–5 tahun**.
4. **Reksa Dana Saham (RDS)** — mayoritas saham. Potensi return tertinggi, **paling fluktuatif**. Untuk **>5 tahun**.

> **Aturan jodoh:** cocokkan jenis reksa dana dengan **jangka waktu tujuanmu**. Dana yang dipakai tahun depan JANGAN di reksa dana saham (bisa lagi turun saat butuh).

## NAB/Unit

Harga reksa dana = **NAB per Unit Penyertaan** (Nilai Aktiva Bersih), dihitung tiap akhir hari bursa. Kamu beli/jual berdasarkan NAB itu, bukan real-time.

## Biaya yang perlu dicek

- **Expense ratio / management fee** — biaya tahunan MI (makin kecil makin baik untuk indeks).
- **Fee beli/jual (subscription/redemption)** — banyak platform sekarang 0%.

## Reksa dana indeks vs aktif

- **Indeks** (mis. ngikut LQ45/IDX30) — biaya murah, ikut pasar.
- **Aktif** — MI berusaha mengalahkan pasar; biaya lebih tinggi, belum tentu menang konsisten.

Untuk pemula jangka panjang, **reksa dana indeks berbiaya rendah** sering jadi fondasi yang solid.`,
    },
    {
      slug: "er-etf-di-idx",
      title: "ETF di IDX & Cara Memilih",
      readMinutes: 6,
      summary: "Cara beli ETF seperti saham, baca underlying-nya, dan hal yang harus dicek.",
      body: `## ETF = reksa dana yang diperdagangkan di bursa

**ETF (Exchange Traded Fund)** isinya sekeranjang aset (saham/obligasi/emas) tapi **diperjualbelikan di bursa seperti saham biasa** — pakai aplikasi sekuritas, ada kode (mis. berawalan "XI...", "R-LQ45", dll), harga bergerak real-time.

## Cara beli

Sama persis seperti beli saham: cari kodenya, beli minimal 1 lot (100 unit). Settlement T+2.

## Yang harus dicek sebelum beli ETF

1. **Underlying / indeks acuan** — ETF ini melacak apa? (LQ45? IDX30? Syariah? Obligasi? Emas?)
2. **Likuiditas** — volume transaksi cukup? ETF yang sepi susah dijual di harga wajar. Lihat **bid-offer spread** (selisih harga beli-jual); makin sempit makin baik.
3. **Expense ratio** — biaya pengelolaan tahunan.
4. **Tracking error** — seberapa rapat ETF mengikuti indeksnya (makin kecil makin bagus).

> ETF di IDX masih lebih sedikit & sebagian kurang likuid dibanding pasar global. Pilih yang **value transaksinya ramai**.

## ETF vs Reksa Dana indeks

Keduanya bisa melacak indeks yang sama. Bedanya cara beli (bursa vs platform MI) & fleksibilitas harga (real-time vs NAB harian). Pilih yang paling nyaman dengan alur transaksimu.

## Ringkas

Mulai dari instrumen "keranjang" ini kalau belum pede pilih saham satuan — diversifikasi instan, biaya bisa murah, dan cocok untuk nabung rutin jangka panjang. Tetap cek biaya & likuiditas.

> Edukasi, bukan rekomendasi produk. Baca prospektus/fund fact sheet sebelum membeli.`,
    },
  ],
};
