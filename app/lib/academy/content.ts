/**
 * Academy content — single source of truth untuk modul edukasi in-app.
 *
 * Tujuan (IMPROVEMENT_PLAN §3.E.1): modul belajar beginner→intermediate untuk
 * meningkatkan retensi + funnel. Beda dari Guidance (yang ngajarin cara pakai
 * fitur app), Academy ngajarin konsep investasi/trading saham itu sendiri.
 *
 * Struktur: Module → Lesson. Konten static & fully typed (bukan DB) supaya
 * MVP cepat & gampang di-review. Body lesson pakai markdown ringkas, dirender
 * lewat komponen yang sama dengan AI Buddy (react-markdown + remark-gfm).
 *
 * CATATAN: untuk skala lebih besar (banyak lesson, edit oleh non-engineer,
 * versioning) konten ini bisa dipindah ke CMS / DB dengan superadmin editor.
 * Bentuk tipe di bawah sengaja dibuat serializable supaya migrasi mudah.
 */

// Modul besar dipisah ke file sendiri (lib/academy/modules/*) lalu di-compose
// ke ACADEMY_MODULES di bawah. Modul ini mengimpor `AcademyModule` dari file ini
// (circular type-only import — aman karena hanya tipe).
import { elliottModule } from "./modules/elliott";
import { wyckoffModule } from "./modules/wyckoff";
import { chartPatternsModule } from "./modules/chart-patterns";
import { candlestickModule } from "./modules/candlestick";
import { fundamentalModule } from "./modules/fundamental";
import { bandarmologyLanjutanModule } from "./modules/bandarmology-lanjutan";
import { psikologiModule } from "./modules/psikologi";
import { sektorRotasiModule } from "./modules/sektor-rotasi";
import { dividendModule } from "./modules/dividend";
import { ipoCorporateActionModule } from "./modules/ipo-corporate-action";
import { makroTemaPasarModule } from "./modules/makro-tema-pasar";
import { sahamSyariahModule } from "./modules/saham-syariah";
import { etfReksadanaModule } from "./modules/etf-reksadana";
import { mekanismeOrderModule } from "./modules/mekanisme-order";
import { valuasiMendalamModule } from "./modules/valuasi-mendalam";
import { analisisTransaksiModule } from "./modules/analisis-transaksi";
import { swingTradingModule } from "./modules/swing-trading";
import { scalpingDaytradingModule } from "./modules/scalping-daytrading";
import { tradingPlanJurnalModule } from "./modules/trading-plan-jurnal";
import { taxLegalModule } from "./modules/tax-legal";
import { studiKasusIdxModule } from "./modules/studi-kasus-idx";
import { sahamFcaModule } from "./modules/saham-fca";
import { insiderIntegritasModule } from "./modules/insider-integritas";
import { waranLengkapModule } from "./modules/waran-lengkap";
import { moneyFlowTimingModule } from "./modules/money-flow-timing";
import { intermarketKorelasiModule } from "./modules/intermarket-korelasi";
import { konstruksiPortofolioModule } from "./modules/konstruksi-portofolio";
import { quantSistematisModule } from "./modules/quant-sistematis";
import { derivatifHedgingModule } from "./modules/derivatif-hedging";
import { marketMicrostructureModule } from "./modules/market-microstructure";
import { indeksGlobalModule } from "./modules/indeks-global";

export interface AcademyLesson {
  /** Slug unik global (dipakai di URL /academy/[slug] & key localStorage). */
  slug: string;
  title: string;
  /** Estimasi waktu baca dalam menit (kasar). */
  readMinutes: number;
  /** Ringkasan 1 kalimat untuk daftar lesson. */
  summary: string;
  /** Body markdown. Nada "kamu", semi-formal. */
  body: string;
}

export interface AcademyModule {
  slug: string;
  title: string;
  /** Lucide icon name (di-resolve di komponen). */
  icon: string;
  /** Level untuk badge. */
  level: "Pemula" | "Menengah" | "Lanjutan";
  description: string;
  lessons: AcademyLesson[];
}

