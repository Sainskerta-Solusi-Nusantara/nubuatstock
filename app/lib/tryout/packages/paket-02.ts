import type { TryoutPackage } from "../types";

export const paket02: TryoutPackage = {
  slug: "wmi-paket-02",
  number: 2,
  title: "Try Out WMI — Paket 2",
  description:
    "Latihan soal pilihan ganda orisinal yang menelaah enam domain materi ujian Wakil Manajer Investasi sesuai silabus resmi.",
  durationMinutes: 30,
  questions: [
    {
      id: "p02-q01",
      domain: "ekonomi_keuangan",
      question:
        "Bank sentral menaikkan suku bunga acuan untuk meredam inflasi. Dampak yang paling mungkin terjadi pada perekonomian dalam jangka pendek adalah?",
      options: [
        "Konsumsi dan investasi cenderung meningkat",
        "Biaya pinjaman naik sehingga permintaan agregat cenderung menurun",
        "Nilai tukar mata uang domestik cenderung melemah tajam",
        "Inflasi langsung naik karena biaya bunga ditanggung konsumen",
      ],
      correctIndex: 1,
      explanation:
        "Kebijakan moneter kontraktif menaikkan suku bunga sehingga biaya pinjaman naik, konsumsi dan investasi melambat, dan permintaan agregat menurun sehingga tekanan inflasi mereda.",
    },
    {
      id: "p02-q02",
      domain: "ekonomi_keuangan",
      question:
        "Berapa nilai sekarang (present value) dari Rp1.100.000 yang akan diterima satu tahun lagi jika tingkat diskonto 10% per tahun?",
      options: ["Rp1.000.000", "Rp1.100.000", "Rp990.000", "Rp1.210.000"],
      correctIndex: 0,
      explanation:
        "PV = FV / (1 + r) = 1.100.000 / 1,10 = Rp1.000.000.",
    },
    {
      id: "p02-q03",
      domain: "etika_regulasi",
      question:
        "Lembaga yang berfungsi sebagai Lembaga Penyimpanan dan Penyelesaian (kustodian sentral) di pasar modal Indonesia adalah?",
      options: ["BEI", "KPEI", "KSEI", "OJK"],
      correctIndex: 2,
      explanation:
        "KSEI (Kustodian Sentral Efek Indonesia) adalah Lembaga Penyimpanan dan Penyelesaian. BEI menyelenggarakan perdagangan, KPEI sebagai lembaga kliring dan penjaminan, dan OJK sebagai pengawas.",
    },
    {
      id: "p02-q04",
      domain: "produk_investasi",
      question:
        "Sebuah obligasi memiliki nilai nominal Rp1.000.000 dan kupon tahunan Rp80.000. Jika harga pasar obligasi tersebut Rp1.000.000, berapa current yield-nya?",
      options: ["6%", "7%", "8%", "10%"],
      correctIndex: 2,
      explanation:
        "Current yield = kupon tahunan / harga pasar = 80.000 / 1.000.000 = 8%. Saat harga sama dengan nominal, current yield sama dengan tingkat kupon.",
    },
    {
      id: "p02-q05",
      domain: "produk_investasi",
      question:
        "Karakteristik utama saham preferen dibandingkan saham biasa adalah?",
      options: [
        "Memiliki hak suara penuh dalam RUPS",
        "Dividennya mengambang mengikuti laba perusahaan tanpa prioritas",
        "Mendapat prioritas atas dividen dan klaim aset saat likuidasi dibanding saham biasa",
        "Selalu dapat dikonversi menjadi obligasi kapan saja",
      ],
      correctIndex: 2,
      explanation:
        "Saham preferen umumnya tidak punya hak suara, tetapi memperoleh prioritas pembayaran dividen (sering tetap) dan klaim aset saat likuidasi lebih dahulu daripada pemegang saham biasa.",
    },
    {
      id: "p02-q06",
      domain: "produk_investasi",
      question:
        "Waran (warrant) yang diterbitkan emiten memberi pemegangnya hak untuk?",
      options: [
        "Menjual saham emiten pada harga tertentu sebelum jatuh tempo",
        "Membeli saham emiten pada harga pelaksanaan tertentu dalam periode tertentu",
        "Menerima bunga tetap sampai waran jatuh tempo",
        "Menukar waran dengan obligasi pemerintah",
      ],
      correctIndex: 1,
      explanation:
        "Waran adalah efek yang memberi pemegangnya hak (bukan kewajiban) untuk membeli saham baru emiten pada harga pelaksanaan (exercise price) selama periode tertentu.",
    },
    {
      id: "p02-q07",
      domain: "reksa_dana",
      question:
        "Nilai Aktiva Bersih (NAB) per unit penyertaan suatu reksa dana dihitung dengan cara?",
      options: [
        "Total aset bersih reksa dana dibagi jumlah unit penyertaan yang beredar",
        "Total kupon obligasi dibagi jumlah investor",
        "Harga beli awal dikalikan jumlah unit penyertaan",
        "Total laba reksa dana dibagi nilai pasar saham",
      ],
      correctIndex: 0,
      explanation:
        "NAB per unit = (total nilai aset reksa dana − kewajiban) / jumlah unit penyertaan yang beredar. Inilah harga acuan saat investor membeli/menjual unit.",
    },
    {
      id: "p02-q08",
      domain: "reksa_dana",
      question:
        "Reksa dana yang menempatkan minimal 80% portofolionya pada efek bersifat utang termasuk jenis?",
      options: [
        "Reksa dana pasar uang",
        "Reksa dana saham",
        "Reksa dana pendapatan tetap",
        "Reksa dana campuran",
      ],
      correctIndex: 2,
      explanation:
        "Reksa dana pendapatan tetap wajib menempatkan sekurang-kurangnya 80% aktivanya pada efek bersifat utang seperti obligasi.",
    },
    {
      id: "p02-q09",
      domain: "reksa_dana",
      question:
        "Dalam struktur reksa dana berbentuk Kontrak Investasi Kolektif (KIK), pihak yang menyimpan dan mengadministrasikan kekayaan reksa dana adalah?",
      options: [
        "Manajer Investasi",
        "Bank Kustodian",
        "Otoritas Jasa Keuangan",
        "Agen Penjual Efek Reksa Dana",
      ],
      correctIndex: 1,
      explanation:
        "Dalam KIK, Manajer Investasi mengelola portofolio, sedangkan Bank Kustodian bertugas menyimpan, menjaga, dan mengadministrasikan kekayaan reksa dana secara terpisah.",
    },
    {
      id: "p02-q10",
      domain: "manajemen_portofolio",
      question:
        "Diversifikasi portofolio paling efektif menurunkan risiko ketika aset-aset yang dikombinasikan memiliki?",
      options: [
        "Korelasi positif sempurna (+1)",
        "Korelasi rendah atau negatif satu sama lain",
        "Tingkat pengembalian yang identik",
        "Volatilitas yang sama persis",
      ],
      correctIndex: 1,
      explanation:
        "Manfaat diversifikasi maksimal saat aset berkorelasi rendah atau negatif, karena pergerakan harga yang tidak searah saling meredam fluktuasi sehingga risiko total portofolio turun.",
    },
    {
      id: "p02-q11",
      domain: "manajemen_portofolio",
      question:
        "Menurut CAPM, jika tingkat bebas risiko 5%, return pasar yang diharapkan 12%, dan beta saham 1,5, berapa tingkat pengembalian yang diharapkan untuk saham tersebut?",
      options: ["12,0%", "15,5%", "17,0%", "18,0%"],
      correctIndex: 1,
      explanation:
        "E(R) = Rf + β(Rm − Rf) = 5% + 1,5 × (12% − 5%) = 5% + 1,5 × 7% = 5% + 10,5% = 15,5%.",
    },
    {
      id: "p02-q12",
      domain: "manajemen_portofolio",
      question:
        "Rasio Sharpe digunakan untuk mengukur?",
      options: [
        "Kelebihan return portofolio per unit risiko total (deviasi standar)",
        "Kelebihan return portofolio per unit risiko sistematis (beta)",
        "Total dividen yang dibagikan portofolio",
        "Tingkat perputaran (turnover) portofolio",
      ],
      correctIndex: 0,
      explanation:
        "Rasio Sharpe = (return portofolio − return bebas risiko) / deviasi standar portofolio, yaitu imbal hasil berlebih per unit risiko total. Treynor yang memakai beta (risiko sistematis).",
    },
    {
      id: "p02-q13",
      domain: "analisis_efek",
      question:
        "Sebuah saham memiliki harga pasar Rp5.000 dan laba per saham (EPS) Rp500. Berapa Price Earning Ratio (PER) saham tersebut?",
      options: ["5 kali", "10 kali", "0,1 kali", "50 kali"],
      correctIndex: 1,
      explanation:
        "PER = harga pasar per saham / EPS = 5.000 / 500 = 10 kali.",
    },
    {
      id: "p02-q14",
      domain: "analisis_efek",
      question:
        "Dalam analisis teknikal, garis support diartikan sebagai?",
      options: [
        "Tingkat harga di mana tekanan jual diperkirakan menahan kenaikan harga",
        "Tingkat harga di mana tekanan beli diperkirakan menahan penurunan harga",
        "Rata-rata laba bersih emiten selama lima tahun",
        "Selisih harga tertinggi dan terendah dalam satu hari",
      ],
      correctIndex: 1,
      explanation:
        "Support adalah level harga di mana minat beli cukup kuat sehingga cenderung menahan penurunan harga lebih lanjut; kebalikannya adalah resistance.",
    },
    {
      id: "p02-q15",
      domain: "etika_regulasi",
      question:
        "Tindakan seseorang yang melakukan transaksi efek berdasarkan informasi material yang belum tersedia bagi publik (orang dalam) dikenal sebagai?",
      options: [
        "Manipulasi pasar",
        "Insider trading (perdagangan orang dalam)",
        "Front running yang sah",
        "Stabilisasi harga",
      ],
      correctIndex: 1,
      explanation:
        "Insider trading adalah perdagangan efek oleh orang dalam menggunakan informasi material yang belum dipublikasikan; tindakan ini dilarang oleh UU No.8 Tahun 1995 tentang Pasar Modal.",
    },
  ],
};

export default paket02;
