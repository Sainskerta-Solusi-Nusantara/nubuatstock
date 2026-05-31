import type { TryoutPackage } from "../types";

/**
 * Paket 09 — Try Out WMI.
 * SOAL LATIHAN ORISINAL berdasarkan SILABUS resmi WMI (Wakil Manajer
 * Investasi). Bukan salinan soal ujian asli yang berhak cipta.
 */
export const paket09: TryoutPackage = {
  slug: "wmi-paket-09",
  number: 9,
  title: "Try Out WMI — Paket 9",
  description:
    "Latihan lintas domain silabus WMI: perhitungan return, kovarians & korelasi, sukuk vs obligasi, NAB & unit, rasio keuangan, IPO, dan etika profesi.",
  durationMinutes: 30,
  questions: [
    {
      id: "p09-q01",
      domain: "ekonomi_keuangan",
      question:
        "Sebuah investasi menghasilkan return 6% untuk periode 6 bulan. Berapa kira-kira return tahunannya jika disetahunkan secara sederhana (annualized)?",
      options: ["3%", "6%", "12%", "36%"],
      correctIndex: 2,
      explanation:
        "Annualized sederhana = return periode × jumlah periode dalam setahun = 6% × 2 = 12%.",
    },
    {
      id: "p09-q02",
      domain: "produk_investasi",
      question:
        "Obligasi yang diterbitkan dengan tingkat kupon lebih tinggi dari yield pasar saat ini akan diperdagangkan...",
      options: [
        "At par",
        "Premium (di atas nilai nominal)",
        "Discount (di bawah nilai nominal)",
        "Selalu pada harga nol",
      ],
      correctIndex: 1,
      explanation:
        "Bila kupon lebih tinggi dari yield pasar, obligasi menjadi lebih menarik sehingga harganya naik di atas nilai nominal (premium).",
    },
    {
      id: "p09-q03",
      domain: "reksa_dana",
      question:
        "Seorang investor membeli unit penyertaan saat NAB per unit Rp1.000 sebesar Rp10.000.000. Berapa unit penyertaan yang diperolehnya (abaikan biaya)?",
      options: ["1.000 unit", "10.000 unit", "100.000 unit", "1.000.000 unit"],
      correctIndex: 1,
      explanation:
        "Jumlah unit = dana investasi / NAB per unit = Rp10.000.000 / Rp1.000 = 10.000 unit.",
    },
    {
      id: "p09-q04",
      domain: "manajemen_portofolio",
      question:
        "Kovarians yang bernilai positif antara dua aset menunjukkan bahwa...",
      options: [
        "Kedua aset cenderung bergerak ke arah yang sama",
        "Kedua aset bergerak berlawanan arah",
        "Kedua aset tidak berhubungan sama sekali",
        "Salah satu aset bebas risiko",
      ],
      correctIndex: 0,
      explanation:
        "Kovarians positif berarti return kedua aset cenderung bergerak searah; nilai negatif menunjukkan pergerakan berlawanan.",
    },
    {
      id: "p09-q05",
      domain: "analisis_efek",
      question:
        "Rasio Debt to Equity Ratio (DER) yang tinggi mengindikasikan bahwa perusahaan...",
      options: [
        "Memiliki sedikit utang relatif terhadap modal",
        "Banyak dibiayai oleh utang relatif terhadap ekuitas",
        "Tidak memiliki utang sama sekali",
        "Memiliki likuiditas yang sangat baik",
      ],
      correctIndex: 1,
      explanation:
        "DER = total utang / total ekuitas. DER tinggi berarti struktur pendanaan perusahaan banyak bersandar pada utang, yang menambah risiko keuangan.",
    },
    {
      id: "p09-q06",
      domain: "etika_regulasi",
      question:
        "Praktik mendorong harga saham naik dengan menyebar rumor positif lalu menjualnya di harga tinggi sehingga merugikan investor lain dikenal sebagai...",
      options: [
        "Pump-and-dump",
        "Dollar cost averaging",
        "Stop loss",
        "Rebalancing",
      ],
      correctIndex: 0,
      explanation:
        "Pump-and-dump adalah skema manipulasi pasar dengan menggelembungkan harga melalui informasi menyesatkan, lalu menjual di puncak harga. Praktik ini dilarang.",
    },
    {
      id: "p09-q07",
      domain: "ekonomi_keuangan",
      question:
        "Geometric mean return umumnya lebih tepat dibanding arithmetic mean untuk mengukur...",
      options: [
        "Return rata-rata satu periode tunggal",
        "Tingkat pertumbuhan majemuk (compounded) investasi sepanjang beberapa periode",
        "Tingkat inflasi tahunan",
        "Besarnya dividen",
      ],
      correctIndex: 1,
      explanation:
        "Geometric mean memperhitungkan efek pemajemukan (compounding) sehingga lebih akurat untuk menggambarkan pertumbuhan investasi selama beberapa periode.",
    },
    {
      id: "p09-q08",
      domain: "produk_investasi",
      question:
        "Perbedaan utama antara sukuk dan obligasi konvensional adalah...",
      options: [
        "Sukuk memberikan bunga tetap seperti deposito",
        "Sukuk berbasis prinsip syariah dan didasari aset/akad, bukan bunga",
        "Sukuk hanya boleh diterbitkan pemerintah",
        "Sukuk tidak memiliki jatuh tempo",
      ],
      correctIndex: 1,
      explanation:
        "Sukuk diterbitkan berdasarkan prinsip syariah dengan dasar aset atau akad tertentu dan memberikan imbal hasil (bagi hasil/ujrah), bukan bunga seperti obligasi konvensional.",
    },
    {
      id: "p09-q09",
      domain: "reksa_dana",
      question:
        "Risiko yang timbul ketika nilai aset dalam portofolio reksa dana turun akibat pergerakan pasar disebut...",
      options: [
        "Risiko pasar",
        "Risiko operasional",
        "Risiko kepatuhan",
        "Risiko reputasi",
      ],
      correctIndex: 0,
      explanation:
        "Risiko pasar adalah risiko penurunan NAB akibat perubahan harga efek di pasar (saham, obligasi) yang menjadi portofolio reksa dana.",
    },
    {
      id: "p09-q10",
      domain: "manajemen_portofolio",
      question: "Deviasi standar portofolio digunakan untuk mengukur...",
      options: [
        "Return yang dijamin portofolio",
        "Total risiko (volatilitas) portofolio",
        "Jumlah aset dalam portofolio",
        "Biaya transaksi portofolio",
      ],
      correctIndex: 1,
      explanation:
        "Deviasi standar mengukur total risiko atau volatilitas return portofolio di sekitar nilai rata-ratanya.",
    },
    {
      id: "p09-q11",
      domain: "analisis_efek",
      question:
        "Pendekatan analisis yang memulai dari pemilihan saham individu berdasarkan fundamentalnya tanpa terlalu memperhatikan kondisi makro lebih dulu disebut...",
      options: [
        "Top-down",
        "Bottom-up",
        "Analisis teknikal",
        "Analisis sektoral",
      ],
      correctIndex: 1,
      explanation:
        "Pendekatan bottom-up berfokus pada pemilihan saham individu berdasarkan fundamental perusahaan, dengan kondisi makro sebagai pertimbangan sekunder.",
    },
    {
      id: "p09-q12",
      domain: "etika_regulasi",
      question:
        "Kewajiban menjaga kerahasiaan data dan transaksi nasabah oleh manajer investasi merupakan bagian dari...",
      options: [
        "Standar profesi dan etika dalam menjaga kerahasiaan nasabah",
        "Strategi pemasaran produk",
        "Kewajiban membayar pajak",
        "Mekanisme settlement",
      ],
      correctIndex: 0,
      explanation:
        "Menjaga kerahasiaan informasi nasabah adalah bagian dari standar profesi dan etika; pelanggaran dapat menimbulkan sanksi serta merusak kepercayaan.",
    },
    {
      id: "p09-q13",
      domain: "ekonomi_keuangan",
      question:
        "Koefisien korelasi antara dua aset selalu berada pada rentang...",
      options: [
        "0 sampai 1",
        "−1 sampai +1",
        "−100 sampai +100",
        "Tidak terbatas",
      ],
      correctIndex: 1,
      explanation:
        "Koefisien korelasi dinormalisasi sehingga selalu berada di rentang −1 (berlawanan sempurna) hingga +1 (searah sempurna).",
    },
    {
      id: "p09-q14",
      domain: "reksa_dana",
      question:
        "NAB total sebuah reksa dana adalah Rp50 miliar dengan 40 juta unit penyertaan beredar. Berapa NAB per unitnya?",
      options: ["Rp1.000", "Rp1.250", "Rp1.500", "Rp2.000"],
      correctIndex: 1,
      explanation:
        "NAB per unit = NAB total / jumlah unit = Rp50.000.000.000 / 40.000.000 = Rp1.250.",
    },
    {
      id: "p09-q15",
      domain: "analisis_efek",
      question:
        "Dalam proses penawaran umum perdana (IPO), pihak yang membantu emiten menyiapkan dan menjamin penjualan efek kepada publik adalah...",
      options: [
        "Bank kustodian",
        "Penjamin emisi efek (underwriter)",
        "Wali amanat",
        "Lembaga pemeringkat",
      ],
      correctIndex: 1,
      explanation:
        "Penjamin emisi efek (underwriter) membantu emiten dalam proses IPO, termasuk penentuan harga dan penjaminan penjualan efek kepada investor.",
    },
  ],
};
