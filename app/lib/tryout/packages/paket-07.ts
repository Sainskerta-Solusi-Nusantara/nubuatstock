import type { TryoutPackage } from "../types";

/**
 * Paket 07 — Try Out WMI (soal latihan berbasis silabus, BUKAN soal ujian resmi).
 * 15 soal, mencakup 6 domain silabus. Fokus: harga vs suku bunga & fallen angel,
 * two-stage DDM & EV/EBITDA, reksa dana syariah & prospektus, rebalancing & korelasi & CML,
 * keterbatasan VaR & risiko likuiditas, fase pemulihan & defisit transaksi berjalan,
 * suitability & POJK bank kustodian.
 */
export const paket07: TryoutPackage = {
  slug: "wmi-paket-07",
  number: 7,
  title: "Try Out WMI — Paket 7",
  description:
    "Latihan lintas domain WMI: hubungan harga-suku bunga & fallen angel, two-stage DDM & EV/EBITDA, reksa dana syariah & prospektus, rebalancing-korelasi-CML, keterbatasan VaR & risiko likuiditas, siklus bisnis & defisit transaksi berjalan, prinsip suitability serta POJK bank kustodian.",
  durationMinutes: 30,
  questions: [
    {
      id: "p07-q01",
      domain: "analisis_efek",
      question:
        "Hubungan antara harga obligasi berkupon tetap dan tingkat suku bunga pasar adalah...",
      options: [
        "Searah: harga naik ketika suku bunga naik",
        "Berlawanan arah: harga turun ketika suku bunga naik, dan sebaliknya",
        "Tidak ada hubungan sama sekali",
        "Selalu proporsional satu banding satu",
      ],
      correctIndex: 1,
      explanation:
        "Karena arus kas obligasi kupon tetap, kenaikan suku bunga pasar membuat nilai sekarang arus kas turun sehingga harga obligasi turun, dan sebaliknya—hubungan terbalik.",
    },
    {
      id: "p07-q02",
      domain: "analisis_efek",
      question:
        "Obligasi yang mengalami penurunan peringkat dari kategori 'investment grade' ke 'non-investment grade' (di bawah idBBB-) sering disebut...",
      options: ["Blue chip bond", "Fallen angel", "Zero coupon bond", "Callable bond"],
      correctIndex: 1,
      explanation:
        "Fallen angel adalah obligasi yang semula berperingkat layak investasi namun kemudian diturunkan ke kategori non-investment grade (high yield/spekulatif) akibat memburuknya kondisi penerbit.",
    },
    {
      id: "p07-q03",
      domain: "analisis_efek",
      question:
        "Dalam two-stage DDM, tahap pertama (high growth) menggunakan tingkat pertumbuhan tinggi, sedangkan tahap kedua (terminal) mengasumsikan...",
      options: [
        "Pertumbuhan dividen yang stabil dan berkelanjutan (lebih rendah dari tahap pertama)",
        "Dividen berhenti dibayarkan selamanya",
        "Pertumbuhan dividen meningkat tanpa batas",
        "Tingkat diskonto menjadi nol",
      ],
      correctIndex: 0,
      explanation:
        "Model dua tahap mengasumsikan periode pertumbuhan tinggi diikuti pertumbuhan stabil jangka panjang (terminal) yang lebih rendah dan berkelanjutan, lazimnya dihitung dengan Gordon Growth pada tahap terminal.",
    },
    {
      id: "p07-q04",
      domain: "analisis_efek",
      question:
        "Perusahaan memiliki EBITDA Rp500 miliar dan Enterprise Value Rp4.000 miliar. Rasio EV/EBITDA-nya adalah...",
      options: ["12,5x", "8,0x", "0,125x", "20,0x"],
      correctIndex: 1,
      explanation:
        "EV/EBITDA = 4.000 / 500 = 8,0x. Rasio ini menunjukkan berapa kali EBITDA dibayar untuk menilai keseluruhan perusahaan.",
    },
    {
      id: "p07-q05",
      domain: "reksa_dana",
      question:
        "Pada reksa dana syariah, fungsi Dewan Pengawas Syariah (DPS) adalah...",
      options: [
        "Menentukan besarnya imbal hasil yang dijamin kepada pemodal",
        "Mengawasi kesesuaian pengelolaan reksa dana dengan prinsip syariah, termasuk proses cleansing/pembersihan pendapatan non-halal",
        "Menggantikan peran Manajer Investasi dalam memilih efek",
        "Menetapkan harga subscription dan redemption harian",
      ],
      correctIndex: 1,
      explanation:
        "DPS bertugas mengawasi agar pengelolaan reksa dana syariah sesuai prinsip syariah, termasuk seleksi efek syariah dan proses pembersihan (cleansing) atas pendapatan yang tidak sesuai syariah.",
    },
    {
      id: "p07-q06",
      domain: "reksa_dana",
      question:
        "Prospektus reksa dana berperan utama sebagai dokumen yang...",
      options: [
        "Menjamin pemodal pasti memperoleh keuntungan",
        "Memuat seluruh informasi material—tujuan investasi, kebijakan investasi, risiko, biaya, dan hak pemodal—sebagai dasar keputusan investasi",
        "Hanya berisi laporan keuangan Manajer Investasi",
        "Mengatur jadwal pembagian dividen perusahaan publik",
      ],
      correctIndex: 1,
      explanation:
        "Prospektus adalah dokumen pengungkapan resmi yang memuat informasi material reksa dana (tujuan, kebijakan dan risiko investasi, biaya, tata cara transaksi, hak pemodal) sebagai dasar pengambilan keputusan investor.",
    },
    {
      id: "p07-q07",
      domain: "manajemen_portofolio",
      question:
        "Rebalancing portofolio secara berkala dilakukan terutama untuk...",
      options: [
        "Mengembalikan bobot aset ke alokasi target/strategis setelah pergerakan harga menggesernya",
        "Menjamin keuntungan tetap setiap bulan",
        "Menghindari kewajiban pelaporan kepada nasabah",
        "Menghapus seluruh risiko sistematis dari portofolio",
      ],
      correctIndex: 0,
      explanation:
        "Rebalancing menjual aset yang bobotnya melebihi target dan membeli yang di bawah target, mengembalikan portofolio ke alokasi strategis sesuai profil risiko, sekaligus menerapkan disiplin beli rendah-jual tinggi.",
    },
    {
      id: "p07-q08",
      domain: "manajemen_portofolio",
      question:
        "Dua saham masing-masing berisiko (deviasi standar) tinggi. Manfaat diversifikasi paling besar diperoleh bila koefisien korelasi keduanya...",
      options: [
        "Mendekati +1",
        "Mendekati −1",
        "Tepat 0 dan tidak bisa lebih rendah",
        "Tidak relevan terhadap diversifikasi",
      ],
      correctIndex: 1,
      explanation:
        "Semakin rendah (mendekati −1) korelasi antaraset, semakin besar pengurangan risiko portofolio; pada korelasi −1 secara teoretis risiko dapat ditekan paling minimal melalui pembobotan yang tepat.",
    },
    {
      id: "p07-q09",
      domain: "manajemen_portofolio",
      question:
        "Garis Pasar Modal (Capital Market Line) berawal dari titik...",
      options: [
        "Tingkat imbal hasil aset bebas risiko (risk-free rate) pada sumbu imbal hasil",
        "Titik nol mutlak (0,0)",
        "Beta sama dengan 1",
        "Titik portofolio dengan risiko tertinggi",
      ],
      correctIndex: 0,
      explanation:
        "CML bermula dari titik imbal hasil aset bebas risiko (risiko = 0) dan menyinggung efficient frontier di portofolio pasar, menggambarkan kombinasi optimal aset bebas risiko dan portofolio pasar.",
    },
    {
      id: "p07-q10",
      domain: "produk_investasi",
      question:
        "Keterbatasan utama Value at Risk (VaR) sebagai alat ukur risiko adalah...",
      options: [
        "Selalu melebih-lebihkan kerugian yang akan terjadi",
        "Tidak menginformasikan besarnya kerugian yang dapat terjadi di luar tingkat keyakinan (tail risk)",
        "Hanya bisa dihitung untuk obligasi pemerintah",
        "Tidak memerlukan asumsi atau data historis apa pun",
      ],
      correctIndex: 1,
      explanation:
        "VaR hanya menyatakan ambang kerugian pada tingkat keyakinan tertentu, tetapi tidak menggambarkan seberapa besar kerugian yang bisa terjadi pada skenario ekstrem di luar ambang tersebut (tail risk).",
    },
    {
      id: "p07-q11",
      domain: "produk_investasi",
      question:
        "Risiko likuiditas (liquidity risk) dalam pengelolaan portofolio mengacu pada...",
      options: [
        "Risiko bahwa suku bunga pasar akan berubah",
        "Risiko kesulitan menjual aset dengan cepat tanpa menurunkan harga secara signifikan",
        "Risiko gagal bayar oleh penerbit obligasi",
        "Risiko perubahan nilai tukar mata uang",
      ],
      correctIndex: 1,
      explanation:
        "Risiko likuiditas adalah risiko aset tidak dapat dijual cukup cepat pada harga wajar; aset kurang likuid memerlukan diskon harga untuk dijual segera.",
    },
    {
      id: "p07-q12",
      domain: "ekonomi_keuangan",
      question:
        "Pada fase pemulihan (recovery/expansion) siklus bisnis, indikator yang umumnya terjadi adalah...",
      options: [
        "Pengangguran meningkat dan output menurun",
        "Aktivitas ekonomi, output, dan kesempatan kerja meningkat secara bertahap",
        "Deflasi yang berkepanjangan dan kredit macet total",
        "Suku bunga acuan dinaikkan tajam untuk meredam resesi",
      ],
      correctIndex: 1,
      explanation:
        "Fase pemulihan/ekspansi ditandai meningkatnya output, konsumsi, investasi, dan kesempatan kerja seiring perekonomian bangkit dari titik terendah (trough).",
    },
    {
      id: "p07-q13",
      domain: "ekonomi_keuangan",
      question:
        "Defisit transaksi berjalan (current account deficit) yang besar dan persisten dapat berdampak pada...",
      options: [
        "Penguatan nilai tukar mata uang domestik secara otomatis",
        "Tekanan terhadap nilai tukar (pelemahan) mata uang domestik dan kebutuhan pembiayaan dari arus modal asing",
        "Kenaikan cadangan devisa secara langsung",
        "Penurunan inflasi yang dijamin",
      ],
      correctIndex: 1,
      explanation:
        "Defisit transaksi berjalan berarti impor barang/jasa dan pembayaran ke luar melebihi penerimaan, sehingga menekan nilai tukar dan menuntut pembiayaan melalui arus modal/investasi asing.",
    },
    {
      id: "p07-q14",
      domain: "etika_regulasi",
      question:
        "Sebelum merekomendasikan produk investasi, prinsip suitability mewajibkan Wakil Manajer Investasi untuk...",
      options: [
        "Menawarkan produk dengan komisi tertinggi terlebih dahulu",
        "Menilai profil risiko, tujuan, dan kemampuan finansial nasabah agar produk yang ditawarkan sesuai",
        "Mengikuti hanya keinginan jangka pendek nasabah tanpa analisis",
        "Menjamin imbal hasil tertentu kepada nasabah",
      ],
      correctIndex: 1,
      explanation:
        "Prinsip suitability menuntut profiling risiko, tujuan, dan kapasitas finansial nasabah sehingga produk yang direkomendasikan benar-benar sesuai kebutuhan dan toleransi risikonya.",
    },
    {
      id: "p07-q15",
      domain: "etika_regulasi",
      question:
        "Dalam pengelolaan reksa dana yang diatur POJK, dana milik pemodal wajib disimpan dan diadministrasikan oleh...",
      options: [
        "Manajer Investasi pada rekening operasionalnya sendiri",
        "Bank Kustodian, terpisah dari kekayaan Manajer Investasi",
        "Agen penjual efek reksa dana",
        "Otoritas Jasa Keuangan secara langsung",
      ],
      correctIndex: 1,
      explanation:
        "POJK reksa dana mewajibkan kekayaan reksa dana disimpan dan diadministrasikan oleh Bank Kustodian secara terpisah dari aset Manajer Investasi, demi melindungi dana pemodal dan mencegah penyalahgunaan.",
    },
  ],
};
