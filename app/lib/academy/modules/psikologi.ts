/**
 * Academy module: Psikologi & Money Management.
 *
 * Modul tentang sisi mental & manajemen modal trading — bagian yang paling
 * sering diremehkan padahal paling menentukan kelangsungan hidup di pasar.
 * Mencakup: kenapa psikologi mengalahkan strategi, bias kognitif trader,
 * siklus emosi pasar, risk per trade & risk-reward, position sizing, plus
 * aturan main / trading plan / jurnal + kombinasi Paper Trading Nubuat.
 *
 * Konten static & fully typed (sama dengan content.ts). Diagram dirender lewat
 * markdown image ![alt](/academy/psikologi/NAMA.svg) (SVG self-hosted di
 * public/academy/psikologi/). Tidak ada raw HTML — LessonMarkdown hanya
 * mendukung markdown + remark-gfm.
 *
 * Di-wire ke ACADEMY_MODULES secara terpisah (lihat content.ts).
 */
import type { AcademyModule } from "../content";

export const psikologiModule: AcademyModule = {
  slug: "psikologi-money-management",
  title: "Psikologi & Money Management",
  icon: "Brain",
  level: "Pemula",
  description:
    "Sisi mental & pengelolaan modal yang menentukan kelangsungan hidup trader: bias kognitif, siklus emosi pasar, risk-reward, position sizing, sampai trading plan & jurnal — lengkap dengan diagram.",
  lessons: [
    // ===================== LESSON 1 =====================
    {
      slug: "pm-psikologi-lebih-penting",
      title: "Kenapa Psikologi > Strategi",
      readMinutes: 6,
      summary:
        "Mayoritas trader rugi bukan karena analisisnya jelek, tapi karena emosi mengambil alih eksekusi.",
      body: `## Kenapa Psikologi > Strategi

Banyak pemula mengira kunci sukses di pasar saham adalah menemukan **strategi rahasia** atau indikator paling canggih. Kenyataannya, sebagian besar trader yang rugi **bukan** karena analisisnya salah — tapi karena **emosi mengambil alih** saat eksekusi.

> Pasar tidak menghukum orang yang kurang pintar. Pasar menghukum orang yang tidak bisa mengendalikan diri.

### Strategi cuma 20%, sisanya kamu

Seorang trader bisa punya sistem yang menguntungkan (*profitable*) secara matematis, tapi tetap bangkrut karena:

- **Tidak disiplin** memasang stop loss, lalu satu kerugian besar menghapus puluhan kemenangan kecil.
- **Memperbesar posisi** saat sedang panas (overconfidence) tepat sebelum strategi memasuki masa rugi.
- **Keluar dari rencana** karena takut atau serakah di tengah jalan.

| Komponen | Bobot kasar | Penjelasan |
| --- | --- | --- |
| **Strategi/edge** | ~20% | Aturan kapan masuk & keluar. |
| **Money management** | ~40% | Berapa besar risiko per posisi. |
| **Psikologi/disiplin** | ~40% | Apakah kamu benar-benar mengeksekusi rencana. |

Dua faktor terakhir — money management dan psikologi — adalah inti modul ini. Keduanya **bisa kamu kontrol penuh**, beda dengan arah pasar yang tidak bisa kamu kontrol.

### Bukti sederhana: sistem koin

Bayangkan kamu punya "sistem" yang menang 60% dari waktu dengan risk-reward 1:1. Secara matematis ini sangat menguntungkan. Tapi kalau setelah 3 kali rugi beruntun kamu **panik dan menggandakan posisi** untuk "balik modal", satu kekalahan besar bisa menghapus seluruh keuntungan berbulan-bulan.

Sistemnya tetap bagus. Yang rusak adalah **eksekusinya** — dan itu murni psikologi.

### Kabar baiknya

Kamu tidak perlu jadi jenius analisis untuk konsisten untung. Kamu hanya perlu:

1. Punya sistem sederhana yang punya *edge* (keunggulan statistik kecil saja cukup).
2. **Mengelola risiko** supaya tidak ada satu transaksi pun yang bisa menghancurkanmu.
3. **Mengeksekusi dengan disiplin**, tanpa diganggu emosi.

Modul ini fokus ke poin 2 dan 3 — bagian yang membuat 90% trader gagal, dan yang paling jarang diajarkan.

> Ingat baik-baik: kamu bisa salah arah dan tetap bertahan kalau risikomu kecil. Tapi kamu bisa benar arah dan tetap bangkrut kalau risikomu tidak terkontrol.`,
    },

    // ===================== LESSON 2 =====================
    {
      slug: "pm-bias-kognitif",
      title: "Bias Kognitif Trader",
      readMinutes: 9,
      summary:
        "FOMO, loss aversion, confirmation bias, anchoring, recency, overconfidence — dan contoh kasusnya di IDX.",
      body: `## Bias Kognitif Trader

Otak manusia dirancang untuk bertahan hidup di alam liar, **bukan** untuk mengambil keputusan rasional di pasar finansial. Akibatnya, kita punya banyak **bias kognitif** — pintasan berpikir yang sering menyesatkan saat trading.

![Enam bias kognitif utama trader yang terhubung ke otak: FOMO, loss aversion, confirmation bias, anchoring, recency, overconfidence](/academy/psikologi/biases.svg)

### Enam bias yang paling menguras cuan

| Bias | Apa yang terjadi | Akibat di trading |
| --- | --- | --- |
| **FOMO** | Takut ketinggalan saat harga sudah naik tinggi | Beli di puncak, jadi pembeli terakhir |
| **Loss aversion** | Rasa sakit rugi 2x lebih kuat dari senang untung | Hold saham rugi terlalu lama, cut untung kecepatan |
| **Confirmation bias** | Hanya cari info yang membenarkan keputusan | Abaikan tanda bahaya, "denial" |
| **Anchoring** | Terpaku pada satu angka (harga beli) | Tunggu "balik modal" padahal tesis rusak |
| **Recency bias** | Terlalu berbobot pada kejadian terbaru | Kapok total habis rugi / sok jago habis cuan |
| **Overconfidence** | Merasa lebih pintar dari pasar | Posisi kebesaran, abaikan risiko |

### 1. FOMO (Fear of Missing Out)

Kamu lihat saham X sudah naik 3 hari ARA berturut-turut. Semua grup ramai membahasnya. Kamu takut ketinggalan, lalu beli di hari ke-4 — tepat saat bandar mulai distribusi.

> **Kasus IDX:** ramai saham "gorengan" yang naik ratusan persen dalam hitungan minggu. Ritel yang FOMO masuk di pucuk sering nyangkut saat harga ARB beruntun setelahnya.

### 2. Loss aversion (penghindaran rugi)

Secara psikologis, sakit kehilangan Rp1 juta terasa **sekitar 2x lebih kuat** daripada senang mendapat Rp1 juta. Akibatnya trader cenderung:

- **Menahan saham yang rugi** ("nanti juga balik") agar tidak harus "merealisasikan" rasa sakit.
- **Buru-buru jual saham yang untung** karena takut untungnya hilang.

Ini kebalikan dari yang seharusnya: *cut your losses, let your profits run*.

### 3. Confirmation bias

Setelah beli, kamu hanya membaca berita & analisis yang **mendukung** keputusanmu, dan mengabaikan yang bertentangan. Tanda bahaya terlewat karena kamu sudah "jatuh cinta" dengan sahammu.

### 4. Anchoring (penjangkaran)

Kamu beli di Rp1.000. Saat harga turun ke Rp700 karena fundamental memburuk, kamu menolak jual karena "terjangkar" pada angka Rp1.000 — padahal harga beli kamu **tidak relevan** dengan kondisi perusahaan saat ini.

> **Kasus IDX:** banyak investor menahan saham yang anjlok puluhan persen bertahun-tahun, hanya karena ingin "balik modal" di harga beli mereka — uangnya jadi mati di situ (*opportunity cost* besar).

### 5. Recency bias

Otak memberi bobot berlebih pada kejadian **paling baru**:

- Habis rugi besar → jadi terlalu takut, tidak berani masuk saat peluang bagus muncul.
- Habis untung beruntun → merasa "pasti menang lagi", lalu memperbesar posisi sembrono.

### 6. Overconfidence (terlalu percaya diri)

Setelah beberapa kali untung, trader merasa sudah "menguasai pasar" dan mulai:

- Memperbesar posisi melebihi batas wajar.
- Mengabaikan stop loss ("kali ini aku yakin").
- Berhenti melakukan analisis serius.

> Pasar punya cara unik untuk merendahkan trader yang sombong. Justru saat kamu merasa paling jago, di situlah risiko terbesar.

### Cara melawan bias

Kamu **tidak bisa menghilangkan** bias ini — ia bawaan otak. Tapi kamu bisa **menjinakkannya** dengan sistem di luar emosi:

1. **Aturan tertulis** (trading plan) yang dibuat saat kepala dingin.
2. **Stop loss otomatis** supaya keputusan keluar tidak bergantung emosi sesaat.
3. **Jurnal trading** untuk mengenali pola bias kamu sendiri.
4. **Position sizing** yang membatasi kerusakan saat kamu salah.

Empat alat ini dibahas di lesson-lesson berikutnya.`,
    },

    // ===================== LESSON 3 =====================
    {
      slug: "pm-siklus-emosi-pasar",
      title: "Siklus Emosi Pasar (Euforia → Panik)",
      readMinutes: 7,
      summary:
        "Kurva emosi kolektif pasar dari optimisme, euforia, sampai panik dan pasrah — plus di mana titik beli & jual terbaik.",
      body: `## Siklus Emosi Pasar

Harga tidak bergerak acak — ia mengikuti **gelombang emosi kolektif** investor. Memahami "kita ada di tahap emosi mana" membantu kamu tidak ikut-ikutan euforia di puncak atau ikut panik di dasar.

![Kurva siklus emosi pasar dari optimisme naik ke euforia di puncak lalu turun ke takut dan panik di dasar, kemudian pasrah dan harapan](/academy/psikologi/emotion-cycle.svg)

### Tahap-tahap siklus emosi

Satu siklus pasar lengkap biasanya melewati tahap emosi berikut:

1. **Harapan / Optimisme** — harga mulai naik dari dasar, sebagian orang masuk lebih dulu.
2. **Antusias** — kenaikan terkonfirmasi, makin banyak yang ikut.
3. **Euforia** — *titik risiko keuangan tertinggi*. Semua orang merasa jenius, berita positif di mana-mana, "harga pasti naik terus".
4. **Kecemasan / Penyangkalan** — harga mulai turun, tapi mayoritas masih yakin ini "koreksi sehat".
5. **Takut** — penurunan berlanjut, mulai panik kecil.
6. **Panik** — aksi jual besar-besaran tanpa pikir panjang.
7. **Pasrah / Putus asa (capitulation)** — *titik peluang keuangan terbaik*. Orang menjual di harga terendah, kapok, bersumpah tidak akan main saham lagi.
8. **Kembali ke harapan** — siklus berulang.

### Pelajaran kuncinya

> **Titik risiko terbesar justru saat kamu merasa paling nyaman (euforia). Titik peluang terbesar justru saat kamu merasa paling takut (pasrah).**

Inilah kenapa investor legendaris bilang: *"Be fearful when others are greedy, and greedy when others are fearful."* (Takutlah saat orang lain serakah, dan seraklah saat orang lain takut.)

### Kenapa ini sulit dilakukan

Secara emosional, **sangat berat** untuk:

- **Tidak ikut beli** saat semua orang euforia dan untung (rasanya seperti melewatkan pesta).
- **Berani beli** saat semua orang panik dan berdarah-darah (rasanya seperti menentang seluruh dunia).

Justru karena sulit, di situlah keuntungannya. Kalau gampang, semua orang akan melakukannya.

### Mengenali tahap di pasar IDX

Tanda-tanda **euforia** (waspada, kurangi risiko):

- Orang yang tidak pernah main saham tiba-tiba ikut beli & pamer cuan.
- Saham-saham "gorengan" naik ratusan persen, ARA beruntun.
- Berita & media penuh optimisme; istilah "to the moon" di mana-mana.

Tanda-tanda **pasrah/dasar** (mulai perhatikan peluang):

- Grup saham sepi, banyak yang kapok dan keluar.
- Berita penuh pesimisme, "saham itu judi".
- Saham bagus dengan fundamental sehat ikut dijual murah tanpa pandang bulu.

### Cara memanfaatkannya

Kamu tidak perlu menebak titik puncak/dasar dengan presisi (itu mustahil). Cukup:

1. **Kurangi posisi** secara bertahap saat tanda euforia menumpuk.
2. **Cicil beli** (lihat lesson DCA di modul Strategi) saat tanda pasrah muncul pada saham berkualitas.
3. Selalu padukan "membaca emosi" ini dengan **manajemen risiko** — karena tahap emosi bisa bertahan lebih lama dari dugaanmu.

> Catatan: membaca siklus emosi adalah **konteks**, bukan sinyal pasti. Pasar bisa euforia jauh lebih lama dari yang masuk akal, dan bisa panik lebih dalam dari dugaan. Tetap pakai stop loss & position sizing.`,
    },

    // ===================== LESSON 4 =====================
    {
      slug: "pm-risk-per-trade-rr",
      title: "Risk per Trade & Risk-Reward Ratio",
      readMinutes: 7,
      summary:
        "Batasi risiko 1-2% per transaksi dan cari rasio risk-reward minimal 1:2 supaya tetap profit walau sering salah.",
      body: `## Risk per Trade & Risk-Reward Ratio

Ini adalah jantung **money management**. Dua konsep yang, kalau kamu kuasai, sudah membuatmu lebih baik dari mayoritas trader ritel.

### Risk per trade (risiko per transaksi)

**Risk per trade** = berapa banyak modal yang siap kamu **relakan hilang** kalau satu transaksi gagal.

Aturan emas: **maksimal 1-2% dari total modal per transaksi.**

> Kenapa kecil? Supaya **tidak ada satu transaksi pun** yang bisa menghancurkanmu. Dengan risiko 2%, kamu bisa salah **10 kali beruntun** dan masih punya ~80% modal untuk bangkit.

Bandingkan kalau kamu berani risiko 20% per transaksi: cukup 5 kali salah beruntun, modalmu **habis**. Dan deret kekalahan adalah hal yang **pasti terjadi** cepat atau lambat.

| Risiko per trade | Salah 5x beruntun, sisa modal | Salah 10x beruntun, sisa modal |
| --- | --- | --- |
| **1%** | ~95% | ~90% |
| **2%** | ~90% | ~82% |
| **10%** | ~59% | ~35% |
| **20%** | ~33% | ~11% |

### Risk-Reward Ratio (RRR)

**Risk-reward ratio** membandingkan **potensi rugi** (jarak entry ke stop loss) dengan **potensi untung** (jarak entry ke target).

![Risk-reward ratio 1:2 dengan posisi entry, stop loss di bawah (risk), dan target di atas (reward)](/academy/psikologi/risk-reward.svg)

Contoh: kamu beli di Rp1.000, stop loss Rp950 (risiko Rp50), target Rp1.100 (potensi untung Rp100).

- Risiko = Rp50
- Reward = Rp100
- **RRR = 1 : 2** (risiko 1 bagian, potensi untung 2 bagian)

### Kenapa RRR mengubah segalanya

Dengan RRR yang bagus, kamu **bisa profit walaupun lebih sering salah daripada benar**.

Misal RRR = 1:2 dan kamu hanya menang **40%** dari waktu (lebih sering kalah!):

\`\`\`
Dari 10 transaksi (risiko 1 unit, reward 2 unit):
  4 menang × (+2 unit) = +8 unit
  6 kalah  × (−1 unit) = −6 unit
  ----------------------------------
  Total                = +2 unit (PROFIT)
\`\`\`

Padahal kamu kalah 6 dari 10 kali! Inilah kekuatan RRR.

### Patokan RRR yang sehat

| RRR | Win rate minimal agar BEP | Catatan |
| --- | --- | --- |
| **1 : 1** | 50% | Berat — harus benar separuh waktu |
| **1 : 2** | ~34% | Sweet spot umum |
| **1 : 3** | ~25% | Sangat longgar, tapi target sering tak tercapai |

> Cari minimal **1:2**. Kalau sebuah peluang RRR-nya di bawah 1:1, **lebih baik dilewati** — secara matematis tidak layak.

### Menggabungkan keduanya

Risk per trade menjawab *"berapa yang aku pertaruhkan?"*, RRR menjawab *"apakah pertaruhan ini sepadan?"*. Keduanya wajib **ditentukan sebelum kamu klik beli**, bukan sesudah harga bergerak.

Di lesson berikutnya kita ubah "risiko 2%" ini jadi **jumlah lot konkret** lewat position sizing.

> Di Nubuat, Daily Picks sudah menyertakan entry / stop loss / target sehingga RRR-nya bisa langsung kamu cek sebelum mengambil posisi.`,
    },

    // ===================== LESSON 5 =====================
    {
      slug: "pm-position-sizing",
      title: "Position Sizing: Menghitung Lot dari Risk%",
      readMinutes: 8,
      summary:
        "Rumus mengubah risiko persen + jarak stop loss jadi jumlah lot yang tepat dibeli, lengkap contoh hitungan.",
      body: `## Position Sizing: Menghitung Lot

Kamu sudah tahu mau risiko **2% per transaksi** dan mau RRR **1:2**. Tapi pertanyaan praktisnya: **berapa lot yang harus aku beli?** Jawabannya ada di *position sizing*.

> Kesalahan terbesar pemula: menentukan jumlah lot dari "berapa uang yang aku punya" — bukan dari "berapa yang siap aku rugikan". Position sizing membalik logika ini.

![Langkah position sizing: modal lalu risk per trade lalu jarak stop loss, menghasilkan jumlah lembar lewat rumus risk dibagi jarak stop](/academy/psikologi/position-sizing.svg)

### Rumus inti

\`\`\`
Risiko (Rp)        = Total Modal × Risk%
Jarak Stop (Rp)    = Harga Entry − Harga Stop Loss
Jumlah lembar      = Risiko (Rp) ÷ Jarak Stop (Rp)
Jumlah lot         = Jumlah lembar ÷ 100
\`\`\`

Tiga input yang kamu butuhkan:

1. **Total modal** kamu.
2. **Risk%** (mis. 1% atau 2%).
3. **Jarak stop loss** (selisih harga entry ke stop loss per lembar).

### Contoh hitungan lengkap

Misal:

- Total modal = **Rp100.000.000**
- Risk per trade = **1%** → Rp1.000.000
- Entry = **Rp1.000**, Stop loss = **Rp950** → jarak stop = **Rp50/lembar**

Maka:

\`\`\`
Risiko (Rp)   = 100.000.000 × 1%   = 1.000.000
Jarak Stop    = 1.000 − 950        = 50 per lembar
Jumlah lembar = 1.000.000 ÷ 50     = 20.000 lembar
Jumlah lot    = 20.000 ÷ 100       = 200 lot
\`\`\`

**Hasil: beli 200 lot.** Kalau stop loss kena, kamu rugi tepat Rp1 juta = 1% modal. Persis sesuai rencana.

### Poin penting: stop lebih jauh = posisi lebih kecil

Perhatikan, **semakin jauh stop loss, semakin kecil posisi** yang boleh kamu ambil — supaya nominal risiko tetap sama.

| Entry | Stop loss | Jarak stop | Lembar (risiko Rp1jt) | Lot |
| --- | --- | --- | --- | --- |
| 1.000 | 950 | 50 | 20.000 | 200 |
| 1.000 | 900 | 100 | 10.000 | 100 |
| 1.000 | 800 | 200 | 5.000 | 50 |

Stop yang lebih lebar bukan berarti "lebih aman" — ia justru memaksamu **mengecilkan jumlah lot** agar risiko rupiahnya konstan. Ini sering bikin pemula kaget.

### Cek modal cukup atau tidak

Setelah dapat jumlah lot, pastikan **nilai posisi tidak melebihi modal** (kecuali kamu sengaja pakai margin — yang tidak disarankan pemula):

\`\`\`
Nilai posisi = Jumlah lembar × Harga Entry
             = 20.000 × 1.000 = Rp20.000.000
\`\`\`

Rp20 juta dari modal Rp100 juta → aman (20% modal di satu posisi). Kalau hasilnya melebihi modal, perkecil lot atau lewati peluang itu.

### Langkah praktis sebelum beli

1. Tentukan **entry** dan **stop loss** (dari support/swing low yang logis).
2. Hitung **jarak stop** per lembar.
3. Tentukan **risiko rupiah** = modal × risk%.
4. Bagi: risiko ÷ jarak stop = **jumlah lembar**, lalu ÷100 = **lot**.
5. Cek nilai posisi ≤ modal yang wajar.
6. Baru klik beli.

> Lakukan ini **setiap kali**. Setelah beberapa minggu, hitungan ini jadi refleks dan kamu tidak akan pernah lagi "asal hajar" jumlah lot. Ini satu kebiasaan kecil yang menyelamatkan banyak modal.`,
    },

    // ===================== LESSON 6 =====================
    {
      slug: "pm-trading-plan-jurnal",
      title: "Aturan Main, Trading Plan & Jurnal",
      readMinutes: 8,
      summary:
        "Bangun trading plan tertulis, catat jurnal, dan latih semuanya dulu di Paper Trading Nubuat tanpa risiko.",
      body: `## Aturan Main, Trading Plan & Jurnal

Semua teori di lesson sebelumnya hanya berguna kalau kamu **menuangkannya ke aturan tertulis** dan **mengeksekusinya dengan disiplin**. Inilah penutup yang menyatukan semuanya.

### Kenapa harus tertulis

Keputusan yang dibuat saat **kepala dingin** (sebelum pasar buka) jauh lebih rasional daripada keputusan saat **harga bergerak liar** dan emosi memuncak. Trading plan tertulis = "kontrak dengan diri sendiri" yang dibuat versi rasionalmu, untuk menahan versi emosionalmu.

> Tanpa rencana tertulis, kamu akan trading berdasarkan perasaan — dan perasaan adalah musuh terbesar trader (ingat lesson bias kognitif).

### Komponen trading plan

Trading plan minimal harus menjawab pertanyaan-pertanyaan ini:

| Pertanyaan | Contoh isian |
| --- | --- |
| **Apa gayaku?** | Swing trade, horizon 1-4 minggu |
| **Saham apa yang aku main?** | Hanya LQ45 / IDX30 (likuid) |
| **Kapan masuk (setup)?** | Breakout resistance + volume naik |
| **Berapa risiko per trade?** | 1% dari modal |
| **RRR minimal?** | 1 : 2 |
| **Di mana stop loss?** | Di bawah swing low terdekat |
| **Kapan ambil untung?** | Di target / saat sinyal balik arah |
| **Maksimal posisi terbuka?** | 5 saham sekaligus |
| **Kapan berhenti hari ini?** | Setelah 2 kali kena stop loss |

### Aturan main anti-emosi

Beberapa aturan keras yang melindungimu dari diri sendiri:

1. **Tentukan stop loss & target SEBELUM beli** — dan jangan diubah saat sudah masuk (kecuali untuk mengamankan untung / *trailing*).
2. **Patuhi stop loss.** Stop loss yang tidak dijalankan tidak ada gunanya.
3. **Jangan revenge trading.** Setelah rugi, jangan langsung "balas dendam" dengan posisi besar — itu memperdalam lubang.
4. **Jangan rata-rata turun (average down) tanpa rencana** pada saham yang tesisnya sudah rusak.
5. **Batasi kerugian harian/mingguan.** Kalau sudah kena batas, berhenti — besok pasar masih ada.

### Jurnal trading

**Jurnal** adalah catatan setiap transaksi beserta **alasannya**. Ini cara satu-satunya untuk benar-benar belajar dari pengalaman, bukan mengulang kesalahan yang sama.

Yang dicatat per transaksi:

- Tanggal, kode saham, harga entry & exit, jumlah lot.
- **Alasan masuk** (setup apa yang terpenuhi).
- **Stop loss & target** yang direncanakan.
- **Hasil** (untung/rugi, dalam Rp & %).
- **Catatan emosi**: apakah kamu disiplin, atau melanggar rencana? Kenapa?

Review jurnal secara berkala (mingguan/bulanan) untuk menemukan **pola kesalahan** kamu sendiri — misalnya "aku sering rugi karena masuk tanpa konfirmasi volume" atau "aku selalu cut untung kecepatan".

### Latih dulu di Paper Trading Nubuat

Semua aturan di atas tidak perlu kamu uji dengan uang asli dulu. Nubuat punya fitur **Paper Trading** (portofolio virtual) yang **gratis** — tempat sempurna untuk:

1. **Menguji trading plan** kamu tanpa risiko uang nyata.
2. **Membangun disiplin** mengeksekusi entry/stop/target sesuai rencana.
3. **Mengisi jurnal** dari transaksi paper untuk mengenali pola bias kamu.
4. **Melatih position sizing** — hitung lot dengan rumus dari lesson 5 pada setiap order virtual.

Cara mulai: buka **[Paper Trading](/portfolio)**, mulai dengan modal virtual, dan perlakukan seserius akun asli. Kalau di paper saja kamu tidak disiplin, dengan uang asli pasti lebih kacau.

> Aturan praktis: konsisten profit di paper trading selama beberapa bulan **dulu**, baru naik ke modal kecil asli, baru naik bertahap. Jangan terbalik.

### Penutup modul

Kamu sekarang punya kerangka lengkap sisi mental & modal:

1. **Psikologi > strategi** — disiplin yang menentukan.
2. **Bias kognitif** — kenali musuh di dalam kepalamu.
3. **Siklus emosi pasar** — jangan euforia di puncak, jangan panik di dasar.
4. **Risk per trade & RRR** — risiko kecil, reward lebih besar.
5. **Position sizing** — ubah risk% jadi lot konkret.
6. **Trading plan & jurnal** — aturan tertulis + evaluasi.

> **Disclaimer:** seluruh materi ini bersifat **edukasi**, bukan ajakan atau rekomendasi membeli/menjual saham tertentu. Trading saham mengandung risiko kehilangan modal. Semua keputusan investasi adalah tanggung jawabmu sendiri. Mulai kecil, gunakan uang dingin, dan latih dulu lewat Paper Trading sebelum mempertaruhkan modal asli.`,
    },
  ],
};
