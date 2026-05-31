import type { TryoutPackage } from "../types";

/**
 * Paket 10 — Try Out WMI.
 * SOAL LATIHAN ORISINAL berdasarkan SILABUS resmi WMI (Wakil Manajer
 * Investasi). Bukan salinan soal ujian asli yang berhak cipta.
 */
export const paket10: TryoutPackage = {
  slug: "wmi-paket-10",
  number: 10,
  title: "Try Out WMI — Paket 10",
  description:
    "Latihan lintas domain silabus WMI: HPR & geometric mean, YTM vs current yield, jenis reksa dana, risiko sistematis, rasio ROA/DER, lembaga penunjang & IPO.",
  durationMinutes: 30,
  questions: [
    {
      id: "p10-q01",
      domain: "ekonomi_keuangan",
      question:
        "Saham dibeli Rp2.000, dibagikan dividen Rp100, dan dijual Rp2.200. Berapa holding period return-nya?",
      options: ["10%", "12%", "15%", "20%"],
      correctIndex: 2,
      explanation:
        "HPR = (capital gain + dividen) / harga beli = ((2.200 − 2.000) + 100) / 2.000 = 300 / 2.000 = 15%.",
    },
    {
      id: "p10-q02",
      domain: "produk_investasi",
      question:
        "Perbedaan utama obligasi korporasi dibanding obligasi pemerintah dari sisi risiko umumnya adalah...",
      options: [
        "Obligasi korporasi bebas risiko gagal bayar",
        "Obligasi korporasi memiliki risiko kredit lebih tinggi sehingga menawarkan yield lebih tinggi",
        "Obligasi pemerintah selalu memberi yield lebih tinggi",
        "Keduanya memiliki risiko yang identik",
      ],
      correctIndex: 1,
      explanation:
        "Obligasi korporasi umumnya memiliki risiko kredit (gagal bayar) lebih tinggi dibanding obligasi pemerintah, sehingga sebagai kompensasi menawarkan yield yang lebih tinggi.",
    },
    {
      id: "p10-q03",
      domain: "reksa_dana",
      question:
        "Reksa dana yang unit penyertaannya tidak dapat dijual kembali kepada manajer investasi setiap saat, melainkan diperdagangkan di bursa, adalah...",
      options: [
        "Reksa dana terbuka",
        "Reksa dana tertutup",
        "Reksa dana pasar uang",
        "Reksa dana indeks",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana tertutup tidak menerima pelunasan unit setiap saat; unit penyertaannya diperjualbelikan antar-investor melalui bursa efek.",
    },
    {
      id: "p10-q04",
      domain: "manajemen_portofolio",
      question:
        "Risiko sistematis dalam suatu portofolio memiliki karakteristik...",
      options: [
        "Dapat dihilangkan sepenuhnya melalui diversifikasi",
        "Tidak dapat dihilangkan melalui diversifikasi karena melekat pada pasar secara keseluruhan",
        "Hanya memengaruhi satu perusahaan",
        "Selalu bernilai nol",
      ],
      correctIndex: 1,
      explanation:
        "Risiko sistematis (risiko pasar) tidak dapat dihilangkan dengan diversifikasi karena memengaruhi seluruh pasar; hanya risiko tidak sistematis yang dapat didiversifikasi.",
    },
    {
      id: "p10-q05",
      domain: "analisis_efek",
      question: "Rasio Return on Assets (ROA) digunakan untuk mengukur...",
      options: [
        "Efisiensi perusahaan menghasilkan laba dari total asetnya",
        "Kemampuan membayar utang jangka pendek",
        "Proporsi utang terhadap modal",
        "Tingkat dividen per saham",
      ],
      correctIndex: 0,
      explanation:
        "ROA = laba bersih / total aset, mengukur seberapa efisien perusahaan menggunakan asetnya untuk menghasilkan laba.",
    },
    {
      id: "p10-q06",
      domain: "etika_regulasi",
      question:
        "Seorang manajer investasi yang menggunakan dana nasabah untuk kepentingan pribadinya melanggar prinsip...",
      options: [
        "Integritas dan fiduciary duty",
        "Diversifikasi",
        "Likuiditas",
        "Hedging",
      ],
      correctIndex: 0,
      explanation:
        "Menggunakan dana nasabah untuk kepentingan pribadi melanggar integritas profesi dan fiduciary duty yang mewajibkan mendahulukan kepentingan nasabah.",
    },
    {
      id: "p10-q07",
      domain: "ekonomi_keuangan",
      question:
        "Mengapa geometric mean return selalu lebih kecil atau sama dengan arithmetic mean return untuk serangkaian return yang berfluktuasi?",
      options: [
        "Karena geometric mean mengabaikan return negatif",
        "Karena efek pemajemukan dan volatilitas menurunkan rata-rata majemuk",
        "Karena arithmetic mean menghitung biaya transaksi",
        "Karena keduanya selalu sama persis",
      ],
      correctIndex: 1,
      explanation:
        "Akibat efek pemajemukan dan volatilitas return, geometric mean selalu ≤ arithmetic mean; selisihnya membesar seiring meningkatnya volatilitas.",
    },
    {
      id: "p10-q08",
      domain: "produk_investasi",
      question:
        "Yield to maturity (YTM) suatu obligasi berbeda dari current yield karena YTM juga memperhitungkan...",
      options: [
        "Hanya kupon tahunan",
        "Capital gain atau loss hingga jatuh tempo dan nilai waktu uang",
        "Tingkat inflasi masa depan",
        "Biaya pengelolaan reksa dana",
      ],
      correctIndex: 1,
      explanation:
        "YTM memperhitungkan seluruh arus kas kupon ditambah selisih harga beli terhadap nilai pelunasan saat jatuh tempo, serta nilai waktu uang—tidak hanya kupon seperti current yield.",
    },
    {
      id: "p10-q09",
      domain: "reksa_dana",
      question:
        "Pihak independen yang menghitung dan mengumumkan Nilai Aktiva Bersih (NAB) reksa dana setiap hari bursa adalah...",
      options: [
        "Manajer investasi",
        "Bank kustodian",
        "Bursa efek",
        "Agen penjual reksa dana",
      ],
      correctIndex: 1,
      explanation:
        "Bank kustodian secara independen menghitung dan mengumumkan NAB reksa dana setiap hari bursa, terpisah dari manajer investasi yang mengelola portofolio.",
    },
    {
      id: "p10-q10",
      domain: "manajemen_portofolio",
      question:
        "Tindakan menyesuaikan kembali komposisi portofolio agar sesuai dengan alokasi target awal disebut...",
      options: ["Rebalancing", "Underwriting", "Short selling", "Settlement"],
      correctIndex: 0,
      explanation:
        "Rebalancing adalah penyesuaian kembali bobot aset dalam portofolio ke alokasi target setelah pergerakan pasar mengubah proporsinya.",
    },
    {
      id: "p10-q11",
      domain: "analisis_efek",
      question: "Analisis sektoral bertujuan untuk...",
      options: [
        "Mengukur kerahasiaan data nasabah",
        "Mengidentifikasi sektor industri yang prospektif untuk dijadikan fokus investasi",
        "Menghitung NAB reksa dana",
        "Menentukan jadwal settlement",
      ],
      correctIndex: 1,
      explanation:
        "Analisis sektoral mengevaluasi prospek berbagai sektor industri untuk menentukan sektor yang paling menarik sebagai fokus investasi.",
    },
    {
      id: "p10-q12",
      domain: "etika_regulasi",
      question:
        "Dalam penawaran umum, pihak yang mewakili dan melindungi kepentingan pemegang obligasi adalah...",
      options: [
        "Penjamin emisi",
        "Wali amanat",
        "Lembaga pemeringkat",
        "Bank kustodian",
      ],
      correctIndex: 1,
      explanation:
        "Wali amanat adalah lembaga penunjang pasar modal yang mewakili dan melindungi kepentingan pemegang efek bersifat utang (obligasi).",
    },
    {
      id: "p10-q13",
      domain: "ekonomi_keuangan",
      question:
        "Jika deviasi standar return sebuah aset semakin besar, hal ini berarti...",
      options: [
        "Return aset semakin stabil",
        "Risiko atau volatilitas aset semakin tinggi",
        "Return aset dijamin lebih tinggi",
        "Korelasi dengan pasar menjadi nol",
      ],
      correctIndex: 1,
      explanation:
        "Deviasi standar yang lebih besar menunjukkan penyebaran return yang lebih lebar di sekitar rata-rata, artinya risiko (volatilitas) aset lebih tinggi.",
    },
    {
      id: "p10-q14",
      domain: "reksa_dana",
      question:
        "Manfaat reksa dana dari sisi kemudahan bagi investor ritel antara lain...",
      options: [
        "Investor harus menganalisis dan memilih setiap saham sendiri",
        "Pengelolaan dilakukan manajer investasi profesional sehingga investor tidak perlu memantau pasar setiap saat",
        "Investor wajib menjadi anggota bursa",
        "Investor menanggung seluruh biaya operasional emiten",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana memberi kemudahan karena dikelola manajer investasi profesional, sehingga investor ritel tidak perlu memantau dan mengelola portofolio sendiri secara aktif.",
    },
    {
      id: "p10-q15",
      domain: "analisis_efek",
      question:
        "Dalam proses IPO, lembaga penunjang yang menilai kelayakan dan kewajaran laporan keuangan emiten adalah...",
      options: ["Akuntan publik", "Notaris", "Wali amanat", "Penilai"],
      correctIndex: 0,
      explanation:
        "Akuntan publik mengaudit dan memberi opini atas kewajaran laporan keuangan emiten sebagai bagian dari proses uji tuntas (due diligence) menjelang IPO.",
    },
  ],
};
