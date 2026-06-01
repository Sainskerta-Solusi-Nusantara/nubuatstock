import type { AcademyModule } from "../content";

export const intermarketKorelasiModule: AcademyModule = {
  slug: "intermarket-korelasi",
  title: "Intermarket & Korelasi Aset",
  icon: "Globe",
  level: "Lanjutan",
  description:
    "Memahami bagaimana suku bunga global, arus dana asing, rupiah, dan harga komoditas saling memengaruhi IHSG serta emiten IDX.",
  lessons: [
    {
      slug: "im-pengantar-intermarket",
      title: "Pengantar Intermarket: IHSG Tidak Berdiri Sendiri",
      readMinutes: 7,
      summary:
        "Konsep dasar analisis intermarket dan kenapa IHSG bergerak mengikuti pasar global serta rupiah.",
      body: `## IHSG Tidak Bergerak Sendirian

Banyak investor pemula memandang IHSG seolah dunia tertutup: hanya soal emiten lokal, sentimen domestik, dan aksi bandar. Padahal pasar saham Indonesia sangat **terbuka** terhadap arus modal global. Analisis intermarket adalah cara membaca hubungan antar pasar — saham, obligasi, mata uang, dan komoditas — agar kamu tidak kaget saat IHSG turun "tanpa sebab" padahal pemicunya ada di luar negeri.

Inti gagasannya: harga sebuah aset jarang ditentukan oleh satu faktor. Ketika imbal hasil (yield) obligasi pemerintah AS naik, efeknya bisa menjalar ke rupiah, lalu ke arus dana asing, lalu ke IHSG. Memahami rantai ini membantu kamu mengantisipasi, bukan sekadar bereaksi.

## Empat Kelas Aset yang Saling Terhubung

- **Saham** — IHSG, indeks regional Asia, S&P500, Nasdaq.
- **Obligasi / suku bunga** — US Treasury 10 tahun (US 10Y), suku bunga acuan The Fed dan Bank Indonesia.
- **Mata uang** — terutama USD/IDR (kurs rupiah terhadap dolar AS) dan indeks dolar (DXY).
- **Komoditas** — minyak (Brent/WTI), batubara, CPO, nikel, emas, tembaga.

Keempatnya membentuk satu ekosistem. Perubahan di satu kelas aset menekan atau menarik yang lain.

## Risk-On vs Risk-Off

Pasar global sering bergerak dalam dua "mode" suasana hati:

- **Risk-on** — investor berani ambil risiko. Dana mengalir ke aset berisiko seperti saham negara berkembang (termasuk IHSG). Rupiah cenderung menguat, IHSG cenderung naik.
- **Risk-off** — investor cari aman. Dana lari ke dolar AS, obligasi AS, dan emas. Saham emerging market dijual, asing keluar dari IHSG, rupiah melemah.

Mengenali apakah pasar sedang risk-on atau risk-off membantu menjelaskan kenapa saham bagus pun bisa ikut turun saat sentimen global memburuk.

## Tabel Ringkas Arah Hubungan

| Pemicu | Mode pasar | Efek ke arus asing | Efek ke USD/IDR | Efek ke IHSG (umum) |
| --- | --- | --- | --- | --- |
| US 10Y yield naik tajam | Risk-off | Asing keluar | Rupiah melemah | Cenderung turun |
| The Fed memangkas bunga | Risk-on | Asing masuk | Rupiah menguat | Cenderung naik |
| S&P500 reli kuat | Risk-on | Asing masuk | Rupiah stabil/menguat | Cenderung naik |
| Harga komoditas naik | Tergantung | Selektif ke emiten komoditas | Bisa menguat (ekspor) | Sektor komoditas naik |

Catatan: tabel ini menggambarkan kecenderungan historis yang **umum**, bukan hukum pasti. Selalu ada pengecualian.

## Kenapa Ini Penting untuk Investor IDX

- Membantu memahami konteks: pergerakan IHSG sering "diimpor" dari luar.
- Memberi peringatan dini lewat pasar yang buka lebih dulu (AS tutup → Asia buka).
- Membantu memilah: apakah penurunan saham karena masalah emiten, atau cuma terseret sentimen global.

> Disclaimer: Materi ini bersifat edukasi, bukan ajakan untuk membeli atau menjual aset apa pun. Korelasi historis bisa berubah sewaktu-waktu dan bukan jaminan hasil di masa depan.`,
    },
    {
      slug: "im-suku-bunga-arus-asing-rupiah",
      title: "Suku Bunga Global, Arus Asing, dan Rupiah",
      readMinutes: 8,
      summary:
        "Bagaimana US 10Y yield dan kebijakan The Fed mengalir ke arus dana asing, USD/IDR, lalu IHSG.",
      body: `## Rantai Transmisi: Dari Yield AS ke IHSG

Salah satu hubungan intermarket paling kuat untuk pasar Indonesia adalah jalur **suku bunga global → arus dana asing → rupiah → IHSG**. Diagram di bawah merangkum alurnya.

![Diagram transmisi intermarket: suku bunga global dan komoditas memengaruhi arus asing, rupiah, dan IHSG](/academy/intermarket/korelasi.svg)

### Langkah demi langkah

1. **US Treasury 10Y yield naik.** Obligasi pemerintah AS dianggap aset paling aman di dunia. Saat imbal hasilnya naik, menyimpan dana di AS jadi lebih menarik.
2. **Arus dana asing keluar dari emerging market.** Investor global menarik dana dari pasar berisiko seperti IDX untuk dipindah ke aset AS yang sekarang lebih menguntungkan dan aman.
3. **Rupiah melemah (USD/IDR naik).** Penjualan aset rupiah dan pembelian dolar membuat permintaan dolar naik, rupiah tertekan.
4. **IHSG cenderung turun.** Outflow asing menekan harga saham bluechip yang banyak dipegang asing (BBCA, BBRI, TLKM, ASII, dll.).

Sebaliknya, saat **The Fed memangkas suku bunga** atau yield AS turun, arus dana cenderung kembali ke emerging market, rupiah menguat, dan IHSG mendapat angin segar.

## Korelasi Positif dan Negatif

- **Korelasi positif** — dua aset bergerak searah. Contoh: S&P500 dan IHSG sering naik-turun bersamaan saat sentimen global jadi penggeraknya.
- **Korelasi negatif** — dua aset bergerak berlawanan. Contoh klasik: **US 10Y yield vs IHSG** sering berlawanan arah, dan **USD/IDR vs IHSG** juga cenderung berlawanan (rupiah melemah saat IHSG turun).

Korelasi diukur dari -1 (berlawanan sempurna) sampai +1 (searah sempurna). Angka mendekati 0 berarti hubungannya lemah.

## Lag dan Lead: Siapa Bergerak Duluan

Pasar tidak bergerak serentak. Karena perbedaan zona waktu dan peran masing-masing:

- Bursa **AS tutup malam** (waktu Indonesia), lalu **bursa Asia + IHSG buka pagi**. Maka penutupan Wall Street sering jadi **leading indicator** untuk pembukaan IHSG keesokan harinya.
- Pasar **obligasi dan mata uang** sering bergerak lebih dulu (lead) dibanding saham, karena lebih sensitif terhadap kabar suku bunga.
- IHSG kadang jadi **lagging** — bereaksi setelah sinyal muncul di yield AS atau USD/IDR.

## Tabel Indikator Pantauan Harian

| Indikator | Apa yang dilihat | Sinyal untuk IHSG |
| --- | --- | --- |
| US 10Y yield | Naik / turun harian | Naik tajam = tekanan; turun = dukungan |
| DXY (indeks dolar) | Kekuatan dolar global | DXY menguat = rupiah & IHSG tertekan |
| USD/IDR | Kurs rupiah | Rupiah melemah cepat = waspada outflow |
| Net foreign flow | Beli/jual bersih asing | Net sell besar berhari-hari = bearish |
| S&P500 / Nasdaq (futures) | Sentimen global | Futures merah pagi hari = pembukaan hati-hati |

## Catatan Penting

- Hubungan ini **bisa melemah atau berbalik** saat ada faktor domestik kuat (pemilu, kebijakan fiskal, krisis sektor tertentu).
- Tidak semua outflow asing langsung menjatuhkan IHSG; kadang ditahan oleh pembelian investor domestik/ritel.

> Disclaimer: Materi ini bersifat edukasi, bukan ajakan untuk membeli atau menjual aset apa pun. Korelasi historis bisa berubah sewaktu-waktu dan bukan jaminan hasil di masa depan.`,
    },
    {
      slug: "im-komoditas-emiten-idx",
      title: "Harga Komoditas dan Emiten Komoditas IDX",
      readMinutes: 7,
      summary:
        "Memetakan komoditas global (CPO, batubara, nikel, emas, minyak) ke emiten IDX yang harganya mengikutinya.",
      body: `## Komoditas: Bahan Bakar Sebagian Besar Emiten Berat IDX

Indonesia adalah negara kaya sumber daya alam, sehingga banyak emiten besar di IDX adalah produsen komoditas. Untuk emiten-emiten ini, **harga komoditas dunia sering lebih menentukan harga saham daripada laporan keuangan kuartalan**. Memahami pemetaan ini adalah inti analisis intermarket sisi komoditas.

## Peta Komoditas ke Emiten IDX

| Komoditas | Emiten IDX terkait | Pola hubungan |
| --- | --- | --- |
| CPO (minyak sawit) | AALI, LSIP | Harga CPO naik → margin & saham cenderung naik |
| Batubara | ADRO, PTBA, ITMG | Harga batubara global naik → emiten batubara menguat |
| Nikel | INCO, ANTM, NCKL | Harga nikel LME naik → emiten nikel terangkat |
| Emas | MDKA | Harga emas naik → emiten tambang emas diuntungkan |
| Minyak mentah | MEDC | Harga minyak naik → emiten migas menguat |

Pola dasar: untuk **produsen**, harga komoditas dan harga saham punya **korelasi positif**. Saat harga jual produk mereka naik, pendapatan dan margin membaik, dan pasar mengantisipasinya lebih dulu di harga saham.

## Mekanisme Transmisi Harga Komoditas

1. **Harga komoditas global naik** (didorong permintaan China, gangguan pasokan, atau cuaca untuk CPO).
2. **Ekspektasi laba emiten produsen naik.** Misal harga batubara acuan (Newcastle) melonjak, analis menaikkan proyeksi laba ADRO/PTBA/ITMG.
3. **Harga saham emiten komoditas naik**, sering **lebih dulu** (leading) sebelum laba aktual terlihat di laporan keuangan.
4. **Efek lanjutan ke neraca dagang & rupiah.** Ekspor komoditas yang kuat bisa membantu menstabilkan atau menguatkan rupiah.

## Jangan Lupa Sisi Biaya

Korelasi positif berlaku untuk produsen, tapi komoditas yang sama bisa jadi **biaya** bagi emiten lain:

- Harga minyak naik = beban bahan bakar & logistik naik bagi maskapai, manufaktur, dan transportasi.
- Harga batubara naik = biaya energi naik bagi pengguna listrik berbasis batubara.

Jadi satu kenaikan harga komoditas bisa **positif untuk satu sektor dan negatif untuk sektor lain**. Inilah kenapa korelasi harus dipetakan per emiten, bukan digeneralisasi ke seluruh IHSG.

## Faktor Pelemah: China, Kebijakan, dan Hilirisasi

- **Permintaan China** sangat dominan untuk batubara, nikel, dan CPO. Perlambatan ekonomi China bisa menekan komoditas walau pasokan normal.
- **Kebijakan domestik** seperti larangan ekspor, DMO (Domestic Market Obligation) batubara, atau hilirisasi nikel dapat memutus korelasi sederhana antara harga global dan saham emiten.
- **Hedging & kontrak jangka panjang** membuat sebagian emiten tidak langsung menikmati lonjakan harga spot.

## Keterbatasan Korelasi (Berlaku untuk Seluruh Modul Ini)

- **Korelasi bukan kausalitas.** Dua hal bergerak bersamaan belum tentu salah satu menyebabkan yang lain — bisa jadi keduanya digerakkan faktor ketiga.
- **Korelasi tidak stabil.** Angka korelasi berubah seiring waktu, regime pasar, dan kebijakan. Korelasi kuat tahun lalu bisa melemah tahun ini.
- **Spurious correlation.** Dengan banyak data, selalu ada pasangan aset yang "kebetulan" berkorelasi tanpa hubungan ekonomi nyata.
- Gunakan intermarket sebagai **konteks dan konfirmasi**, bukan satu-satunya dasar keputusan.

> Disclaimer: Materi ini bersifat edukasi, bukan ajakan untuk membeli atau menjual aset apa pun. Korelasi historis bisa berubah sewaktu-waktu dan bukan jaminan hasil di masa depan.`,
    },
  ],
};
