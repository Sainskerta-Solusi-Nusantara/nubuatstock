/**
 * Academy content — single source of truth untuk modul edukasi in-app.
 *
 * Tujuan (IMPROVEMENT_PLAN §3.E.1): modul belajar beginner→intermediate untuk
 * meningkatkan retensi + funnel. Beda dari Guidance (yang ngajarin cara pakai
 * fitur app), Academy ngajarin konsep investasi/trading saham itu sendiri.
 *
 * Struktur: Module → Lesson. Konten static & fully typed (bukan DB) supaya
 * MVP cepat & gampang di-review. Body lesson pakai markdown ringkas, dirender
 * lewat komponen yang sama dengan AI Copilot (react-markdown + remark-gfm).
 *
 * CATATAN: untuk skala lebih besar (banyak lesson, edit oleh non-engineer,
 * versioning) konten ini bisa dipindah ke CMS / DB dengan superadmin editor.
 * Bentuk tipe di bawah sengaja dibuat serializable supaya migrasi mudah.
 */

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
  level: "Pemula" | "Menengah";
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

Sebelum masuk, bandingkan potensi untung vs rugi. Cari minimal **1:2** (potensi untung 2× potensi rugi). Di Nubuat, Daily Picks sudah menyertakan entry/SL/TP dengan rasio ini.`,
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
