/**
 * Academy module: Analisis Fundamental Mendalam.
 *
 * Modul standalone tentang VALUASI & ANALISIS BISNIS — top-down/bottom-up, moat,
 * rasio kunci (DuPont), valuasi relatif (PER/PBV/PEG/EV-EBITDA), valuasi absolut
 * (DCF/DDM), dan margin of safety untuk menyusun thesis investasi.
 *
 * Sengaja KOMPLEMEN dengan modul "baca-laporan-keuangan" — tidak mengulang dasar
 * membaca laba rugi / neraca / arus kas, melainkan lanjutannya ke valuasi & analisis.
 *
 * Konten static & fully typed (sama dengan content.ts). Diagram dirender lewat
 * markdown image `![alt](/academy/fundamental/NAMA.svg)` (SVG self-hosted di
 * public/academy/fundamental/). Tidak ada raw HTML — LessonMarkdown hanya
 * mendukung markdown + remark-gfm (tabel didukung, raw HTML tidak).
 *
 * Di-wire ke ACADEMY_MODULES secara terpisah (lihat content.ts).
 *
 * CATATAN: konten edukasi murni. Bukan ajakan jual/beli. Selalu sertakan disclaimer.
 */
import type { AcademyModule } from "../content";

export const fundamentalModule: AcademyModule = {
  slug: "analisis-fundamental",
  title: "Analisis Fundamental Mendalam",
  icon: "Calculator",
  level: "Menengah",
  description:
    "Dari ekonomi makro sampai valuasi saham: top-down vs bottom-up, moat, rasio kunci (DuPont), valuasi relatif (PER/PBV/PEG/EV-EBITDA), valuasi absolut (DCF/DDM), dan margin of safety untuk menyusun thesis investasi.",
  lessons: [
    // ===================== LESSON 1 =====================
    {
      slug: "af-top-down-bottom-up",
      title: "Top-Down vs Bottom-Up: Kerangka Berpikir",
      readMinutes: 11,
      summary:
        "Dua arah menyusun analisis fundamental dan alur ekonomi → industri → perusahaan.",
      body: `## Dua arah memandang sebuah saham

Sebelum menghitung satu angka pun, kamu perlu **kerangka**. Ada dua cara klasik menyusun analisis fundamental: **top-down** dan **bottom-up**. Keduanya valid; investor hebat sering menggabungkannya.

![Piramida analisis top-down: ekonomi makro di puncak, industri di tengah, perusahaan di dasar](/academy/fundamental/top-down-pyramid.svg)

### 1. Top-down: dari langit ke bumi

Kamu mulai dari gambaran besar lalu menyempit:

1. **Ekonomi makro** — Ke mana arah PDB, inflasi, suku bunga acuan (BI Rate), dan nilai tukar Rupiah? Lingkungan suku bunga tinggi, misalnya, menekan sektor properti dan emiten berutang besar, tetapi bisa menguntungkan bank.
2. **Industri / sektor** — Di dalam kondisi makro itu, sektor mana yang sedang berada di fase pertumbuhan? Bagaimana struktur persaingannya, regulasinya, dan siklusnya?
3. **Perusahaan / emiten** — Baru di sini kamu memilih emiten terbaik di sektor yang menarik tadi, lalu menilai moat, manajemen, rasio, dan valuasinya.

Top-down cocok saat kondisi makro sedang **dominan** menentukan nasib pasar (mis. krisis, perubahan suku bunga tajam, atau booming komoditas).

### 2. Bottom-up: dari bisnis dulu, makro belakangan

Arahnya dibalik. Kamu **mulai dari perusahaan**: cari bisnis hebat dengan moat kuat, neraca sehat, dan harga wajar — terlepas dari sektor atau timing makro. Filosofi ini dianut Warren Buffett: lebih baik membeli **bisnis bagus dengan harga wajar** daripada bisnis biasa-biasa dengan harga sangat murah.

Bottom-up cocok untuk **investor jangka panjang** yang percaya bisnis unggul akan menang di berbagai cuaca ekonomi, dan tidak ingin bermain tebak-tebakan timing makro.

### Analisis ekonomi → industri → perusahaan

Ketiga lapisan ini bukan teori abstrak. Tiap lapisan memberi **pertanyaan konkret**:

| Lapisan | Pertanyaan kunci | Sumber data |
| --- | --- | --- |
| Ekonomi makro | Suku bunga naik/turun? Inflasi terkendali? Rupiah stabil? | BI, BPS, berita ekonomi |
| Industri | Sektor sedang tumbuh atau jenuh? Regulasi mendukung? Persaingan ketat? | Laporan industri, asosiasi |
| Perusahaan | Punya keunggulan kompetitif? Manajemen kredibel? Valuasi wajar? | Laporan tahunan, halaman /ticker |

### Menggabungkan keduanya

Pendekatan paling kokoh: gunakan **top-down** untuk menyaring di sektor mana kamu mencari (hindari sektor yang struktural sedang turun), lalu **bottom-up** untuk memilih emiten terbaik di dalamnya dan menentukan harga beli yang wajar.

> **Ingat:** kerangka hanya mengatur urutan berpikir. Kualitas kesimpulan tetap bergantung pada kedalaman riset di tiap lapisan.

---

*Disclaimer: materi edukasi, bukan rekomendasi jual/beli. Selalu lakukan riset mandiri.*`,
    },

    // ===================== LESSON 2 =====================
    {
      slug: "af-moat-keunggulan-kompetitif",
      title: "Moat: Keunggulan Kompetitif yang Bertahan",
      readMinutes: 12,
      summary:
        "Lima tipe parit ekonomi (moat) dan contoh tipe-tipenya di pasar IDX.",
      body: `## Apa itu "moat"?

**Moat** (parit ekonomi, istilah Warren Buffett) adalah keunggulan kompetitif yang membuat sebuah perusahaan **sulit ditiru atau direbut** pesaingnya selama bertahun-tahun. Moat itulah yang menjaga **profitabilitas tinggi** (ROE/margin) tidak tergerus oleh kompetisi.

Analisis moat bersifat **kualitatif** — tidak ada di satu angka rasio. Tapi dampaknya muncul di angka: perusahaan ber-moat cenderung mempertahankan margin dan ROE tinggi secara **konsisten** bertahun-tahun.

### Lima tipe moat klasik

1. **Aset tak berwujud (intangibles)** — Merek kuat, paten, atau lisensi/izin yang membatasi pesaing. Pelanggan rela bayar lebih atau tidak mau pindah.
2. **Biaya peralihan (switching cost)** — Pelanggan rugi/repot jika pindah ke pesaing (mis. sistem perbankan, software yang sudah tertanam di operasi).
3. **Efek jaringan (network effect)** — Produk makin berharga seiring makin banyak pengguna (mis. marketplace, bursa, platform pembayaran).
4. **Keunggulan biaya (cost advantage)** — Bisa memproduksi lebih murah secara struktural: skala besar, akses bahan baku, lokasi, atau proses unik.
5. **Skala efisien (efficient scale)** — Pasar hanya cukup untuk sedikit pemain, sehingga pemain baru tidak rasional masuk (mis. infrastruktur, tol, menara telko).

### Contoh ilustratif di pasar IDX

> Contoh berikut **ilustrasi tipe moat**, bukan rekomendasi membeli emitennya.

| Tipe moat | Contoh konteks IDX |
| --- | --- |
| Merek & loyalitas | Produsen consumer goods dengan merek rumah tangga yang melekat puluhan tahun |
| Switching cost | Bank besar dengan basis nasabah & ekosistem transaksi yang lengket |
| Efek jaringan | Operator bursa / penyedia infrastruktur pasar dengan posisi sentral |
| Keunggulan biaya | Produsen komoditas berbiaya rendah (low-cost producer) di sektor tambang/energi |
| Skala efisien | Operator menara telekomunikasi & jalan tol dengan barrier modal tinggi |

### Cara menguji apakah moat itu nyata

- **Apakah ROE/margin tetap tinggi selama 5–10 tahun?** Moat sejati terlihat dari **konsistensi**, bukan satu tahun bagus.
- **Apa yang terjadi saat pesaing menyerang?** Apakah perusahaan kehilangan pangsa pasar atau menahannya?
- **Apakah moat melebar atau menyempit?** Teknologi & regulasi bisa mengikis moat (mis. disrupsi digital terhadap ritel konvensional).

### Faktor kualitatif pendamping

- **Kualitas manajemen** — Rekam jejak alokasi modal, kejujuran dalam laporan, keselarasan kepentingan dengan pemegang saham minoritas.
- **Tata kelola (GCG)** — Transaksi afiliasi, struktur kepemilikan, transparansi.
- **Daya tahan model bisnis** — Apakah masih relevan 10 tahun lagi?

> **Inti:** angka memberitahu *apa yang terjadi*; moat & kualitas manajemen menjelaskan *apakah itu akan bertahan*. Valuasi yang bagus di atas bisnis tanpa moat sering berubah jadi jebakan nilai.

---

*Disclaimer: materi edukasi, bukan rekomendasi jual/beli. Selalu lakukan riset mandiri.*`,
    },

    // ===================== LESSON 3 =====================
    {
      slug: "af-rasio-kunci",
      title: "Rasio Kunci & Artinya (DuPont)",
      readMinutes: 13,
      summary:
        "ROE, DER, margin, current ratio — plus menguraikan ROE dengan analisis DuPont.",
      body: `## Rasio adalah bahasa kesehatan bisnis

Rasio mengubah angka mentah laporan keuangan menjadi **perbandingan yang bisa dinilai**. Di sini kita fokus pada rasio yang paling sering dipakai untuk **menilai kualitas & risiko bisnis** — bukan mengajari ulang cara membaca laporannya (itu ada di modul "Baca Laporan Keuangan IDX").

### Tabel rasio kunci

| Rasio | Rumus singkat | Mengukur | Rambu umum |
| --- | --- | --- | --- |
| **ROE** | Laba Bersih / Ekuitas | Imbal hasil bagi pemegang saham | Makin tinggi & stabil makin baik; waspadai jika dorongannya utang |
| **ROA** | Laba Bersih / Total Aset | Efisiensi seluruh aset | Membandingkan ROE vs ROA mengungkap peran leverage |
| **Net Margin** | Laba Bersih / Penjualan | Berapa sen laba per Rp penjualan | Bandingkan dengan peers sektor |
| **Gross Margin** | Laba Kotor / Penjualan | Kekuatan harga & efisiensi produksi | Margin kotor stabil = indikasi daya tawar harga |
| **DER** | Total Utang / Ekuitas | Tingkat leverage / risiko keuangan | Tergantung sektor; terlalu tinggi = rapuh saat bunga naik |
| **Current Ratio** | Aset Lancar / Utang Lancar | Likuiditas jangka pendek | Di atas 1 menandakan mampu bayar kewajiban pendek |
| **Interest Coverage** | EBIT / Beban Bunga | Kemampuan menanggung bunga | Makin tinggi makin aman |

> **Penting:** tidak ada angka "ajaib" universal. DER 2x normal untuk bank, tetapi mengkhawatirkan untuk perusahaan consumer. **Selalu bandingkan dengan peers di sektor yang sama dan dengan tren historis emiten itu sendiri.**

### Menguraikan ROE dengan DuPont

ROE adalah rasio favorit, tapi juga **paling mudah menipu**: ROE bisa tinggi hanya karena utang besar. Analisis **DuPont** memecah ROE menjadi tiga komponen agar kamu tahu *dari mana* ROE itu berasal.

![Dekomposisi DuPont: ROE sama dengan Net Margin dikali Asset Turnover dikali Equity Multiplier](/academy/fundamental/dupont.svg)

\`\`\`
ROE = Net Margin x Asset Turnover x Equity Multiplier
\`\`\`

| Komponen | Rumus | Cerita yang diceritakan |
| --- | --- | --- |
| Net Margin | Laba Bersih / Penjualan | Seberapa untung tiap penjualan (profitabilitas) |
| Asset Turnover | Penjualan / Total Aset | Seberapa efisien aset menghasilkan penjualan |
| Equity Multiplier | Total Aset / Ekuitas | Seberapa besar leverage (utang) |

**Contoh perbandingan dua emiten dengan ROE sama (20%):**

| | Emiten A | Emiten B |
| --- | --- | --- |
| Net Margin | 15% | 4% |
| Asset Turnover | 1,0x | 1,0x |
| Equity Multiplier | 1,33x | 5,0x |
| **ROE** | **20%** | **20%** |

ROE keduanya 20%, tapi cerita berbeda jauh: **Emiten A** untung karena margin tebal (kualitas operasi). **Emiten B** mengandalkan **leverage 5x** — ROE besar, tapi rapuh saat bunga naik atau penjualan turun. DuPont membuka selubung ini.

### Cara membaca rasio dengan benar

1. **Tren, bukan satu titik** — Lihat 3–5 tahun. Naik konsisten? Volatil?
2. **Relatif terhadap peers** — Bagus/buruk hanya bermakna dibanding pembanding.
3. **Saling silang** — ROE tinggi + DER tinggi → cek apakah itu kualitas atau risiko.
4. **Kaitkan dengan moat** — Margin tinggi yang bertahan biasanya didukung moat.

---

*Disclaimer: materi edukasi, bukan rekomendasi jual/beli. Selalu lakukan riset mandiri.*`,
    },

    // ===================== LESSON 4 =====================
    {
      slug: "af-valuasi-relatif",
      title: "Valuasi Relatif: PER, PBV, PEG, EV/EBITDA",
      readMinutes: 12,
      summary:
        "Empat multiple valuasi dan panduan kapan memakai masing-masing.",
      body: `## Mahal atau murah — dibanding apa?

**Valuasi relatif** menilai harga saham dengan **membandingkan multiple-nya** terhadap perusahaan lain atau terhadap sejarahnya sendiri. Cepat, intuitif, dan populer — tapi hanya bermakna jika pembandingnya tepat.

![Peta multiple valuasi: PER, PBV, PEG, EV per EBITDA beserta rumusnya](/academy/fundamental/valuation-multiples.svg)

### Empat multiple yang wajib dipahami

| Multiple | Rumus | Cocok untuk | Kelemahan |
| --- | --- | --- | --- |
| **PER** (P/E) | Harga / EPS | Perusahaan profitabel & stabil | Tak berguna jika rugi; EPS bisa terdistorsi item non-operasi |
| **PBV** (P/B) | Harga / Nilai Buku per Saham | Bank & lembaga keuangan, perusahaan padat aset | Kurang relevan untuk bisnis aset ringan (jasa/teknologi) |
| **PEG** | PER / Pertumbuhan Laba (%) | Perusahaan bertumbuh | Sangat sensitif pada asumsi growth; growth sulit ditebak |
| **EV/EBITDA** | Enterprise Value / EBITDA | Bandingkan lintas struktur modal & sektor padat modal | EBITDA mengabaikan belanja modal & utang |

### Kapan pakai yang mana?

- **PER** — Default untuk perusahaan yang **untung konsisten**. PER 15x berarti kamu bayar 15x laba setahun. Bandingkan dengan rata-rata sektor & PER historis emiten itu. PER rendah belum tentu murah (bisa value trap); PER tinggi belum tentu mahal (bisa karena growth tinggi).
- **PBV** — Andalan untuk **bank & emiten padat aset**, di mana nilai buku mencerminkan modal riil. PBV < 1 berarti pasar menghargai di bawah nilai bukunya — bisa peluang, bisa sinyal masalah kualitas aset.
- **PEG** — Menyempurnakan PER dengan memasukkan **pertumbuhan**. PEG di sekitar 1 sering dianggap "wajar untuk growth-nya". PEG < 1 bisa menarik *jika* growth realistis dan berkelanjutan.
- **EV/EBITDA** — Pilihan saat membandingkan perusahaan dengan **tingkat utang berbeda**, atau sektor padat modal (telko, tambang, infrastruktur). EV memasukkan utang & kas sehingga lebih "apel-ke-apel" lintas struktur modal.

### Enterprise Value (EV), kenapa penting

\`\`\`
EV = Kapitalisasi Pasar + Total Utang - Kas
\`\`\`

EV menggambarkan harga untuk **mengakuisisi seluruh bisnis** — kamu menanggung utangnya, tapi kasnya mengurangi harga efektif. Karena netral terhadap struktur modal, EV/EBITDA lebih adil dibanding PER saat dua perusahaan punya beban utang berbeda.

### Aturan main valuasi relatif

1. **Bandingkan apel dengan apel** — peers di sektor & model bisnis serupa.
2. **Lihat band historis** — apakah multiple sekarang di atas/bawah rata-rata 5 tahun emiten itu?
3. **Pahami *kenapa* murah** — multiple rendah bisa berarti pasar benar (laba akan turun). Itu **value trap**.
4. **Jangan satu rasio** — silangkan beberapa multiple + kualitas bisnis (moat, ROE).

> Valuasi relatif menjawab "murah/mahal **dibanding pembanding**", bukan "berapa nilai sebenarnya". Untuk yang terakhir, kita butuh valuasi absolut (lesson berikutnya).

---

*Disclaimer: materi edukasi, bukan rekomendasi jual/beli. Selalu lakukan riset mandiri.*`,
    },

    // ===================== LESSON 5 =====================
    {
      slug: "af-valuasi-absolut",
      title: "Valuasi Absolut: DCF & DDM",
      readMinutes: 13,
      summary:
        "Konsep present value arus kas: model DCF dan DDM untuk menaksir nilai intrinsik.",
      body: `## Berapa nilai bisnis ini sebenarnya?

**Valuasi absolut** mencoba menghitung **nilai intrinsik** sebuah bisnis dari arus kas yang akan dihasilkannya di masa depan — bukan dibandingkan dengan perusahaan lain. Dua metode utama: **DCF** (Discounted Cash Flow) dan **DDM** (Dividend Discount Model).

### Ide inti: nilai sekarang (present value)

Uang Rp1 juta **hari ini** lebih berharga daripada Rp1 juta **tahun depan**, karena uang hari ini bisa diinvestasikan. Maka arus kas masa depan harus "**didiskonto**" kembali ke nilai hari ini:

\`\`\`
PV = CF(t) / (1 + r)^t
\`\`\`

- \`CF(t)\` = arus kas pada tahun ke-t
- \`r\` = tingkat diskonto (mencerminkan risiko & biaya modal)
- \`t\` = jumlah tahun ke depan

Makin jauh arus kas (t besar) dan makin tinggi risikonya (r besar), makin **kecil** nilai sekarangnya.

### Discounted Cash Flow (DCF)

DCF menjumlahkan nilai sekarang dari **arus kas bebas (Free Cash Flow)** masa depan, ditambah **terminal value** (nilai semua kas setelah periode proyeksi).

![Alur kas tahunan didiskonto ke nilai sekarang, plus terminal value](/academy/fundamental/dcf-flow.svg)

\`\`\`
Nilai Wajar = jumlah dari FCF(t)/(1+r)^t  +  Terminal Value/(1+r)^n
\`\`\`

Langkah praktis:

1. **Proyeksikan FCF** beberapa tahun ke depan (mis. 5–10 tahun) berdasar asumsi pertumbuhan penjualan, margin, dan belanja modal.
2. **Tentukan tingkat diskonto (r)** — sering memakai **WACC** (biaya modal rata-rata tertimbang).
3. **Hitung terminal value** — nilai bisnis setelah periode proyeksi, biasanya dengan asumsi pertumbuhan kekal (perpetuity growth) yang konservatif.
4. **Diskonto semuanya ke hari ini** dan jumlahkan → nilai ekuitas → bagi jumlah saham → **nilai wajar per saham**.

> **Peringatan besar:** DCF sangat **sensitif terhadap asumsi**. Ubah sedikit growth atau r, hasilnya bisa berubah drastis. DCF terbaik dipakai untuk memahami *logika* nilai dan menguji skenario (konservatif vs optimis), bukan mengejar satu angka "pasti".

### Dividend Discount Model (DDM)

DDM adalah versi yang berfokus pada **dividen** — cocok untuk perusahaan matang yang rutin & stabil membagi dividen (mis. bank besar, utilitas). Versi paling sederhana, **Gordon Growth Model**:

\`\`\`
Nilai = D1 / (r - g)
\`\`\`

- \`D1\` = dividen yang diharapkan tahun depan
- \`r\` = tingkat imbal hasil yang diminta investor
- \`g\` = pertumbuhan dividen yang diasumsikan (harus lebih kecil dari r)

DDM elegan tapi rapuh: hanya valid jika dividen **stabil & bertumbuh terprediksi**, dan sangat sensitif terhadap selisih (r − g) yang kecil.

### Relatif vs absolut — saling melengkapi

| Aspek | Valuasi Relatif | Valuasi Absolut |
| --- | --- | --- |
| Pertanyaan | Murah dibanding peers? | Berapa nilai sebenarnya? |
| Kecepatan | Cepat | Lambat, banyak asumsi |
| Kelemahan | Ikut bias pasar/peers | Sangat sensitif asumsi |

> Praktik baik: gunakan keduanya untuk **triangulasi**. Jika valuasi relatif **dan** absolut sama-sama menunjuk "murah", keyakinanmu lebih kuat. Jika bertentangan, cari tahu kenapa.

---

*Disclaimer: materi edukasi, bukan rekomendasi jual/beli. Angka valuasi adalah estimasi penuh asumsi, bukan kepastian. Selalu lakukan riset mandiri.*`,
    },

    // ===================== LESSON 6 =====================
    {
      slug: "af-margin-of-safety-thesis",
      title: "Margin of Safety & Menyusun Thesis Investasi",
      readMinutes: 9,
      summary:
        "Bantalan pengaman, kerangka thesis, dan cara memadukannya dengan Verdict & Valuasi Nubuat.",
      body: `## Margin of safety: bantalan untuk salah hitung

Semua valuasi adalah **estimasi**, dan estimasi bisa keliru. **Margin of safety** (MoS), konsep inti Benjamin Graham, adalah selisih pengaman antara **nilai wajar** yang kamu hitung dan **harga** yang kamu bayar.

![Margin of safety: selisih antara nilai wajar dan harga pasar sebagai bantalan](/academy/fundamental/margin-of-safety.svg)

\`\`\`
Margin of Safety = (Nilai Wajar - Harga Pasar) / Nilai Wajar
\`\`\`

Jika kamu menaksir nilai wajar Rp1.000 dan membeli di Rp700, MoS-mu **30%**. Bantalan itu melindungimu jika:

- Estimasimu terlalu optimis (growth/margin meleset).
- Terjadi kejutan tak terduga (resesi, regulasi, kompetisi).
- Asumsi tingkat diskonto ternyata terlalu rendah.

Makin **tidak pasti** bisnisnya, makin **besar** MoS yang sebaiknya kamu minta.

### Menyusun thesis investasi

Thesis adalah **argumen tertulis** kenapa kamu membeli — dan kapan kamu salah. Strukturnya kira-kira:

1. **Ringkasan bisnis** — Apa yang dijual, bagaimana menghasilkan uang, siapa pelanggan.
2. **Moat & kualitas** — Keunggulan kompetitif, manajemen, tata kelola.
3. **Kesehatan finansial** — Tren ROE/margin, DER, likuiditas (lihat lesson rasio).
4. **Valuasi** — Hasil valuasi relatif + absolut, dan margin of safety saat ini.
5. **Katalis** — Apa yang akan membuat pasar mengakui nilainya?
6. **Risiko & pembatal (kill criteria)** — Kondisi spesifik yang membuktikan thesis-mu **salah** (mis. "jika margin kotor turun di bawah X dua kuartal berturut-turut"). Ini menjaga dari menahan saham karena ego.

> Thesis yang baik membuat keputusan jual/beli jadi **disiplin**, bukan emosional.

### Mengombinasikan dengan fitur Nubuat

Nubuat membantu mempercepat langkah riset di atas. Di halaman **/ticker** tiap emiten, buka tab **Fundamental** untuk melihat data dan ringkasan yang relevan, serta fitur **Verdict** dan **Valuasi** sebagai **titik awal** analisismu:

- **Tab Fundamental** — Kumpulan rasio & data fundamental untuk mengisi langkah 3 (kesehatan finansial) dengan cepat.
- **Verdict** — Ringkasan penilaian sebagai *starting point*, bukan keputusan final.
- **Valuasi** — Estimasi nilai untuk dibandingkan dengan harga (cek margin of safety).

Cara memakainya yang sehat: **jangan menelan mentah-mentah**. Pakai Verdict & Valuasi Nubuat untuk **menyaring & mempercepat**, lalu verifikasi sendiri dengan kerangka di modul ini (moat, rasio, valuasi, MoS) sebelum mengambil keputusan.

### Checklist ringkas sebelum membeli

| Cek | Pertanyaan |
| --- | --- |
| Bisnis | Apakah aku paham cara mereka menghasilkan uang? |
| Moat | Apakah keunggulannya bertahan 5–10 tahun? |
| Finansial | ROE/margin sehat & stabil? Utang terkendali? |
| Valuasi | Relatif & absolut sama-sama wajar/murah? |
| Margin of safety | Ada bantalan cukup untuk salah hitung? |
| Pembatal | Apa yang akan membuktikan aku salah? |

---

*Disclaimer: Seluruh materi ini bersifat edukasi dan bukan rekomendasi/ajakan untuk membeli atau menjual efek apa pun. Fitur Verdict & Valuasi Nubuat adalah alat bantu analisis, bukan nasihat investasi. Keputusan investasi sepenuhnya tanggung jawab kamu — selalu lakukan riset mandiri dan pertimbangkan profil risiko serta tujuan keuanganmu.*`,
    },
  ],
};
