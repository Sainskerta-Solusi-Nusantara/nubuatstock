import type { TryoutPackage } from "../types";

/**
 * Paket 06 — Try Out WMI (soal latihan berbasis silabus, BUKAN soal ujian resmi).
 * 15 soal, mencakup 6 domain silabus. Fokus: durasi Macaulay & immunization,
 * FCFF & Gordon, fund fact sheet/subscription-redemption/reksa dana indeks,
 * SML & alpha & tracking error, hedging long, neraca pembayaran & moneter ekspansif,
 * perizinan WPPE & keterbukaan informasi.
 */
export const paket06: TryoutPackage = {
  slug: "wmi-paket-06",
  number: 6,
  title: "Try Out WMI — Paket 6",
  description:
    "Latihan lintas domain WMI: durasi Macaulay & imunisasi obligasi, FCFF & DDM, fund fact sheet & mekanisme subscription/redemption & reksa dana indeks, SML-alpha-tracking error, hedging, neraca pembayaran & kebijakan moneter ekspansif, perizinan WPPE serta keterbukaan informasi.",
  durationMinutes: 30,
  questions: [
    {
      id: "p06-q01",
      domain: "analisis_efek",
      question:
        "Durasi Macaulay sebuah obligasi paling tepat diartikan sebagai...",
      options: [
        "Jumlah tahun hingga obligasi jatuh tempo",
        "Rata-rata tertimbang waktu penerimaan seluruh arus kas obligasi, dengan bobot berdasarkan nilai sekarang arus kas",
        "Selisih antara harga beli dan nilai nominal obligasi",
        "Total kupon yang akan diterima sampai jatuh tempo",
      ],
      correctIndex: 1,
      explanation:
        "Durasi Macaulay adalah rata-rata tertimbang waktu (dalam tahun) penerimaan arus kas obligasi, dengan bobot proporsional terhadap nilai sekarang masing-masing arus kas.",
    },
    {
      id: "p06-q02",
      domain: "analisis_efek",
      question:
        "Strategi 'immunization' (imunisasi) portofolio obligasi bertujuan untuk...",
      options: [
        "Memaksimalkan kupon dengan membeli obligasi berkupon tertinggi",
        "Mengunci imbal hasil dan melindungi nilai portofolio dari risiko suku bunga dengan menyamakan durasi aset dengan horizon kewajiban",
        "Menghindari pembayaran pajak atas kupon obligasi",
        "Menjamin peringkat obligasi tetap idAAA",
      ],
      correctIndex: 1,
      explanation:
        "Imunisasi menyetarakan durasi portofolio dengan horizon investasi/kewajiban sehingga efek perubahan harga dan reinvestasi saling mengompensasi, melindungi nilai terhadap pergerakan suku bunga.",
    },
    {
      id: "p06-q03",
      domain: "analisis_efek",
      question:
        "Pendekatan Free Cash Flow to Firm (FCFF) menilai perusahaan dengan mendiskontokan...",
      options: [
        "Hanya dividen tunai yang dibagikan kepada pemegang saham",
        "Arus kas bebas yang tersedia bagi seluruh penyedia modal (kreditur dan pemegang saham), didiskontokan dengan WACC",
        "Laba bersih akuntansi tanpa penyesuaian",
        "Nilai buku ekuitas perusahaan",
      ],
      correctIndex: 1,
      explanation:
        "FCFF adalah arus kas bebas untuk seluruh penyedia modal dan didiskontokan dengan biaya modal rata-rata tertimbang (WACC) untuk memperoleh nilai perusahaan (enterprise value).",
    },
    {
      id: "p06-q04",
      domain: "analisis_efek",
      question:
        "Saham membayar dividen terakhir (D0) Rp300 dengan pertumbuhan tetap 6% dan tingkat imbal hasil disyaratkan 14%. Menggunakan Gordon Growth Model, nilai wajar saham adalah...",
      options: ["Rp3.750", "Rp3.975", "Rp5.000", "Rp2.143"],
      correctIndex: 1,
      explanation:
        "D1 = D0 × (1+g) = 300 × 1,06 = 318. P = D1/(r−g) = 318/(0,14−0,06) = 318/0,08 = Rp3.975.",
    },
    {
      id: "p06-q05",
      domain: "reksa_dana",
      question:
        "Fund Fact Sheet reksa dana yang diterbitkan secara berkala paling sedikit memuat informasi berikut, KECUALI...",
      options: [
        "Kinerja reksa dana dan tolok ukur (benchmark)",
        "Komposisi/alokasi portofolio dan efek-efek utama",
        "Janji pasti imbal hasil yang akan diperoleh pemodal pada periode berikutnya",
        "Nilai Aktiva Bersih per unit penyertaan",
      ],
      correctIndex: 2,
      explanation:
        "Fund Fact Sheet menyajikan kinerja historis, alokasi aset, NAB/unit, dan informasi pengelolaan; ia tidak boleh memuat janji pasti imbal hasil masa depan karena kinerja tidak dijamin.",
    },
    {
      id: "p06-q06",
      domain: "reksa_dana",
      question:
        "Pada reksa dana terbuka, harga subscription dan redemption unit penyertaan ditetapkan berdasarkan...",
      options: [
        "Harga penawaran yang ditentukan agen penjual secara bebas",
        "Nilai Aktiva Bersih (NAB) per unit pada hari transaksi sesuai cut-off time",
        "Harga rata-rata di Bursa Efek hari sebelumnya",
        "Nilai nominal awal Rp1.000 yang tetap sepanjang waktu",
      ],
      correctIndex: 1,
      explanation:
        "Pembelian (subscription) dan penjualan kembali (redemption) unit reksa dana terbuka dihargai berdasarkan NAB per unit pada hari bursa transaksi yang sesuai dengan ketentuan cut-off time.",
    },
    {
      id: "p06-q07",
      domain: "reksa_dana",
      question: "Ciri khas reksa dana indeks adalah...",
      options: [
        "Dikelola secara aktif untuk mengalahkan pasar dengan margin besar",
        "Bertujuan mereplikasi kinerja suatu indeks acuan sehingga umumnya berbiaya pengelolaan lebih rendah",
        "Hanya boleh berinvestasi pada instrumen pasar uang",
        "Menjamin imbal hasil di atas inflasi setiap tahun",
      ],
      correctIndex: 1,
      explanation:
        "Reksa dana indeks merupakan strategi pasif yang berupaya meniru komposisi dan kinerja indeks acuannya; karena minim pengelolaan aktif, biayanya cenderung lebih rendah.",
    },
    {
      id: "p06-q08",
      domain: "manajemen_portofolio",
      question:
        "Security Market Line (SML) dalam CAPM menyatakan bahwa imbal hasil yang diharapkan suatu aset merupakan fungsi linear dari...",
      options: [
        "Deviasi standar (risiko total) aset",
        "Beta aset (ukuran risiko sistematis)",
        "Rasio P/E aset",
        "Tingkat dividen aset",
      ],
      correctIndex: 1,
      explanation:
        "SML menggambarkan hubungan linear antara expected return dan beta (risiko sistematis): E(Ri) = Rf + βi × (E(Rm) − Rf).",
    },
    {
      id: "p06-q09",
      domain: "manajemen_portofolio",
      question: "Alpha (Jensen's alpha) positif sebuah portofolio menunjukkan...",
      options: [
        "Portofolio memberikan imbal hasil lebih tinggi dari yang diprediksi CAPM untuk tingkat risikonya",
        "Portofolio memiliki risiko paling rendah di pasar",
        "Portofolio tidak terkorelasi dengan pasar",
        "Portofolio pasti mengalami kerugian",
      ],
      correctIndex: 0,
      explanation:
        "Alpha positif berarti kinerja portofolio melampaui imbal hasil yang diharapkan menurut CAPM untuk tingkat beta-nya, kerap dianggap sebagai indikasi keterampilan manajer.",
    },
    {
      id: "p06-q10",
      domain: "manajemen_portofolio",
      question: "Tracking error mengukur...",
      options: [
        "Selisih NAB harian reksa dana",
        "Deviasi standar selisih imbal hasil portofolio terhadap imbal hasil tolok ukur (benchmark)",
        "Total biaya transaksi portofolio",
        "Jumlah kesalahan pencatatan oleh bank kustodian",
      ],
      correctIndex: 1,
      explanation:
        "Tracking error adalah deviasi standar dari selisih return portofolio dengan return benchmark-nya; semakin kecil, semakin dekat kinerja portofolio mengikuti benchmark.",
    },
    {
      id: "p06-q11",
      domain: "produk_investasi",
      question:
        "Seorang investor yang akan menerima dana dalam tiga bulan dan khawatir harga saham naik dapat mengunci harga beli dengan...",
      options: [
        "Membeli kontrak call option atau long futures atas saham/indeks tersebut",
        "Menjual seluruh aset bebas risiko miliknya",
        "Membeli put option atas saham tersebut",
        "Menunda investasi tanpa instrumen apa pun",
      ],
      correctIndex: 0,
      explanation:
        "Untuk mengunci harga beli di masa depan dan melindungi diri dari kenaikan harga, investor dapat mengambil posisi long melalui call option atau kontrak futures atas instrumen tersebut.",
    },
    {
      id: "p06-q12",
      domain: "ekonomi_keuangan",
      question:
        "Neraca pembayaran (Balance of Payments) suatu negara mencatat...",
      options: [
        "Hanya transaksi belanja pemerintah dalam negeri",
        "Seluruh transaksi ekonomi suatu negara dengan negara lain dalam periode tertentu, mencakup transaksi berjalan dan transaksi modal/finansial",
        "Jumlah uang beredar di dalam negeri",
        "Total pajak yang dikumpulkan negara",
      ],
      correctIndex: 1,
      explanation:
        "Neraca pembayaran adalah catatan sistematis seluruh transaksi ekonomi penduduk suatu negara dengan penduduk negara lain pada periode tertentu, terdiri atas current account dan capital/financial account.",
    },
    {
      id: "p06-q13",
      domain: "ekonomi_keuangan",
      question:
        "Untuk menstimulasi perekonomian yang sedang lesu (resesi), kebijakan moneter ekspansif yang dapat ditempuh bank sentral adalah...",
      options: [
        "Menaikkan giro wajib minimum dan suku bunga acuan",
        "Menurunkan suku bunga acuan dan membeli surat berharga untuk menambah likuiditas",
        "Menjual cadangan devisa dalam jumlah besar",
        "Menaikkan tarif pajak penghasilan",
      ],
      correctIndex: 1,
      explanation:
        "Kebijakan moneter ekspansif menurunkan suku bunga acuan dan menambah likuiditas (mis. operasi pasar terbuka membeli surat berharga) guna mendorong kredit, konsumsi, dan investasi.",
    },
    {
      id: "p06-q14",
      domain: "etika_regulasi",
      question:
        "Izin profesi untuk seseorang yang melakukan kegiatan sebagai perantara pedagang efek (broker) adalah...",
      options: [
        "Wakil Manajer Investasi (WMI)",
        "Wakil Perantara Pedagang Efek (WPPE)",
        "Wakil Penjamin Emisi Efek (WPEE)",
        "Akuntan Publik Teregistrasi",
      ],
      correctIndex: 1,
      explanation:
        "WPPE adalah izin orang perseorangan untuk bertindak mewakili perusahaan efek sebagai perantara pedagang efek; WMI untuk pengelolaan investasi dan WPEE untuk penjaminan emisi.",
    },
    {
      id: "p06-q15",
      domain: "etika_regulasi",
      question:
        "Prinsip keterbukaan informasi (transparansi) di pasar modal mewajibkan emiten dan pengelola investasi untuk...",
      options: [
        "Menyembunyikan informasi material yang dapat menurunkan harga efek",
        "Mengungkapkan informasi material secara akurat, lengkap, dan tepat waktu kepada publik/pemodal",
        "Hanya memberikan informasi kepada pemegang saham pengendali",
        "Menunda penyampaian laporan keuangan sampai akhir tahun berikutnya",
      ],
      correctIndex: 1,
      explanation:
        "Prinsip keterbukaan menuntut pengungkapan informasi material secara akurat, lengkap, dan tepat waktu agar pemodal dapat mengambil keputusan investasi yang terinformasi dan pasar berjalan wajar.",
    },
  ],
};
