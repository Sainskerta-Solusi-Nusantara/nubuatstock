import type { TryoutPackage } from "../types";

export const paket04: TryoutPackage = {
  slug: "wmi-paket-04",
  number: 4,
  title: "Try Out WMI — Paket 4",
  description:
    "Latihan soal pilihan ganda orisinal mencakup enam domain materi ujian Wakil Manajer Investasi untuk menguji pemahaman menyeluruh.",
  durationMinutes: 30,
  questions: [
    {
      id: "p04-q01",
      domain: "ekonomi_keuangan",
      question:
        "Ketika nilai tukar Rupiah melemah terhadap Dolar AS (depresiasi), dampak yang umum terjadi adalah?",
      options: [
        "Harga barang impor menjadi lebih murah",
        "Daya saing produk ekspor cenderung meningkat",
        "Beban utang luar negeri dalam Rupiah berkurang",
        "Inflasi impor cenderung menurun",
      ],
      correctIndex: 1,
      explanation:
        "Depresiasi Rupiah membuat produk ekspor relatif lebih murah bagi pembeli asing sehingga daya saing ekspor meningkat, namun barang impor menjadi lebih mahal dan beban utang valas membengkak.",
    },
    {
      id: "p04-q02",
      domain: "ekonomi_keuangan",
      question:
        "Sebuah investasi memberikan return 8% pada saat inflasi 3%. Berapa kira-kira return riilnya dengan pendekatan sederhana?",
      options: ["3%", "5%", "8%", "11%"],
      correctIndex: 1,
      explanation:
        "Return riil ≈ return nominal − inflasi = 8% − 3% = 5%.",
    },
    {
      id: "p04-q03",
      domain: "produk_investasi",
      question:
        "Yield to maturity (YTM) sebuah obligasi mencerminkan?",
      options: [
        "Hanya tingkat kupon tahunan obligasi",
        "Total tingkat pengembalian jika obligasi ditahan hingga jatuh tempo, memperhitungkan kupon dan selisih harga",
        "Selisih harga beli dengan nilai nominal saja",
        "Imbal hasil dividen saham penerbit",
      ],
      correctIndex: 1,
      explanation:
        "YTM adalah tingkat imbal hasil total yang diperoleh investor bila obligasi dipegang sampai jatuh tempo, memperhitungkan pembayaran kupon, nilai pelunasan pokok, dan selisih harga beli terhadap nominal.",
    },
    {
      id: "p04-q04",
      domain: "produk_investasi",
      question:
        "Konveksitas (convexity) pada obligasi menjelaskan bahwa?",
      options: [
        "Hubungan harga dan yield obligasi berbentuk garis lurus sempurna",
        "Hubungan harga dan yield obligasi melengkung, sehingga durasi saja kurang akurat untuk perubahan yield besar",
        "Obligasi tidak pernah berubah harga",
        "Kupon obligasi selalu naik seiring waktu",
      ],
      correctIndex: 1,
      explanation:
        "Konveksitas menangkap kelengkungan hubungan harga-yield obligasi. Durasi memperkirakan perubahan harga secara linear; konveksitas mengoreksinya agar lebih akurat ketika perubahan yield cukup besar.",
    },
    {
      id: "p04-q05",
      domain: "produk_investasi",
      question:
        "Sukuk (efek syariah) berbeda dari obligasi konvensional karena sukuk?",
      options: [
        "Memberikan bunga tetap (riba) kepada pemegang",
        "Mencerminkan kepemilikan atas aset/manfaat dan memberi imbal hasil sesuai akad syariah",
        "Tidak memiliki underlying asset",
        "Hanya boleh diterbitkan oleh pemerintah asing",
      ],
      correctIndex: 1,
      explanation:
        "Sukuk merupakan efek syariah yang mencerminkan penyertaan kepemilikan atas aset atau manfaat (underlying asset) dan memberikan imbal hasil berdasarkan akad syariah, bukan bunga (riba).",
    },
    {
      id: "p04-q06",
      domain: "reksa_dana",
      question:
        "Reksa dana terproteksi (capital protected fund) memiliki ciri utama?",
      options: [
        "Menjamin keuntungan dalam jumlah pasti setiap tahun",
        "Memberikan proteksi atas nilai pokok investasi pada saat jatuh tempo melalui pengelolaan portofolio tertentu",
        "Seluruh dana ditempatkan pada saham agresif",
        "Dapat dicairkan kapan saja tanpa konsekuensi pada proteksi",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana terproteksi dirancang melindungi nilai pokok investasi pada saat jatuh tempo, umumnya dengan menempatkan sebagian besar dana pada efek utang yang jatuh tempo sesuai jangka waktu proteksi.",
    },
    {
      id: "p04-q07",
      domain: "reksa_dana",
      question:
        "Reksa dana campuran (balanced fund) dicirikan oleh?",
      options: [
        "Wajib 100% pada obligasi pemerintah",
        "Komposisi efek saham, utang, dan/atau pasar uang yang masing-masing tidak melebihi 79%",
        "Hanya boleh berisi instrumen pasar uang",
        "Selalu berisi 50% emas dan 50% saham",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana campuran mengalokasikan dana pada kombinasi efek ekuitas, utang, dan/atau pasar uang dengan masing-masing porsi tidak mencapai batas jenis reksa dana spesifik (tidak melebihi 79%).",
    },
    {
      id: "p04-q08",
      domain: "reksa_dana",
      question:
        "Imbal hasil yang diperoleh investor reksa dana saham terutama berasal dari?",
      options: [
        "Bunga tetap yang dijamin Manajer Investasi",
        "Kenaikan NAB per unit akibat apresiasi harga saham dalam portofolio",
        "Kupon obligasi pemerintah",
        "Premi asuransi jiwa",
      ],
      correctIndex: 1,
      explanation:
        "Keuntungan investor reksa dana saham terutama berasal dari kenaikan NAB per unit yang terjadi ketika nilai saham dalam portofolio terapresiasi (serta dividen yang diterima portofolio).",
    },
    {
      id: "p04-q09",
      domain: "manajemen_portofolio",
      question:
        "Rasio Treynor mengukur kelebihan return portofolio per unit?",
      options: [
        "Deviasi standar (risiko total)",
        "Beta (risiko sistematis)",
        "Biaya transaksi",
        "Jumlah aset dalam portofolio",
      ],
      correctIndex: 1,
      explanation:
        "Rasio Treynor = (return portofolio − return bebas risiko) / beta portofolio, yaitu imbal hasil berlebih per unit risiko sistematis. Berbeda dari Sharpe yang memakai deviasi standar.",
    },
    {
      id: "p04-q10",
      domain: "manajemen_portofolio",
      question:
        "Strategi alokasi aset strategis (strategic asset allocation) pada dasarnya adalah?",
      options: [
        "Menentukan bauran aset jangka panjang sesuai tujuan dan profil risiko investor",
        "Membeli dan menjual saham harian mengikuti rumor pasar",
        "Menempatkan seluruh dana pada satu emiten favorit",
        "Mengubah portofolio setiap jam mengikuti berita",
      ],
      correctIndex: 0,
      explanation:
        "Alokasi aset strategis menetapkan proporsi jangka panjang antar kelas aset (mis. saham, obligasi, pasar uang) yang sesuai dengan tujuan investasi dan toleransi risiko, lalu di-rebalance secara berkala.",
    },
    {
      id: "p04-q11",
      domain: "manajemen_portofolio",
      question:
        "Garis pasar modal (Capital Market Line/CML) menghubungkan aset bebas risiko dengan?",
      options: [
        "Portofolio pasar yang efisien",
        "Saham dengan beta tertinggi",
        "Obligasi gagal bayar",
        "Aset dengan korelasi positif sempurna",
      ],
      correctIndex: 0,
      explanation:
        "CML adalah garis yang menghubungkan aset bebas risiko dengan portofolio pasar yang efisien, menggambarkan kombinasi risiko-return optimal bagi portofolio yang terdiversifikasi sempurna.",
    },
    {
      id: "p04-q12",
      domain: "analisis_efek",
      question:
        "Rasio Price to Book Value (PBV) membandingkan?",
      options: [
        "Harga pasar saham terhadap nilai buku ekuitas per saham",
        "Laba bersih terhadap total aset",
        "Dividen terhadap harga saham",
        "Utang terhadap ekuitas",
      ],
      correctIndex: 0,
      explanation:
        "PBV = harga pasar per saham / nilai buku ekuitas per saham. Rasio ini menunjukkan berapa kali pasar menghargai saham dibanding nilai buku ekuitasnya.",
    },
    {
      id: "p04-q13",
      domain: "analisis_efek",
      question:
        "Indikator Moving Average dalam analisis teknikal digunakan terutama untuk?",
      options: [
        "Mengukur nilai buku perusahaan",
        "Memuluskan data harga sehingga arah tren lebih mudah dikenali",
        "Menghitung dividen yang dibagikan",
        "Menentukan tarif pajak transaksi",
      ],
      correctIndex: 1,
      explanation:
        "Moving Average (rata-rata bergerak) memuluskan fluktuasi harga jangka pendek sehingga arah tren menjadi lebih jelas dan dapat dipakai sebagai sinyal pada perpotongan garis.",
    },
    {
      id: "p04-q14",
      domain: "etika_regulasi",
      question:
        "Perbuatan menciptakan gambaran semu atas perdagangan, harga, atau likuiditas suatu efek agar pihak lain terpengaruh untuk bertransaksi disebut?",
      options: [
        "Diversifikasi",
        "Manipulasi pasar",
        "Hedging",
        "Rebalancing",
      ],
      correctIndex: 1,
      explanation:
        "Manipulasi pasar adalah tindakan menciptakan gambaran semu atau menyesatkan mengenai perdagangan, harga, atau likuiditas efek; perbuatan ini dilarang oleh UU No.8 Tahun 1995 tentang Pasar Modal.",
    },
    {
      id: "p04-q15",
      domain: "etika_regulasi",
      question:
        "Salah satu kewajiban Manajer Investasi terkait kode etik dalam mengelola dana nasabah adalah?",
      options: [
        "Mendahulukan kepentingan pribadi di atas kepentingan nasabah",
        "Bertindak untuk kepentingan terbaik nasabah serta menghindari benturan kepentingan",
        "Menjanjikan imbal hasil pasti kepada nasabah",
        "Menggabungkan dana nasabah dengan rekening pribadi",
      ],
      correctIndex: 1,
      explanation:
        "Manajer Investasi wajib menjunjung integritas dan profesionalisme, bertindak demi kepentingan terbaik nasabah (fiduciary duty), serta menghindari benturan kepentingan; menjanjikan imbal hasil pasti dilarang.",
    },
  ],
};

export default paket04;
