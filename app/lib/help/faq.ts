/**
 * Help Center / FAQ — single source of truth untuk pertanyaan umum user.
 *
 * BEDA dengan Guidance & Academy:
 * - Academy → mengajarkan konsep pasar saham (teori).
 * - Guidance → mengajarkan cara pakai fitur Nubuat (modul per modul, detail).
 * - FAQ (ini) → jawaban singkat & langsung atas pertanyaan operasional yang
 *   paling sering muncul (akun, langganan, pembayaran, data, dll). MELENGKAPI
 *   Guidance, bukan menggantikannya — kalau butuh detail, FAQ menautkan ke
 *   Guidance/Academy.
 *
 * Konten static & fully typed supaya mudah di-review dan (nanti) di-migrate ke
 * CMS/DB. Nada semi-formal santai, pakai "kamu".
 */

export interface FaqItem {
  /** Kategori untuk grouping & filter. Harus salah satu dari FAQ_CATEGORIES. */
  category: FaqCategory;
  question: string;
  /** Jawaban ringkas. Plain text (boleh multi-kalimat). */
  answer: string;
}

export const FAQ_CATEGORIES = [
  "Akun & Login",
  "Langganan & Trial",
  "Paper Trading",
  "AI Buddy",
  "Alerts",
  "Data & Harga",
  "Pembayaran",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const FAQ_ITEMS: FaqItem[] = [
  // ============================ AKUN & LOGIN ============================
  {
    category: "Akun & Login",
    question: "Bagaimana cara membuat akun Nubuat?",
    answer:
      "Daftar pakai email kamu lewat halaman Sign Up. Setelah verifikasi email, kamu langsung bisa masuk dan mengakses Dashboard. Tidak perlu kartu kredit untuk mulai.",
  },
  {
    category: "Akun & Login",
    question: "Aku lupa password, gimana?",
    answer:
      "Di halaman login, klik \"Lupa password\". Kami kirim tautan reset ke email kamu. Kalau emailnya tidak masuk dalam beberapa menit, cek folder spam/promosi dulu ya.",
  },
  {
    category: "Akun & Login",
    question: "Apakah aku bisa pakai Nubuat di HP dan laptop sekaligus?",
    answer:
      "Bisa. Akun kamu sinkron lintas perangkat — watchlist, alerts, dan paper trading akan sama di mana pun kamu login. Nubuat juga responsif di layar HP.",
  },
  {
    category: "Akun & Login",
    question: "Bagaimana cara menghapus akun?",
    answer:
      "Kamu bisa mengajukan penghapusan akun lewat email ke support@nubuat.id dari alamat email yang terdaftar. Data kamu akan dihapus sesuai kebijakan privasi kami.",
  },

  // ============================ LANGGANAN & TRIAL ============================
  {
    category: "Langganan & Trial",
    question: "Apa itu trial 7 hari?",
    answer:
      "Saat pertama daftar, kamu mendapat akses gratis ke fitur premium (setara tier Pro) selama 7 hari — termasuk AI Buddy, Verdict, Wyckoff, Screener, dan lainnya. Tidak ada penarikan biaya selama trial.",
  },
  {
    category: "Langganan & Trial",
    question: "Apa yang terjadi setelah trial 7 hari berakhir?",
    answer:
      "Akun kamu otomatis turun ke tier Free tanpa ada biaya yang ditarik. Kamu tetap bisa pakai fitur dasar (Dashboard, watchlist, news, paper trading). Untuk membuka lagi fitur premium, upgrade kapan saja di halaman Langganan.",
  },
  {
    category: "Langganan & Trial",
    question: "Apakah aku akan otomatis ditagih setelah trial?",
    answer:
      "Tidak. Trial tidak meminta kartu kredit, jadi tidak ada penagihan otomatis. Kamu hanya membayar kalau memang memilih upgrade ke paket berbayar secara sadar.",
  },
  {
    category: "Langganan & Trial",
    question: "Apa bedanya tier Free, Starter, Pro, dan Elite?",
    answer:
      "Free: Dashboard, 1 watchlist, news, paper trading. Starter: + alerts, screener, daily picks. Pro: + AI Buddy, DCF, Verdict, Wyckoff, Bandarmology, backtest. Elite: + L2 depth, API access, AI Deep Mode. Detail lengkap ada di halaman Langganan.",
  },
  {
    category: "Langganan & Trial",
    question: "Bisakah aku membatalkan langganan kapan saja?",
    answer:
      "Bisa. Pembatalan berlaku di akhir periode billing yang sudah kamu bayar — jadi kamu tetap bisa pakai fitur premium sampai masa aktifnya habis, lalu turun ke Free.",
  },

  // ============================ PAPER TRADING ============================
  {
    category: "Paper Trading",
    question: "Apakah Paper Trading berbayar?",
    answer:
      "Tidak — Paper Trading GRATIS untuk semua user, termasuk tier Free. Kamu dapat modal virtual Rp 100 juta untuk latihan strategi tanpa risiko uang sungguhan.",
  },
  {
    category: "Paper Trading",
    question: "Apakah uang di Paper Trading uang sungguhan?",
    answer:
      "Bukan. Semuanya virtual (simulasi). Tidak ada uang asli yang masuk atau keluar. Tujuannya melatih strategi & disiplin sebelum kamu trading dengan dana nyata di sekuritas.",
  },
  {
    category: "Paper Trading",
    question: "Harga apa yang dipakai saat eksekusi paper trade?",
    answer:
      "Eksekusi memakai harga last close EOD (akhir hari), bukan harga real-time intraday. Slippage dan likuiditas tidak disimulasikan, jadi anggap hasilnya sebagai latihan strategi — bukan jaminan hasil di trading sungguhan. Fee realistis tetap dihitung (0.15% beli + 0.25% jual).",
  },
  {
    category: "Paper Trading",
    question: "Bisakah aku reset portfolio paper trading?",
    answer:
      "Fitur reset portfolio sedang disiapkan. Untuk sekarang, fokus melatih konsistensi — performa kamu juga tampil di Leaderboard supaya seru.",
  },

  // ============================ AI BUDDY ============================
  {
    category: "AI Buddy",
    question: "Apa itu AI Buddy?",
    answer:
      "AI Buddy adalah asisten berbasis AI yang bisa menjawab pertanyaan soal saham dengan akses ke data Nubuat: harga, fundamental, watchlist, picks, dan news. Cocok untuk analisis cepat & belajar.",
  },
  {
    category: "AI Buddy",
    question: "Apakah jawaban AI Buddy adalah saran investasi?",
    answer:
      "Bukan. AI Buddy memberikan analisis berbasis data sebagai bahan edukasi & riset, BUKAN rekomendasi beli/jual. Selalu validasi sendiri dan sesuaikan dengan profil risiko kamu sebelum mengambil keputusan.",
  },
  {
    category: "AI Buddy",
    question: "Contoh pertanyaan yang bagus untuk AI Buddy?",
    answer:
      "Semakin spesifik semakin baik. Contoh: \"Bandingkan BBRI vs BMRI dari sisi ROE\", \"Kenapa GOTO turun hari ini?\", atau \"Screen saham dengan PE < 10 dan ROE > 20%\". Lihat lebih banyak tips di halaman Guidance.",
  },
  {
    category: "AI Buddy",
    question: "Apakah AI Buddy tersedia di tier Free?",
    answer:
      "AI Buddy adalah fitur premium (tier Pro ke atas), tapi kamu bisa mencobanya gratis selama trial 7 hari. Setelah trial, upgrade untuk akses penuh.",
  },

  // ============================ ALERTS ============================
  {
    category: "Alerts",
    question: "Bagaimana cara membuat alert?",
    answer:
      "Buka halaman Alerts, klik \"+ Alert baru\", masukkan kode emiten, lalu pilih kondisi (mis. harga di atas/bawah, % perubahan, volume spike, MA cross, atau RSI). Pilih channel notifikasi, simpan, selesai.",
  },
  {
    category: "Alerts",
    question: "Kapan alert dievaluasi dan dikirim?",
    answer:
      "Alert dievaluasi setelah data EOD harian masuk (bukan real-time intraday). Kalau kondisinya terpenuhi, kamu dapat notifikasi via in-app dan/atau email sesuai channel yang kamu pilih.",
  },
  {
    category: "Alerts",
    question: "Apa beda status Active, Paused, Triggered, dan Expired?",
    answer:
      "Active = aktif dan dievaluasi tiap hari. Paused = dijeda sementara. Triggered = sudah terpicu (bisa di-rearm atau diarsipkan). Expired = sudah lewat tanggal kedaluwarsa.",
  },

  // ============================ DATA & HARGA ============================
  {
    category: "Data & Harga",
    question: "Apakah harga di Nubuat real-time?",
    answer:
      "Sebagian besar data harga adalah EOD (end-of-day / akhir hari) dan dapat memiliki keterlambatan (delayed). Untuk keputusan eksekusi di sekuritas, selalu cek harga real-time di platform broker resmi kamu.",
  },
  {
    category: "Data & Harga",
    question: "Kenapa harga di Nubuat kadang beda dengan aplikasi sekuritas?",
    answer:
      "Karena data kami umumnya EOD/delayed, sementara aplikasi sekuritas menampilkan harga live. Perbedaan kecil itu wajar. Nubuat dirancang untuk analisis & riset, bukan untuk eksekusi order.",
  },
  {
    category: "Data & Harga",
    question: "Dari mana sumber data Nubuat?",
    answer:
      "Data harga & fundamental berasal dari penyedia data pasar pihak ketiga dan sumber publik IDX. News diambil dari beberapa media keuangan publik dan diberi skor sentimen oleh AI.",
  },
  {
    category: "Data & Harga",
    question: "Kenapa data sebuah emiten kosong atau belum lengkap?",
    answer:
      "Bisa karena emiten baru listing, likuiditas sangat rendah, atau data dari penyedia belum sinkron. Biasanya akan terisi setelah proses ingest data berikutnya berjalan.",
  },

  // ============================ PEMBAYARAN ============================
  {
    category: "Pembayaran",
    question: "Metode pembayaran apa saja yang didukung?",
    answer:
      "Kami mendukung metode pembayaran umum di Indonesia (transfer bank/virtual account, e-wallet, dan kartu) melalui payment gateway tepercaya. Pilihan lengkap muncul di halaman checkout saat kamu upgrade.",
  },
  {
    category: "Pembayaran",
    question: "Apakah pembayaranku aman?",
    answer:
      "Ya. Pembayaran diproses lewat payment gateway tepercaya yang sudah memenuhi standar keamanan. Nubuat tidak menyimpan detail kartu kamu secara langsung.",
  },
  {
    category: "Pembayaran",
    question: "Apakah ada kebijakan refund?",
    answer:
      "Karena ada trial 7 hari gratis untuk mencoba fitur premium sebelum membayar, langganan berbayar umumnya non-refundable. Kalau ada kendala penagihan atau salah charge, hubungi support@nubuat.id dan kami bantu cek.",
  },
  {
    category: "Pembayaran",
    question: "Apakah harga sudah termasuk pajak?",
    answer:
      "Harga yang tampil di halaman Langganan adalah harga final yang kamu bayar. Rincian termasuk komponen pajak (jika berlaku) akan terlihat pada invoice/checkout.",
  },
];
