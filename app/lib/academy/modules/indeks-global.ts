import type { AcademyModule } from "../content";

export const indeksGlobalModule: AcademyModule = {
  slug: "indeks-global-msci-ftse",
  title: "Indeks Global: MSCI, FTSE & Emas",
  icon: "Landmark",
  level: "Lanjutan",
  description:
    "Bagaimana indeks dunia (MSCI, FTSE Russell), free float, dan harga emas/komoditas memengaruhi arus dana asing dan harga saham IDX — plus keluarga indeks domestik.",
  lessons: [
    {
      slug: "ig-apa-itu-indeks",
      title: "Apa Itu Indeks & Penyedia Indeks Global",
      readMinutes: 6,
      summary: "Indeks = ukuran rata-rata pasar; MSCI/FTSE/IDX adalah penyusunnya, dan triliunan dolar dana pasif mengikutinya.",
      body: `## Apa Itu Indeks Saham?

**Indeks saham** adalah satu angka yang merangkum pergerakan sekelompok saham. IHSG, misalnya, merangkum seluruh saham di Bursa Efek Indonesia. Indeks berguna sebagai **tolok ukur (benchmark)**: naik-turun portofoliomu dibandingkan dengan "pasar".

Sebagian besar indeks modern memakai bobot **market-cap tertimbang & disesuaikan free float** — makin besar nilai pasar saham yang beredar di publik, makin besar pengaruhnya ke indeks. (Konsep free float dibahas tuntas di pelajaran tersendiri.)

## Siapa yang Menyusun Indeks?

Ada perusahaan khusus penyedia indeks. Tiga yang paling relevan buat investor IDX:

| Penyedia | Cakupan | Contoh indeks |
| --- | --- | --- |
| **MSCI** | Global, acuan utama investor institusi dunia | MSCI Emerging Markets, MSCI Indonesia |
| **FTSE Russell** | Global, banyak dipakai dana Eropa & Inggris | FTSE GEIS, FTSE Indonesia |
| **IDX** | Domestik (Indonesia) | IHSG, LQ45, IDX30, JII |

![Penyedia indeks MSCI, FTSE Russell, dan IDX dengan contoh indeksnya, serta dana pasif triliunan dolar yang mengikuti](/academy/indeks/penyedia-indeks.svg)

## Kenapa Ini Penting buat Saham IDX?

Karena ada **dana pasif** (ETF dan reksa dana indeks) senilai **triliunan dolar** yang tugasnya cuma satu: **meniru komposisi indeks**. Kalau MSCI memasukkan sebuah saham IDX ke indeksnya, semua dana yang melacak indeks itu **wajib membeli** saham tersebut — tanpa peduli murah atau mahal. Sebaliknya, kalau dikeluarkan, mereka **wajib menjual**.

> Karena itu keputusan MSCI/FTSE bisa menggerakkan harga sebuah saham secara signifikan, kadang lebih kuat dari berita fundamental. Memahami "permainan indeks" membuatmu tidak kaget saat saham bergerak liar di sekitar tanggal rebalancing.

Di pelajaran berikutnya kita bedah dua pemain global terbesar: MSCI dan FTSE Russell.`,
    },
    {
      slug: "ig-msci",
      title: "MSCI: Klasifikasi, Rebalancing & Dampak ke IDX",
      readMinutes: 7,
      summary: "Indonesia ada di MSCI Emerging Markets; masuk/keluar indeks memicu arus dana asing yang besar.",
      body: `## MSCI & Posisi Indonesia

**MSCI (Morgan Stanley Capital International)** adalah penyedia indeks paling banyak diacu investor institusi global. MSCI mengklasifikasikan negara ke dalam tiga keranjang besar:

- **Developed Markets** — AS, Jepang, Eropa Barat, dll.
- **Emerging Markets (EM)** — termasuk **Indonesia**, China, India, Brasil.
- **Frontier Markets** — pasar yang lebih kecil/kurang likuid.

Indonesia berada di **MSCI Emerging Markets**. Saham-saham besar IDX (mis. BBCA, BBRI, TLKM) menjadi konstituen MSCI Indonesia / EM, sehingga jadi sasaran dana global.

## Kriteria Masuk Indeks MSCI

Sebuah saham dipertimbangkan masuk MSCI Standard Index kalau memenuhi ambang:

1. **Ukuran (market cap)** — cukup besar (full & free-float adjusted).
2. **Likuiditas** — ramai diperdagangkan, mudah masuk-keluar.
3. **Free float** — porsi saham publik memadai (umumnya minimal sekitar 15%).

Ada pula **MSCI Small Cap** untuk emiten yang lebih kecil.

## Jadwal Rebalancing

MSCI meninjau indeksnya secara berkala: **review besar tiap Mei & November**, dan **review kuartalan tiap Februari & Agustus**. Perubahan diumumkan ~2 minggu sebelum **tanggal efektif**.

![Alur dampak: pengumuman MSCI, dana pasif membeli, arus dana asing masuk, harga naik jelang tanggal efektif](/academy/indeks/msci-arus-dana.svg)

## Dampak ke Harga

- **Inclusion (masuk indeks)** → dana pasif wajib membeli → **foreign inflow** → harga cenderung naik menjelang tanggal efektif.
- **Exclusion (keluar indeks)** → arus sebaliknya, tekanan jual.
- Setelah tanggal efektif, sering ada **profit-taking** — kenaikan jelang inclusion tidak selalu berlanjut.

> **Hati-hati FOMO.** Banyak ritel ikut beli saat berita inclusion ramai, padahal kenaikannya sudah "dihargai" lebih dulu oleh pemain besar. Pahami timing-nya, jangan jadi pembeli terakhir.

## Kaitan dengan Arus Asing IDX

Pergerakan dana asing (foreign net buy/sell) di IDX sebagian besar didorong oleh keputusan alokasi EM global — yang berpatokan ke MSCI. Saat Indonesia dapat **kenaikan bobot** di MSCI EM, arus masuk cenderung deras; saat bobot dipangkas, sebaliknya.`,
    },
    {
      slug: "ig-ftse",
      title: "FTSE Russell & Bedanya dengan MSCI",
      readMinutes: 6,
      summary: "FTSE mengklasifikasikan Indonesia sebagai Secondary Emerging; dua provider = dua kolam dana berbeda.",
      body: `## FTSE Russell

**FTSE Russell** (anak usaha London Stock Exchange Group) adalah penyedia indeks global kedua yang paling berpengaruh, terutama untuk dana yang berbasis di Inggris & Eropa. Indeks payungnya adalah **FTSE GEIS (Global Equity Index Series)**.

FTSE mengklasifikasikan negara sedikit berbeda dari MSCI:

| Kelas FTSE | Keterangan |
| --- | --- |
| **Developed** | Pasar maju |
| **Advanced Emerging** | EM yang lebih matang (mis. Malaysia, Thailand) |
| **Secondary Emerging** | **Indonesia** ada di sini |
| **Frontier** | Pasar kecil |

## Beda MSCI vs FTSE

Walau tujuannya mirip, metodologinya tidak identik:

- **Klasifikasi negara** bisa beda (sebuah negara bisa "Emerging" di MSCI tapi beda label di FTSE).
- **Jadwal review** beda: FTSE meninjau tiap **Maret, Juni, September, Desember**.
- **Aturan free float & buffer** (ambang masuk/keluar) berbeda detailnya.

> Karena metodologinya beda, **sebuah saham bisa masuk MSCI tapi belum masuk FTSE**, atau sebaliknya. Dua provider = dua kolam dana berbeda yang bisa bergerak di waktu berbeda.

## Kenapa Investor IDX Perlu Tahu Keduanya

Memantau kalender **kedua** provider membantu mengantisipasi lonjakan arus dana asing. Banyak peristiwa "saham tiba-tiba ramai diborong asing" sebenarnya bertepatan dengan jadwal rebalancing MSCI atau FTSE.

Selain saham individual, ada juga **upgrade/downgrade kelas negara**. Jika Indonesia naik kelas (mis. dari Secondary ke Advanced Emerging di FTSE), profil investor yang masuk bisa berubah — biasanya dianggap sentimen positif jangka panjang.`,
    },
    {
      slug: "ig-free-float",
      title: "Free Float: Kunci Bobot Indeks",
      readMinutes: 6,
      summary: "Indeks hanya menghitung saham yang beredar bebas di publik — bukan milik pengendali. Ini terhubung ke data KSEI di Nubuat.",
      body: `## Apa Itu Free Float?

**Free float** adalah porsi saham yang benar-benar **beredar bebas** dan bisa diperjualbelikan publik — di luar kepemilikan pihak pengendali, pemerintah, atau pemegang strategis yang "mengunci" sahamnya jangka panjang.

Indeks modern memakai **free-float adjusted market cap**: yang dihitung untuk bobot indeks hanya bagian free float, bukan seluruh saham tercatat.

![Total saham tercatat dibanding free float: hanya porsi publik yang dihitung untuk bobot indeks](/academy/indeks/free-float.svg)

## Contoh Sederhana

Sebuah emiten punya 10 miliar saham, tapi 65% dipegang grup pengendali. Maka:

- **Total market cap** dihitung dari 10 miliar saham.
- **Free-float market cap** (yang dipakai indeks) hanya dari 35% × 10 miliar = 3,5 miliar saham.

Akibatnya, perusahaan dengan kapitalisasi raksasa tapi free float kecil bisa punya bobot indeks yang lebih kecil dari yang dikira.

## Free Float di MSCI, FTSE & IDX

- **MSCI & FTSE** menerapkan ambang & "band" free float untuk menentukan layak-tidaknya dan besar bobot sebuah saham.
- **IDX sejak 2021** juga merombak metodologi IHSG dan indeks turunannya menjadi **free-float adjusted + filter likuiditas**, supaya indeks tidak didominasi saham berkapitalisasi besar tapi sahamnya "tidur".

## Hubungannya dengan Nubuat

Free float = sisi lain dari **konsentrasi kepemilikan**. Makin terkonsentrasi di segelintir pengendali, makin kecil free float-nya, makin tipis saham yang beredar.

> Di Nubuat, kamu bisa melihat komposisi kepemilikan (Lokal vs Asing, per tipe investor) dan porsi free float tiap emiten lewat fitur **Kepemilikan Saham**. Saham dengan free float sangat kecil cenderung lebih mudah "digerakkan" dan berisiko likuiditas — perhatikan baik-baik.`,
    },
    {
      slug: "ig-emas-komoditas",
      title: "Indeks Emas & Komoditas: Safe Haven",
      readMinutes: 7,
      summary: "Emas naik saat pasar panik (risk-off); pahami pendorongnya dan kaitannya ke saham tambang emas IDX.",
      body: `## Emas Sebagai "Safe Haven"

Saat pasar gelisah, investor global lari ke aset yang dianggap aman — terutama **emas**. Harga emas internasional diacu lewat **harga spot XAU/USD** (London/LBMA), dan komoditas lain dirangkum indeks seperti **S&P GSCI** atau **Bloomberg Commodity Index**.

![Saat risk-off, harga emas naik sementara saham berisiko turun; kaitannya ke saham tambang emas IDX](/academy/indeks/emas-safe-haven.svg)

## Risk-On vs Risk-Off

- **Risk-on** (optimis): dana mengalir ke saham, emas relatif kalem.
- **Risk-off** (panik/ketidakpastian): dana lari ke emas, dolar AS, dan obligasi AS. Harga emas naik justru saat saham turun.

## Pendorong Harga Emas

1. **Real yield** (imbal hasil obligasi setelah inflasi) — emas tidak memberi bunga, jadi saat real yield **turun**, daya tarik emas **naik**.
2. **Dolar AS (DXY)** — emas dihargai dalam dolar; dolar **melemah** → emas cenderung **naik**.
3. **Geopolitik & ketidakpastian** — perang, krisis, ketegangan dagang menaikkan permintaan safe haven.
4. **Inflasi** — emas sering dipakai lindung nilai (hedge) terhadap inflasi.

## Kaitan ke Saham IDX

Harga emas yang naik memperbaiki margin emiten emas & tambang. Saham yang terkait emas di IDX antara lain **ANTM, MDKA, AMMN, BRMS, ARCI** (produsen), serta **HRTA** (ritel perhiasan emas).

> **Tapi tidak otomatis.** Saham tambang emas juga dipengaruhi biaya produksi, kebijakan hedging, volume produksi, dan utang. Harga emas naik adalah angin segar, bukan jaminan saham ikut naik. Selalu cek fundamental emitennya.

## Cara Memakai Informasi Ini

Pantau tren emas & DXY sebagai bagian dari analisis **intermarket** (lihat modul *Intermarket & Korelasi Aset*). Saat kamu melihat pasar masuk fase risk-off, sektor emas bisa jadi pelindung sebagian portofolio — sementara saham berisiko tinggi (teknologi, saham beta tinggi) cenderung lebih tertekan.`,
    },
    {
      slug: "ig-keluarga-indeks-idx",
      title: "Keluarga Indeks IDX (IHSG, LQ45, dll)",
      readMinutes: 6,
      summary: "Mengenal indeks domestik dari IHSG hingga LQ45, IDX30, tematik, dan syariah — serta untuk apa dipakai.",
      body: `## IHSG: Sang Induk

**IHSG (Indeks Harga Saham Gabungan / IDX Composite)** merangkum **seluruh** saham tercatat di BEI. Inilah angka yang biasa kamu dengar di berita ("IHSG ditutup naik..."). Tapi karena memuat semua saham, IHSG kurang cocok jadi acuan produk investasi yang butuh saham likuid.

![Keluarga indeks IDX: IHSG sebagai induk, lalu indeks likuiditas, tematik, dan syariah](/academy/indeks/keluarga-indeks-idx.svg)

## Indeks Turunan Populer

### Berbasis likuiditas & ukuran
- **LQ45** — 45 saham paling likuid & berkapitalisasi besar. Acuan paling populer.
- **IDX30** — 30 saham terlikuid (lebih ketat dari LQ45).
- **IDX80** — 80 saham likuid (lebih luas).
- **IDX High Dividend 20** — 20 saham rutin bagi dividen besar.

### Tematik / faktor
- **IDXBUMN20** — saham BUMN.
- **IDXValue30, IDXGrowth30, IDXQuality30** — berbasis faktor (value/growth/kualitas).
- Indeks **sektoral** (IDX-IC) — per sektor (keuangan, energi, konsumer, dll).

### Syariah
- **ISSI (Indeks Saham Syariah Indonesia)** — semua saham syariah.
- **JII (Jakarta Islamic Index)** — 30 saham syariah terlikuid.
- **JII70** — 70 saham syariah.

## Untuk Apa Indeks Domestik Dipakai?

1. **Benchmark** — mengukur apakah kinerja portofolio/reksa dana mengalahkan "pasar".
2. **Dasar produk pasif** — reksa dana indeks & **ETF** yang melacak LQ45 atau IDX30.
3. **Sinyal kualitas** — saham yang masuk **LQ45/IDX30** biasanya naik pamor, likuiditasnya membaik, dan jadi incaran institusi. Masuk/keluar indeks ini (review tiap ~6 bulan) juga memicu penyesuaian portofolio.

> **Tips praktis:** kalau kamu pemula yang ingin "ikut pasar" tanpa repot pilih saham satu-satu, indeks likuid seperti **LQ45/IDX30** (lewat reksa dana indeks atau ETF) sering jadi titik awal yang lebih aman daripada langsung memburu saham gorengan.`,
    },
  ],
};
