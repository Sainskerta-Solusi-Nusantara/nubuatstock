/**
 * Modul Academy — Wyckoff Method (Menengah).
 *
 * Konten static & fully typed mengikuti interface AcademyModule/AcademyLesson
 * di ../content.ts. Body lesson markdown (react-markdown + remark-gfm),
 * gambar via ![alt](/academy/wyckoff/NAMA.svg) — plain <img>, tanpa raw HTML.
 *
 * Diagram SVG self-hosted ada di public/academy/wyckoff/.
 * Wiring ke ACADEMY_MODULES dilakukan terpisah di content.ts.
 */
import type { AcademyModule } from "../content";

export const wyckoffModule: AcademyModule = {
  slug: "wyckoff-method",
  title: "Wyckoff Method Lengkap",
  icon: "Activity",
  level: "Menengah",
  description:
    "Belajar membaca jejak smart money lewat metode Wyckoff: 3 hukum, siklus pasar, skema akumulasi & distribusi, sampai analisis volume (VSA) dan praktiknya di saham IDX.",
  lessons: [
    // ============================ LESSON 1 ============================
    {
      slug: "wyckoff-pengantar",
      title: "Pengantar: Apa Itu Wyckoff & Composite Man",
      readMinutes: 7,
      summary:
        "Sejarah Richard D. Wyckoff dan filosofi inti: anggap pasar digerakkan satu 'pemain besar' bernama Composite Man.",
      body: `## Pengantar Metode Wyckoff

**Metode Wyckoff** adalah kerangka analisis teknikal yang fokus pada satu pertanyaan: *siapa yang sedang mengendalikan saham ini — pembeli besar atau penjual besar?* Alih-alih menebak arah harga lewat ratusan indikator, Wyckoff mengajak kamu membaca hubungan antara **harga, volume, dan waktu** untuk melihat jejak "uang pintar" (*smart money*).

Kalau kamu sudah pernah dengar istilah **bandarmology** di pasar saham Indonesia, kamu sebenarnya sudah berada di kebun yang sama. Wyckoff adalah "nenek moyang" teoretis dari cara berpikir itu — lahir hampir seabad lebih awal dan lebih terstruktur.

### Siapa Richard D. Wyckoff?

**Richard Demille Wyckoff (1873–1934)** adalah seorang trader, jurnalis, sekaligus pendidik pasar saham di Wall Street awal abad ke-20. Dia mulai bekerja sebagai *stock runner* di usia 15 tahun, lalu menjadi broker dan akhirnya menerbitkan *The Magazine of Wall Street* yang sempat punya ratusan ribu pembaca.

Yang membuat Wyckoff istimewa: dia punya **akses dan kesempatan mewawancarai operator legendaris** zamannya seperti Jesse Livermore, J.P. Morgan, dan Charles Dow. Dari situ dia menyimpulkan bahwa pergerakan harga besar bukan kebetulan — ada pemain besar yang mengakumulasi (mengumpulkan) saham diam-diam, lalu menjualnya ke publik di harga tinggi.

Wyckoff lalu merumuskan pengamatannya menjadi sebuah **metode yang bisa diajarkan**, bukan sekadar intuisi. Itulah yang kita pelajari sampai hari ini.

### Filosofi inti: Composite Man (Sang Operator Komposit)

Inti cara berpikir Wyckoff adalah sebuah alat bantu mental bernama **Composite Man** (Manusia Komposit / Operator Tunggal). Wyckoff menulis kira-kira begini:

> "Semua fluktuasi di pasar sebaiknya kamu pelajari seolah-olah hasil dari operasi satu orang. Sebut saja dia Composite Man, yang secara teoretis duduk di balik layar dan memanipulasi saham demi kerugianmu jika kamu tidak memahami permainannya."

Maksudnya: **bayangkan seluruh aksi beli-jual besar di sebuah saham dilakukan oleh satu pemain raksasa.** Pemain ini rasional, punya rencana, dan punya modal besar. Dengan asumsi ini, kamu berhenti melihat grafik sebagai keacakan, dan mulai bertanya:

- Kalau aku jadi Composite Man, apa yang aku lakukan di posisi harga ini?
- Apakah dia sedang **mengumpulkan barang** (akumulasi) atau **membuang barang** (distribusi)?
- Apa langkah dia berikutnya?

### Prinsip-prinsip Composite Man

1. **Composite Man merencanakan, melaksanakan, dan menuntaskan kampanyenya dengan hati-hati.** Tidak terburu-buru.
2. **Dia memancing publik untuk membeli saham yang sudah banyak dia akumulasi** dengan menciptakan banyak transaksi dan menaikkan harga (markup).
3. **Kamu bisa mengantisipasi langkahnya** dengan mempelajari grafik harga–volume yang merekam jejak aksinya.

### Kenapa ini relevan buat kamu (investor ritel)?

Sebagai ritel, kamu hampir selalu **terlambat** dibanding pemain besar. Tapi jejak mereka tertinggal di grafik: lonjakan volume tak wajar, harga yang "ditahan" di area tertentu, breakout palsu. Wyckoff melatih mata kamu untuk **menumpang arus smart money**, bukan melawannya.

> **Catatan penting.** Composite Man hanyalah *model berpikir*, bukan klaim bahwa ada satu orang yang benar-benar mengendalikan saham. Di praktiknya "smart money" adalah kumpulan institusi, bandar, dan pemain besar yang sering bergerak ke arah serupa. Modelnya berguna justru karena menyederhanakan.

### Tiga pilar yang akan kita bahas

Metode Wyckoff berdiri di atas tiga kaki:

1. **Tiga Hukum Wyckoff** — fondasi logika (lesson berikutnya).
2. **Siklus pasar & skema** — peta kapan akumulasi/distribusi terjadi.
3. **Pendekatan lima langkah memilih saham** — cara praktis menerapkannya.

Di lesson-lesson selanjutnya kita bedah satu per satu, lengkap dengan diagram.`,
    },

    // ============================ LESSON 2 ============================
    {
      slug: "wyckoff-tiga-hukum",
      title: "3 Hukum Wyckoff",
      readMinutes: 8,
      summary:
        "Supply & Demand, Cause & Effect, dan Effort vs Result — tiga logika dasar yang menjelaskan kenapa harga bergerak.",
      body: `## Tiga Hukum Wyckoff

Seluruh metode Wyckoff berdiri di atas tiga hukum fundamental. Kalau kamu paham tiga ini, sisa materi tinggal penerapan.

![Tiga hukum Wyckoff: supply & demand, cause & effect, effort vs result](/academy/wyckoff/three-laws.svg)

### Hukum 1 — The Law of Supply and Demand (Penawaran & Permintaan)

Hukum paling dasar di seluruh ekonomi, dan juga di Wyckoff:

- Kalau **permintaan (demand) > penawaran (supply)** → harga **naik**.
- Kalau **penawaran (supply) > permintaan (demand)** → harga **turun**.
- Kalau keduanya **seimbang** → harga bergerak menyamping (*sideways / trading range*).

Yang khas dari Wyckoff: kamu tidak cukup melihat *harga* saja, tapi membaca **siapa yang lebih agresif** lewat **volume**. Volume adalah ukuran "tenaga" di balik pergerakan. Lonjakan harga tanpa volume = lemah; lonjakan harga dengan volume tinggi = ada permintaan nyata.

| Kondisi | Harga | Volume | Interpretasi Wyckoff |
| --- | --- | --- | --- |
| Demand kuat | Naik | Naik | Sehat, smart money membeli |
| Demand lemah | Naik | Turun | Rapuh, bisa jadi jebakan |
| Supply kuat | Turun | Naik | Tekanan jual nyata |
| Supply mengering | Turun | Turun | Penjual kehabisan tenaga |

### Hukum 2 — The Law of Cause and Effect (Sebab & Akibat)

> **Tidak ada akibat tanpa sebab, dan besarnya akibat sebanding dengan besarnya sebab.**

Dalam Wyckoff:

- **Cause (sebab)** = proses akumulasi atau distribusi yang terjadi selama harga bergerak menyamping di sebuah **trading range**.
- **Effect (akibat)** = tren naik (setelah akumulasi) atau tren turun (setelah distribusi) yang menyusul.

Logikanya: makin **lama dan lebar** sebuah trading range (makin banyak "sebab" yang dibangun smart money), makin **besar** potensi pergerakan harga setelahnya. Range akumulasi kecil → kenaikan kecil. Range akumulasi besar dan lama → potensi kenaikan besar.

Wyckoff klasik bahkan memakai **Point & Figure chart** untuk *mengukur* lebar range dan memproyeksikan target harga. Untuk pemula, cukup pegang intuisinya: **konsolidasi panjang sering melahirkan tren panjang.**

### Hukum 3 — The Law of Effort versus Result (Usaha vs Hasil)

Ini hukum khas Wyckoff yang paling sering dipakai untuk membaca anomali:

- **Effort (usaha)** = **volume**.
- **Result (hasil)** = **pergerakan harga** (lebar candle / spread).

Dalam kondisi normal, **effort dan result harus harmonis**: volume besar menghasilkan pergerakan harga besar searah. Kalau keduanya **tidak harmonis (divergensi)**, itu sinyal ada sesuatu di balik layar.

Contoh divergensi penting:

- **Volume sangat besar, tapi harga hampir tidak naik.** Artinya ada penjual besar yang "menyerap" semua pembelian (supply tersembunyi). Sering muncul di puncak.
- **Volume sangat besar, tapi harga hampir tidak turun.** Artinya ada pembeli besar yang menyerap semua jualan (demand tersembunyi). Sering muncul di dasar.
- **Harga naik tajam tapi volume mengecil.** Kenaikan kehabisan tenaga, hati-hati pembalikan.

> Effort vs Result adalah inti dari **VSA (Volume Spread Analysis)** yang kita bahas khusus di lesson tersendiri.

### Cara tiga hukum ini bekerja bersama

Bayangkan alurnya:

1. **Supply & Demand** memberitahu kamu *arah* dorongan saat ini.
2. **Cause & Effect** memberitahu kamu *seberapa besar* potensi pergerakan setelah konsolidasi.
3. **Effort vs Result** memberitahu kamu *apakah pergerakan itu jujur atau jebakan*.

Tiga lensa ini yang akan kamu pakai berulang kali saat membaca skema akumulasi dan distribusi.`,
    },

    // ============================ LESSON 3 ============================
    {
      slug: "wyckoff-siklus-pasar",
      title: "Siklus Pasar Wyckoff: 4 Fase",
      readMinutes: 7,
      summary:
        "Accumulation → Markup → Distribution → Markdown: peta besar perputaran harga dari dasar ke puncak dan kembali.",
      body: `## Siklus Pasar Wyckoff

Menurut Wyckoff, harga sebuah saham (atau pasar) bergerak dalam **siklus berulang** yang terdiri dari empat fase besar. Memahami posisi saham di siklus ini membantu kamu tahu **kapan harus sabar, kapan menumpang tren, dan kapan menghindar.**

![Siklus pasar Wyckoff: akumulasi, markup, distribusi, markdown](/academy/wyckoff/market-cycle.svg)

### Fase 1 — Accumulation (Akumulasi)

Terjadi **setelah tren turun panjang**, saat harga sudah "murah" dan publik pesimis. Smart money diam-diam **mengumpulkan saham** dari tangan ritel yang panik menjual.

- Harga bergerak **menyamping** dalam sebuah trading range.
- Volume cenderung mengering, lalu muncul lonjakan-lonjakan di area dasar.
- Tujuannya: membeli sebanyak mungkin **tanpa menaikkan harga** (supaya barang murah).

Ini fase paling membosankan, dan justru di situ smart money bekerja.

### Fase 2 — Markup (Kenaikan)

Setelah barang terkumpul cukup, Composite Man **berhenti menahan harga**. Permintaan melampaui penawaran dan harga **naik membentuk tren naik**.

- Higher highs & higher lows (puncak dan lembah makin tinggi).
- Pullback (koreksi) sering jadi peluang masuk.
- Ini fase paling menguntungkan untuk menumpang arus (*trend following*).

### Fase 3 — Distribution (Distribusi)

Setelah harga tinggi dan publik akhirnya euforia masuk, smart money mulai **menjual barangnya** secara perlahan ke ritel yang FOMO.

- Harga kembali bergerak **menyamping** di area atas (trading range baru).
- Sering ada lonjakan volume besar tanpa kelanjutan kenaikan (effort vs result divergen).
- Tujuannya: menjual sebanyak mungkin **tanpa menjatuhkan harga** dulu.

### Fase 4 — Markdown (Penurunan)

Setelah barang habis terdistribusi, tidak ada lagi yang menahan harga. Penawaran melampaui permintaan dan harga **turun membentuk tren turun.**

- Lower highs & lower lows.
- Ritel yang beli di puncak menahan rugi ("nyangkut").
- Di ujung markdown, siklus kembali ke **akumulasi** — dan roda berputar lagi.

### Ringkasan siklus

| Fase | Posisi siklus | Aksi smart money | Aksi ritel umumnya | Sikap ideal kamu |
| --- | --- | --- | --- | --- |
| Accumulation | Dasar | Membeli diam-diam | Menjual / takut | Mengamati, siap masuk |
| Markup | Naik | Menahan / menambah | Mulai ikut | Menumpang tren |
| Distribution | Puncak | Menjual diam-diam | Euforia, FOMO beli | Mulai amankan profit |
| Markdown | Turun | Sudah keluar | Nyangkut | Menghindar / cash |

### Inti pelajaran

Smart money **membeli saat publik takut** (akumulasi) dan **menjual saat publik serakah** (distribusi). Wyckoff melatih kamu mengenali pola "menyamping yang penuh makna" ini — yaitu trading range — sebelum tren besar dimulai. Dua range itulah (akumulasi & distribusi) yang kita bedah detail di lesson berikutnya.`,
    },

    // ============================ LESSON 4 ============================
    {
      slug: "wyckoff-skema-akumulasi",
      title: "Skema Akumulasi: Fase A–E & Event-nya",
      readMinutes: 11,
      summary:
        "Anatomi lengkap trading range akumulasi: dari PS, SC, AR, ST, Spring, Test, SOS, LPS, sampai breakout (BU).",
      body: `## Skema Akumulasi Wyckoff

Inilah jantung metode Wyckoff. **Skema akumulasi** adalah peta detail tentang apa yang terjadi di dalam trading range dasar — lengkap dengan **fase (A–E)** dan **event** bernama khusus. Hafalkan polanya, lalu cari di grafik nyata.

![Skema akumulasi Wyckoff lengkap dengan fase A sampai E dan event PS, SC, AR, ST, Spring, Test, SOS, LPS](/academy/wyckoff/accumulation-schematic.svg)

### Glosarium event (singkatan penting)

| Singkatan | Nama | Arti singkat |
| --- | --- | --- |
| **PS** | Preliminary Support | Dukungan awal, beli pertama smart money |
| **SC** | Selling Climax | Puncak panik jual, volume ekstrem |
| **AR** | Automatic Rally | Pantulan otomatis setelah SC |
| **ST** | Secondary Test | Uji ulang area SC dengan volume lebih kecil |
| **Spring** | Spring / Shakeout | Jebakan turun di bawah support |
| **Test** | Test | Uji apakah masih ada supply setelah Spring |
| **SOS** | Sign of Strength | Tanda kekuatan, naik dengan volume |
| **LPS** | Last Point of Support | Titik dukungan terakhir sebelum markup |
| **BU/LPS** | Back Up | Koreksi terakhir ke atas range |

### Fase A — Menghentikan tren turun

Tujuan fase A: **menghentikan momentum jual** yang sebelumnya dominan.

- **PS (Preliminary Support):** muncul saat pembelian besar pertama mulai memberi dukungan setelah penurunan panjang. Volume mulai melebar. Belum tentu dasar, tapi sinyal awal.
- **SC (Selling Climax):** klimaks kepanikan. Ritel menjual besar-besaran, harga jatuh tajam, **volume sangat ekstrem**. Justru di sini smart money menyerap barang murah secara masif.
- **AR (Automatic Rally):** setelah jual habis-habisan, tekanan jual mengering → harga **memantul otomatis**. Tinggi AR menandai batas atas (resistance) trading range.
- **ST (Secondary Test):** harga turun lagi menguji area SC, tapi dengan **volume & spread lebih kecil**. Kalau tidak menembus jauh ke bawah, artinya supply sudah berkurang. ST menandai batas bawah (support) range.

Setelah fase A, batas atas (AR) dan batas bawah (SC/ST) trading range sudah terbentuk.

### Fase B — Membangun "cause"

Ini fase **terpanjang dan paling membosankan**. Smart money mengakumulasi secara perlahan sambil harga naik-turun di dalam range.

- Banyak ST tambahan, baik di dekat support maupun resistance.
- Volume cenderung menurun seiring supply menipis.
- Sesuai **Hukum Cause & Effect**: makin lama fase B, makin besar "sebab" yang dibangun → makin besar potensi tren naik nanti.

Kesabaran diuji di sini. Banyak ritel menyerah; smart money justru senang.

### Fase C — Ujian terakhir (Spring)

Fase paling menentukan. Tujuannya **memastikan supply sudah benar-benar habis** dengan sebuah jebakan.

- **Spring (Shakeout):** harga **menembus ke bawah support** trading range — seolah-olah breakdown. Ini memancing ritel menjual (stop-loss kena) dan trader nge-short masuk.
- Tapi penembusan itu **palsu**: harga cepat kembali naik ke dalam range. Volume saat kembali penting — idealnya menunjukkan demand.
- **Test:** setelah Spring, harga sering turun sekali lagi menguji, tapi dengan **volume sangat rendah** dan tidak membuat lower low baru. Test bersih = supply habis = lampu hijau.

> Spring yang sukses adalah salah satu sinyal beli paling kuat di Wyckoff. Tapi hati-hati: tidak semua akumulasi punya Spring jelas.

### Fase D — Demand mengambil alih (markup mini)

Setelah supply habis, demand mulai menang. Harga bergerak menuju batas atas range.

- **SOS (Sign of Strength):** lonjakan naik dengan **spread lebar dan volume meningkat** — bukti permintaan nyata. Sering menembus resistance range.
- **LPS (Last Point of Support):** koreksi setelah SOS yang berhenti di level lebih tinggi (higher low). Ini titik masuk "aman" dengan risiko terukur. Bisa ada beberapa LPS berurutan membentuk tangga naik.

### Fase E — Saham keluar dari range (Markup)

Harga **resmi keluar dari trading range** dan tren naik dimulai.

- **BU (Back Up):** kadang harga sempat kembali (back up) menguji batas atas range yang kini jadi support, lalu lanjut naik.
- Setelah ini, saham masuk fase **Markup** di siklus besar.

### Checklist membaca akumulasi

1. Apakah ada tren turun panjang sebelumnya? (syarat akumulasi)
2. Apakah ada SC dengan volume ekstrem + AR setelahnya?
3. Apakah range sudah terbentuk jelas (support–resistance)?
4. Apakah ada Spring + Test bervolume rendah?
5. Apakah muncul SOS (spread lebar, volume naik) menembus resistance?
6. Apakah ada LPS sebagai titik masuk berisiko terukur?

Kalau mayoritas "ya", probabilitas akumulasi sejati meningkat — tapi tetap bukan jaminan.`,
    },

    // ============================ LESSON 5 ============================
    {
      slug: "wyckoff-skema-distribusi",
      title: "Skema Distribusi: Fase A–E & Event-nya",
      readMinutes: 10,
      summary:
        "Kebalikan akumulasi: bagaimana smart money membuang barang di puncak lewat PSY, BC, AR, ST, UTAD, SOW, LPSY.",
      body: `## Skema Distribusi Wyckoff

**Distribusi** adalah cermin dari akumulasi, tapi terjadi di **puncak** dan jauh lebih licik karena bekerja saat publik sedang euforia. Di sini smart money **membuang barang** yang dulu dia kumpulkan murah — ke ritel yang FOMO membeli mahal.

![Skema distribusi Wyckoff lengkap dengan fase A sampai E dan event PSY, BC, AR, ST, UTAD, SOW, LPSY](/academy/wyckoff/distribution-schematic.svg)

### Glosarium event distribusi

| Singkatan | Nama | Arti singkat |
| --- | --- | --- |
| **PSY** | Preliminary Supply | Penawaran awal, jual pertama smart money |
| **BC** | Buying Climax | Puncak euforia beli, volume ekstrem |
| **AR** | Automatic Reaction | Penurunan otomatis setelah BC |
| **ST** | Secondary Test | Uji ulang area BC dengan demand lebih lemah |
| **UTAD** | Upthrust After Distribution | Jebakan naik di atas resistance |
| **SOW** | Sign of Weakness | Tanda kelemahan, turun dengan volume |
| **LPSY** | Last Point of Supply | Titik penawaran terakhir sebelum markdown |

### Fase A — Menghentikan tren naik

Tujuan fase A distribusi: **menghentikan momentum beli.**

- **PSY (Preliminary Supply):** smart money mulai menjual diam-diam di tengah euforia. Muncul lonjakan volume saat harga masih naik — penjual besar mulai aktif.
- **BC (Buying Climax):** klimaks keserakahan. Ritel berbondong-bondong membeli, harga melonjak dengan **volume ekstrem**. Justru di sinilah smart money melepas barang besar-besaran.
- **AR (Automatic Reaction):** setelah pembelian habis tenaganya, harga **jatuh otomatis**. Titik terendah AR menandai support trading range.
- **ST (Secondary Test):** harga naik lagi menguji area BC, tapi dengan **demand lebih lemah** (volume mengecil, gagal bikin higher high meyakinkan). Menandai resistance range.

### Fase B — Membangun "cause" (untuk turun)

Fase panjang tempat smart money **menghabiskan sisa barang**. Harga naik-turun di dalam range, sering terasa "kuat" dan menipu ritel agar terus membeli.

- Effort vs Result mulai sering divergen: volume besar tapi harga gagal naik berarti.
- Makin lama fase B, makin besar potensi penurunan setelahnya (Cause & Effect, versi bearish).

### Fase C — Jebakan terakhir (UTAD)

- **UTAD (Upthrust After Distribution):** kebalikan dari Spring. Harga **menembus ke atas resistance** range — seolah breakout besar. Ini memancing ritel FOMO dan trader breakout masuk, sekaligus menjebak short-seller agar menutup posisi.
- Tapi penembusan palsu: harga cepat **jatuh kembali ke dalam range**. UTAD yang gagal dengan volume tinggi = sinyal distribusi kuat & sering jadi peluang jual / short terbaik.

> Banyak "breakout palsu" yang bikin ritel nyangkut sebenarnya adalah UTAD klasik.

### Fase D — Supply mengambil alih

Setelah UTAD, kelemahan jadi nyata.

- **SOW (Sign of Weakness):** penurunan dengan **spread lebar dan volume meningkat**, sering menembus support range. Bukti penawaran (jual) nyata mendominasi.
- **LPSY (Last Point of Supply):** pantulan lemah setelah SOW yang berhenti di level lebih rendah (lower high). Rally lemah, volume tipis. Ini titik jual/short terakhir berisiko terukur sebelum jatuh. Bisa muncul beberapa kali membentuk tangga turun.

### Fase E — Saham keluar dari range (Markdown)

Harga **jatuh keluar dari trading range** dan tren turun (markdown) dimulai. Lower highs & lower lows berturut-turut. Ritel yang beli di BC/UTAD mulai nyangkut.

### Akumulasi vs Distribusi — tabel cermin

| Aspek | Akumulasi (dasar) | Distribusi (puncak) |
| --- | --- | --- |
| Terjadi setelah | Tren turun panjang | Tren naik panjang |
| Klimaks | Selling Climax (SC) | Buying Climax (BC) |
| Pantulan | Automatic Rally (AR, naik) | Automatic Reaction (AR, turun) |
| Jebakan kunci | Spring (tembus bawah palsu) | UTAD (tembus atas palsu) |
| Sinyal arah | SOS (Sign of Strength) | SOW (Sign of Weakness) |
| Titik terakhir | LPS (Last Point of Support) | LPSY (Last Point of Supply) |
| Hasil | Markup (naik) | Markdown (turun) |

### Hati-hati: keduanya bisa mirip di awal

Trading range akumulasi dan distribusi **terlihat sama** di tahap awal (sama-sama menyamping). Yang membedakan adalah **konteks tren sebelumnya** dan **perilaku volume di event-event kunci** (terutama Spring vs UTAD, dan arah SOS/SOW). Karena itu, jangan menyimpulkan terlalu cepat — tunggu konfirmasi fase C–D.`,
    },

    // ============================ LESSON 6 ============================
    {
      slug: "wyckoff-vsa-volume",
      title: "Volume & VSA (Volume Spread Analysis)",
      readMinutes: 9,
      summary:
        "Cara membaca effort vs result lewat hubungan volume, spread candle, dan posisi penutupan — plus sinyal-sinyal khasnya.",
      body: `## Volume & Volume Spread Analysis (VSA)

Wyckoff menyebut volume sebagai **"effort"** dan pergerakan harga sebagai **"result"**. **VSA (Volume Spread Analysis)** adalah teknik modern (dipopulerkan Tom Williams) yang memperdalam Hukum ke-3 Wyckoff: membaca hubungan antara **volume**, **spread (rentang candle)**, dan **posisi close (penutupan)** untuk mendeteksi jejak smart money di tiap bar.

![Effort vs Result: perbandingan bar harmonis dan bar anomali](/academy/wyckoff/effort-vs-result.svg)

### Tiga komponen yang dibaca VSA

1. **Spread** — jarak antara high dan low candle. Lebar = pergerakan besar; sempit = pergerakan kecil.
2. **Volume** — jumlah transaksi pada candle itu. Tinggi = banyak "tenaga"; rendah = sedikit minat.
3. **Closing position** — di mana harga menutup dalam rentang candle. Close di atas = pembeli menang; close di bawah = penjual menang; close di tengah = tarik-menarik.

### Prinsip harmoni vs anomali

- **Harmoni (sehat):** effort dan result searah & sebanding. Contoh: harga naik dengan spread lebar **dan** volume tinggi → kenaikan didukung permintaan nyata. Tren bisa dipercaya.
- **Anomali (divergensi):** effort dan result tidak nyambung. Inilah sinyal paling berharga, karena membongkar aksi tersembunyi smart money.

### Sinyal-sinyal VSA klasik

#### Sinyal bullish (potensi kekuatan tersembunyi)

| Sinyal | Ciri candle | Makna |
| --- | --- | --- |
| **No Demand (bull trap reverse)** | Bar naik, spread sempit, volume rendah | Kenaikan tanpa minat → rapuh |
| **Stopping Volume** | Bar turun, volume sangat besar, close di atas tengah | Pembeli besar menyerap jual → dasar dekat |
| **Selling Climax** | Spread lebar turun, volume ekstrem, lalu pulih | Panik habis, smart money membeli |
| **Test** | Bar turun ke area supply, volume rendah, close menguat | Supply sudah habis → siap naik |

#### Sinyal bearish (potensi kelemahan tersembunyi)

| Sinyal | Ciri candle | Makna |
| --- | --- | --- |
| **No Supply** (kebalikan) | Bar turun, spread sempit, volume rendah | Penurunan tanpa minat jual |
| **Buying Climax** | Spread lebar naik, volume ekstrem, lalu loyo | Euforia puncak, smart money menjual |
| **Upthrust** | Tembus high lalu close di bawah, volume tinggi | Jebakan naik → distribusi |
| **No Demand di puncak** | Bar naik, spread sempit, volume rendah | Tidak ada lagi pembeli besar |

### Contoh membaca sebuah bar

Bayangkan saham X di area puncak setelah naik panjang:

- Hari ini: **volume tertinggi sebulan**, tapi candle **spread sempit dan close di bawah tengah**.
- Baca pakai Effort vs Result: effort (volume) **sangat besar**, result (kenaikan harga) **kecil**.
- Kesimpulan: ada **penyerapan jual** — penjual besar melepas barang ke setiap pembelian. Ini ciri distribusi. Waspada.

Sebaliknya di area dasar setelah turun panjang:

- **Volume ekstrem**, candle turun **spread lebar** tapi **close kembali ke atas** (ekor bawah panjang).
- Effort besar, hasil akhir justru ditolak ke bawah → ada **demand tersembunyi** menyerap panic selling. Ciri Selling Climax / Spring.

### Aturan praktis VSA

1. **Selalu bandingkan volume bar ini dengan rata-rata** beberapa bar terakhir, bukan angka absolut.
2. **Spread + volume + close** dibaca bersama, jangan satu-satu.
3. **Konteks adalah raja:** sinyal yang sama bisa berarti beda di dasar vs di puncak. Selalu cek posisi di trading range.
4. **Volume tinggi tanpa lanjutan harga = peringatan** (effort tanpa result).
5. **Satu bar bukan sistem.** VSA mengkonfirmasi narasi Wyckoff (fase & event), bukan menggantikannya.

> Inti VSA: harga bisa berbohong, tapi **volume meninggalkan jejak**. Belajar membaca jejak itu adalah keterampilan inti Wyckoff.`,
    },

    // ============================ LESSON 7 ============================
    {
      slug: "wyckoff-praktik-idx",
      title: "Praktik di Saham IDX & Fitur Wyckoff Nubuat",
      readMinutes: 9,
      summary:
        "Menerapkan Wyckoff di pasar Indonesia, menggabungkannya dengan bandarmology, plus cara pakai fitur Wyckoff di Nubuat.",
      body: `## Praktik Wyckoff di Saham IDX

Teori sudah, sekarang praktik. Pasar saham Indonesia (IDX) punya karakter sendiri yang membuat Wyckoff sangat relevan — tapi juga ada beberapa hal yang perlu kamu sesuaikan.

### Kenapa Wyckoff cocok untuk IDX

- **Banyak saham digerakkan "bandar"** (pemain besar), terutama saham lapis dua & tiga. Ini persis model **Composite Man**.
- **Likuiditas tidak merata**: saham tertentu mudah "diatur" pola akumulasi-distribusinya, meninggalkan jejak volume yang jelas.
- **Ritel dominan & emosional**: pola panik (SC) dan euforia (BC) sering kentara.

### Menyesuaikan Wyckoff dengan realita IDX

| Tantangan IDX | Penyesuaian |
| --- | --- |
| Saham gocap / sangat tidak likuid | Hindari — pola Wyckoff jadi tidak andal di volume tipis |
| Auto reject atas/bawah (ARA/ARB) | Klimaks bisa "terpotong" sistem; baca beberapa hari sekaligus |
| Suspensi / corporate action | Bisa merusak struktur range; cek berita dulu |
| Saham blue chip lebih "rapi" | Pola Wyckoff lebih halus, butuh timeframe lebih panjang |

### Menggabungkan Wyckoff + Bandarmology

Wyckoff membaca **harga & volume** (jejak di grafik). **Bandarmology** membaca **siapa yang transaksi** (broker summary, net foreign, akumulasi broker tertentu). Keduanya saling melengkapi:

- Wyckoff bilang "ini terlihat seperti akumulasi (Spring + Test)".
- Bandarmology mengonfirmasi "broker besar/asing memang sedang net buy di area ini".

Kalau **dua lensa sepakat**, keyakinan kamu naik. Kalau bertentangan, lebih baik tunggu. Pelajari lebih lanjut di modul **Bandarmology** kalau tersedia di Academy kamu.

### Langkah praktis menemukan setup Wyckoff

1. **Cari konteks tren dulu.** Saham habis turun panjang (kandidat akumulasi) atau naik panjang (kandidat distribusi)?
2. **Identifikasi trading range.** Apakah harga sudah menyamping membentuk support–resistance jelas?
3. **Tandai event kunci.** Adakah SC/BC, AR, ST? Lalu Spring/UTAD?
4. **Konfirmasi dengan volume (VSA).** Apakah effort vs result mendukung narasi?
5. **Tentukan titik masuk & risiko.** LPS (untuk beli) / LPSY (untuk hindar/jual) memberi level stop yang logis (di bawah Spring / di atas UTAD).
6. **Sabar menunggu fase D–E.** Jangan masuk hanya karena harga menyamping.

### Cara pakai fitur Wyckoff di Nubuat

Nubuat membantu kamu menerapkan langkah-langkah di atas tanpa harus menggambar manual:

- Buka halaman saham lewat **/ticker** (misalnya cari emiten yang kamu minati).
- Masuk ke **tab Teknikal / Analisis** pada halaman saham tersebut.
- Di sana kamu bisa melihat **grafik harga–volume** untuk membaca trading range, event, dan pola effort vs result yang baru kamu pelajari.
- Gunakan analisis yang tersedia sebagai **titik awal**, lalu validasi sendiri dengan checklist Wyckoff di atas dan, kalau ada, data bandarmology.

> **Tips alur belajar:** mulai dari mengenali siklus (akumulasi/markup/distribusi/markdown) di grafik saham yang sudah selesai bergerak (backtest mata). Setelah terbiasa, baru terapkan pada saham yang sedang berjalan.

### Kesalahan umum pemula Wyckoff

- **Memaksakan pola.** Tidak semua saham sedang dalam skema Wyckoff yang rapi. Kalau ragu, lewati.
- **Masuk terlalu dini.** Range menyamping belum tentu akumulasi — bisa jadi distribusi atau sekadar konsolidasi tanpa arah.
- **Mengabaikan volume.** Wyckoff tanpa analisis volume kehilangan setengah kekuatannya.
- **Lupa stop-loss.** Spring/UTAD memberi level invalidasi yang jelas — pakai itu.
- **Mengandalkan satu lensa.** Kombinasikan dengan manajemen risiko dan konteks fundamental/berita.

### Disclaimer

Metode Wyckoff dan seluruh fitur terkait di Nubuat adalah **alat bantu analisis dan edukasi**, **bukan rekomendasi jual/beli** dan **bukan jaminan keuntungan**. Pasar selalu mengandung risiko, dan pola masa lalu tidak menjamin hasil masa depan. Selalu lakukan riset mandiri, gunakan manajemen risiko, dan sesuaikan dengan profil risiko serta tujuan keuanganmu sendiri.`,
    },
  ],
};
