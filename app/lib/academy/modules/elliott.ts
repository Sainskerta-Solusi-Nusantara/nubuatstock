/**
 * Academy module: Elliott Wave Lengkap.
 *
 * Modul mendalam tentang Teori Gelombang Elliott — dari sejarah & filosofi,
 * struktur 5-3, aturan wajib, pola koreksi, Fibonacci, fractal/degree, sampai
 * praktik di saham IDX + cara pakai fitur Elliott Wave otomatis Nubuat.
 *
 * Konten static & fully typed (sama dengan content.ts). Diagram dirender lewat
 * markdown image `![alt](/academy/elliott/NAMA.svg)` (SVG self-hosted di
 * public/academy/elliott/). Tidak ada raw HTML — LessonMarkdown hanya mendukung
 * markdown + remark-gfm.
 *
 * Di-wire ke ACADEMY_MODULES secara terpisah (lihat content.ts).
 */
import type { AcademyModule } from "../content";

export const elliottModule: AcademyModule = {
  slug: "elliott-wave",
  title: "Elliott Wave Lengkap",
  icon: "Waves",
  level: "Menengah",
  description:
    "Teori Gelombang Elliott dari nol sampai praktik: struktur 5-3, aturan wajib, pola koreksi, Fibonacci, fractal, plus cara membacanya di saham IDX dengan diagram lengkap.",
  lessons: [
    // ===================== LESSON 1 =====================
    {
      slug: "elliott-apa-itu-dan-sejarah",
      title: "Apa Itu Elliott Wave & Sejarahnya",
      readMinutes: 7,
      summary:
        "Asal-usul teori dari Ralph Nelson Elliott dan filosofi psikologi massa di baliknya.",
      body: `## Apa Itu Elliott Wave?

**Elliott Wave Theory** (Teori Gelombang Elliott) adalah cara membaca pergerakan harga sebagai **pola berulang yang punya struktur**, bukan acak. Idenya: pasar bergerak dalam "gelombang" yang mencerminkan **psikologi massa** investor — bergantian antara optimisme dan pesimisme.

Inti klaimnya sederhana tapi kuat: tren utama bergerak dalam **5 gelombang searah tren**, lalu dikoreksi oleh **3 gelombang melawan tren**. Pola 5-3 ini berulang di semua skala waktu.

### Sejarah singkat: Ralph Nelson Elliott

- **Ralph Nelson Elliott (1871–1948)** adalah seorang akuntan profesional dari Amerika Serikat.
- Saat pensiun karena sakit pada tahun 1930-an, ia menghabiskan waktu menganalisis **75 tahun data indeks saham** dalam berbagai timeframe (tahunan hingga per jam).
- Ia menemukan bahwa pergerakan pasar yang sekilas kacau ternyata membentuk **pola berulang yang teratur**.
- Tahun **1938** ia menerbitkan temuannya dalam buku *The Wave Principle*, lalu memperluasnya di *Nature's Law: The Secret of the Universe* (1946).
- Teori ini sempat dilupakan, lalu **dipopulerkan kembali oleh Robert Prechter** lewat buku *Elliott Wave Principle* (1978).

### Filosofi: pasar = cermin psikologi massa

Elliott percaya harga digerakkan oleh **emosi kolektif** yang berayun teratur:

- Saat optimisme tumbuh → harga naik bertahap (gelombang impuls).
- Saat optimisme berlebihan habis → muncul rasa ragu & ambil untung (gelombang koreksi).

Karena emosi manusia berulang dengan pola yang mirip dari waktu ke waktu, **jejaknya di grafik juga berulang**. Itulah mengapa pola yang sama muncul di chart 5 menit maupun chart bulanan.

> Elliott Wave bukan ramalan magis. Ia adalah **kerangka untuk membaca struktur** psikologi pasar — membantu kamu menebak "kita ada di tahap mana" dan apa yang mungkin terjadi berikutnya.

### Kenapa teori ini menarik untuk trader

| Manfaat | Penjelasan |
| --- | --- |
| **Konteks** | Tahu apakah tren masih awal (wave 1-2) atau sudah tua (wave 5). |
| **Target** | Dipadu Fibonacci, bisa memperkirakan area target tiap gelombang. |
| **Manajemen risiko** | Aturan wave memberi titik *invalidation* (kalau dilanggar, hitungan salah). |

### Catatan penting sejak awal

Elliott Wave bersifat **subjektif** — dua analis bisa menghitung gelombang berbeda pada chart yang sama. Karena itu teori ini paling kuat saat **dipadukan** dengan analisis lain (support-resistance, volume, fundamental), bukan dipakai sendirian. Anggap ia sebagai peta probabilitas, bukan kepastian.`,
    },

    // ===================== LESSON 2 =====================
    {
      slug: "elliott-struktur-5-3",
      title: "Struktur Dasar 5-3 (Impuls & Koreksi)",
      readMinutes: 8,
      summary:
        "Pola inti Elliott: 5 gelombang impuls searah tren disusul 3 gelombang koreksi.",
      body: `## Struktur Dasar 5-3

Seluruh Teori Elliott berdiri di atas satu pola dasar: **5 gelombang naik (impuls) lalu 3 gelombang turun (koreksi)** dalam tren naik — dan kebalikannya dalam tren turun.

![Pola Elliott Wave lengkap: 5 gelombang impuls naik 1-2-3-4-5 lalu koreksi A-B-C turun](/academy/elliott/impulse-5-3.svg)

### Fase impuls: gelombang 1 sampai 5

Gelombang impuls bergerak **searah tren utama**. Diberi nomor **1, 2, 3, 4, 5**.

| Wave | Sifat | Psikologi |
| --- | --- | --- |
| **1** | Kenaikan awal, sering ragu | Sedikit pihak mulai membeli |
| **2** | Koreksi turun gelombang 1 | Skeptis, banyak yang kira tren lama lanjut |
| **3** | Biasanya terkuat & terpanjang | Mayoritas sadar tren baru; momentum besar |
| **4** | Koreksi, biasanya kecil & menyamping | Ambil untung, jeda |
| **5** | Dorongan terakhir | Euforia/FOMO; sering disertai divergensi |

Perhatikan: gelombang **1, 3, 5** searah tren (disebut *motive/actionary*), sedangkan **2 dan 4** melawan tren (disebut *corrective* di dalam impuls).

### Fase koreksi: gelombang A-B-C

Setelah impuls 5 gelombang selesai, pasar mengoreksi dengan **3 gelombang** yang diberi huruf **A, B, C**:

- **A** — penurunan pertama (banyak masih mengira ini koreksi biasa).
- **B** — kenaikan kembali (sering jadi *bull trap* — jebakan bahwa tren naik lanjut).
- **C** — penurunan kuat yang biasanya menembus dasar A; saat ini pasar baru sadar tren berubah.

### Gabungan 5-3 = satu siklus penuh

Satu siklus Elliott penuh = **8 gelombang** (5 impuls + 3 koreksi). Setelah siklus ini selesai, pola yang sama bisa dimulai lagi di skala lebih besar.

> **Cara mengingat:** angka untuk gerak searah tren (1-2-3-4-5), huruf untuk gerak melawan tren (A-B-C).

### Contoh narasi di saham

Bayangkan saham BBCA setelah lama turun mulai naik:

1. Naik tipis dari dasar (wave 1) — sedikit yang percaya.
2. Turun lagi menguji dasar (wave 2) — "ah, cuma rebound sesaat."
3. Melesat kencang dengan volume besar (wave 3) — berita & analis ramai.
4. Konsolidasi mendatar (wave 4) — ambil untung.
5. Naik sekali lagi ke puncak baru (wave 5) — euforia, semua bicara saham ini.

Lalu koreksi A-B-C menyusul: turun (A), rebound menipu (B), turun lebih dalam (C). Memahami posisi ini membantu kamu **tidak membeli tepat di wave 5 saat euforia**.`,
    },

    // ===================== LESSON 3 =====================
    {
      slug: "elliott-aturan-dan-pedoman",
      title: "3 Aturan Wajib & Pedoman",
      readMinutes: 7,
      summary:
        "Tiga rule yang tidak boleh dilanggar plus guidelines yang memperkuat hitungan.",
      body: `## 3 Aturan Wajib & Pedoman

Inilah yang membedakan Elliott Wave dari "tarik garis sesuka hati". Ada **3 aturan absolut** yang **tidak boleh dilanggar**. Kalau salah satunya dilanggar, hitungan gelombangmu **salah** dan harus diulang.

![Ilustrasi 3 aturan wajib Elliott Wave pada pola impuls 1-2-3-4-5](/academy/elliott/rules.svg)

### Aturan 1 — Wave 2 tidak boleh retrace lebih dari 100% wave 1

Gelombang 2 boleh mengoreksi sebagian besar gelombang 1, **tapi tidak boleh turun di bawah titik awal gelombang 1**. Kalau harga menembus titik awal wave 1, berarti yang kamu kira "wave 1" bukan awal impuls.

> Konsekuensi praktis: titik awal wave 1 menjadi **batas invalidation** (titik di mana hitungan dianggap salah dan kamu keluar).

### Aturan 2 — Wave 3 tidak boleh yang terpendek

Di antara gelombang searah tren (1, 3, 5), **gelombang 3 tidak boleh menjadi yang terpendek**. Ia boleh bukan yang terpanjang, tapi tak boleh paling pendek.

Dalam praktik, **wave 3 sering justru paling panjang & paling kuat** — inilah gelombang favorit trader karena momentumnya besar dan jelas.

### Aturan 3 — Wave 4 tidak boleh overlap wilayah harga wave 1

Wilayah harga gelombang 4 **tidak boleh masuk ke wilayah harga gelombang 1**. Dalam tren naik: titik terendah wave 4 harus **tetap di atas** puncak wave 1.

> Pengecualian: aturan overlap ini boleh longgar pada pola khusus bernama *diagonal* (leading/ending diagonal), tapi untuk impuls standar, ia mutlak.

### Ringkasan aturan

| Aturan | Bunyi | Batas yang dijaga |
| --- | --- | --- |
| **1** | Wave 2 tak retrace > 100% wave 1 | Awal wave 1 |
| **2** | Wave 3 bukan yang terpendek | Panjang relatif 1-3-5 |
| **3** | Wave 4 tak overlap wave 1 | Puncak wave 1 |

### Pedoman (guidelines) — bukan wajib, tapi sangat membantu

Pedoman tidak absolut, tapi sering benar dan memperkuat keyakinan hitungan:

- **Alternation (selang-seling):** kalau wave 2 koreksinya *tajam* (zigzag), wave 4 cenderung *mendatar* (flat/triangle), dan sebaliknya.
- **Wave 3 paling kuat:** biasanya momentum, volume, dan panjangnya terbesar.
- **Equality:** kalau wave 3 sangat panjang (extended), wave 1 dan wave 5 cenderung **mirip panjangnya**.
- **Channeling:** kelima gelombang sering muat dalam satu *channel* (dua garis sejajar) — alat bantu memperkirakan akhir wave 5.
- **Wave 5 sering disertai divergensi:** harga bikin puncak baru tapi RSI/MACD melemah → sinyal tren mendekati akhir.

> Hafalkan **3 aturan** mati-matian; pakai **pedoman** untuk memilih hitungan paling masuk akal saat ada beberapa kemungkinan.`,
    },

    // ===================== LESSON 4 =====================
    {
      slug: "elliott-pola-koreksi",
      title: "Pola Koreksi: Zigzag, Flat, Triangle, Combination",
      readMinutes: 9,
      summary:
        "Empat keluarga pola koreksi A-B-C dan cara mengenalinya dari bentuknya.",
      body: `## Pola Koreksi A-B-C

Banyak orang menyerah pada Elliott karena **koreksi jauh lebih rumit** daripada impuls. Koreksi punya beberapa "bentuk" yang harus kamu kenali. Empat keluarga utama: **zigzag, flat, triangle, dan combination**.

### 1. Zigzag (5-3-5)

Koreksi **tajam** yang bergerak jauh melawan tren. Struktur internal: A (5 gelombang), B (3 gelombang), C (5 gelombang).

![Pola koreksi Zigzag 5-3-5: A turun tajam, B naik kecil, C turun tajam](/academy/elliott/zigzag.svg)

- **B biasanya pendek** — tidak mencapai kembali awal A.
- **C biasanya menembus** dasar A → terlihat seperti penurunan kuat.
- Sering muncul sebagai **wave 2** dalam impuls.

### 2. Flat (3-3-5)

Koreksi **mendatar/menyamping**. Struktur internal: A (3 gelombang), B (3 gelombang), C (5 gelombang).

![Pola koreksi Flat 3-3-5: B hampir kembali ke awal A, C turun ke sekitar dasar A](/academy/elliott/flat.svg)

- **B hampir kembali ke titik awal A** (sekitar 90%+) — inilah ciri khas flat.
- Varian: **regular flat** (C berakhir ~setara dasar A), **expanded flat** (B melampaui awal A dan C menembus dasar A — sangat umum di pasar nyata), **running flat** (C tidak mencapai dasar A).
- Sering muncul sebagai **wave 4**.

### 3. Triangle (segitiga)

Koreksi **menyamping yang menyempit** — terdiri dari **5 gelombang** berlabel **A-B-C-D-E**, masing-masing 3 gelombang (3-3-3-3-3).

![Pola koreksi Triangle A-B-C-D-E dengan ayunan yang makin mengecil](/academy/elliott/triangle.svg)

- Ayunan harga **makin mengecil** (konvergen) — energi pasar meredup.
- Jenis: *contracting* (menyempit, paling umum), *expanding* (melebar), *ascending*, *descending*.
- **Hampir selalu muncul sebagai wave 4** atau wave B — ia adalah **jeda sebelum dorongan terakhir** tren.
- Setelah triangle selesai, biasanya muncul *thrust* (dorongan cepat) searah tren utama.

### 4. Combination (kombinasi)

Dua atau tiga pola koreksi sederhana **digabung** dan dihubungkan oleh gelombang penghubung berlabel **X**.

- Contoh: **double three** (koreksi-X-koreksi), **triple three** (koreksi-X-koreksi-X-koreksi).
- Biasanya menghasilkan koreksi yang **berkepanjangan & menyamping** — sering bikin trader frustrasi.
- Tujuannya "membuang waktu" sampai keseimbangan harga tercapai.

### Tabel ringkas

| Pola | Struktur | Sifat | Sering muncul di |
| --- | --- | --- | --- |
| **Zigzag** | 5-3-5 | Tajam | Wave 2 |
| **Flat** | 3-3-5 | Mendatar | Wave 4 |
| **Triangle** | 3-3-3-3-3 | Menyempit | Wave 4 / B |
| **Combination** | gabungan + X | Berlarut | Wave 2/4/B |

> **Tips alternation:** kalau wave 2 berupa zigzag yang tajam, besar kemungkinan wave 4 berupa flat/triangle yang mendatar — dan sebaliknya. Ini membantu kamu menebak bentuk koreksi berikutnya.`,
    },

    // ===================== LESSON 5 =====================
    {
      slug: "elliott-fibonacci",
      title: "Fibonacci dalam Elliott Wave",
      readMinutes: 8,
      summary:
        "Rasio retracement & extension untuk memperkirakan target tiap gelombang.",
      body: `## Fibonacci dalam Elliott Wave

Elliott Wave memberi tahu **struktur** (kita ada di gelombang mana), sedangkan **Fibonacci** memberi tahu **seberapa jauh** sebuah gelombang mungkin bergerak. Keduanya pasangan klasik.

![Penerapan Fibonacci pada Elliott Wave: retracement wave 2 di 0.618 dan target extension wave 3 di 1.618](/academy/elliott/fibonacci.svg)

### Dua jenis rasio Fibonacci

1. **Retracement** — seberapa dalam koreksi "memakan kembali" gelombang sebelumnya. Rasio utama: **0.236, 0.382, 0.5, 0.618, 0.786**.
2. **Extension** — seberapa jauh gelombang impuls melampaui gelombang acuan. Rasio utama: **1.0, 1.272, 1.618, 2.0, 2.618**.

### Retracement untuk gelombang koreksi

| Gelombang | Retracement umum (dari gelombang sebelumnya) |
| --- | --- |
| **Wave 2** | **0.5 – 0.618** dari wave 1 (sering dalam) |
| **Wave 4** | **0.236 – 0.382** dari wave 3 (sering dangkal) |
| **Wave B** | bervariasi: 0.382 (zigzag) sampai ~0.9+ (flat) |

> Perhatikan **alternation** lagi: wave 2 cenderung dalam (0.618), wave 4 cenderung dangkal (0.382). Pola yang saling melengkapi.

### Extension untuk gelombang impuls

| Gelombang | Target extension umum |
| --- | --- |
| **Wave 3** | **1.618 × panjang wave 1** (paling sering); bisa 2.618× kalau extended |
| **Wave 5** | sering **= wave 1** (rasio 1.0), atau 0.618 × jarak wave 1→3 |

### Cara memakai di praktik

1. Ukur panjang **wave 1** (dari dasar ke puncak).
2. Untuk menebak akhir **wave 2**, tarik retracement → cari area **0.5–0.618** sebagai zona entry potensial.
3. Untuk menebak akhir **wave 3**, proyeksikan extension **1.618×** wave 1 dari titik akhir wave 2.
4. Untuk **wave 5**, sering cukup dengan menyamakan panjangnya dengan wave 1.

### Contoh angka

Misal wave 1 naik dari Rp1.000 → Rp1.200 (panjang Rp200):

- Zona wave 2 (0.618): 1.200 − (200 × 0.618) ≈ **Rp1.076** → kandidat entry.
- Target wave 3 (1.618 dari akhir wave 2): 1.076 + (200 × 1.618) ≈ **Rp1.400**.
- Target wave 5 (= wave 1, dari akhir wave 4): tambahkan ~Rp200 dari titik wave 4.

> Angka Fibonacci adalah **zona**, bukan titik presisi. Pakai sebagai "area perhatian" untuk entry/exit, bukan harga pasti. Selalu konfirmasi dengan price action di area tersebut.`,
    },

    // ===================== LESSON 6 =====================
    {
      slug: "elliott-fractal-dan-degree",
      title: "Fractal & Degree (Tingkatan Gelombang)",
      readMinutes: 7,
      summary:
        "Gelombang di dalam gelombang: dari Grand Supercycle sampai Subminuette.",
      body: `## Fractal & Degree

Salah satu ide paling kuat (sekaligus membingungkan) di Elliott Wave: pola bersifat **fractal** — pola yang sama berulang di setiap skala. Sebuah gelombang besar tersusun dari gelombang-gelombang lebih kecil yang berstruktur sama.

### Apa itu fractal di sini

- **Wave 1** dari sebuah impuls besar, kalau kamu zoom in, ternyata juga terdiri dari **5 gelombang kecil** (1-2-3-4-5).
- **Wave 2** kalau di-zoom terdiri dari **3 gelombang** (A-B-C).
- Begitu seterusnya, ke atas (timeframe besar) maupun ke bawah (timeframe kecil).

> Konsekuensi: gelombang yang kamu lihat di chart harian adalah bagian dari gelombang lebih besar di chart mingguan, dan terdiri dari gelombang lebih kecil di chart per jam.

### Degree (tingkatan/derajat gelombang)

Elliott memberi nama untuk setiap tingkatan, dari yang terbesar ke terkecil:

| Degree | Skala waktu kasar |
| --- | --- |
| **Grand Supercycle** | Multi-dekade sampai abad |
| **Supercycle** | Beberapa dekade |
| **Cycle** | 1 sampai beberapa tahun |
| **Primary** | Beberapa bulan sampai tahun |
| **Intermediate** | Mingguan sampai bulanan |
| **Minor** | Mingguan |
| **Minute** | Harian |
| **Minuette** | Per jam |
| **Subminuette** | Menit |

> Untuk trader ritel IDX, yang paling relevan biasanya **Primary, Intermediate, Minor, dan Minute** — selaras dengan chart mingguan, harian, dan intraday.

### Penomoran & penamaan per degree

Agar tidak tertukar, tiap degree punya **gaya label berbeda**:

- **Impuls degree besar:** angka Romawi besar berkurung — (I), (II), (III), (IV), (V).
- **Impuls degree menengah:** angka biasa — 1, 2, 3, 4, 5.
- **Impuls degree kecil:** angka kecil/subscript.
- **Koreksi** mengikuti pola serupa dengan huruf: (A)(B)(C) untuk besar, A-B-C untuk menengah, a-b-c untuk kecil.

Penomoran ini membantumu menjawab: *"5 gelombang yang aku lihat ini bagian dari gelombang besar yang mana?"*

### Kenapa ini penting untuk keputusan

1. **Konteks tren:** wave 3 di degree Minor bisa jadi hanya bagian dari wave 1 di degree Primary — artinya tren besar baru mulai.
2. **Risiko vs reward:** trading searah gelombang **degree besar** umumnya lebih aman daripada melawannya.
3. **Menghindari salah skala:** kesalahan umum pemula adalah mencampur label antar degree sehingga hitungan jadi kacau.

> Praktik: **mulai dari timeframe besar** (mingguan) untuk menentukan posisi gelombang utama, baru turun ke timeframe kecil untuk mencari titik entry. Top-down, bukan sebaliknya.`,
    },

    // ===================== LESSON 7 =====================
    {
      slug: "elliott-praktik-idx-dan-nubuat",
      title: "Praktik di Saham IDX, Kesalahan Umum & Fitur Nubuat",
      readMinutes: 8,
      summary:
        "Menerapkan Elliott di IDX, jebakan yang harus dihindari, dan cara pakai Elliott Wave otomatis Nubuat.",
      body: `## Praktik di Saham IDX

Teori sudah, sekarang penerapannya di pasar nyata — khususnya saham Indonesia yang punya karakter sendiri (likuiditas beragam, batas ARA/ARB, banyak saham digerakkan sentimen).

### Langkah praktis menghitung gelombang

1. **Mulai dari timeframe besar.** Buka chart mingguan/harian dulu untuk melihat tren utama dan posisi gelombang besar.
2. **Cari titik awal yang jelas.** Awal impuls paling baik dihitung dari dasar/puncak ekstrem yang nyata, bukan di tengah-tengah tren.
3. **Tandai 5 gelombang impuls,** lalu uji dengan 3 aturan wajib. Kalau ada yang dilanggar → ulang hitungan.
4. **Konfirmasi dengan Fibonacci** (retracement wave 2/4, extension wave 3/5).
5. **Tentukan invalidation** (mis. di bawah awal wave 1) sebagai stop loss logis.
6. **Konfirmasi dengan alat lain:** volume membesar di wave 3, divergensi di wave 5, support-resistance.

### Pertimbangan khas IDX

- **Likuiditas:** Elliott lebih andal di saham **likuid** (LQ45, IDX30). Saham tidur sering bergerak patah-patah sehingga pola sulit terbaca.
- **ARA/ARB:** batas auto reject bisa "memotong" gelombang secara artifisial — sesuaikan ekspektasi panjang gelombang.
- **Saham gorengan:** pola Elliott bisa menyesatkan karena harga digerakkan bandar, bukan psikologi massa yang natural. Hati-hati.

### Kesalahan umum (hindari!)

| Kesalahan | Akibat | Perbaikan |
| --- | --- | --- |
| Memaksakan hitungan agar "cocok" | Bias konfirmasi, salah arah | Hormati 3 aturan; rela ganti hitungan |
| Mengabaikan degree | Campur skala, label kacau | Top-down, satu degree per analisis |
| Memakai Elliott sendirian | Sinyal lemah | Padukan volume, S/R, fundamental |
| Menganggap target Fibonacci pasti | Over-leverage | Perlakukan sebagai zona, pakai stop |
| Trading wave 5 saat euforia | Beli di puncak | Sadari posisi siklus; waspada divergensi |

### Cara pakai fitur Elliott Wave otomatis Nubuat

Nubuat menyediakan **deteksi Elliott Wave otomatis** supaya kamu tidak perlu menarik gelombang manual dari nol:

1. Buka halaman emiten lewat **/ticker** (mis. ketik kode saham yang kamu pantau).
2. Masuk ke **tab Teknikal**.
3. Lihat bagian **Elliott Wave** — sistem menandai label gelombang (1-2-3-4-5 / A-B-C) di chart beserta hitungan kandidatnya.
4. Padukan dengan indikator lain di tab yang sama (RSI, MACD, volume) untuk konfirmasi.

Fitur ini mempercepat langkah 1–4 di atas, lalu kamu tetap mengambil keputusan dengan menambahkan konteks (Fibonacci, S/R, fundamental).

> **Disclaimer penting:** deteksi Elliott Wave — baik manual maupun otomatis — adalah **alat bantu analisis, bukan kepastian**. Hitungan gelombang bersifat probabilistik dan subjektif; pola bisa berubah seiring data baru masuk. Jangan jadikan satu-satunya dasar keputusan beli/jual. Selalu gunakan manajemen risiko (stop loss, position sizing) dan jangan pertaruhkan dana yang tidak siap kamu rugikan.

### Penutup modul

Kamu sekarang paham fondasi Elliott Wave: sejarah & filosofinya, struktur 5-3, 3 aturan wajib, pola koreksi, Fibonacci, fractal/degree, dan penerapannya di IDX. Latih membaca chart secara rutin — Elliott adalah keterampilan yang tajam karena jam terbang. Mulai dengan saham likuid, hormati aturan, dan selalu padukan dengan konteks lain.`,
    },
  ],
};
