import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { glossaryTerms, type NewGlossaryTerm } from "@/db/schema/glossary";
import { logger } from "@/lib/logger";

/**
 * Seed kamus istilah saham (Glossary). Idempotent — ON CONFLICT slug DO UPDATE,
 * jadi aman dijalankan berulang dan akan refresh definisi kalau diubah di sini.
 *
 * Nada: semi-formal santai, sapa "kamu". Definisi diusahakan akurat untuk
 * konteks pasar saham Indonesia (IDX).
 */

type SeedTerm = {
  slug: string;
  term: string;
  definition: string;
  category: "Teknikal" | "Fundamental" | "Bandarmologi" | "Umum";
  aliases?: string[];
  relatedSlugs?: string[];
};

const TERMS: SeedTerm[] = [
  // ===== Umum =====
  {
    slug: "ihsg",
    term: "IHSG",
    definition:
      "Indeks Harga Saham Gabungan — indeks yang merangkum pergerakan harga seluruh saham yang tercatat di Bursa Efek Indonesia (BEI). Kalau kamu dengar \"IHSG naik 1%\", artinya secara rata-rata tertimbang pasar saham Indonesia lagi menguat. IHSG sering dipakai sebagai tolok ukur (benchmark) kondisi pasar secara keseluruhan.",
    category: "Umum",
    aliases: ["IDX Composite", "Composite Index"],
    relatedSlugs: ["emiten", "bursa-efek-indonesia"],
  },
  {
    slug: "bursa-efek-indonesia",
    term: "Bursa Efek Indonesia",
    definition:
      "Bursa Efek Indonesia (BEI) atau Indonesia Stock Exchange (IDX) adalah tempat resmi jual-beli efek (saham, obligasi, dan instrumen lain) di Indonesia. Semua transaksi saham yang kamu lakukan lewat sekuritas pada akhirnya diteruskan ke sistem perdagangan BEI.",
    category: "Umum",
    aliases: ["BEI", "IDX"],
    relatedSlugs: ["ihsg", "emiten"],
  },
  {
    slug: "emiten",
    term: "Emiten",
    definition:
      "Perusahaan yang menerbitkan (menjual) sahamnya ke publik lewat bursa. Kalau kamu beli saham BBCA, berarti BBCA adalah emitennya. Istilah \"emiten\" dan \"perusahaan tercatat\" sering dipakai bergantian.",
    category: "Umum",
    aliases: ["perusahaan tercatat", "issuer"],
    relatedSlugs: ["saham", "ipo"],
  },
  {
    slug: "saham",
    term: "Saham",
    definition:
      "Bukti kepemilikan kamu atas sebagian kecil sebuah perusahaan. Punya 1 lot saham berarti kamu jadi pemilik (walau mungil) perusahaan itu, dan berhak atas keuntungannya lewat kenaikan harga (capital gain) maupun dividen.",
    category: "Umum",
    aliases: ["stock", "ekuitas"],
    relatedSlugs: ["lot", "emiten", "dividen"],
  },
  {
    slug: "ipo",
    term: "IPO",
    definition:
      "Initial Public Offering — momen pertama kali sebuah perusahaan menjual sahamnya ke publik dan resmi tercatat di bursa. Setelah IPO, sahamnya bisa kamu beli dan jual bebas di pasar. Saham IPO kadang diburu karena potensi naik di hari pertama, tapi risikonya juga besar.",
    category: "Umum",
    aliases: ["Initial Public Offering", "go public"],
    relatedSlugs: ["emiten", "saham"],
  },
  {
    slug: "lot",
    term: "Lot",
    definition:
      "Satuan minimal pembelian saham di bursa Indonesia. 1 lot = 100 lembar saham. Jadi kalau harga saham Rp1.000 dan kamu beli 1 lot, modalnya Rp1.000 × 100 = Rp100.000 (belum termasuk fee).",
    category: "Umum",
    aliases: ["round lot"],
    relatedSlugs: ["saham", "fraksi-harga"],
  },
  {
    slug: "bid-offer",
    term: "Bid/Offer",
    definition:
      "Bid adalah harga tertinggi yang mau dibayar pembeli, sedangkan Offer (atau Ask) adalah harga terendah yang diminta penjual. Selisih keduanya disebut spread. Transaksi terjadi saat bid dan offer bertemu di harga yang sama.",
    category: "Umum",
    aliases: ["bid ask", "ask"],
    relatedSlugs: ["fraksi-harga", "likuiditas"],
  },
  {
    slug: "fraksi-harga",
    term: "Fraksi Harga",
    definition:
      "Kelipatan minimal perubahan harga saham yang diizinkan bursa, dan besarnya berbeda tergantung rentang harga saham (tick size). Misalnya saham di rentang harga tertentu hanya bisa bergerak naik/turun Rp1, Rp2, atau Rp5 per langkah. Memahami fraksi harga penting buat kamu yang scalping karena menentukan keuntungan minimal per tick.",
    category: "Umum",
    aliases: ["tick size", "tick"],
    relatedSlugs: ["bid-offer", "ara", "arb"],
  },
  {
    slug: "ara",
    term: "ARA",
    definition:
      "Auto Rejection Atas — batas maksimal kenaikan harga sebuah saham dalam satu hari perdagangan. Kalau saham menyentuh ARA, harganya tidak bisa naik lebih tinggi lagi hari itu, dan biasanya antrian beli menumpuk. Persentase ARA berbeda tergantung kelompok harga dan ketentuan bursa.",
    category: "Umum",
    aliases: ["Auto Rejection Atas"],
    relatedSlugs: ["arb", "auto-reject", "saham-gorengan"],
  },
  {
    slug: "arb",
    term: "ARB",
    definition:
      "Auto Rejection Bawah — batas maksimal penurunan harga sebuah saham dalam satu hari. Kalau saham kena ARB, harganya tidak bisa turun lebih rendah lagi hari itu, dan biasanya antrian jual menumpuk tanpa pembeli. Ini momok buat trader yang nyangkut di saham gorengan.",
    category: "Umum",
    aliases: ["Auto Rejection Bawah"],
    relatedSlugs: ["ara", "auto-reject", "nyangkut"],
  },
  {
    slug: "auto-reject",
    term: "Auto Reject",
    definition:
      "Mekanisme otomatis bursa yang menolak order di luar batas harga harian (ARA di atas, ARB di bawah). Tujuannya meredam volatilitas ekstrem supaya harga tidak melonjak atau anjlok tak terkendali dalam sehari.",
    category: "Umum",
    aliases: ["auto rejection"],
    relatedSlugs: ["ara", "arb", "trading-halt"],
  },
  {
    slug: "trading-halt",
    term: "Trading Halt",
    definition:
      "Penghentian sementara perdagangan oleh bursa, baik untuk satu saham tertentu maupun seluruh pasar, biasanya saat terjadi penurunan tajam atau ada informasi penting yang perlu disampaikan. Setelah jeda, perdagangan dilanjutkan kembali. Kalau penghentian berlangsung lama disebut trading suspend.",
    category: "Umum",
    aliases: ["halt", "suspensi"],
    relatedSlugs: ["auto-reject", "ara", "arb"],
  },
  {
    slug: "blue-chip",
    term: "Blue Chip",
    definition:
      "Sebutan untuk saham perusahaan besar, mapan, dan punya kapitalisasi pasar tinggi serta fundamental kuat — contohnya bank-bank besar dan emiten papan atas. Saham blue chip cenderung lebih stabil dan likuid, jadi sering jadi pilihan investor pemula yang cari aman.",
    category: "Umum",
    aliases: ["saham lapis satu", "first liner"],
    relatedSlugs: ["likuiditas", "saham-gorengan"],
  },
  {
    slug: "saham-gorengan",
    term: "Saham Gorengan",
    definition:
      "Saham yang harganya digerakkan secara tidak wajar — naik atau turun drastis bukan karena fundamental, melainkan karena ada pihak yang \"menggoreng\" (memompa) harganya. Risikonya sangat tinggi: kamu bisa cuan besar, tapi juga bisa nyangkut parah saat harganya tiba-tiba dibanting.",
    category: "Umum",
    aliases: ["gorengan"],
    relatedSlugs: ["pom-pom", "bandarmologi", "nyangkut"],
  },
  {
    slug: "pom-pom",
    term: "Pom-pom",
    definition:
      "Aksi mengajak atau membujuk banyak orang untuk beli saham tertentu secara berlebihan, biasanya lewat media sosial atau grup, supaya harganya naik. Hati-hati: pom-pom sering dipakai untuk menarik pembeli baru agar pihak yang sudah punya barang bisa jualan di harga tinggi.",
    category: "Umum",
    aliases: ["pompom", "pump"],
    relatedSlugs: ["saham-gorengan", "bandarmologi"],
  },
  {
    slug: "nyangkut",
    term: "Nyangkut",
    definition:
      "Kondisi saat kamu beli saham lalu harganya turun di bawah harga beli, dan kamu menahannya (tidak jual) sambil berharap balik modal. Nyangkut adalah \"penyakit\" klasik trader retail — apalagi kalau nyangkut di saham gorengan yang sulit balik ke harga semula.",
    category: "Umum",
    aliases: ["stuck", "floating loss"],
    relatedSlugs: ["cut-loss", "average-down", "saham-gorengan"],
  },
  {
    slug: "likuiditas",
    term: "Likuiditas",
    definition:
      "Seberapa mudah sebuah saham bisa dibeli atau dijual tanpa menggerakkan harganya terlalu jauh. Saham likuid (volume besar, banyak peminat) gampang kamu jual kapan saja. Saham tidak likuid bisa bikin kamu susah keluar karena tidak ada yang mau beli.",
    category: "Umum",
    aliases: ["liquidity"],
    relatedSlugs: ["volume", "bid-offer", "blue-chip"],
  },
  {
    slug: "volume",
    term: "Volume",
    definition:
      "Jumlah lembar (atau lot) saham yang diperdagangkan dalam periode tertentu, misalnya satu hari. Volume tinggi menandakan minat pasar yang besar dan biasanya bikin pergerakan harga lebih meyakinkan. Volume sering dipakai untuk konfirmasi sinyal teknikal.",
    category: "Teknikal",
    aliases: ["trading volume"],
    relatedSlugs: ["likuiditas", "breakout"],
  },
  {
    slug: "margin",
    term: "Margin",
    definition:
      "Fasilitas pinjaman dana dari sekuritas supaya kamu bisa beli saham melebihi modal sendiri. Margin bisa memperbesar keuntungan, tapi juga memperbesar kerugian — kalau harga turun, kamu bisa kena margin call (diminta top up dana) atau posisi dijual paksa.",
    category: "Umum",
    aliases: ["margin trading"],
    relatedSlugs: ["short-selling", "cut-loss"],
  },
  {
    slug: "short-selling",
    term: "Short Selling",
    definition:
      "Strategi menjual saham yang dipinjam dengan harapan harganya turun, lalu membelinya kembali lebih murah untuk untung dari selisihnya. Di Indonesia, short selling diatur ketat dan hanya boleh untuk saham tertentu lewat sekuritas yang ditunjuk.",
    category: "Umum",
    aliases: ["short", "jual kosong"],
    relatedSlugs: ["margin", "bearish"],
  },
  {
    slug: "warrant",
    term: "Waran",
    definition:
      "Efek turunan yang memberi kamu hak (bukan kewajiban) untuk membeli saham emiten di harga tertentu (harga pelaksanaan/exercise) sebelum tanggal jatuh tempo. Waran sering dibagikan sebagai \"bonus\" saat right issue atau IPO. Harganya bisa sangat volatil.",
    category: "Umum",
    aliases: ["warrant"],
    relatedSlugs: ["right-issue", "saham"],
  },
  {
    slug: "obligasi",
    term: "Obligasi",
    definition:
      "Surat utang yang diterbitkan perusahaan atau pemerintah. Saat kamu beli obligasi, kamu sebenarnya meminjamkan uang dan akan menerima bunga (kupon) berkala plus pengembalian pokok saat jatuh tempo. Risikonya umumnya lebih rendah daripada saham.",
    category: "Fundamental",
    aliases: ["bond", "surat utang"],
    relatedSlugs: ["reksadana", "dividen"],
  },
  {
    slug: "reksadana",
    term: "Reksadana",
    definition:
      "Wadah investasi yang mengumpulkan dana dari banyak investor lalu dikelola manajer investasi profesional ke berbagai instrumen (saham, obligasi, pasar uang). Cocok buat kamu yang ingin diversifikasi tanpa harus pilih saham satu per satu.",
    category: "Fundamental",
    aliases: ["mutual fund"],
    relatedSlugs: ["obligasi", "saham"],
  },
  {
    slug: "rups",
    term: "RUPS",
    definition:
      "Rapat Umum Pemegang Saham — forum tertinggi di mana pemegang saham mengambil keputusan penting perusahaan, seperti pembagian dividen, pengangkatan direksi, atau aksi korporasi. Sebagai pemilik saham, kamu punya hak suara di RUPS sesuai jumlah saham yang kamu pegang.",
    category: "Fundamental",
    aliases: ["Rapat Umum Pemegang Saham", "AGM"],
    relatedSlugs: ["dividen", "emiten"],
  },

  // ===== Fundamental =====
  {
    slug: "dividen",
    term: "Dividen",
    definition:
      "Bagian keuntungan perusahaan yang dibagikan ke pemegang saham, biasanya berupa uang tunai per lembar. Kalau kamu pegang saham sampai tanggal pencatatan (recording date), kamu berhak menerima dividennya. Besarnya ditentukan lewat RUPS.",
    category: "Fundamental",
    aliases: ["dividend"],
    relatedSlugs: ["cum-date-ex-date", "rups", "dividend-yield"],
  },
  {
    slug: "dividend-yield",
    term: "Dividend Yield",
    definition:
      "Rasio yang menunjukkan seberapa besar dividen tahunan dibandingkan harga sahamnya, dinyatakan dalam persen. Misalnya dividen Rp50 per saham dengan harga Rp1.000 berarti dividend yield 5%. Berguna untuk membandingkan \"imbal hasil\" antar saham dividen.",
    category: "Fundamental",
    aliases: ["yield dividen"],
    relatedSlugs: ["dividen", "per"],
  },
  {
    slug: "cum-date-ex-date",
    term: "Cum/Ex Date",
    definition:
      "Cum Date adalah hari terakhir kamu bisa beli saham dan tetap berhak atas dividen (atau hak aksi korporasi lain). Ex Date adalah hari berikutnya, di mana pembeli baru sudah tidak berhak lagi. Biasanya harga saham turun di Ex Date sebesar dividen yang dibagikan.",
    category: "Fundamental",
    aliases: ["cum date", "ex date", "ex dividend"],
    relatedSlugs: ["dividen", "rups"],
  },
  {
    slug: "eps",
    term: "EPS",
    definition:
      "Earnings Per Share — laba bersih perusahaan dibagi jumlah saham beredar. EPS menunjukkan berapa rupiah laba yang \"jatah\" tiap satu lembar saham. Semakin tinggi dan tumbuh konsisten, umumnya semakin baik. EPS jadi bahan utama menghitung PER.",
    category: "Fundamental",
    aliases: ["Earnings Per Share", "laba per saham"],
    relatedSlugs: ["per", "roe"],
  },
  {
    slug: "per",
    term: "PER",
    definition:
      "Price to Earnings Ratio — harga saham dibagi EPS. PER memberitahu kamu berapa kali laba tahunan yang \"kamu bayar\" untuk memiliki saham itu. PER rendah bisa berarti murah, tapi bandingkan dengan rata-rata industri sebelum menyimpulkan.",
    category: "Fundamental",
    aliases: ["Price to Earnings Ratio", "P/E"],
    relatedSlugs: ["eps", "pbv", "dividend-yield"],
  },
  {
    slug: "pbv",
    term: "PBV",
    definition:
      "Price to Book Value — harga saham dibagi nilai buku per saham (ekuitas dibagi jumlah saham). PBV di bawah 1 berarti harga saham di bawah nilai bukunya, yang kadang dianggap murah. Tetap perlu dilihat bersama rasio lain dan kualitas asetnya.",
    category: "Fundamental",
    aliases: ["Price to Book Value", "P/B"],
    relatedSlugs: ["per", "roe"],
  },
  {
    slug: "roe",
    term: "ROE",
    definition:
      "Return on Equity — laba bersih dibagi total ekuitas, dalam persen. ROE mengukur seberapa efisien perusahaan menghasilkan laba dari modal pemegang saham. ROE tinggi dan stabil biasanya tanda manajemen yang produktif.",
    category: "Fundamental",
    aliases: ["Return on Equity"],
    relatedSlugs: ["eps", "pbv", "per"],
  },
  {
    slug: "buyback",
    term: "Buyback",
    definition:
      "Aksi perusahaan membeli kembali sahamnya sendiri dari pasar. Buyback bisa mengurangi jumlah saham beredar (sehingga EPS naik) dan sering jadi sinyal bahwa manajemen menganggap harga sahamnya lagi murah. Tapi efeknya ke harga tidak selalu instan.",
    category: "Fundamental",
    aliases: ["share buyback", "pembelian kembali"],
    relatedSlugs: ["eps", "stock-split"],
  },
  {
    slug: "right-issue",
    term: "Right Issue",
    definition:
      "Aksi korporasi di mana perusahaan menerbitkan saham baru dan menawarkannya lebih dulu ke pemegang saham lama, biasanya dengan harga diskon. Tujuannya menggalang dana. Kalau kamu tidak ikut menebus, kepemilikanmu bisa terdilusi (mengecil persentasenya).",
    category: "Fundamental",
    aliases: ["HMETD", "rights issue"],
    relatedSlugs: ["warrant", "dilusi", "stock-split"],
  },
  {
    slug: "dilusi",
    term: "Dilusi",
    definition:
      "Penurunan persentase kepemilikan kamu di sebuah perusahaan karena bertambahnya jumlah saham beredar — misalnya akibat right issue atau penerbitan saham baru. EPS juga bisa ikut mengecil karena laba dibagi ke lebih banyak saham.",
    category: "Fundamental",
    aliases: ["dilution"],
    relatedSlugs: ["right-issue", "eps"],
  },
  {
    slug: "stock-split",
    term: "Stock Split",
    definition:
      "Pemecahan satu saham menjadi beberapa saham dengan harga per lembar yang lebih rendah, tanpa mengubah total nilai investasimu. Tujuannya bikin harga lebih terjangkau dan likuid. Lawannya adalah reverse stock split (penggabungan).",
    category: "Fundamental",
    aliases: ["pemecahan saham", "split"],
    relatedSlugs: ["buyback", "right-issue"],
  },

  // ===== Teknikal =====
  {
    slug: "support",
    term: "Support",
    definition:
      "Level harga di mana tekanan beli cenderung muncul sehingga penurunan harga \"tertahan\". Bayangkan support sebagai lantai: harga sering memantul naik saat menyentuhnya. Kalau support ditembus ke bawah, biasanya jadi sinyal pelemahan lanjutan.",
    category: "Teknikal",
    aliases: ["level support"],
    relatedSlugs: ["resistance", "rebound", "breakout"],
  },
  {
    slug: "resistance",
    term: "Resistance",
    definition:
      "Level harga di mana tekanan jual cenderung muncul sehingga kenaikan harga \"tertahan\". Anggap resistance sebagai atap: harga sering tertekan turun saat menyentuhnya. Kalau resistance ditembus ke atas (breakout), sering jadi sinyal penguatan.",
    category: "Teknikal",
    aliases: ["level resistance"],
    relatedSlugs: ["support", "breakout"],
  },
  {
    slug: "breakout",
    term: "Breakout",
    definition:
      "Momen ketika harga menembus level penting — biasanya resistance ke atas — disertai volume yang meningkat. Breakout sering dianggap sinyal awal tren naik. Tapi waspada breakout palsu (false breakout) yang langsung balik turun.",
    category: "Teknikal",
    aliases: ["break out", "tembus"],
    relatedSlugs: ["resistance", "support", "volume"],
  },
  {
    slug: "bullish",
    term: "Bullish",
    definition:
      "Kondisi atau sentimen pasar yang cenderung naik, atau pandangan optimis bahwa harga akan menguat. Kalau kamu \"bullish\" pada sebuah saham, artinya kamu yakin harganya bakal naik. Istilahnya berasal dari banteng (bull) yang menyeruduk ke atas.",
    category: "Teknikal",
    aliases: ["bull"],
    relatedSlugs: ["bearish", "rebound", "uptrend"],
  },
  {
    slug: "bearish",
    term: "Bearish",
    definition:
      "Kondisi atau sentimen pasar yang cenderung turun, atau pandangan pesimis bahwa harga akan melemah. Kalau kamu \"bearish\", kamu menduga harga bakal turun. Istilahnya dari beruang (bear) yang mencakar ke bawah.",
    category: "Teknikal",
    aliases: ["bear"],
    relatedSlugs: ["bullish", "koreksi", "short-selling"],
  },
  {
    slug: "uptrend",
    term: "Uptrend",
    definition:
      "Tren naik — pola di mana harga membentuk puncak dan lembah yang makin tinggi (higher high, higher low) selama periode tertentu. Banyak trader memilih beli searah tren (\"trend is your friend\") saat pasar sedang uptrend.",
    category: "Teknikal",
    aliases: ["tren naik"],
    relatedSlugs: ["bullish", "sideways", "moving-average"],
  },
  {
    slug: "koreksi",
    term: "Koreksi",
    definition:
      "Penurunan harga sementara di tengah tren yang lebih besar, biasanya setelah kenaikan yang cukup tinggi. Koreksi adalah hal normal dan sehat dalam tren naik — sering jadi kesempatan masuk buat trader yang menunggu harga lebih murah.",
    category: "Teknikal",
    aliases: ["pullback", "correction"],
    relatedSlugs: ["rebound", "bearish", "support"],
  },
  {
    slug: "rebound",
    term: "Rebound",
    definition:
      "Pembalikan arah harga ke atas setelah sebelumnya turun. Rebound sering terjadi saat harga menyentuh support atau ketika tekanan jual mereda. Hati-hati membedakan rebound sesungguhnya dengan technical rebound yang hanya sesaat.",
    category: "Teknikal",
    aliases: ["bounce", "memantul"],
    relatedSlugs: ["koreksi", "support", "bullish"],
  },
  {
    slug: "sideways",
    term: "Sideways",
    definition:
      "Kondisi harga bergerak mendatar dalam rentang sempit, tanpa tren naik atau turun yang jelas. Pasar sideways sering bikin trend follower bosan, tapi cocok buat strategi trading dalam range (beli di support, jual di resistance).",
    category: "Teknikal",
    aliases: ["konsolidasi", "ranging"],
    relatedSlugs: ["support", "resistance", "uptrend"],
  },
  {
    slug: "candlestick",
    term: "Candlestick",
    definition:
      "Jenis grafik harga berbentuk \"lilin\" yang menampilkan harga buka, tutup, tertinggi, dan terendah dalam satu periode. Badan lilin menunjukkan rentang open–close, sedangkan ekor (shadow) menunjukkan harga ekstrem. Pola candlestick sering dipakai membaca psikologi pasar.",
    category: "Teknikal",
    aliases: ["candle", "grafik lilin"],
    relatedSlugs: ["doji", "volume"],
  },
  {
    slug: "doji",
    term: "Doji",
    definition:
      "Pola candlestick di mana harga buka dan tutup hampir sama, sehingga badan lilinnya sangat tipis. Doji menandakan keraguan atau keseimbangan antara pembeli dan penjual, dan sering muncul sebagai sinyal potensi pembalikan arah — terutama di puncak atau dasar tren.",
    category: "Teknikal",
    aliases: ["doji candle"],
    relatedSlugs: ["candlestick"],
  },
  {
    slug: "moving-average",
    term: "Moving Average",
    definition:
      "Indikator yang menghaluskan pergerakan harga dengan merata-ratakan harga selama sejumlah periode (mis. MA20, MA50). Moving average membantu kamu melihat arah tren dan sering jadi acuan support/resistance dinamis. Persilangan dua MA (golden cross / death cross) dipakai sebagai sinyal.",
    category: "Teknikal",
    aliases: ["MA", "rata-rata bergerak", "EMA", "SMA"],
    relatedSlugs: ["macd", "uptrend", "support"],
  },
  {
    slug: "rsi",
    term: "RSI",
    definition:
      "Relative Strength Index — indikator momentum berskala 0–100 yang mengukur kecepatan dan besarnya pergerakan harga. Umumnya RSI di atas 70 dianggap overbought (jenuh beli) dan di bawah 30 oversold (jenuh jual). Berguna untuk mendeteksi potensi pembalikan, tapi jangan dipakai sendirian.",
    category: "Teknikal",
    aliases: ["Relative Strength Index"],
    relatedSlugs: ["macd", "stochastic", "moving-average"],
  },
  {
    slug: "macd",
    term: "MACD",
    definition:
      "Moving Average Convergence Divergence — indikator yang membandingkan dua moving average untuk menangkap perubahan momentum dan arah tren. Persilangan garis MACD dengan garis sinyal sering dipakai sebagai pemicu beli/jual. Sumbu histogramnya menunjukkan kekuatan momentum.",
    category: "Teknikal",
    aliases: ["Moving Average Convergence Divergence"],
    relatedSlugs: ["moving-average", "rsi", "stochastic"],
  },
  {
    slug: "stochastic",
    term: "Stochastic",
    definition:
      "Stochastic Oscillator — indikator momentum yang membandingkan harga tutup terhadap rentang harga selama periode tertentu, berskala 0–100. Mirip RSI, di atas 80 dianggap overbought dan di bawah 20 oversold. Persilangan garis %K dan %D dipakai sebagai sinyal.",
    category: "Teknikal",
    aliases: ["stochastic oscillator", "stoch"],
    relatedSlugs: ["rsi", "macd"],
  },
  {
    slug: "elliott-wave",
    term: "Elliott Wave",
    definition:
      "Teori analisis teknikal yang menyatakan harga bergerak dalam pola gelombang berulang yang mencerminkan psikologi massa — umumnya 5 gelombang searah tren (impulse) diikuti 3 gelombang koreksi. Dengan menghitung posisi gelombang, trader mencoba memperkirakan arah berikutnya. Butuh latihan karena penghitungannya subjektif.",
    category: "Teknikal",
    aliases: ["Elliott Wave Theory", "gelombang Elliott"],
    relatedSlugs: ["fibonacci", "koreksi", "uptrend"],
  },
  {
    slug: "fibonacci",
    term: "Fibonacci",
    definition:
      "Alat analisis teknikal yang memakai rasio dari deret Fibonacci (mis. 23,6%, 38,2%, 50%, 61,8%) untuk memperkirakan level support/resistance potensial saat harga retrace (mundur) atau extension (melaju). Banyak dipakai bersama Elliott Wave untuk menentukan target dan area entry.",
    category: "Teknikal",
    aliases: ["fibo", "fibonacci retracement"],
    relatedSlugs: ["elliott-wave", "support", "resistance"],
  },

  // ===== Manajemen risiko / strategi =====
  {
    slug: "cut-loss",
    term: "Cut Loss",
    definition:
      "Tindakan menjual saham yang sedang rugi untuk membatasi kerugian agar tidak makin dalam. Cut loss memang menyakitkan, tapi ini disiplin penting supaya modalmu tetap terjaga dan bisa dialihkan ke peluang yang lebih baik. Lebih baik rugi kecil terkendali daripada nyangkut tak berujung.",
    category: "Umum",
    aliases: ["cutloss", "stop rugi"],
    relatedSlugs: ["stop-loss", "nyangkut", "take-profit"],
  },
  {
    slug: "stop-loss",
    term: "Stop Loss",
    definition:
      "Batas harga yang kamu tetapkan sebelumnya untuk otomatis (atau manual) menjual saham kalau harganya turun ke level itu. Tujuannya membatasi kerugian sesuai rencana. Bedanya dengan cut loss: stop loss adalah rencananya, cut loss adalah eksekusinya.",
    category: "Umum",
    aliases: ["SL", "stoploss"],
    relatedSlugs: ["cut-loss", "take-profit", "trailing-stop"],
  },
  {
    slug: "take-profit",
    term: "Take Profit",
    definition:
      "Tindakan menjual saham untuk merealisasikan keuntungan saat harga mencapai target yang sudah kamu tentukan. \"Cuan belum jadi cuan sampai dijual\" — take profit memastikan keuntunganmu benar-benar masuk kantong, bukan cuma di atas kertas.",
    category: "Umum",
    aliases: ["TP", "profit taking"],
    relatedSlugs: ["stop-loss", "cut-loss", "trailing-stop"],
  },
  {
    slug: "trailing-stop",
    term: "Trailing Stop",
    definition:
      "Variasi stop loss yang ikut \"bergerak naik\" mengikuti kenaikan harga, tapi tidak turun saat harga melemah. Dengan trailing stop, kamu mengunci sebagian keuntungan sambil tetap memberi ruang harga untuk naik. Begitu harga berbalik turun ke level trailing, posisi dijual.",
    category: "Umum",
    aliases: ["trailing stop loss"],
    relatedSlugs: ["stop-loss", "take-profit"],
  },
  {
    slug: "average-down",
    term: "Average Down",
    definition:
      "Strategi menambah beli saham saat harganya turun, supaya rata-rata harga belimu jadi lebih rendah. Kalau harga akhirnya naik, kamu balik modal lebih cepat. Tapi hati-hati: average down di saham bermasalah malah bisa memperbesar kerugian (\"averaging into a falling knife\").",
    category: "Umum",
    aliases: ["avg down", "averaging down"],
    relatedSlugs: ["average-up", "nyangkut", "cut-loss"],
  },
  {
    slug: "average-up",
    term: "Average Up",
    definition:
      "Strategi menambah beli saham saat harganya justru sedang naik, untuk memperbesar posisi pada tren yang sudah terbukti menguat. Risikonya rata-rata harga belimu jadi lebih tinggi, jadi biasanya dipakai trader yang mengikuti momentum dengan manajemen risiko ketat.",
    category: "Umum",
    aliases: ["avg up", "averaging up", "piramida"],
    relatedSlugs: ["average-down", "uptrend"],
  },

  // ===== Bandarmologi =====
  {
    slug: "bandarmologi",
    term: "Bandarmologi",
    definition:
      "Pendekatan analisis yang mencoba melacak pergerakan \"bandar\" atau pemain besar (institusi, investor kakap) lewat data transaksi seperti broker summary, akumulasi, dan distribusi. Idenya: kalau kamu tahu ke mana uang besar mengalir, kamu bisa ikut menumpang arahnya.",
    category: "Bandarmologi",
    aliases: ["bandarmology", "tracking bandar"],
    relatedSlugs: ["foreign-flow", "net-buy-net-sell", "akumulasi"],
  },
  {
    slug: "foreign-flow",
    term: "Foreign Flow",
    definition:
      "Arus dana investor asing yang masuk (foreign inflow) atau keluar (foreign outflow) dari pasar saham Indonesia. Foreign flow sering dipantau karena investor asing kerap menggerakkan saham blue chip dan IHSG. Inflow besar biasanya sentimen positif, outflow sebaliknya.",
    category: "Bandarmologi",
    aliases: ["foreign inflow", "foreign outflow", "asing"],
    relatedSlugs: ["net-buy-net-sell", "bandarmologi", "ihsg"],
  },
  {
    slug: "net-buy-net-sell",
    term: "Net Buy/Net Sell",
    definition:
      "Selisih antara total beli dan total jual suatu kelompok pelaku pasar (mis. asing) dalam periode tertentu. Net buy berarti lebih banyak beli daripada jual (akumulasi bersih), net sell sebaliknya (distribusi bersih). Sering dipakai mengukur minat asing terhadap sebuah saham.",
    category: "Bandarmologi",
    aliases: ["net buy", "net sell", "net foreign"],
    relatedSlugs: ["foreign-flow", "bandarmologi", "akumulasi"],
  },
  {
    slug: "akumulasi",
    term: "Akumulasi",
    definition:
      "Fase ketika pemain besar diam-diam mengumpulkan saham dalam jumlah banyak, biasanya saat harga masih rendah dan sepi perhatian. Tanda-tandanya bisa terlihat dari net buy berkelanjutan dan volume yang perlahan naik. Lawannya adalah distribusi.",
    category: "Bandarmologi",
    aliases: ["accumulation"],
    relatedSlugs: ["distribusi", "bandarmologi", "net-buy-net-sell"],
  },
  {
    slug: "distribusi",
    term: "Distribusi",
    definition:
      "Fase ketika pemain besar melepas (menjual) saham yang sudah mereka akumulasi, biasanya saat harga sudah tinggi dan ramai diburu retail. Distribusi sering menandai akhir tren naik. Kalau kamu lihat tanda distribusi, hati-hati jangan jadi pembeli terakhir.",
    category: "Bandarmologi",
    aliases: ["distribution"],
    relatedSlugs: ["akumulasi", "bandarmologi", "pom-pom"],
  },
  {
    slug: "broker-summary",
    term: "Broker Summary",
    definition:
      "Rekap aktivitas beli dan jual sebuah saham yang dikelompokkan per broker (sekuritas) dalam periode tertentu. Praktisi bandarmologi membaca broker summary untuk menebak broker mana yang sedang akumulasi atau distribusi, dan menyimpulkan arah \"bandar\".",
    category: "Bandarmologi",
    aliases: ["bandar detector", "broker summary"],
    relatedSlugs: ["bandarmologi", "akumulasi", "distribusi"],
  },
];

export async function seedGlossary(): Promise<void> {
  logger.info(`Seeding ${TERMS.length} glossary terms...`);
  for (const t of TERMS) {
    const row: NewGlossaryTerm = {
      slug: t.slug,
      term: t.term,
      definition: t.definition,
      category: t.category,
      aliases: t.aliases ?? [],
      relatedSlugs: t.relatedSlugs ?? [],
      published: true,
    };
    await db
      .insert(glossaryTerms)
      .values(row)
      .onConflictDoUpdate({
        target: glossaryTerms.slug,
        set: {
          term: row.term,
          definition: row.definition,
          category: row.category,
          aliases: row.aliases,
          relatedSlugs: row.relatedSlugs,
          published: row.published,
          updatedAt: sql`now()`,
        },
      });
  }
  logger.info(`Seeded ${TERMS.length} glossary terms`);
}

async function main() {
  await seedGlossary();
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logger.error({ err }, "seed glossary failed");
    process.exit(1);
  });
}
