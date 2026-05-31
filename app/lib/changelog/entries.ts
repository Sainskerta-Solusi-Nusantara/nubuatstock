/**
 * Sumber data changelog "Apa yang baru" yang tampil di bell navbar.
 *
 * Aturan:
 * - Urut TERBARU di paling atas (index 0).
 * - `version` dipakai sebagai penanda "seen" di localStorage; bandingkan
 *   secara semver-ish via `compareVersions` di helper bawah.
 * - Tulis `items` ringkas & ramah ("kamu"), fokus ke manfaat buat user.
 */
export interface ChangelogEntry {
  /** Versi rilis, mis. "1.4.0". Dipakai untuk tracking "sudah dilihat". */
  version: string;
  /** Tanggal rilis dalam format ISO (YYYY-MM-DD). */
  date: string;
  /** Judul singkat rilis. */
  title: string;
  /** Daftar perubahan/fitur, ditulis ramah dan ringkas. */
  items: string[];
}

/** Entry changelog, urut terbaru dulu. */
export const changelogEntries: ChangelogEntry[] = [
  {
    version: "1.8.0",
    date: "2026-05-31",
    title: "Academy makin lengkap + diagram di mana-mana",
    items: [
      "3 modul baru: Psikologi & Money Management, Bandarmology Lanjutan, dan Candlestick Patterns Lengkap (25+ pola).",
      "Modul lama kini dilengkapi gambar/diagram — candlestick, support-resistance, risk-reward, dan lainnya.",
      "Sertifikat Try Out di-desain ulang (tema putih-hijau) biar lebih rapi.",
      "Kami pasang analitik traffic biar bisa terus memperbaiki pengalaman kamu.",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-05-31",
    title: "Academy WMI, Try Out & modul Elliott/Wyckoff",
    items: [
      "Modul WMI (Wakil Manajer Investasi) + Try Out 10 paket soal lengkap dengan pembahasan.",
      "Lulus Try Out? Unduh sertifikat penyelesaian dalam bentuk PDF.",
      "Modul Elliott Wave & Wyckoff selengkapnya — disertai diagram biar gampang dipahami.",
      "Riwayat skor Try Out tersimpan, plus contoh sekuritas populer di materi buka rekening.",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-05-31",
    title: "Notifikasi: lonceng, WhatsApp & push browser",
    items: [
      "Lonceng notifikasi di header + halaman riwayat notifikasi.",
      "Alert saham bisa dikirim ke WhatsApp kamu (opt-in, ada jam tenang & batas harian biar tak spam).",
      "Notifikasi push langsung di browser/HP walau app ditutup (PWA).",
      "Atur semua kanal & jenis notifikasi di Pengaturan → Notifikasi.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-05-31",
    title: "Terminal Pro, Paper Trading, Ajak Teman & lainnya",
    items: [
      "Terminal Pro: workspace multi-chart untuk pantau banyak emiten sekaligus.",
      "Paper Trading modal virtual Rp100jt + Hall of Fame leaderboard.",
      "Backtest lanjutan (walk-forward & Monte Carlo) untuk uji strategi lebih dalam.",
      "Program Ajak Teman (referral) berhadiah kredit + AI Buddy makin pintar (sumber & Deep Mode).",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-05-29",
    title: "Elliott Wave & teman-temannya",
    items: [
      "Analisis Elliott Wave per emiten: kamu bisa lihat hitungan wave langsung di chart, lengkap dengan narasi AI yang menjelaskan posisi gelombang saat ini.",
      "Glossary istilah: bingung sama istilah teknikal? Buka kamus singkat di dalam app.",
      "Halaman About Us biar kamu makin kenal siapa di balik Nubuat.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-05-20",
    title: "Tampil lebih rapi & cepat dikenali",
    items: [
      "Logo emiten kini muncul di daftar dan halaman detail, jadi lebih gampang kamu kenali.",
      "Screener \"Swing Santai\" baru: preset siap pakai buat kamu yang trading tanpa harus melototin chart seharian.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-05-10",
    title: "Nyaman dipakai kapan pun",
    items: [
      "Dark mode hadir! Mata kamu aman walau analisis sampai larut malam.",
      "Nubuat sekarang bisa di-install sebagai aplikasi (PWA) di HP maupun desktop kamu.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-28",
    title: "Jejak rekomendasi yang transparan",
    items: [
      "Arsip picks: kamu bisa menengok kembali semua rekomendasi sebelumnya beserta hasilnya.",
    ],
  },
];

/** Versi terbaru (entry paling atas). */
export const latestChangelogVersion: string =
  changelogEntries[0]?.version ?? "0.0.0";

/**
 * Bandingkan dua versi bergaya semver ("1.4.0" vs "1.3.10").
 * @returns angka < 0 jika a < b, 0 jika sama, > 0 jika a > b.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
