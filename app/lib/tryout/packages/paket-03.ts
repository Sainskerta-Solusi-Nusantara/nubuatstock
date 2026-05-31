import type { TryoutPackage } from "../types";

export const paket03: TryoutPackage = {
  slug: "wmi-paket-03",
  number: 3,
  title: "Try Out WMI — Paket 3",
  description:
    "Latihan soal pilihan ganda orisinal bertema enam domain materi ujian Wakil Manajer Investasi dengan tingkat kesulitan menengah.",
  durationMinutes: 30,
  questions: [
    {
      id: "p03-q01",
      domain: "ekonomi_keuangan",
      question:
        "Jika Anda menabung Rp1.000.000 hari ini pada bunga majemuk 10% per tahun, berapa nilainya pada akhir tahun kedua?",
      options: ["Rp1.100.000", "Rp1.200.000", "Rp1.210.000", "Rp1.331.000"],
      correctIndex: 2,
      explanation:
        "FV = PV × (1 + r)^n = 1.000.000 × (1,10)^2 = 1.000.000 × 1,21 = Rp1.210.000.",
    },
    {
      id: "p03-q02",
      domain: "ekonomi_keuangan",
      question:
        "Kebijakan fiskal ekspansif yang dijalankan pemerintah umumnya berbentuk?",
      options: [
        "Menaikkan pajak dan memangkas belanja negara",
        "Menaikkan suku bunga acuan",
        "Menaikkan belanja negara dan/atau menurunkan pajak",
        "Menjual surat berharga negara ke pasar terbuka",
      ],
      correctIndex: 2,
      explanation:
        "Kebijakan fiskal ekspansif bertujuan mendorong permintaan agregat melalui peningkatan belanja pemerintah dan/atau penurunan pajak. Mengatur suku bunga dan operasi pasar terbuka adalah ranah kebijakan moneter.",
    },
    {
      id: "p03-q03",
      domain: "produk_investasi",
      question:
        "Durasi (duration) sebuah obligasi terutama menggambarkan?",
      options: [
        "Jumlah kupon yang akan dibayar sampai jatuh tempo",
        "Sensitivitas harga obligasi terhadap perubahan suku bunga",
        "Peringkat kredit penerbit obligasi",
        "Selisih antara harga beli dan harga jual obligasi",
      ],
      correctIndex: 1,
      explanation:
        "Durasi mengukur sensitivitas harga obligasi terhadap perubahan tingkat suku bunga; semakin panjang durasi, semakin besar perubahan harga ketika suku bunga bergerak.",
    },
    {
      id: "p03-q04",
      domain: "produk_investasi",
      question:
        "Ketika suku bunga pasar naik, harga obligasi dengan kupon tetap yang sudah beredar cenderung?",
      options: [
        "Naik",
        "Turun",
        "Tetap tidak berubah",
        "Naik lalu langsung jatuh tempo",
      ],
      correctIndex: 1,
      explanation:
        "Harga obligasi berhubungan terbalik dengan suku bunga. Saat suku bunga pasar naik, obligasi lama berkupon tetap menjadi kurang menarik sehingga harganya turun.",
    },
    {
      id: "p03-q05",
      domain: "produk_investasi",
      question:
        "Kontrak berjangka (futures) berbeda dari kontrak opsi karena pada futures?",
      options: [
        "Pembeli hanya memiliki hak, bukan kewajiban, untuk bertransaksi",
        "Kedua pihak wajib memenuhi kontrak pada saat jatuh tempo",
        "Tidak ada penyelesaian harga sama sekali",
        "Selalu diselesaikan secara fisik, tidak pernah tunai",
      ],
      correctIndex: 1,
      explanation:
        "Pada kontrak futures, kedua belah pihak terikat kewajiban untuk membeli/menjual aset dasar pada harga dan tanggal yang disepakati, sedangkan pada opsi pembeli hanya memiliki hak.",
    },
    {
      id: "p03-q06",
      domain: "reksa_dana",
      question:
        "Reksa dana pasar uang memiliki karakteristik?",
      options: [
        "Berinvestasi pada saham untuk imbal hasil tinggi jangka panjang",
        "Berinvestasi pada efek pasar uang dan/atau utang jatuh tempo ≤ 1 tahun, risiko relatif rendah",
        "Wajib menempatkan minimal 80% pada saham",
        "Tidak boleh dicairkan sebelum lima tahun",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana pasar uang menempatkan seluruh dananya pada instrumen pasar uang dan/atau efek utang dengan sisa jatuh tempo tidak lebih dari satu tahun, sehingga risikonya relatif rendah dan likuiditasnya tinggi.",
    },
    {
      id: "p03-q07",
      domain: "reksa_dana",
      question:
        "Biaya yang dibebankan kepada investor saat membeli unit penyertaan reksa dana umumnya disebut?",
      options: [
        "Subscription fee (biaya pembelian)",
        "Redemption fee (biaya penjualan kembali)",
        "Management fee (biaya pengelolaan)",
        "Custodian fee (biaya kustodian)",
      ],
      correctIndex: 0,
      explanation:
        "Subscription fee adalah biaya pembelian yang dikenakan saat investor membeli unit penyertaan. Redemption fee dikenakan saat penjualan kembali, sementara management dan custodian fee dibebankan ke aset reksa dana.",
    },
    {
      id: "p03-q08",
      domain: "reksa_dana",
      question:
        "Manakah pernyataan yang benar mengenai Exchange Traded Fund (ETF)?",
      options: [
        "ETF tidak dapat diperdagangkan di bursa efek",
        "ETF adalah reksa dana yang unitnya diperdagangkan di bursa seperti saham",
        "ETF menjamin imbal hasil tetap kepada investor",
        "ETF hanya boleh dibeli melalui Manajer Investasi secara langsung",
      ],
      correctIndex: 1,
      explanation:
        "ETF (Exchange Traded Fund) adalah reksa dana berbentuk KIK yang unit penyertaannya dicatatkan dan diperdagangkan di bursa efek layaknya saham, sehingga harganya bergerak sepanjang jam perdagangan.",
    },
    {
      id: "p03-q09",
      domain: "manajemen_portofolio",
      question:
        "Risiko yang dapat dihilangkan melalui diversifikasi disebut?",
      options: [
        "Risiko sistematis (risiko pasar)",
        "Risiko tidak sistematis (risiko spesifik)",
        "Risiko suku bunga",
        "Risiko inflasi",
      ],
      correctIndex: 1,
      explanation:
        "Risiko tidak sistematis (spesifik perusahaan/industri) dapat dikurangi atau dihilangkan dengan diversifikasi. Risiko sistematis (pasar) tidak dapat dihilangkan melalui diversifikasi.",
    },
    {
      id: "p03-q10",
      domain: "manajemen_portofolio",
      question:
        "Saham dengan beta sama dengan 1,0 berarti?",
      options: [
        "Pergerakannya lebih volatil daripada pasar",
        "Pergerakannya cenderung searah dan sebesar pergerakan pasar",
        "Tidak terpengaruh oleh pergerakan pasar",
        "Bergerak berlawanan arah dengan pasar",
      ],
      correctIndex: 1,
      explanation:
        "Beta 1,0 menunjukkan saham bergerak seiring dengan pasar (jika pasar naik 1%, saham diharapkan naik sekitar 1%). Beta > 1 lebih volatil, beta < 1 kurang volatil.",
    },
    {
      id: "p03-q11",
      domain: "manajemen_portofolio",
      question:
        "Konsep efficient frontier dalam teori portofolio menggambarkan?",
      options: [
        "Kumpulan portofolio dengan return tertinggi pada setiap tingkat risiko tertentu",
        "Portofolio yang seluruhnya berisi aset bebas risiko",
        "Portofolio dengan biaya transaksi paling rendah",
        "Portofolio yang dijamin tidak akan merugi",
      ],
      correctIndex: 0,
      explanation:
        "Efficient frontier adalah himpunan portofolio optimal yang menawarkan imbal hasil ekspektasi tertinggi untuk setiap tingkat risiko, atau risiko terendah untuk setiap tingkat imbal hasil.",
    },
    {
      id: "p03-q12",
      domain: "analisis_efek",
      question:
        "Pendekatan analisis fundamental top-down dimulai dari menganalisis?",
      options: [
        "Laporan keuangan emiten terlebih dahulu",
        "Pola grafik harga saham",
        "Kondisi makroekonomi dan industri sebelum memilih emiten",
        "Volume perdagangan harian",
      ],
      correctIndex: 2,
      explanation:
        "Analisis top-down bergerak dari gambaran besar ke kecil: menilai kondisi makroekonomi, lalu prospek industri/sektor, baru kemudian memilih emiten spesifik yang menarik.",
    },
    {
      id: "p03-q13",
      domain: "analisis_efek",
      question:
        "Menggunakan model diskonto dividen (Gordon Growth), jika dividen tahun depan Rp200, tingkat pertumbuhan dividen 5%, dan tingkat diskonto 10%, berapa nilai wajar saham?",
      options: ["Rp2.000", "Rp4.000", "Rp1.333", "Rp20.000"],
      correctIndex: 1,
      explanation:
        "Harga = D1 / (r − g) = 200 / (0,10 − 0,05) = 200 / 0,05 = Rp4.000.",
    },
    {
      id: "p03-q14",
      domain: "etika_regulasi",
      question:
        "Undang-undang yang menjadi landasan utama pengaturan pasar modal di Indonesia adalah?",
      options: [
        "UU No.8 Tahun 1995 tentang Pasar Modal",
        "UU No.40 Tahun 2007 tentang Perseroan Terbatas",
        "UU No.7 Tahun 1992 tentang Perbankan",
        "UU No.21 Tahun 2011 tentang OJK",
      ],
      correctIndex: 0,
      explanation:
        "UU No.8 Tahun 1995 tentang Pasar Modal adalah dasar hukum utama yang mengatur kegiatan dan pelaku pasar modal di Indonesia.",
    },
    {
      id: "p03-q15",
      domain: "etika_regulasi",
      question:
        "Penerapan prinsip mengenal nasabah (Know Your Customer/KYC) dalam kerangka APU-PPT bertujuan untuk?",
      options: [
        "Meningkatkan komisi perusahaan efek",
        "Mencegah pencucian uang dan pendanaan terorisme dengan mengenali profil nasabah",
        "Menjamin keuntungan investasi nasabah",
        "Mempercepat pencairan dana tanpa verifikasi",
      ],
      correctIndex: 1,
      explanation:
        "KYC dalam rangka APU-PPT (Anti Pencucian Uang dan Pencegahan Pendanaan Terorisme) mewajibkan identifikasi dan verifikasi identitas serta pemantauan transaksi nasabah untuk mencegah penyalahgunaan sistem keuangan.",
    },
  ],
};

export default paket03;