export const ACADEMY_MODULES: AcademyModule[] = [
  // ============================ MODUL 1 ============================
  {
    slug: "dasar-saham-idx",
    title: "Dasar Saham IDX",
    icon: "GraduationCap",
    level: "Pemula",
    description:
      "Fondasi sebelum beli saham pertama: apa itu saham, cara kerja Bursa Efek Indonesia, dan istilah wajib.",
    lessons: [
      {
        slug: "apa-itu-saham",
        title: "Apa Itu Saham?",
        readMinutes: 4,
        summary: "Saham = bukti kepemilikan perusahaan, plus cara kamu untung darinya.",
        body: `## Apa Itu Saham?

Saham adalah **bukti kepemilikan** atas sebagian kecil sebuah perusahaan. Saat kamu beli 1 lot saham BBRI, secara hukum kamu jadi salah satu pemilik Bank BRI — meski porsinya sangat kecil.

### Dua cara kamu untung dari saham

1. **Capital gain** — kamu beli di harga rendah, jual di harga lebih tinggi. Selisihnya jadi keuntungan kamu.
2. **Dividen** — bagian laba perusahaan yang dibagikan ke pemegang saham, biasanya per tahun atau per semester.

### Kenapa harga saham bergerak?

Harga saham naik-turun karena tarik-menarik antara **pembeli (demand)** dan **penjual (supply)**. Faktor yang memengaruhi:

- Kinerja keuangan perusahaan (laba naik/turun)
- Sentimen pasar & berita
- Kondisi makro (suku bunga, kurs, ekonomi)
- Aksi investor besar ("bandar")

> Ingat: harga saham adalah opini pasar tentang masa depan perusahaan, bukan kepastian. Karena itu selalu ada **risiko**.

### 1 lot = 100 lembar

Di Indonesia, transaksi saham dilakukan per **lot**, dan 1 lot = **100 lembar**. Jadi kalau harga BBRI Rp5.000, modal minimum untuk 1 lot ≈ Rp500.000 (belum termasuk fee broker).`,
      },
      {
        slug: "cara-kerja-bei",
        title: "Cara Kerja Bursa Efek Indonesia",
        readMinutes: 5,
        summary: "BEI, broker, KSEI, dan apa yang terjadi saat kamu klik 'Beli'.",
        body: `## Cara Kerja Bursa Efek Indonesia (BEI)

Sebelum trading, kamu perlu paham siapa saja pemain di belakang layar.

### Pemain utama

| Pihak | Peran |
| --- | --- |
| **BEI / IDX** | Tempat (pasar) jual-beli saham dipertemukan. |
| **Broker / Sekuritas** | Perantara resmi; kamu trading lewat aplikasi mereka. |
| **KSEI** | Tempat penyimpanan saham kamu secara elektronik. |
| **KPEI** | Menjamin transaksi terselesaikan (kliring). |
| **OJK** | Regulator yang mengawasi seluruh pasar modal. |

### Jam perdagangan (hari kerja)

- **Sesi 1:** 09:00 – 11:30 WIB
- **Sesi 2:** 13:30 – 14:49 WIB (Senin–Kamis), 14:00 – 14:49 (Jumat)

### Apa yang terjadi saat kamu klik "Beli"

1. Order kamu dikirim broker ke sistem BEI (JATS).
2. Sistem mencocokkan order kamu dengan penjual di harga yang cocok (*matching*).
3. Kalau matched, transaksi tercatat. Settlement (perpindahan saham & uang) selesai **T+2** — dua hari bursa setelah transaksi.

### Fraksi harga

Harga saham hanya bisa bergerak per **fraksi (tick)** tertentu, tergantung rentang harganya. Misal saham di bawah Rp200 bergerak per Rp1, sedangkan saham Rp500–Rp2.000 bergerak per Rp2. Ini penting saat kamu pasang harga limit.`,
      },
      {
        slug: "istilah-wajib-pemula",
        title: "Istilah Wajib untuk Pemula",
        readMinutes: 4,
        summary: "Bid, offer, ARA, ARB, IPO, dividen — kamus singkat anti-bingung.",
        body: `## Istilah Wajib untuk Pemula

Daftar istilah yang akan terus kamu temui. Hafalkan yang dasar dulu.

### Order book

- **Bid** — harga yang ditawarkan **pembeli**.
- **Offer / Ask** — harga yang diminta **penjual**.
- **Spread** — selisih antara bid dan offer.

### Batas gerak harian

- **ARA (Auto Rejection Atas)** — batas maksimum kenaikan harga dalam sehari. Order beli di atas ARA otomatis ditolak.
- **ARB (Auto Rejection Bawah)** — batas maksimum penurunan harga dalam sehari.

### Lainnya

- **IPO** — saat perusahaan pertama kali jual sahamnya ke publik.
- **Dividen** — bagi hasil laba ke pemegang saham.
- **Cum & Ex Date** — *cum date* batas terakhir punya saham agar dapat dividen; *ex date* hari setelahnya (sudah tak dapat).
- **Lot** — satuan transaksi = 100 lembar.
- **Likuiditas** — seberapa ramai saham diperjualbelikan. Saham likuid mudah dibeli/dijual; saham "tidur" susah keluar.

> Tips: jangan beli saham yang likuiditasnya sangat rendah hanya karena harganya murah. Kamu bisa "nyangkut" — sulit menjual saat butuh.`,
      },
      {
        slug: "buka-rekening-dan-modal-awal",
        title: "Buka Rekening & Modal Awal",
        readMinutes: 4,
        summary: "Langkah praktis mulai investasi dan mindset modal yang sehat.",
        body: `## Buka Rekening & Modal Awal

### Langkah buka rekening saham (RDN)

1. Pilih sekuritas yang terdaftar & diawasi **OJK**.
2. Daftar online: siapkan KTP, NPWP (opsional di beberapa broker), dan rekening bank.
3. Sekuritas membuatkan **RDN (Rekening Dana Nasabah)** atas nama kamu.
4. Setor dana ke RDN, lalu kamu siap transaksi.

### Berapa modal awal yang ideal?

Tidak ada angka wajib. Prinsipnya:

- **Pakai uang dingin** — uang yang tidak kamu butuhkan dalam 1–3 tahun ke depan.
- Jangan pakai uang dapur, dana darurat, atau uang pinjaman.
- Mulai kecil sambil belajar. Pengalaman lebih mahal daripada modal besar di awal.

> **Aturan emas pemula:** kalau kehilangan seluruh modal awal akan mengganggu hidupmu, modal itu terlalu besar. Kecilkan dulu.

### Setelah punya rekening

Jangan langsung borong. Gunakan Academy ini + fitur riset di Nubuat (Verdict, Wyckoff, Bandarmology) untuk membangun tesis sebelum membeli saham pertama kamu.`,
      },
    ],
  },

  // ============================ MODUL 2 ============================
  {
    slug: "analisis-teknikal",
    title: "Analisis Teknikal",
    icon: "LineChart",
    level: "Menengah",
    description:
      "Baca pergerakan harga: candlestick, support-resistance, tren, volume, dan indikator populer.",
    lessons: [
      {
        slug: "membaca-candlestick",
        title: "Membaca Candlestick",
        readMinutes: 5,
        summary: "Anatomi candle, warna, body & sumbu, plus pola dasar.",
        body: `## Membaca Candlestick

Candlestick adalah cara paling umum menampilkan pergerakan harga dalam satu periode (mis. 1 hari).

### Anatomi 1 candle

Setiap candle merangkum 4 harga: **Open, High, Low, Close**.

- **Body** — jarak antara Open dan Close.
- **Sumbu/ekor (wick)** — jarak ke High dan Low.
- **Warna hijau** (umumnya) — Close > Open (harga naik).
- **Warna merah** — Close < Open (harga turun).

![Anatomi candlestick bullish & bearish: body, upper wick, lower wick, dan posisi open/close/high/low](/academy/candlestick/anatomy.svg)

### Apa yang diceritakan candle

- **Body panjang hijau** → pembeli dominan kuat.
- **Body panjang merah** → penjual dominan kuat.
- **Body kecil dengan sumbu panjang** → ragu-ragu / tarik-menarik.

### Pola dasar yang sering muncul

| Pola | Arti umum |
| --- | --- |
| **Hammer** | Sumbu bawah panjang setelah turun → potensi pembalikan naik. |
| **Shooting Star** | Sumbu atas panjang setelah naik → potensi pembalikan turun. |
| **Doji** | Open ≈ Close → keraguan pasar. |
| **Bullish Engulfing** | Candle hijau "menelan" candle merah sebelumnya → sinyal naik. |

![Contoh pola candlestick: Doji (ragu), Hammer (potensi naik), dan Bullish Engulfing](/academy/candlestick/doji-hammer-engulfing.svg)

> Satu candle jarang cukup. Selalu baca dalam **konteks** tren dan lokasi (di support? di resistance?).`,
      },
      {
        slug: "support-resistance-tren",
        title: "Support, Resistance & Tren",
        readMinutes: 5,
        summary: "Tiga konsep paling fundamental dalam membaca grafik.",
        body: `## Support, Resistance & Tren

### Support & Resistance

- **Support** — area harga di mana permintaan cukup kuat untuk menahan penurunan ("lantai").
- **Resistance** — area harga di mana penawaran menekan kenaikan ("atap").

Saat resistance ditembus (*breakout*), ia sering berubah jadi support baru — dan sebaliknya.

![Level support & resistance tempat harga memantul, plus garis tren naik dan tren turun](/academy/teknikal/support-resistance.svg)

### Tren

Tren adalah arah dominan pergerakan harga:

- **Uptrend** — rangkaian *higher high* & *higher low*. Beli saat *pullback* ke support.
- **Downtrend** — rangkaian *lower high* & *lower low*. Hindari "menangkap pisau jatuh".
- **Sideways** — harga bergerak datar di antara support & resistance.

> Prinsip klasik: **"the trend is your friend."** Lebih aman ikut arah tren daripada melawannya.

### Cara praktis menandai level

1. Tarik garis horizontal di titik-titik harga yang berkali-kali ditolak (pantul).
2. Semakin sering sebuah level diuji, semakin signifikan.
3. Gabungkan dengan **volume** — breakout dengan volume besar lebih meyakinkan.`,
      },
      {
        slug: "volume-dan-likuiditas",
        title: "Volume & Konfirmasi",
        readMinutes: 4,
        summary: "Volume sebagai 'bahan bakar' pergerakan harga.",
        body: `## Volume & Konfirmasi

Harga memberi tahu **apa** yang terjadi; volume memberi tahu **seberapa serius** itu terjadi.

### Prinsip dasar volume

- **Naik + volume tinggi** → kenaikan didukung partisipasi luas (sehat).
- **Naik + volume rendah** → kenaikan rapuh, bisa cepat berbalik.
- **Breakout + volume melonjak** → konfirmasi kuat.
- **Breakout + volume tipis** → waspada *false breakout*.

![Volume melonjak saat harga menembus resistance — konfirmasi breakout yang sehat](/academy/teknikal/volume-breakout.svg)

### Divergensi volume

Kalau harga terus naik tapi volume terus menurun, itu sinyal momentum melemah — pembeli mulai habis. Sebaliknya, volume yang membesar saat harga mendekati support bisa menandakan akumulasi.

> Di Nubuat, sinyal volume ini juga dipakai modul **Bandarmology** untuk mendeteksi akumulasi/distribusi investor besar. Pelajari kaitannya di modul Bandarmology 101.`,
      },
      {
        slug: "indikator-populer",
        title: "Indikator Populer (MA, RSI, MACD)",
        readMinutes: 6,
        summary: "Tiga indikator paling dipakai dan cara membacanya tanpa over-rely.",
        body: `## Indikator Populer

Indikator adalah turunan matematis dari harga/volume. Alat bantu — **bukan bola kristal**.

![Tiga indikator populer: Moving Average dengan golden cross, RSI dengan zona overbought/oversold, dan MACD](/academy/teknikal/indicators.svg)

### Moving Average (MA)

Rata-rata harga selama N periode, untuk memuluskan noise dan melihat arah tren.

- **MA50 & MA200** sering dipakai. Harga di atas MA200 = bias jangka panjang naik.
- **Golden Cross** (MA50 memotong MA200 ke atas) → sinyal bullish.
- **Death Cross** (MA50 memotong MA200 ke bawah) → sinyal bearish.

### RSI (Relative Strength Index)

Mengukur kecepatan & besar pergerakan, skala 0–100.

- **> 70** → *overbought* (potensi koreksi).
- **< 30** → *oversold* (potensi rebound).
- **Divergensi** (harga naik tapi RSI turun) → momentum melemah.

### MACD

Membandingkan dua MA untuk mendeteksi perubahan momentum.

- **MACD memotong garis sinyal ke atas** → momentum naik.
- **Memotong ke bawah** → momentum turun.

> **Jangan over-rely.** Indikator sering memberi sinyal terlambat (*lagging*). Pakai sebagai konfirmasi tambahan, bukan satu-satunya alasan beli. Gabungkan dengan struktur harga & volume.`,
      },
    ],
  },

  // ============================ MODUL 3 ============================
  {
    slug: "bandarmology-101",
    title: "Bandarmology 101",
    icon: "Users",
    level: "Menengah",
    description:
      "Membaca jejak investor besar: akumulasi, distribusi, dan data broker summary.",
    lessons: [
      {
        slug: "siapa-itu-bandar",
        title: "Siapa Itu 'Bandar'?",
        readMinutes: 4,
        summary: "Definisi realistis bandar dan kenapa jejaknya penting.",
        body: `## Siapa Itu "Bandar"?

Dalam pasar saham Indonesia, **bandar** adalah istilah informal untuk **investor berdana besar** yang mampu menggerakkan harga sebuah saham — bisa institusi, asing, atau pemain lokal kakap.

### Kenapa kita peduli?

Pemain besar tidak bisa membeli/menjual diam-diam tanpa meninggalkan **jejak** di data transaksi. Dengan membaca jejak ini, kamu bisa:

- Mendeteksi kapan saham sedang **diakumulasi** (dikumpulkan diam-diam).
- Mendeteksi kapan saham sedang **didistribusi** (dilepas ke ritel).
- Menghindari jebakan "saham digoreng" lalu ditinggal.

### Penting: ini bukan kepastian

Bandarmology adalah **analisis probabilistik**, bukan sinyal pasti. Jejak bisa menyesatkan (mis. transaksi *crossing* internal). Gunakan sebagai **satu lapisan konfirmasi**, dipadu analisis teknikal & fundamental.

> Di Nubuat, modul Bandarmology mengolah data ini otomatis jadi skor & narasi. Memahami konsepnya di sini membuat kamu paham *kenapa* skor itu muncul.`,
      },
      {
        slug: "akumulasi-vs-distribusi",
        title: "Akumulasi vs Distribusi",
        readMinutes: 5,
        summary: "Dua fase kunci yang menentukan arah saham berikutnya.",
        body: `## Akumulasi vs Distribusi

Ini adalah inti dari bandarmology (dan beririsan dengan teori Wyckoff).

![Fase akumulasi (sideways di area bawah) lalu markup naik, disusul distribusi (sideways di area atas) lalu markdown turun](/academy/bandarmology/akumulasi-distribusi.svg)

### Akumulasi

Pemain besar mengumpulkan saham **secara perlahan** agar harga tidak naik terlalu cepat.

Ciri-ciri:

- Harga cenderung **sideways** di area bawah, tidak banyak bergerak.
- Volume beli stabil/meningkat tanpa lonjakan harga signifikan.
- Sering terjadi setelah penurunan panjang (saat ritel sudah pesimis).

### Distribusi

Pemain besar **melepas** saham ke pasar (sering ke ritel yang FOMO).

Ciri-ciri:

- Harga sideways/menurun di area atas setelah kenaikan besar.
- Volume jual tinggi tapi harga sulit naik lagi.
- Berita positif justru ramai saat harga mulai loyo (ciri klasik).

| Fase | Lokasi harga | Mood ritel | Aksi cerdas |
| --- | --- | --- | --- |
| **Akumulasi** | Bawah | Pesimis | Pertimbangkan masuk bertahap |
| **Distribusi** | Atas | Euforia | Pertimbangkan kurangi / hindari |

> Pola umum: **ritel cenderung beli saat euforia (distribusi) dan jual saat panik (akumulasi)** — kebalikan dari yang menguntungkan. Sadari bias ini.`,
      },
      {
        slug: "membaca-broker-summary",
        title: "Membaca Broker Summary",
        readMinutes: 5,
        summary: "Data broker net buy/sell dan cara menafsirkannya.",
        body: `## Membaca Broker Summary

**Broker summary** menampilkan ringkasan broker mana yang paling banyak membeli & menjual sebuah saham pada periode tertentu.

![Ilustrasi tabel broker summary: top buyers (net beli) vs top sellers (net jual) beserta net value](/academy/bandarmology/broker-summary.svg)

### Komponen yang dibaca

- **Top Buyers** — broker dengan net beli terbesar (volume & nilai).
- **Top Sellers** — broker dengan net jual terbesar.
- **Net value** — selisih beli dikurangi jual per broker.
- **Average price** — harga rata-rata broker tersebut bertransaksi.

### Cara menafsirkan

1. **Broker asing/institusi net beli konsisten** beberapa hari → indikasi akumulasi serius.
2. **Average price pembeli besar di atas harga sekarang** → mereka belum untung, cenderung menahan harga (support psikologis).
3. **Satu broker dominan di kedua sisi (buy & sell)** → hati-hati, bisa jadi transaksi *crossing* yang menyesatkan.

> **Jangan baca 1 hari saja.** Lihat tren beberapa hari/minggu. Akumulasi sejati butuh waktu, bukan lonjakan sehari.

### Hubungan dengan harga

Net buy besar yang diikuti harga naik bertahap = sinyal sehat. Net buy besar tapi harga stagnan = bisa jadi sedang dikumpulkan (akumulasi diam-diam) — perhatikan kelanjutannya.`,
      },
    ],
  },

  // ============================ MODUL 4 ============================
  {
    slug: "manajemen-risiko",
    title: "Manajemen Risiko",
    icon: "ShieldCheck",
    level: "Pemula",
    description:
      "Bertahan hidup di pasar: position sizing, stop loss, diversifikasi, dan psikologi.",
    lessons: [
      {
        slug: "kenapa-risiko-nomor-satu",
        title: "Kenapa Risiko Nomor Satu",
        readMinutes: 4,
        summary: "Bertahan dulu, baru cuan. Matematika kerugian yang harus kamu tahu.",
        body: `## Kenapa Risiko Nomor Satu

Pemain pemula fokus ke "berapa cuan". Pemain yang bertahan fokus ke "berapa yang bisa hilang". **Tugas utama kamu adalah bertahan hidup di pasar.**

### Matematika kerugian (penting!)

Kerugian dan keuntungan tidak simetris. Untuk balik modal:

| Rugi | Butuh naik berapa untuk pulih |
| --- | --- |
| -10% | +11% |
| -25% | +33% |
| -50% | +100% |
| -90% | +900% |

Semakin dalam rugi, semakin sulit pulih. Inilah kenapa **membatasi kerugian** lebih penting daripada mengejar untung besar.

> Aturan terkenal: **Rule No.1 — jangan rugi besar. Rule No.2 — jangan lupa Rule No.1.**

### Mindset yang benar

- Kamu tidak harus menang di setiap transaksi.
- Kamu hanya perlu memastikan kemenangan lebih besar daripada kekalahan secara total.
- Modal yang terjaga = kesempatan untuk transaksi berikutnya.`,
      },
      {
        slug: "position-sizing-stop-loss",
        title: "Position Sizing & Stop Loss",
        readMinutes: 6,
        summary: "Tentukan ukuran posisi & titik cut loss sebelum membeli.",
        body: `## Position Sizing & Stop Loss

Dua alat paling ampuh untuk mengontrol risiko per transaksi.

### Stop Loss

**Stop loss** adalah harga di mana kamu akan menjual untuk membatasi kerugian kalau tesis kamu salah.

- Tentukan **sebelum** beli, bukan setelah harga jatuh.
- Letakkan di bawah support / swing low yang logis, bukan angka asal.
- **Patuhi.** Stop loss yang tidak dijalankan tidak ada gunanya.

### Position Sizing (aturan 1–2%)

Aturan umum: **risiko maksimal per transaksi 1–2% dari total modal.**

Rumus jumlah lembar yang boleh dibeli:

\`\`\`
Risiko per transaksi = Total Modal × 2%
Risiko per lembar     = Harga Beli − Harga Stop Loss
Jumlah lembar         = Risiko per transaksi ÷ Risiko per lembar
\`\`\`

**Contoh:** Modal Rp50.000.000, risiko 2% = Rp1.000.000.
Beli di Rp1.000, stop loss Rp950 → risiko Rp50/lembar.
Maksimal beli = 1.000.000 ÷ 50 = **20.000 lembar (200 lot)**.

> Dengan cara ini, walau stop loss kena, kamu hanya kehilangan 2% modal — tidak fatal.

### Risk/Reward Ratio

Sebelum masuk, bandingkan potensi untung vs rugi. Cari minimal **1:2** (potensi untung 2× potensi rugi). Di Nubuat, Daily Picks sudah menyertakan entry/SL/TP dengan rasio ini.

![Risk-reward ratio 1:2 dengan posisi Entry, Stop Loss di bawah, dan Target di atas](/academy/risk/risk-reward.svg)`,
      },
      {
        slug: "diversifikasi",
        title: "Diversifikasi (Tanpa Berlebihan)",
        readMinutes: 4,
        summary: "Jangan taruh semua telur di satu keranjang — tapi jangan punya 50 keranjang.",
        body: `## Diversifikasi (Tanpa Berlebihan)

**Diversifikasi** = menyebar modal ke beberapa saham/sektor agar satu kejadian buruk tidak menghancurkan portofolio.

### Kenapa penting

Kalau seluruh modal di 1 saham dan perusahaan itu kena masalah (suspensi, skandal, rugi), kamu bisa kehilangan banyak sekaligus. Beberapa posisi mengurangi dampak satu kegagalan.

### Tapi jangan over-diversifikasi

- Punya 30–50 saham → kamu tidak bisa memantau semuanya; hasilnya cuma "rata-rata pasar" tapi tanpa fokus.
- Untuk ritel, **5–10 saham** yang dipahami betul biasanya cukup.

### Diversifikasi yang benar

- Sebar antar **sektor berbeda** (mis. perbankan, konsumer, energi) — bukan 5 bank sekaligus.
- Pertimbangkan korelasi: saham di sektor sama cenderung bergerak searah.
- Sisakan **cash**. Kas bukan posisi yang sia-sia — ia memberi fleksibilitas saat peluang muncul.

> Gunakan fitur **Sectors** & **Rotation (RRG)** di Nubuat untuk melihat sebaran sektor dan menghindari penumpukan di satu area.`,
      },
      {
        slug: "psikologi-trading",
        title: "Psikologi Trading",
        readMinutes: 5,
        summary: "Musuh terbesar kamu sering bukan pasar, tapi emosi sendiri.",
        body: `## Psikologi Trading

Strategi sebagus apa pun gagal kalau emosi mengambil alih. Ini sisi yang paling sering diremehkan pemula.

### Tiga emosi penghancur

1. **FOMO (Fear of Missing Out)** — beli karena takut ketinggalan saat harga sudah naik tinggi. Sering jadi pembeli terakhir sebelum koreksi.
2. **Greed (serakah)** — menahan posisi terlalu lama karena ingin lebih, lalu untung berubah jadi rugi.
3. **Fear / Panic** — menjual di harga terendah saat panik, persis saat seharusnya tenang.

### Cara melawannya

- **Punya rencana sebelum masuk:** entry, stop loss, target. Eksekusi sesuai rencana, bukan perasaan.
- **Jurnal trading:** catat alasan setiap beli/jual. Review berkala untuk melihat pola kesalahan.
- **Jangan balas dendam (revenge trading):** setelah rugi, jangan langsung "ingin balik modal" dengan posisi besar — itu memperdalam lubang.
- **Terima bahwa loss adalah biaya bisnis.** Tidak ada yang menang 100%.

> Latih disiplin tanpa risiko uang nyata lewat fitur **Paper Trade** di Nubuat sebelum mempertaruhkan modal asli.

### Penutup

Konsistensi mengalahkan keberuntungan. Trader yang bertahan bukan yang paling pintar, tapi yang paling **disiplin** mengelola risiko dan emosinya.`,
      },
    ],
  },

  // ============================ MODUL 5 ============================
  {
    slug: "baca-laporan-keuangan",
    title: "Baca Laporan Keuangan IDX",
    icon: "FileText",
    level: "Menengah",
    description:
      "Bedah laporan keuangan emiten: laba rugi, neraca, arus kas, dan rasio penting biar kamu tahu kondisi asli perusahaan.",
    lessons: [
      {
        slug: "tiga-laporan-utama",
        title: "Tiga Laporan Utama",
        readMinutes: 5,
        summary: "Laba rugi, neraca, dan arus kas — apa beda & fungsinya.",
        body: `## Tiga Laporan Utama

Sebelum beli saham, kamu sebaiknya tahu kondisi keuangan perusahaannya. Tiga laporan ini adalah "rapor" emiten yang wajib dipahami. Semuanya bisa kamu unduh dari situs **IDX** atau halaman resmi emiten.

### 1. Laporan Laba Rugi (Income Statement)

Menjawab: **"Perusahaan ini untung atau rugi selama periode tertentu?"**

Alurnya sederhana:

\`\`\`
Pendapatan (Revenue)
−  Beban Pokok Penjualan (COGS)
=  Laba Kotor (Gross Profit)
−  Beban Operasional
=  Laba Operasi (Operating Profit)
−  Beban Bunga & Pajak
=  Laba Bersih (Net Income)
\`\`\`

### 2. Neraca (Balance Sheet)

Foto kondisi keuangan pada **satu titik waktu**. Rumus emasnya:

> **Aset = Liabilitas (Utang) + Ekuitas (Modal)**

- **Aset** — apa yang dimiliki (kas, piutang, persediaan, pabrik).
- **Liabilitas** — apa yang menjadi kewajiban/utang.
- **Ekuitas** — sisa hak pemilik setelah utang dilunasi.

### 3. Laporan Arus Kas (Cash Flow)

Melacak **uang tunai** yang benar-benar masuk & keluar — dibagi 3: Operasi, Investasi, Pendanaan.

> Laba bisa "di-make up" lewat akuntansi, tapi **kas susah dibohongi**. Perusahaan bisa untung di atas kertas tapi kehabisan kas. Karena itu arus kas operasi yang positif & sehat sangat penting.`,
      },
      {
        slug: "rasio-keuangan-penting",
        title: "Rasio Keuangan Penting",
        readMinutes: 6,
        summary: "ROE, PER, PBV, DER, margin — angka kunci yang dipakai analis.",
        body: `## Rasio Keuangan Penting

Angka mentah di laporan jadi lebih bermakna setelah diubah jadi **rasio**. Ini yang sering kamu lihat di halaman ticker Nubuat.

### Rasio profitabilitas

| Rasio | Arti | Patokan kasar |
| --- | --- | --- |
| **ROE** | Laba bersih ÷ ekuitas. Seberapa efisien modal menghasilkan laba. | > 15% = bagus |
| **Net Profit Margin** | Laba bersih ÷ pendapatan. | Makin tinggi makin baik |

### Rasio valuasi

| Rasio | Arti | Patokan kasar |
| --- | --- | --- |
| **PER (P/E)** | Harga ÷ laba per saham. Berapa "tahun" laba untuk balik modal. | < 15 relatif murah |
| **PBV (P/BV)** | Harga ÷ nilai buku per saham. | < 1 = di bawah nilai buku |

### Rasio kesehatan utang

- **DER (Debt to Equity)** — total utang ÷ ekuitas. Di atas 2 perlu hati-hati (kecuali sektor seperti bank yang wajar tinggi).
- **Current Ratio** — aset lancar ÷ utang lancar. > 1 berarti mampu bayar kewajiban jangka pendek.

> **Selalu bandingkan dengan sektor sejenis.** PER 25 bisa mahal untuk bank, tapi wajar untuk saham teknologi bertumbuh. Rasio tanpa konteks menyesatkan.`,
      },
      {
        slug: "red-flag-laporan-keuangan",
        title: "Red Flag yang Harus Diwaspadai",
        readMinutes: 5,
        summary: "Tanda bahaya di laporan keuangan sebelum kamu nyangkut.",
        body: `## Red Flag yang Harus Diwaspadai

Membaca laporan bukan cuma cari yang bagus, tapi juga menghindari jebakan. Ini sinyal bahaya yang sering muncul.

### Daftar red flag

1. **Laba naik tapi arus kas operasi negatif** — labanya mungkin cuma "di atas kertas" (banyak piutang yang belum jadi uang).
2. **Utang tumbuh jauh lebih cepat dari pendapatan** — beban bunga bisa menggerus laba dan menambah risiko.
3. **Piutang & persediaan menumpuk** — produk tidak laku atau pelanggan telat bayar.
4. **Opini auditor selain "Wajar Tanpa Pengecualian (WTP)"** — perhatikan baik-baik kalau auditor memberi catatan.
5. **Sering ganti auditor atau direktur keuangan** — bisa jadi ada yang ditutupi.
6. **Laba "luar biasa" dari pos non-operasional** — mis. untung sekali dari jual aset, bukan dari bisnis inti.

### Cara praktis

- Bandingkan minimal **3 tahun** untuk lihat tren, bukan cuma 1 kuartal bagus.
- Baca **Catatan atas Laporan Keuangan** (CALK) — detail penting sering "disembunyikan" di sana.

> Di Nubuat, faktor **Quality** & **Value** pada Nubuat Verdict sudah merangkum sebagian rasio ini otomatis. Tapi memahami sumbernya membuat kamu tidak buta saat angkanya terlihat aneh.`,
      },
    ],
  },

  // ============================ MODUL 6 ============================
  {
    slug: "strategi-investasi",
    title: "Strategi & Style Investasi",
    icon: "Compass",
    level: "Pemula",
    description:
      "Kenali gaya investasi yang cocok untuk kamu: value, growth, dividen, DCA, dan beda trading vs investing.",
    lessons: [
      {
        slug: "trading-vs-investing",
        title: "Trading vs Investing",
        readMinutes: 4,
        summary: "Dua pendekatan berbeda — kenali mana yang cocok untuk kamu.",
        body: `## Trading vs Investing

Banyak pemula bingung karena mencampur dua hal yang berbeda. Tentukan dulu kamu mau jadi yang mana.

### Investing (jangka panjang)

- **Horizon:** tahunan.
- **Fokus:** kualitas bisnis & pertumbuhan jangka panjang (fundamental).
- **Aktivitas:** jarang transaksi; beli lalu tahan ("buy and hold").
- **Cocok untuk:** kamu yang sibuk, sabar, dan tak mau pantau layar tiap hari.

### Trading (jangka pendek)

- **Horizon:** harian sampai mingguan/bulanan.
- **Fokus:** pergerakan harga & momentum (teknikal).
- **Aktivitas:** sering transaksi; butuh disiplin & manajemen risiko ketat.
- **Cocok untuk:** kamu yang punya waktu memantau dan tahan tekanan.

| Aspek | Investing | Trading |
| --- | --- | --- |
| Waktu dibutuhkan | Sedikit | Banyak |
| Andalan analisis | Fundamental | Teknikal |
| Frekuensi | Rendah | Tinggi |
| Stres | Rendah | Tinggi |

> Tidak ada yang lebih superior — yang penting **konsisten dengan satu gaya** dan tidak loncat-loncat saat panik. Banyak kerugian pemula berasal dari "beli niat investasi, jual karena panik harian".`,
      },
      {
        slug: "value-growth-dividen",
        title: "Value, Growth & Dividen",
        readMinutes: 5,
        summary: "Tiga aliran investasi populer dan filosofi di baliknya.",
        body: `## Value, Growth & Dividen

Tiga gaya investing yang paling umum. Kamu bisa mengombinasikannya, tapi pahami dulu masing-masing.

### Value Investing

Cari saham bagus yang **dihargai murah** oleh pasar (di bawah nilai wajarnya). Diusung Benjamin Graham & Warren Buffett.

- Lihat: PER & PBV rendah, tapi bisnis tetap sehat.
- Butuh kesabaran sampai pasar "sadar" dan menaikkan harganya.

### Growth Investing

Cari perusahaan dengan **pertumbuhan tinggi** (pendapatan & laba naik kencang). Diusung Peter Lynch.

- Lihat: revenue & earnings growth tinggi (> 20%).
- Valuasi sering "mahal" — kamu membayar untuk masa depan.

### Dividend Investing

Cari perusahaan yang rutin **membagikan dividen** besar & stabil. Untuk arus kas pasif.

- Lihat: dividend yield tinggi + payout berkelanjutan.
- Cocok untuk tujuan passive income jangka panjang.

> Di **Screener** Nubuat ada preset "Value Hunter", "Growth Story", dan "Dividend Aristocrat" yang langsung menyaring saham sesuai gaya ini. Pakai sebagai titik awal riset.`,
      },
      {
        slug: "dca-strategi-nabung",
        title: "Dollar-Cost Averaging (Nabung Saham)",
        readMinutes: 4,
        summary: "Strategi paling ramah pemula: cicil beli rutin tanpa menebak waktu.",
        body: `## Dollar-Cost Averaging (Nabung Saham)

**DCA** adalah strategi membeli saham dengan **nominal tetap secara rutin** (mis. tiap bulan), tanpa peduli harga sedang naik atau turun.

### Kenapa ampuh untuk pemula

- **Tidak perlu menebak waktu pasar (timing).** Menebak titik terendah hampir mustahil, bahkan untuk profesional.
- Saat harga turun, nominal yang sama dapat **lebih banyak lembar**; saat naik, dapat lebih sedikit. Rata-rata harga belimu jadi lebih halus.
- Membangun **disiplin & kebiasaan** — investasi jadi otomatis, bukan emosional.

### Contoh sederhana

Kamu beli Rp1.000.000 saham X tiap bulan:

| Bulan | Harga | Lembar didapat |
| --- | --- | --- |
| 1 | Rp1.000 | 1.000 |
| 2 | Rp800 | 1.250 |
| 3 | Rp1.250 | 800 |

Total Rp3.000.000 → 3.050 lembar, harga rata-rata ≈ Rp984 — lebih rendah dari rata-rata sederhana ketiga harga.

### Catatan penting

- DCA cocok untuk saham/indeks **berkualitas & bertumbuh jangka panjang**, bukan saham gorengan.
- Tetap evaluasi berkala: kalau fundamental perusahaan rusak permanen, DCA hanya memperdalam kerugian.

> Latih ritme beli bertahap ini dulu lewat **Paper Trade** di Nubuat — gratis dan tanpa risiko uang asli.`,
      },
    ],
  },

  // ============================ MODUL: WMI ============================
  {
    slug: "wmi-wakil-manajer-investasi",
    title: "WMI — Wakil Manajer Investasi",
    icon: "Award",
    level: "Menengah",
    description:
      "Persiapan sertifikasi WMI (Wakil Manajer Investasi): apa itu, untuk siapa, struktur ujian, silabus, dan tips lulus. Lanjutkan ke Try Out 10 paket soal + sertifikat.",
    lessons: [
      {
        slug: "wmi-apa-itu",
        title: "Apa Itu WMI?",
        readMinutes: 5,
        summary: "WMI = izin profesi OJK untuk mengelola portofolio investasi nasabah.",
        body: `**WMI (Wakil Manajer Investasi)** adalah izin profesi dari OJK bagi orang perseorangan yang mewakili perusahaan **Manajer Investasi (MI)** dalam mengelola portofolio efek nasabah (reksa dana, kontrak pengelolaan dana/KPD, dll).

WMI adalah salah satu dari tiga izin wakil di pasar modal:

| Izin | Untuk |
|---|---|
| **WPPE** | Wakil Perantara Pedagang Efek (broker/dealer) |
| **WPEE** | Wakil Penjamin Emisi Efek (underwriter) |
| **WMI** | Wakil Manajer Investasi (pengelola investasi) |

Untuk berkarier di industri pengelolaan investasi (fund manager, wealth/asset management), izin **WMI umumnya wajib**.`,
      },
      {
        slug: "wmi-untuk-siapa",
        title: "Untuk Siapa & Kenapa Penting?",
        readMinutes: 4,
        summary: "Cocok untuk calon fund manager, analis, sales reksa dana, hingga fresh graduate.",
        body: `Cocok untuk: calon **fund manager**, analis investasi, tim pengelolaan portofolio MI, financial planner, sales reksa dana yang ingin naik level, serta mahasiswa/fresh graduate yang menargetkan karier di industri pengelolaan dana.

**Manfaat:**

- Syarat legal untuk mengelola dana nasabah.
- Bukti kompetensi yang diakui industri → buka peluang karier & kenaikan jenjang.
- Memperdalam pemahaman pasar modal, valuasi, dan manajemen portofolio secara terstruktur.`,
      },
      {
        slug: "wmi-struktur-ujian",
        title: "Struktur & Format Ujian",
        readMinutes: 4,
        summary: "Pilihan ganda berbasis komputer (CBT) dengan nilai ambang kelulusan.",
        body: `Ujian WMI diselenggarakan lembaga sertifikasi profesi pasar modal di bawah pengawasan OJK. Format umum:

- **Pilihan ganda** (multiple choice), berbasis komputer (CBT).
- Materi lintas beberapa bidang (lihat silabus).
- Ada **nilai ambang kelulusan** (passing grade).

> Detail jumlah soal, durasi, biaya, dan jadwal mengikuti ketentuan lembaga penyelenggara terkini — selalu cek sumber resmi sebelum mendaftar. **Try Out di Nubuat** membantumu berlatih format & materinya.`,
      },
      {
        slug: "wmi-silabus",
        title: "Silabus & Materi yang Diuji",
        readMinutes: 6,
        summary: "Enam bidang: ekonomi, produk investasi, reksa dana, portofolio, analisis efek, etika-regulasi.",
        body: `Bidang materi utama WMI:

1. **Ekonomi & Keuangan** — makroekonomi (inflasi, suku bunga, PDB, nilai tukar), nilai waktu uang, matematika keuangan.
2. **Produk Investasi & Pasar Modal** — saham, obligasi/SBN, derivatif, kelembagaan (BEI, KPEI, KSEI, OJK), mekanisme perdagangan & IPO.
3. **Reksa Dana & Pengelolaan Investasi** — jenis reksa dana, NAB, KIK, biaya, prospektus, perpajakan.
4. **Manajemen Portofolio** — diversifikasi, CAPM/beta, Markowitz, Sharpe/Treynor, alokasi & rebalancing.
5. **Analisis Efek** — fundamental (rasio, valuasi saham/obligasi) & teknikal dasar.
6. **Etika & Regulasi** — UU Pasar Modal No.8/1995, POJK, kode etik, larangan (insider trading, manipulasi pasar), APU-PPT/KYC, prinsip mengenal nasabah & kesesuaian (suitability).`,
      },
      {
        slug: "wmi-tips-lulus",
        title: "Tips Lulus + Mulai Try Out",
        readMinutes: 4,
        summary: "Kuasai konsep & hitungan, banyak latihan soal, lalu uji di Try Out WMI.",
        body: `**Tips:**

1. Kuasai konsep, jangan menghafal mati — banyak soal kasus/hitungan.
2. Latih matematika keuangan (PV/FV, yield, NAB) sampai cepat.
3. Hafal kelembagaan & regulasi inti (siapa mengatur apa, larangan & sanksinya).
4. Kerjakan banyak latihan soal + baca pembahasannya.
5. Kelola waktu saat ujian.

**Siap berlatih?** Buka **[Try Out WMI](/academy/tryout)** — 10 paket soal latihan lintas silabus, lengkap dengan **pembahasan tiap soal**, riwayat skor, dan **sertifikat penyelesaian** kalau kamu lulus.

> Soal latihan disusun berdasarkan silabus WMI untuk tujuan edukasi — bukan reproduksi soal ujian resmi.`,
      },
    ],
  },

  elliottModule,
  wyckoffModule,
  chartPatternsModule,
  candlestickModule,
  fundamentalModule,
  bandarmologyLanjutanModule,
  psikologiModule,
  sektorRotasiModule,
  dividendModule,
  ipoCorporateActionModule,
  makroTemaPasarModule,
  sahamSyariahModule,
  etfReksadanaModule,
  mekanismeOrderModule,
  valuasiMendalamModule,
  analisisTransaksiModule,
  swingTradingModule,
  scalpingDaytradingModule,
  tradingPlanJurnalModule,
  taxLegalModule,
  studiKasusIdxModule,
  sahamFcaModule,
  insiderIntegritasModule,
  waranLengkapModule,
  moneyFlowTimingModule,
  intermarketKorelasiModule,
  konstruksiPortofolioModule,
  quantSistematisModule,
  derivatifHedgingModule,
  marketMicrostructureModule,
  indeksGlobalModule,
];

