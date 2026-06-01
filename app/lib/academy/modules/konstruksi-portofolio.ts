import type { AcademyModule } from "../content";

export const konstruksiPortofolioModule: AcademyModule = {
  slug: "konstruksi-portofolio",
  title: "Konstruksi Portofolio",
  icon: "Layers",
  level: "Lanjutan",
  description:
    "Membangun portofolio saham IDX yang terstruktur: korelasi sejati, alokasi & sizing level-portofolio, dan disiplin rebalancing.",
  lessons: [
    {
      slug: "kp-korelasi-dan-diversifikasi-sejati",
      title: "Korelasi & Diversifikasi yang Sesungguhnya",
      readMinutes: 7,
      summary:
        "Kenapa 10 saham bank bukan diversifikasi: memahami korelasi, risiko sistematis vs spesifik.",
      body: `## Korelasi & Diversifikasi yang Sesungguhnya

Banyak investor merasa "aman" karena punya 10 saham. Tapi kalau kesepuluhnya bank (mis. BBRI, BBCA, BMRI, BBNI, dan lainnya), kamu **tidak** sebenar-benarnya terdiversifikasi — kamu hanya punya satu taruhan besar: **sektor perbankan Indonesia**. Saat suku bunga, regulasi, atau kredit macet menekan sektor itu, seluruh portofoliomu turun bersama-sama.

Diversifikasi sejati bukan soal **jumlah** saham, tapi soal **seberapa berbeda** perilaku saham-saham itu satu sama lain — itulah korelasi.

### Apa itu korelasi?

Korelasi mengukur sejauh mana dua saham bergerak searah, dalam skala -1 sampai +1.

- **+1** — bergerak persis searah (naik bareng, turun bareng).
- **0** — tidak ada hubungan; gerakannya independen.
- **-1** — bergerak berlawanan (satu naik, satu turun).

Manfaat diversifikasi muncul justru ketika korelasi antar-aset **rendah**. Kalau semua koleksimu berkorelasi mendekati +1, menambah saham hampir tidak mengurangi risiko — kamu cuma menggandakan taruhan yang sama.

### Korelasi antar-sektor di IDX

Saham dalam satu sektor cenderung berkorelasi tinggi karena dipengaruhi pendorong (driver) yang sama. Tabel ilustrasi kasar untuk konteks IDX (bukan angka presisi, hanya untuk intuisi):

| Pasangan ilustrasi | Korelasi tipikal | Kenapa |
| --- | --- | --- |
| BBRI vs BMRI (bank vs bank) | Tinggi (+) | Driver sama: suku bunga, kredit, makro |
| BBRI (bank) vs ICBP (konsumer) | Sedang | Sebagian beda: konsumer lebih defensif |
| ADRO (energi/batu bara) vs ICBP (konsumer) | Rendah | Driver berbeda: harga komoditas vs daya beli |
| TLKM (telko) vs ADRO (komoditas) | Rendah | Siklus dan sensitivitas berbeda |

Intinya: menggabungkan **sektor dengan driver berbeda** (perbankan, konsumer, telko, energi/komoditas, infrastruktur) memberi efek peredam jauh lebih besar daripada menumpuk banyak nama di satu sektor.

### Risiko sistematis vs risiko spesifik

Total risiko portofoliomu bisa dipecah jadi dua:

- **Risiko spesifik (unsystematic)** — risiko unik per emiten: skandal manajemen, gagal bayar utang, suspensi, kebakaran pabrik. Risiko ini **bisa dikurangi** lewat diversifikasi yang benar. Semakin banyak emiten dengan korelasi rendah, semakin kecil dampak satu kejadian buruk.
- **Risiko sistematis (market)** — risiko yang menimpa seluruh pasar: resesi, kenaikan suku bunga global, pelemahan rupiah, gejolak geopolitik. Risiko ini **tidak bisa dihilangkan** hanya dengan menambah saham, karena hampir semua saham ikut turun saat pasar panik.

> Diversifikasi adalah obat untuk risiko **spesifik**, bukan untuk risiko **sistematis**. Untuk meredam risiko sistematis, kamu butuh kelas aset lain (kas, obligasi/SBN, emas) — dibahas di lesson ketiga.

### Praktik singkat

1. Lihat sebaran portofoliomu **per sektor**, bukan per saham. Kalau >40-50% modal menumpuk di satu sektor, itu konsentrasi terselubung.
2. Tanyakan: "Kalau driver utama sektor ini memburuk, berapa persen portofolioku yang terdampak sekaligus?"
3. Tambah emiten dari sektor dengan driver **berbeda**, bukan sekadar menambah jumlah nama.

> **Disclaimer:** Materi ini bersifat edukasi, bukan ajakan membeli atau menjual saham apa pun. Emiten yang disebut hanya ilustrasi. Komposisi yang tepat bergantung pada profil risiko masing-masing.`,
    },
    {
      slug: "kp-alokasi-dan-position-sizing",
      title: "Alokasi & Position Sizing Level-Portofolio",
      readMinutes: 8,
      summary:
        "Core-satellite, barbell, equal vs conviction weight, sizing berbasis risiko, dan Kelly secara hati-hati.",
      body: `## Alokasi & Position Sizing Level-Portofolio

Di modul Manajemen Risiko kamu belajar sizing **per posisi** (aturan 1-2% risiko). Sekarang kita naik satu tingkat: bagaimana menyusun **keseluruhan** portofolio agar punya struktur yang jelas, bukan sekadar kumpulan saham acak hasil impuls.

### Kerangka core-satellite

Pendekatan paling populer untuk investor yang ingin tumbuh tapi tetap terkendali adalah **core-satellite**: bagi portofolio jadi inti yang stabil dan satelit yang lebih agresif, ditambah lapisan peredam.

![Diagram alokasi portofolio core-satellite: inti saham blue-chip stabil dikelilingi satelit bertumbuh, ditambah peredam kas/obligasi](/academy/portofolio/alokasi.svg)

| Lapisan | Porsi ilustrasi | Isi | Tujuan |
| --- | --- | --- | --- |
| **Inti (core)** | 60-70% | Blue chip likuid & defensif (mis. BBRI, BBCA, TLKM, ICBP sebagai ilustrasi) | Fondasi stabil, ikut pertumbuhan pasar |
| **Satelit** | 20-30% | Saham bertumbuh / tematik / siklikal (mis. ADRO, emiten growth) | Mengejar alpha, conviction lebih tinggi |
| **Peredam** | 10-15% | Kas, obligasi/SBN, emas | Meredam guncangan, amunisi saat diskon |

Inti memberi stabilitas; satelit memberi peluang upside; peredam menahan saat pasar jatuh. Porsi di atas hanya ilustrasi — sesuaikan dengan profil risiko dan horizon kamu.

### Pendekatan barbell

Alternatif lain adalah **barbell**: konsentrasi di dua ujung ekstrem dan menghindari "tengah" yang biasa-biasa saja. Misal sebagian besar di aset sangat aman (kas/obligasi) dan sebagian kecil di taruhan berisiko tinggi-imbal hasil tinggi, tanpa banyak posisi medium. Cocok untuk yang ingin melindungi modal inti sambil tetap punya eksposur ke potensi besar, tapi butuh disiplin agar sisi agresif tidak membengkak.

### Equal-weight vs conviction-weight

Bagaimana membobot tiap saham di dalam satu lapisan?

- **Equal-weight** — setiap saham diberi porsi sama (mis. 8 saham masing-masing 12,5%). Sederhana, menghindari bias emosional, dan otomatis "menjual yang menang, membeli yang kalah" saat rebalancing. Cocok kalau kamu tidak punya keyakinan kuat siapa yang akan unggul.
- **Conviction-weight** — porsi lebih besar untuk ide dengan keyakinan & kualitas tesis lebih tinggi. Potensi imbal hasil lebih besar, tapi risiko juga terkonsentrasi kalau tesismu salah. Cocok kalau riset kamu mendalam — tapi tetap batasi porsi maksimum per posisi (mis. tidak lebih dari 15-20%).

> Aturan praktis: walau sangat yakin pada satu emiten, hindari satu posisi tunggal mendominasi portofolio. Konsentrasi berlebih membuat satu kesalahan jadi fatal.

### Position sizing berbasis risiko (level-portofolio)

Di tingkat portofolio, sizing bukan soal "berapa rupiah yang saya beli", tapi "berapa **risiko** yang posisi ini bawa ke total modal". Pakai jarak ke stop loss, bukan harga beli, sebagai dasar:

\`\`\`
Risiko per posisi = Total Modal × R%        (mis. R = 1%)
Risiko per lembar = Harga Beli − Harga Stop Loss
Jumlah lembar     = Risiko per posisi ÷ Risiko per lembar
\`\`\`

Saham yang lebih volatil (stop loss lebih jauh) otomatis dapat porsi rupiah lebih kecil, sehingga **kontribusi risiko** antar-posisi lebih seimbang. Ini mencegah satu saham liar diam-diam mendominasi risiko portofolio meski porsi rupiahnya terlihat wajar. Pastikan **total** risiko gabungan semua posisi tetap dalam batas nyaman (mis. total risiko terbuka tidak melebihi 6-10% modal).

### Konsep Kelly — singkat & hati-hati

**Kriteria Kelly** adalah rumus matematis untuk menentukan ukuran taruhan optimal berdasarkan peluang menang dan rasio imbal hasil:

\`\`\`
f* = W − (1 − W) / R
W = probabilitas menang   R = rasio rata-rata untung : rata-rata rugi
\`\`\`

Contoh: kalau W = 55% dan R = 2, maka f* = 0,55 − 0,45/2 ≈ 0,325 → secara teori 32,5% modal. Angka ini **terlalu agresif** untuk dipakai mentah-mentah.

> **Peringatan penting:** Kelly sangat sensitif terhadap estimasi W dan R yang kamu tebak sendiri — dan estimasi itu hampir selalu over-optimistis. Kelly penuh juga menghasilkan ayunan ekuitas yang brutal. Praktisi yang memakainya umumnya pakai **fractional Kelly** (mis. seperempat atau setengah dari f*). Untuk mayoritas investor ritel, aturan risiko tetap (1-2% per posisi) lebih aman, lebih sederhana, dan tidak bergantung pada tebakan probabilitas. Anggap Kelly sebagai **rambu kewaspadaan** ("jangan over-bet"), bukan resep harga mati.

> **Disclaimer:** Materi ini bersifat edukasi, bukan ajakan membeli atau menjual saham apa pun. Emiten yang disebut hanya ilustrasi alokasi. Persentase dan ukuran posisi bergantung pada profil risiko masing-masing.`,
    },
    {
      slug: "kp-rebalancing-dan-manajemen",
      title: "Rebalancing & Manajemen Portofolio",
      readMinutes: 7,
      summary:
        "Kapan & cara rebalancing, menghindari diworsification, dan peran kas/obligasi/emas sebagai peredam.",
      body: `## Rebalancing & Manajemen Portofolio

Portofolio yang bagus tidak dibangun sekali lalu ditinggal. Seiring harga bergerak, bobot tiap posisi bergeser dari rencana awal — saham yang naik kencang membengkak, yang turun mengecil. **Rebalancing** adalah proses mengembalikan bobot ke target.

### Kenapa rebalancing penting

Tanpa rebalancing, portofolio "core-satellite 65/25/10" bisa diam-diam berubah jadi "50/45/5" setelah satelit melonjak — risikomu naik tanpa kamu sadari. Rebalancing memaksamu **menjual sebagian yang sudah mahal dan menambah yang relatif murah** — disiplin yang melawan emosi FOMO dan panik.

### Dua metode rebalancing

| Metode | Cara | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| **Kalender** | Cek & sesuaikan pada interval tetap (mis. tiap kuartal / semester) | Sederhana, terjadwal, tak butuh pantau terus | Bisa "telat" merespons pergeseran besar di antara jadwal |
| **Threshold (ambang)** | Rebalance hanya saat bobot menyimpang melebihi batas (mis. ±5% dari target) | Responsif, transaksi hanya saat perlu | Butuh pemantauan lebih sering |

Banyak investor menggabungkan keduanya: **cek terjadwal** (mis. tiap kuartal) **tapi hanya eksekusi** kalau penyimpangan melewati ambang. Ini menyeimbangkan disiplin dengan efisiensi biaya.

> Perhatikan **biaya transaksi & pajak** (di IDX ada fee broker dan PPh final penjualan saham). Rebalancing terlalu sering menggerus hasil. Jangan rebalance untuk pergeseran kecil.

### Hindari over-diversifikasi (diworsification)

Lawan dari konsentrasi berlebih adalah **diworsification** — istilah Peter Lynch untuk diversifikasi yang merusak. Gejalanya:

- Punya 30-50 saham sampai tidak sanggup memantau tesis masing-masing.
- Banyak posisi mini yang dampaknya terlalu kecil untuk berarti, tapi cukup banyak untuk membuat hasilmu sekadar meniru indeks — namun dengan biaya & effort lebih tinggi.
- Membeli saham baru hanya "biar tambah variasi", bukan karena tesis yang kuat.

> Untuk ritel, **8-15 saham** yang benar-benar dipahami, tersebar di sektor dengan driver berbeda, umumnya lebih efektif daripada 40 saham yang tidak terpantau. Kalau kamu hanya ingin meniru pasar, ETF/reksa dana indeks justru lebih murah dan efisien.

### Korelasi dengan kas, obligasi & emas sebagai peredam

Karena diversifikasi antar-saham tidak menolong saat **seluruh pasar** jatuh (risiko sistematis), kamu butuh kelas aset yang korelasinya rendah atau negatif terhadap saham:

- **Kas** — korelasi nol, nilainya tidak ikut turun saat pasar anjlok, dan jadi "amunisi" untuk membeli saat harga diskon. Kekurangan: tergerus inflasi kalau menganggur terlalu lama.
- **Obligasi / SBN** — cenderung lebih stabil; sebagian (terutama saat pelarian ke aset aman) bisa naik justru ketika saham turun. Memberi arus kupon.
- **Emas** — sering jadi pelindung saat krisis dan pelemahan rupiah; korelasi terhadap saham kerap rendah. Tapi tidak memberi arus kas dan harganya sendiri bisa volatil.

Mengalokasikan 10-15% ke lapisan peredam ini bisa menurunkan ayunan total portofolio secara berarti, dengan tukar-rugi imbal hasil jangka panjang yang relatif kecil. Porsinya tergantung horizon dan toleransi risikomu.

### Evaluasi berkala — checklist

Saat jadwal review tiba, tanyakan:

1. Apakah **tesis** tiap posisi masih berlaku? (Bukan sekadar harganya naik/turun.)
2. Apakah ada **konsentrasi sektor** yang menumpuk diam-diam?
3. Apakah bobot core / satelit / peredam masih sesuai target?
4. Apakah ada posisi yang fundamentalnya rusak permanen — perlu dipotong, bukan di-DCA?
5. Apakah total risiko terbuka masih dalam batas nyaman?

> **Disclaimer:** Materi ini bersifat edukasi, bukan ajakan membeli atau menjual saham, obligasi, emas, atau instrumen apa pun. Frekuensi rebalancing, jumlah posisi, dan porsi peredam yang ideal bergantung pada profil risiko, horizon, dan tujuan masing-masing investor.`,
    },
  ],
};
