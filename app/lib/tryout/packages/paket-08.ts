import type { TryoutPackage } from "../types";

/**
 * Paket 08 — Try Out WMI.
 * SOAL LATIHAN ORISINAL berdasarkan SILABUS resmi WMI (Wakil Manajer
 * Investasi). Bukan salinan soal ujian asli yang berhak cipta.
 */
export const paket08: TryoutPackage = {
  slug: "wmi-paket-08",
  number: 8,
  title: "Try Out WMI — Paket 8",
  description:
    "Latihan lintas domain silabus WMI: return & risiko, obligasi, reksa dana, portofolio, analisis efek, serta etika & regulasi pasar modal.",
  durationMinutes: 30,
  questions: [
    {
      id: "p08-q01",
      domain: "ekonomi_keuangan",
      question:
        "Sebuah investasi dibeli seharga Rp1.000.000 dan dijual setahun kemudian seharga Rp1.150.000 tanpa pembagian dividen. Berapa holding period return-nya?",
      options: ["5%", "10%", "15%", "20%"],
      correctIndex: 2,
      explanation:
        "Holding period return = (harga jual − harga beli) / harga beli = (1.150.000 − 1.000.000) / 1.000.000 = 15%.",
    },
    {
      id: "p08-q02",
      domain: "produk_investasi",
      question:
        "Sebuah obligasi memiliki tingkat kupon yang sama persis dengan yield to maturity yang berlaku di pasar. Obligasi tersebut akan diperdagangkan...",
      options: [
        "Di atas nilai nominal (premium)",
        "Di bawah nilai nominal (discount)",
        "Pada nilai nominal (at par)",
        "Tidak dapat ditentukan",
      ],
      correctIndex: 2,
      explanation:
        "Ketika kupon sama dengan YTM, harga obligasi setara dengan nilai nominalnya (at par).",
    },
    {
      id: "p08-q03",
      domain: "reksa_dana",
      question:
        "Atas keuntungan yang diperoleh investor dari reksa dana, secara umum perlakuan perpajakannya di Indonesia adalah...",
      options: [
        "Dikenai PPh final tinggi yang dipotong di setiap transaksi",
        "Bukan merupakan objek pajak bagi investor sehingga relatif efisien secara pajak",
        "Dikenai pajak ganda baik di tingkat reksa dana maupun investor",
        "Dikenai pajak progresif sesuai penghasilan investor",
      ],
      correctIndex: 1,
      explanation:
        "Keuntungan (kenaikan NAB) dari reksa dana bukan objek pajak bagi investor, sehingga reksa dana menjadi instrumen yang relatif efisien secara perpajakan.",
    },
    {
      id: "p08-q04",
      domain: "manajemen_portofolio",
      question:
        "Dua aset memiliki koefisien korelasi −1. Penggabungan keduanya dalam portofolio akan...",
      options: [
        "Tidak memberikan manfaat diversifikasi sama sekali",
        "Memberikan manfaat diversifikasi maksimum dan dapat menghilangkan risiko",
        "Menggandakan risiko portofolio",
        "Membuat return menjadi nol",
      ],
      correctIndex: 1,
      explanation:
        "Korelasi −1 berarti pergerakan kedua aset berlawanan sempurna, sehingga secara teoritis risiko portofolio dapat ditekan hingga nol (manfaat diversifikasi maksimum).",
    },
    {
      id: "p08-q05",
      domain: "analisis_efek",
      question: "Rasio Return on Equity (ROE) dihitung dengan membandingkan...",
      options: [
        "Laba bersih terhadap total aset",
        "Laba bersih terhadap total ekuitas",
        "Laba kotor terhadap penjualan",
        "Total utang terhadap total ekuitas",
      ],
      correctIndex: 1,
      explanation:
        "ROE = laba bersih / total ekuitas, mengukur kemampuan perusahaan menghasilkan laba dari modal pemegang saham.",
    },
    {
      id: "p08-q06",
      domain: "etika_regulasi",
      question:
        "Manajer investasi yang wajib mendahulukan kepentingan nasabah di atas kepentingan pribadinya menjalankan prinsip...",
      options: ["Fiduciary duty", "Diversifikasi", "Arbitrase", "Spekulasi"],
      correctIndex: 0,
      explanation:
        "Fiduciary duty mewajibkan manajer investasi bertindak dengan itikad baik dan mendahulukan kepentingan nasabah di atas kepentingan pribadinya.",
    },
    {
      id: "p08-q07",
      domain: "ekonomi_keuangan",
      question:
        "Sebuah saham memberikan return 10% pada tahun pertama dan 20% pada tahun kedua. Berapa arithmetic mean return tahunannya?",
      options: ["12%", "14,9%", "15%", "30%"],
      correctIndex: 2,
      explanation:
        "Arithmetic mean = (10% + 20%) / 2 = 15%. (Geometric mean akan sedikit lebih rendah, sekitar 14,9%.)",
    },
    {
      id: "p08-q08",
      domain: "produk_investasi",
      question: "Current yield sebuah obligasi dihitung dengan rumus...",
      options: [
        "Kupon tahunan dibagi nilai nominal",
        "Kupon tahunan dibagi harga pasar obligasi",
        "Selisih harga jual dan beli dibagi harga beli",
        "Yield to maturity dikurangi tingkat kupon",
      ],
      correctIndex: 1,
      explanation:
        "Current yield = kupon tahunan / harga pasar obligasi saat ini. Berbeda dengan YTM yang memperhitungkan capital gain/loss hingga jatuh tempo.",
    },
    {
      id: "p08-q09",
      domain: "reksa_dana",
      question:
        "Salah satu risiko utama yang melekat pada reksa dana adalah risiko likuiditas, yang berarti...",
      options: [
        "Risiko NAB selalu turun setiap hari",
        "Risiko manajer investasi gagal membayar kembali pelunasan unit penyertaan tepat waktu",
        "Risiko reksa dana tidak boleh dijual selamanya",
        "Risiko bank kustodian menaikkan biaya",
      ],
      correctIndex: 1,
      explanation:
        "Risiko likuiditas reksa dana muncul ketika manajer investasi kesulitan menyediakan dana untuk pembayaran pelunasan (redemption) unit penyertaan tepat waktu.",
    },
    {
      id: "p08-q10",
      domain: "manajemen_portofolio",
      question:
        "Pendekatan analisis portofolio yang dimulai dari kondisi makroekonomi, lalu sektor, baru ke pemilihan saham individu disebut...",
      options: ["Bottom-up", "Top-down", "Buy and hold", "Contrarian"],
      correctIndex: 1,
      explanation:
        "Pendekatan top-down memulai analisis dari makroekonomi, kemudian sektor industri yang menarik, lalu menentukan saham individu di dalamnya.",
    },
    {
      id: "p08-q11",
      domain: "analisis_efek",
      question:
        "Rasio yang paling tepat untuk mengukur kemampuan perusahaan memenuhi kewajiban jangka pendeknya adalah...",
      options: [
        "Debt to Equity Ratio",
        "Current Ratio",
        "Return on Assets",
        "Price to Book Value",
      ],
      correctIndex: 1,
      explanation:
        "Current ratio (aset lancar / kewajiban lancar) adalah rasio likuiditas yang mengukur kemampuan memenuhi kewajiban jangka pendek.",
    },
    {
      id: "p08-q12",
      domain: "etika_regulasi",
      question:
        "Dalam penerapan APU-PPT (Anti Pencucian Uang dan Pencegahan Pendanaan Terorisme), kewajiban mengenali profil dan sumber dana calon nasabah dikenal sebagai...",
      options: [
        "Customer Due Diligence",
        "Rebalancing",
        "Short selling",
        "Window dressing",
      ],
      correctIndex: 0,
      explanation:
        "Customer Due Diligence (CDD) mewajibkan penyedia jasa keuangan mengidentifikasi dan memverifikasi identitas serta sumber dana nasabah sesuai ketentuan APU-PPT.",
    },
    {
      id: "p08-q13",
      domain: "ekonomi_keuangan",
      question: "Varians dari return suatu aset pada dasarnya mengukur...",
      options: [
        "Rata-rata return aset",
        "Penyebaran return di sekitar rata-ratanya (volatilitas)",
        "Korelasi dengan aset lain",
        "Tingkat dividen yang dibayarkan",
      ],
      correctIndex: 1,
      explanation:
        "Varians mengukur seberapa besar penyebaran return di sekitar nilai rata-ratanya; akar dari varians adalah deviasi standar (ukuran risiko/volatilitas).",
    },
    {
      id: "p08-q14",
      domain: "reksa_dana",
      question:
        "Salah satu manfaat utama reksa dana bagi investor ritel adalah...",
      options: [
        "Menjamin keuntungan pasti setiap tahun",
        "Diversifikasi dan pengelolaan profesional dengan modal relatif kecil",
        "Bebas dari segala bentuk risiko",
        "Tidak memerlukan bank kustodian",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana memungkinkan investor ritel memperoleh diversifikasi portofolio dan pengelolaan oleh manajer investasi profesional meski dengan modal kecil.",
    },
    {
      id: "p08-q15",
      domain: "analisis_efek",
      question:
        "Mekanisme penyelesaian transaksi (settlement) saham di Bursa Efek Indonesia saat ini umumnya menggunakan siklus...",
      options: ["T+0", "T+1", "T+2", "T+5"],
      correctIndex: 2,
      explanation:
        "Penyelesaian transaksi saham di BEI menggunakan siklus T+2, yaitu dua hari bursa setelah tanggal transaksi.",
    },
  ],
};
