import type { TryoutPackage } from "../types";

/**
 * Paket 01 — Try Out WMI (soal latihan berbasis silabus, BUKAN soal ujian resmi).
 * Template acuan untuk paket lain: 15 soal, mencakup 6 domain silabus.
 */
export const paket01: TryoutPackage = {
  slug: "wmi-paket-01",
  number: 1,
  title: "Try Out WMI — Paket 1",
  description: "Latihan menyeluruh lintas domain silabus WMI: ekonomi, produk investasi, reksa dana, portofolio, analisis efek, dan etika-regulasi.",
  durationMinutes: 30,
  questions: [
    {
      id: "p01-q01",
      domain: "ekonomi_keuangan",
      question:
        "Bank sentral menaikkan suku bunga acuan untuk meredam inflasi. Dampak paling umum terhadap harga obligasi yang sudah beredar adalah...",
      options: ["Harga obligasi naik", "Harga obligasi turun", "Harga obligasi tetap", "Kupon obligasi otomatis naik"],
      correctIndex: 1,
      explanation:
        "Harga obligasi bergerak berlawanan arah dengan suku bunga. Saat suku bunga acuan naik, yield yang diminta pasar naik sehingga harga obligasi lama (berkupon tetap) turun agar yield-nya setara dengan obligasi baru.",
    },
    {
      id: "p01-q02",
      domain: "ekonomi_keuangan",
      question: "Indikator yang paling tepat mengukur tingkat pertumbuhan ekonomi suatu negara adalah...",
      options: ["Inflasi (CPI)", "Produk Domestik Bruto (PDB) riil", "Nilai tukar mata uang", "Indeks Harga Saham Gabungan"],
      correctIndex: 1,
      explanation:
        "PDB riil mengukur nilai seluruh barang & jasa yang diproduksi (disesuaikan inflasi), sehingga menjadi ukuran utama pertumbuhan ekonomi. CPI mengukur inflasi, bukan pertumbuhan.",
    },
    {
      id: "p01-q03",
      domain: "produk_investasi",
      question: "Efek yang memberikan hak kepada pemegangnya untuk membeli saham pada harga tertentu dalam periode tertentu disebut...",
      options: ["Obligasi konversi", "Waran", "Right issue", "Medium Term Notes"],
      correctIndex: 1,
      explanation:
        "Waran adalah efek yang memberi hak (bukan kewajiban) membeli saham pada harga pelaksanaan (exercise price) dalam jangka waktu tertentu. Right issue adalah hak memesan efek terlebih dahulu bagi pemegang saham lama.",
    },
    {
      id: "p01-q04",
      domain: "produk_investasi",
      question: "Di pasar modal Indonesia, lembaga yang menyelenggarakan perdagangan efek adalah...",
      options: ["Otoritas Jasa Keuangan (OJK)", "Bursa Efek Indonesia (BEI)", "Kustodian Sentral Efek Indonesia (KSEI)", "Kliring Penjaminan Efek Indonesia (KPEI)"],
      correctIndex: 1,
      explanation:
        "BEI adalah Self-Regulatory Organization (SRO) yang menyelenggarakan & menyediakan sistem perdagangan efek. OJK adalah pengawas; KSEI kustodian sentral; KPEI lembaga kliring & penjaminan.",
    },
    {
      id: "p01-q05",
      domain: "reksa_dana",
      question: "Nilai Aktiva Bersih (NAB) per unit penyertaan reksa dana dihitung dengan cara...",
      options: [
        "Total aset dikurangi kewajiban, dibagi jumlah unit penyertaan beredar",
        "Total aset dibagi jumlah investor",
        "Harga pasar saham dalam portofolio dikali jumlah unit",
        "Total dana kelolaan dikali biaya manajemen",
      ],
      correctIndex: 0,
      explanation:
        "NAB/unit = (total nilai aset reksa dana − kewajiban) ÷ jumlah unit penyertaan yang beredar. Ini mencerminkan nilai wajar tiap unit pada hari bursa tersebut.",
    },
    {
      id: "p01-q06",
      domain: "reksa_dana",
      question: "Jenis reksa dana yang wajib menempatkan minimal 80% dananya pada efek bersifat utang adalah...",
      options: ["Reksa dana pasar uang", "Reksa dana pendapatan tetap", "Reksa dana saham", "Reksa dana campuran"],
      correctIndex: 1,
      explanation:
        "Reksa dana pendapatan tetap wajib menempatkan minimal 80% NAB pada efek bersifat utang (obligasi). Reksa dana saham minimal 80% pada saham; pasar uang 100% pada instrumen jatuh tempo ≤1 tahun.",
    },
    {
      id: "p01-q07",
      domain: "manajemen_portofolio",
      question: "Manfaat utama diversifikasi dalam pembentukan portofolio adalah...",
      options: [
        "Menghilangkan seluruh risiko investasi",
        "Mengurangi risiko tidak sistematis (unsystematic risk)",
        "Meningkatkan return tanpa menambah risiko sama sekali",
        "Menghilangkan risiko pasar (systematic risk)",
      ],
      correctIndex: 1,
      explanation:
        "Diversifikasi mengurangi risiko tidak sistematis (spesifik perusahaan/sektor), namun TIDAK dapat menghilangkan risiko sistematis/pasar yang melekat pada seluruh pasar.",
    },
    {
      id: "p01-q08",
      domain: "manajemen_portofolio",
      question: "Dalam Capital Asset Pricing Model (CAPM), beta (β) mengukur...",
      options: [
        "Risiko total suatu aset",
        "Sensitivitas return aset terhadap pergerakan return pasar",
        "Tingkat pengembalian bebas risiko",
        "Risiko tidak sistematis aset",
      ],
      correctIndex: 1,
      explanation:
        "Beta mengukur risiko sistematis — yaitu seberapa sensitif return suatu aset terhadap pergerakan pasar. β>1 lebih volatil dari pasar, β<1 lebih stabil.",
    },
    {
      id: "p01-q09",
      domain: "analisis_efek",
      question: "Rasio Price to Earnings Ratio (PER) yang tinggi pada suatu saham umumnya mengindikasikan...",
      options: [
        "Saham pasti murah (undervalued)",
        "Ekspektasi pertumbuhan laba tinggi atau valuasi yang mahal",
        "Perusahaan pasti merugi",
        "Dividen yang dibayarkan besar",
      ],
      correctIndex: 1,
      explanation:
        "PER tinggi berarti investor bersedia membayar mahal per rupiah laba — bisa karena ekspektasi pertumbuhan laba tinggi, atau karena saham sedang overvalued. Perlu dibandingkan dengan peer & pertumbuhannya.",
    },
    {
      id: "p01-q10",
      domain: "analisis_efek",
      question: "Pendekatan valuasi obligasi pada dasarnya adalah...",
      options: [
        "Menjumlahkan seluruh kupon nominal tanpa diskonto",
        "Nilai kini (present value) dari arus kas kupon dan nilai pokok",
        "Harga pasar saham emiten dikali rasio utang",
        "Rata-rata harga obligasi sejenis di pasar",
      ],
      correctIndex: 1,
      explanation:
        "Nilai wajar obligasi = present value seluruh arus kas masa depan (kupon periodik + pelunasan pokok), didiskonto dengan yield/tingkat diskonto yang sesuai.",
    },
    {
      id: "p01-q11",
      domain: "etika_regulasi",
      question: "Undang-Undang yang menjadi dasar hukum pasar modal di Indonesia adalah...",
      options: ["UU No. 8 Tahun 1995 tentang Pasar Modal", "UU No. 40 Tahun 2007 tentang Perseroan Terbatas", "UU No. 21 Tahun 2011 tentang OJK", "UU No. 7 Tahun 1992 tentang Perbankan"],
      correctIndex: 0,
      explanation:
        "UU No. 8 Tahun 1995 tentang Pasar Modal adalah dasar hukum utama (kemudian disempurnakan a.l. oleh UU P2SK No. 4/2023). UU 21/2011 mengatur OJK sebagai pengawas.",
    },
    {
      id: "p01-q12",
      domain: "etika_regulasi",
      question: "Tindakan memperdagangkan efek berdasarkan informasi material yang belum tersedia untuk publik disebut...",
      options: ["Window dressing", "Insider trading", "Short selling", "Margin trading"],
      correctIndex: 1,
      explanation:
        "Insider trading (perdagangan orang dalam) adalah transaksi efek berbasis informasi orang dalam yang material & belum dipublikasikan — dilarang keras oleh UU Pasar Modal karena merugikan investor lain.",
    },
    {
      id: "p01-q13",
      domain: "manajemen_portofolio",
      question: "Sharpe Ratio digunakan untuk mengukur...",
      options: [
        "Return portofolio per unit risiko total (deviasi standar)",
        "Return portofolio per unit risiko sistematis (beta)",
        "Total dividen yang diterima",
        "Korelasi antar aset dalam portofolio",
      ],
      correctIndex: 0,
      explanation:
        "Sharpe Ratio = (return portofolio − risk free) ÷ deviasi standar portofolio. Mengukur excess return per unit risiko TOTAL. (Treynor Ratio memakai beta sebagai pembagi.)",
    },
    {
      id: "p01-q14",
      domain: "produk_investasi",
      question: "Surat Berharga Negara (SBN) yang diterbitkan pemerintah dan ditujukan untuk investor ritel adalah...",
      options: ["SBI (Sertifikat Bank Indonesia)", "ORI (Obligasi Negara Ritel) / SBR", "Commercial Paper", "Negotiable Certificate of Deposit"],
      correctIndex: 1,
      explanation:
        "ORI dan SBR (Savings Bond Ritel) adalah SBN yang ditawarkan khusus ke investor ritel individu WNI. SBI diterbitkan Bank Indonesia untuk instrumen moneter, bukan ritel.",
    },
    {
      id: "p01-q15",
      domain: "ekonomi_keuangan",
      question: "Konsep time value of money menyatakan bahwa...",
      options: [
        "Uang Rp1 juta hari ini bernilai sama dengan Rp1 juta tahun depan",
        "Uang Rp1 juta hari ini lebih bernilai daripada Rp1 juta di masa depan",
        "Nilai uang tidak dipengaruhi waktu maupun bunga",
        "Inflasi tidak relevan dalam penilaian investasi",
      ],
      correctIndex: 1,
      explanation:
        "Time value of money: uang yang dimiliki sekarang lebih bernilai daripada jumlah nominal yang sama di masa depan, karena bisa diinvestasikan untuk menghasilkan return (dan tergerus inflasi bila menunggu).",
    },
  ],
};