// ---------------------------------------------------------------------------
// Helpers (dipakai oleh halaman & komponen Academy).
// ---------------------------------------------------------------------------

export interface LessonRef {
  module: AcademyModule;
  lesson: AcademyLesson;
}

/** Daftar lesson ter-flatten dalam urutan modul→lesson (untuk navigasi prev/next). */
export const ACADEMY_LESSON_ORDER: LessonRef[] = ACADEMY_MODULES.flatMap((module) =>
  module.lessons.map((lesson) => ({ module, lesson })),
);

export function getLessonBySlug(slug: string): LessonRef | undefined {
  return ACADEMY_LESSON_ORDER.find((ref) => ref.lesson.slug === slug);
}

export function getModuleBySlug(slug: string): AcademyModule | undefined {
  return ACADEMY_MODULES.find((m) => m.slug === slug);
}

/** Slug modul WMI — dipisah ke seksi "Sertifikasi" di UI (tidak semua butuh). */
export const WMI_MODULE_SLUG = "wmi-wakil-manajer-investasi";

export function getAdjacentLessons(slug: string): {
  prev?: LessonRef;
  next?: LessonRef;
} {
  const idx = ACADEMY_LESSON_ORDER.findIndex((ref) => ref.lesson.slug === slug);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? ACADEMY_LESSON_ORDER[idx - 1] : undefined,
    next: idx < ACADEMY_LESSON_ORDER.length - 1 ? ACADEMY_LESSON_ORDER[idx + 1] : undefined,
  };
}

export const TOTAL_LESSON_COUNT = ACADEMY_LESSON_ORDER.length;

/** localStorage key prefix untuk progress "sudah dibaca" per lesson. */
export const ACADEMY_PROGRESS_PREFIX = "nubuat-academy-read:";
