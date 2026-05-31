import type { TryoutPackage } from "../types";

/**
 * Paket 05 — Try Out WMI (soal latihan berbasis silabus, BUKAN soal ujian resmi).
 * 15 soal, mencakup 6 domain silabus. Fokus: obligasi lanjutan, valuasi saham,
 * ETF/reksa dana terproteksi, Markowitz/CML, hedging & VaR, siklus bisnis & BI-Rate,
 * serta etika (mis-selling & benturan kepentingan).
 */
export const paket05: TryoutPackage = {
  slug: "wmi-paket-05",
  number: 5,
  title: "Try Out WMI — Paket 5",
  description:
    "Latihan lintas domain WMI tingkat lanjut: yield & durasi obligasi, DDM Gordon & EV/EBITDA, ETF & reksa dana terproteksi, teori Markowitz & CML, hedging & VaR, siklus bisnis & BI-Rate, serta etika dan benturan kepentingan.",
  durationMinutes: 30,
  questions: [
    {
      id: "p05-q01",
      domain: "analisis_efek",
      question:
        "Yield to maturity (YTM) sebuah obligasi paling tepat didefinisikan sebagai...",
      options: [
        "Tingkat kupon tahunan dibagi nilai nominal obligasi",
        "Tingkat imbal hasil yang menyamakan nilai sekarang seluruh arus kas obligasi dengan harga pasarnya saat ini",
        "Kupon tahunan dibagi harga pasar obligasi saat ini",
        "Selisih harga beli dan harga jual obligasi dalam satu tahun",
      ],
      correctIndex: 1,
      explanation:
        "YTM adalah tingkat diskonto yang membuat nilai sekarang seluruh kupon dan pelunasan pokok sama dengan harga pasar obligasi, dengan asumsi dipegang hingga jatuh tempo dan kupon diinvestasikan ulang pada YTM.",
    },
    {
      id: "p05-q02",
      domain: "analisis_efek",
      question:
        "Durasi modified (modified duration) sebuah obligasi 6,5 tahun. Jika yield naik 0,5%, perkiraan perubahan harga obligasi adalah...",
      options: [
        "Naik sekitar 3,25%",
        "Turun sekitar 3,25%",
        "Turun sekitar 0,5%",
        "Naik sekitar 6,5%",
      ],
      correctIndex: 1,
      explanation:
        "Perubahan harga ≈ −modified duration × Δyield = −6,5 × 0,5% = −3,25%. Karena yield naik, harga turun sekitar 3,25%.",
    },
    {
      id: "p05-q03",
      domain: "analisis_efek",
      question:
        "Peringkat efek (rating) 'idAAA' dari lembaga pemeringkat menunjukkan...",
      options: [
        "Obligasi dengan risiko gagal bayar tertinggi (spekulatif)",
        "Kemampuan terkuat penerbit untuk memenuhi kewajiban finansial jangka panjang",
        "Obligasi yang sudah masuk kategori default",
        "Tingkat kupon tertinggi yang ditawarkan di pasar",
      ],
      correctIndex: 1,
      explanation:
        "Peringkat tertinggi (mis. idAAA) mencerminkan kemampuan penerbit yang paling kuat dalam memenuhi kewajiban finansialnya, sehingga risiko gagal bayar paling rendah.",
    },
    {
      id: "p05-q04",
      domain: "analisis_efek",
      question:
        "Dengan model Dividend Discount Model (Gordon Growth), saham membayar dividen tahun depan Rp200, pertumbuhan dividen 5%, dan tingkat imbal hasil disyaratkan 13%. Nilai wajar saham adalah...",
      options: ["Rp1.538", "Rp2.500", "Rp4.000", "Rp1.667"],
      correctIndex: 1,
      explanation:
        "Gordon: P = D1 / (r − g) = 200 / (0,13 − 0,05) = 200 / 0,08 = Rp2.500.",
    },
    {
      id: "p05-q05",
      domain: "analisis_efek",
      question: "Rasio EV/EBITDA lebih disukai dibanding P/E karena...",
      options: [
        "Selalu menghasilkan nilai lebih kecil daripada P/E",
        "Tidak terpengaruh perbedaan struktur modal dan kebijakan penyusutan/pajak antarperusahaan",
        "Mengabaikan utang perusahaan sehingga lebih sederhana",
        "Hanya dapat digunakan untuk perusahaan tanpa utang",
      ],
      correctIndex: 1,
      explanation:
        "EV mencakup utang dan kas (struktur modal), sedangkan EBITDA berada di atas bunga, pajak, dan penyusutan, sehingga rasio ini lebih netral terhadap perbedaan pendanaan dan akuntansi antarperusahaan.",
    },
    {
      id: "p05-q06",
      domain: "reksa_dana",
      question:
        "Karakteristik utama Exchange Traded Fund (ETF) dibanding reksa dana terbuka konvensional adalah...",
      options: [
        "Unit penyertaannya hanya dapat ditebus langsung ke Manajer Investasi setiap akhir hari",
        "Unit penyertaannya dapat diperjualbelikan di Bursa Efek sepanjang jam perdagangan layaknya saham",
        "Tidak memiliki Nilai Aktiva Bersih (NAB)",
        "Dijamin memberikan imbal hasil tetap kepada pemodal",
      ],
      correctIndex: 1,
      explanation:
        "ETF diperdagangkan di bursa seperti saham sehingga dapat dibeli/dijual sepanjang jam bursa pada harga pasar, berbeda dengan reksa dana terbuka yang transaksinya berdasarkan NAB akhir hari.",
    },
    {
      id: "p05-q07",
      domain: "reksa_dana",
      question: "Reksa dana terproteksi bertujuan utama untuk...",
      options: [
        "Memberikan proteksi atas nilai pokok investasi pada saat jatuh tempo melalui penempatan pada efek bersifat utang",
        "Menjamin keuntungan minimal 20% per tahun",
        "Hanya berinvestasi pada saham unggulan",
        "Membebaskan pemodal dari seluruh biaya pengelolaan",
      ],
      correctIndex: 0,
      explanation:
        "Reksa dana terproteksi menggunakan mekanisme penempatan pada efek utang (umumnya obligasi) yang jatuh temponya disesuaikan agar nilai pokok terlindungi pada saat jatuh tempo; proteksi pokok bukan jaminan imbal hasil.",
    },
    {
      id: "p05-q08",
      domain: "manajemen_portofolio",
      question:
        "Menurut teori portofolio Markowitz, menggabungkan dua aset dengan koefisien korelasi kurang dari +1 akan...",
      options: [
        "Selalu meningkatkan risiko total portofolio",
        "Memberikan manfaat diversifikasi sehingga risiko portofolio lebih kecil dari rata-rata tertimbang risiko masing-masing aset",
        "Tidak memengaruhi risiko portofolio sama sekali",
        "Menghilangkan seluruh risiko pasar (sistematis)",
      ],
      correctIndex: 1,
      explanation:
        "Selama korelasi < +1, diversifikasi menurunkan risiko (deviasi standar) portofolio di bawah rata-rata tertimbang risiko aset individual; risiko sistematis tetap tidak dapat dihilangkan.",
    },
    {
      id: "p05-q09",
      domain: "manajemen_portofolio",
      question:
        "Capital Market Line (CML) menggambarkan hubungan antara imbal hasil yang diharapkan dengan...",
      options: [
        "Beta portofolio",
        "Risiko total (deviasi standar) portofolio efisien yang mengombinasikan aset bebas risiko dan portofolio pasar",
        "Tingkat inflasi yang diharapkan",
        "Rasio utang terhadap ekuitas perusahaan",
      ],
      correctIndex: 1,
      explanation:
        "CML menghubungkan expected return dengan risiko total (deviasi standar) untuk portofolio efisien hasil kombinasi aset bebas risiko dan portofolio pasar; sedangkan SML menggunakan beta.",
    },
    {
      id: "p05-q10",
      domain: "produk_investasi",
      question:
        "Seorang manajer investasi memegang portofolio saham dan ingin melindungi nilainya dari penurunan pasar tanpa menjual sahamnya. Strategi hedging yang tepat adalah...",
      options: [
        "Membeli kontrak put option atas indeks saham",
        "Menjual kontrak put option atas indeks saham",
        "Membeli lebih banyak saham yang sama",
        "Menambah deposito berjangka",
      ],
      correctIndex: 0,
      explanation:
        "Membeli put option (atau menjual futures indeks) memberi perlindungan terhadap penurunan harga: nilai put naik saat pasar turun, mengompensasi kerugian portofolio saham.",
    },
    {
      id: "p05-q11",
      domain: "produk_investasi",
      question: "Value at Risk (VaR) sebuah portofolio mengukur...",
      options: [
        "Keuntungan maksimal yang pasti diperoleh dalam periode tertentu",
        "Estimasi kerugian maksimum yang mungkin terjadi pada tingkat keyakinan tertentu selama horizon waktu tertentu",
        "Rata-rata imbal hasil historis portofolio",
        "Total nilai aset bersih portofolio",
      ],
      correctIndex: 1,
      explanation:
        "VaR menyatakan potensi kerugian maksimum suatu portofolio pada tingkat kepercayaan tertentu (mis. 95%) selama horizon waktu tertentu, namun tidak menggambarkan kerugian di luar tingkat keyakinan tersebut.",
    },
    {
      id: "p05-q12",
      domain: "ekonomi_keuangan",
      question:
        "Pada fase puncak (peak) siklus bisnis, bank sentral umumnya cenderung...",
      options: [
        "Menurunkan suku bunga acuan untuk mendorong pertumbuhan",
        "Menaikkan suku bunga acuan untuk meredam tekanan inflasi",
        "Menghentikan seluruh kebijakan moneter",
        "Mencetak uang sebanyak-banyaknya tanpa batas",
      ],
      correctIndex: 1,
      explanation:
        "Saat ekonomi memuncak dan tekanan inflasi meningkat, bank sentral cenderung memperketat kebijakan moneter dengan menaikkan suku bunga acuan untuk menjaga stabilitas harga.",
    },
    {
      id: "p05-q13",
      domain: "ekonomi_keuangan",
      question:
        "BI-Rate (suku bunga acuan Bank Indonesia) berfungsi terutama sebagai...",
      options: [
        "Patokan tingkat pajak penghasilan",
        "Sinyal kebijakan moneter yang memengaruhi suku bunga pasar uang dan ekspektasi inflasi",
        "Nilai tukar resmi rupiah terhadap dolar AS",
        "Batas atas imbal hasil obligasi pemerintah",
      ],
      correctIndex: 1,
      explanation:
        "BI-Rate adalah suku bunga kebijakan yang ditetapkan Bank Indonesia sebagai sinyal arah kebijakan moneter; perubahannya ditransmisikan ke suku bunga pasar uang, kredit, dan memengaruhi ekspektasi inflasi.",
    },
    {
      id: "p05-q14",
      domain: "etika_regulasi",
      question:
        "Praktik 'mis-selling' produk reksa dana yang harus dihindari Wakil Manajer Investasi adalah...",
      options: [
        "Menjelaskan risiko produk secara lengkap kepada nasabah",
        "Menjual produk yang tidak sesuai dengan profil risiko dan kebutuhan nasabah demi mengejar komisi",
        "Melakukan profiling risiko sebelum menawarkan produk",
        "Memberikan prospektus kepada calon pemodal",
      ],
      correctIndex: 1,
      explanation:
        "Mis-selling terjadi ketika produk dijual tidak sesuai profil risiko/kebutuhan nasabah atau dengan informasi menyesatkan; ini melanggar prinsip suitability dan etika profesi.",
    },
    {
      id: "p05-q15",
      domain: "etika_regulasi",
      question:
        "Manakah yang merupakan bentuk benturan kepentingan (conflict of interest) yang wajib dikelola oleh Manajer Investasi?",
      options: [
        "Mendahulukan transaksi rekening pribadi karyawan di atas kepentingan nasabah (front running)",
        "Mengungkapkan kinerja portofolio kepada nasabah secara berkala",
        "Memisahkan dana nasabah dari aset Manajer Investasi melalui bank kustodian",
        "Menyusun laporan keuangan yang diaudit",
      ],
      correctIndex: 0,
      explanation:
        "Front running—mendahulukan transaksi pribadi sebelum order nasabah—merupakan benturan kepentingan yang dilarang; MI wajib mengutamakan kepentingan nasabah dan mengelola/menghindari konflik tersebut.",
    },
  ],
};
