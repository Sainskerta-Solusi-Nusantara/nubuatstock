import { db } from "../../lib/db";
import { appConfig } from "../schema/config";
import { logger } from "../../lib/logger";

/**
 * Seed landing page content sebagai DB-driven CMS.
 *
 * Semua text, stat, painpoint, fitur, FAQ, dan emiten showcase di-store sebagai
 * jsonb di `app_config` (category="landing"). Superadmin edit via /superadmin/landing.
 *
 * Icon untuk painpoint & feature di-map dari `id` string ke Lucide icon di
 * component (lib/landing-icons.ts). Admin tidak edit icon — hanya text.
 */

interface LandingConfigEntry {
  key: string;
  value: unknown;
  type: string;
  description: string;
}

const landingDefaults: LandingConfigEntry[] = [
  // ===== HERO =====
  {
    key: "landing.hero.badge",
    value: "Beta launch — akses awal terbatas",
    type: "string",
    description: "Badge kecil di atas headline hero.",
  },
  {
    key: "landing.hero.headline_lead",
    value: "Berhenti",
    type: "string",
    description: "Kata pembuka headline sebelum highlight bearish.",
  },
  {
    key: "landing.hero.headline_bearish",
    value: "nyangkut",
    type: "string",
    description: "Kata dengan highlight warna bearish (merah).",
  },
  {
    key: "landing.hero.headline_middle",
    value: ". Mulai",
    type: "string",
    description: "Penghubung antara bearish dan bullish.",
  },
  {
    key: "landing.hero.headline_bullish",
    value: "profit",
    type: "string",
    description: "Kata dengan highlight warna bullish (hijau).",
  },
  {
    key: "landing.hero.headline_tail",
    value: "dari data.",
    type: "string",
    description: "Penutup headline.",
  },
  {
    key: "landing.hero.subheadline",
    value: "menganalisa setiap entry sebelum kamu klik beli — multi-lensa Technical, Fundamental, Bandarmology, dan AI yang menjelaskan keputusannya dalam Bahasa Indonesia.",
    type: "string",
    description: "Subheadline di bawah headline. Akan di-prefix nama app + suffix tagline.",
  },
  {
    key: "landing.hero.cta_primary",
    value: "Coba Gratis 7 Hari",
    type: "string",
    description: "CTA primary di hero.",
  },
  {
    key: "landing.hero.cta_secondary",
    value: "Lihat semua fitur",
    type: "string",
    description: "CTA secondary di hero.",
  },
  {
    key: "landing.hero.cta_note",
    value: "Tanpa kartu kredit · Tier Pro penuh selama 7 hari · Auto turun ke Free, tidak ada charge mendadak",
    type: "string",
    description: "Catatan kecil di bawah CTA.",
  },
  {
    key: "landing.hero.stats",
    value: [
      { label: "Emiten BEI dianalisa", value: "960+" },
      { label: "Lensa analisis", value: "5" },
      { label: "Daily Picks dengan SR/SL/TP", value: "10/hari" },
      { label: "Bahasa Indonesia native", value: "100%" },
    ],
    type: "json",
    description: "4 stat strip di bawah hero CTA.",
  },
  {
    key: "landing.hero.background_image",
    value: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=70&fm=webp&auto=format",
    type: "string",
    description: "URL Unsplash untuk background hero (sudah optimized).",
  },

  // ===== PAINPOINTS =====
  {
    key: "landing.painpoints.headline_lead",
    value: "Trader retail Indonesia kalah karena",
    type: "string",
    description: "Bagian pembuka headline painpoints.",
  },
  {
    key: "landing.painpoints.headline_highlight",
    value: "empat hal yang sama",
    type: "string",
    description: "Bagian highlight di headline painpoints (warna bear).",
  },
  {
    key: "landing.painpoints.subtitle",
    value: "Bukan karena tidak pintar. Tapi karena tidak punya kerangka data yang konsisten untuk setiap entry & exit.",
    type: "string",
    description: "Subtitle painpoints.",
  },
  {
    key: "landing.painpoints.items",
    value: [
      { id: "fomo", title: "Beli di puncak karena FOMO", body: "Lihat trending di grup Telegram, klik beli — besoknya minus 8%. Tidak ada konteks: tren beneran atau pump terkoordinasi?" },
      { id: "sl", title: "Stop loss tebakan, modal habis", body: "Set SL di angka random. Sering kena wick lalu langsung rally — atau SL terlalu jauh, modal habis sebelum reversal." },
      { id: "cutloss", title: "Cut loss telat, makin dalam", body: "Ingin menunggu balik modal. Akhirnya nyangkut di -30%. Modal beku, peluang lain terlewat." },
      { id: "noplan", title: "Hold tanpa data, hanya harap", body: "Tidak tahu kapan jual. Tidak ada thesis. Tidak ada level. Setiap candle bikin deg-degan tanpa kerangka berpikir." },
    ],
    type: "json",
    description: "4 kartu painpoint. Field id memetakan ke icon di komponen.",
  },
  {
    key: "landing.painpoints.footnote",
    value: "Jawabannya bukan analisa lebih banyak — tapi analisa multi-lensa yang konsisten, dengan level entry/SL/TP eksplisit & alasan yang transparan.",
    type: "string",
    description: "Catatan penutup painpoints.",
  },

  // ===== FEATURES =====
  {
    key: "landing.features.headline_lead",
    value: "Semua yang kamu butuhkan untuk",
    type: "string",
    description: "Bagian pembuka headline features.",
  },
  {
    key: "landing.features.headline_highlight",
    value: "trading yang disiplin",
    type: "string",
    description: "Highlight bullish di headline features.",
  },
  {
    key: "landing.features.subtitle",
    value: "Bukan lima aplikasi yang tidak terhubung. Satu workspace, lima lensa data, AI yang menjelaskan setiap sinyal.",
    type: "string",
    description: "Subtitle features.",
  },
  {
    key: "landing.features.items",
    value: [
      { id: "multilens", badge: "Inti", title: "5 lensa analisis dalam satu verdict", body: "Technical + Fundamental + Bandarmology + Brokermology + Macro digabung jadi satu skor 0–100 dengan breakdown faktor transparan. Bukan black box." },
      { id: "picks", badge: "Killer", title: "Daily Picks dengan SR/SL/TP konkrit", body: "Bukan rekomendasi 'BBRI bagus'. Tapi: entry zone Rp 4.700–4.760, SL Rp 4.620, TP1 Rp 4.880 (R/R 1.7), setup pullback, time horizon 3–5 hari." },
      { id: "ai", badge: "AI", title: "AI Copilot DeepSeek bilingual", body: "Tanya 'Kenapa GOTO turun hari ini?' atau 'Bandingkan ANTM vs MDKA dari sisi PE forward'. Bahasa Indonesia, jawaban dengan sumber & disclaimer." },
      { id: "research", badge: "Hemat waktu", title: "Research Aggregator 15+ sekuritas", body: "Konsensus target price BRI Danareksa, Mandiri Sekuritas, Mirae, Trimegah dll — di-summarize otomatis. Tidak perlu cek satu-satu." },
      { id: "bandar", badge: "Edge", title: "Bandarmology & Foreign Flow", body: "Broker concentration heatmap, foreign flow intraday 5m (tier Pro), accumulation phase tagger. Lihat siapa yang 'bergerak duluan'." },
      { id: "cmd", badge: "Power user", title: "Bloomberg-style command palette", body: "Tekan Cmd+K, ketik 'BBRI', langsung buka. Atau 'EQS' untuk screener, 'BMAP' untuk broker map. Cepat seperti terminal pro." },
      { id: "alerts", badge: "Disiplin", title: "Alerts multi-channel", body: "Price level, % change, volume spike, MA cross, RSI overbought. Push, email, WhatsApp. Tidak ketinggalan momen penting." },
      { id: "paper", badge: "Risk-free", title: "Paper trading + backtest", body: "Test strategi dengan virtual Rp 100 jt sebelum risk uang asli. Backtest no-code, walk-forward validation otomatis." },
    ],
    type: "json",
    description: "8 fitur utama. Field id memetakan ke icon.",
  },

  // ===== EMITEN SHOWCASE =====
  {
    key: "landing.emiten.headline",
    value: "Emiten favorit ritel — sudah di-cover sejak hari pertama",
    type: "string",
    description: "Headline emiten showcase.",
  },
  {
    key: "landing.emiten.subtitle",
    value: "Saham yang sering kamu pantau (atau nyangkut) sudah masuk universe analisa. Total 960+ emiten BEI, dari LQ45 sampai papan akselerasi.",
    type: "string",
    description: "Subtitle emiten showcase.",
  },
  {
    key: "landing.emiten.tickers",
    value: [
      { kode: "BBRI", nama: "Bank Rakyat Indonesia", sektor: "Financials", tag: "Banking-blue chip" },
      { kode: "BBCA", nama: "Bank Central Asia", sektor: "Financials", tag: "Banking-blue chip" },
      { kode: "BMRI", nama: "Bank Mandiri", sektor: "Financials", tag: "Banking-blue chip" },
      { kode: "TLKM", nama: "Telkom Indonesia", sektor: "Infrastructures", tag: "Telco BUMN" },
      { kode: "ASII", nama: "Astra International", sektor: "Industrials", tag: "Konglomerat" },
      { kode: "GOTO", nama: "GoTo Gojek Tokopedia", sektor: "Technology", tag: "Tech retail-fav" },
      { kode: "ANTM", nama: "Aneka Tambang", sektor: "Basic Materials", tag: "Nikel/emas" },
      { kode: "ADRO", nama: "Alamtri Resources", sektor: "Energy", tag: "Batu bara" },
      { kode: "MDKA", nama: "Merdeka Copper Gold", sektor: "Basic Materials", tag: "Tembaga/emas" },
      { kode: "UNVR", nama: "Unilever Indonesia", sektor: "Consumer Staples", tag: "Consumer" },
      { kode: "INDF", nama: "Indofood Sukses Makmur", sektor: "Consumer Staples", tag: "Consumer" },
      { kode: "PTBA", nama: "Bukit Asam", sektor: "Energy", tag: "Batu bara BUMN" },
    ],
    type: "json",
    description: "Daftar emiten yang ditampilkan di landing. Superadmin bisa tambah/hapus.",
  },

  // ===== HOW IT WORKS =====
  {
    key: "landing.how.headline_lead",
    value: "4 langkah dari nyangkut ke",
    type: "string",
    description: "Bagian pembuka headline how-it-works.",
  },
  {
    key: "landing.how.headline_highlight",
    value: "disiplin",
    type: "string",
    description: "Highlight bullish.",
  },
  {
    key: "landing.how.subtitle",
    value: "Tidak perlu pelatihan minggu-minggu. Kerangka kerja siap-pakai dalam hari pertama.",
    type: "string",
    description: "Subtitle how-it-works.",
  },
  {
    key: "landing.how.steps",
    value: [
      { n: "01", title: "Daftar 30 detik, gratis 7 hari", body: "Hanya email + password. Tanpa kartu kredit. Akses penuh tier Pro selama 7 hari untuk test semua fitur." },
      { n: "02", title: "Set watchlist & alert", body: "Tambah saham yang kamu pantau. Set alert harga, volume spike, MA cross. Notifikasi di app + email." },
      { n: "03", title: "Lihat Daily Picks pagi & tanya AI", body: "Setiap pagi sebelum bursa buka, dapat 3–10 pick dengan SR/SL/TP. Tanya AI: kenapa pilih ini, apa risikonya." },
      { n: "04", title: "Entry sesuai zona, exit sesuai plan", body: "Tidak lagi tebak-tebakan. Setiap entry punya alasan, setiap exit punya level. Catat di journal, evaluasi." },
    ],
    type: "json",
    description: "4 langkah dalam how-it-works.",
  },

  // ===== TRIAL CTA =====
  {
    key: "landing.trial.headline",
    value: "Coba 7 hari, gratis penuh — tanpa kartu kredit",
    type: "string",
    description: "Headline trial CTA section.",
  },
  {
    key: "landing.trial.description",
    value: "Trial penuh tier Pro (senilai Rp 299rb/bulan). Tidak ada lock-in. Tidak ada charge mendadak. Kalau cocok, lanjut. Kalau tidak, auto turun ke Free.",
    type: "string",
    description: "Deskripsi trial CTA.",
  },
  {
    key: "landing.trial.cta",
    value: "Mulai Trial Sekarang",
    type: "string",
    description: "Teks tombol trial CTA.",
  },
  {
    key: "landing.trial.inclusions",
    value: [
      "Akses semua fitur tier Pro selama 7 hari",
      "Real-time quote semua emiten BEI",
      "Daily Picks dengan SR/SL/TP konkrit",
      "AI Copilot DeepSeek — 50 query/hari",
      "Bandarmology basic + foreign flow harian",
      "Watchlist unlimited + alerts unlimited",
      "Tanpa kartu kredit, tanpa charge mendadak",
      "Auto turun ke tier Free setelah 7 hari kalau tidak upgrade",
    ],
    type: "json",
    description: "Daftar checklist trial CTA.",
  },

  // ===== FAQ =====
  {
    key: "landing.faq.headline",
    value: "Pertanyaan yang sering ditanya",
    type: "string",
    description: "Headline FAQ.",
  },
  {
    key: "landing.faq.items",
    value: [
      { q: "Apakah saya butuh akun broker untuk pakai Nubuat?", a: "Tidak. Nubuat adalah platform analisis & informasi — bukan broker. Kamu tetap eksekusi order di broker pilihan kamu. Nubuat memberikan analisa, level entry/SL/TP, dan insight; eksekusi tetap di tangan kamu." },
      { q: "Apakah Nubuat memberikan saran investasi personal?", a: "Tidak. Semua analisa & Daily Picks bersifat informasi & edukasi berbasis data. Bukan ajakan jual/beli efek tertentu untuk kamu secara pribadi. Keputusan investasi selalu jadi tanggung jawab kamu. Lihat disclaimer di bawah." },
      { q: "Berapa biaya setelah trial 7 hari habis?", a: "Tier Free tetap gratis selamanya — kamu bisa lanjut pakai dengan fitur dasar (watchlist 10 emiten, quote delayed 15m, 5 AI query/hari). Mau lanjut tier Starter? Rp 99rb/bulan. Pro Rp 299rb/bulan, Elite Rp 899rb/bulan. Tidak ada auto-charge — kamu harus aktif upgrade." },
      { q: "AI Nubuat pakai model apa?", a: "Default DeepSeek (deepseek-v4-flash). Pengganti dapat di-swap admin ke Anthropic Claude atau OpenAI GPT lewat config — tidak ada vendor lock-in. Setiap response menyertakan disclaimer & sumber data." },
      { q: "Bandarmology — itu bukan teori konspirasi?", a: "Bukan. Bandarmology dalam Nubuat adalah analisis statistik aliran dana: broker mana net-buy/net-sell, foreign flow harian/intraday, volume spike, accumulation/distribution line. Semua data publik dari BEI/KSEI. Bukan tebakan." },
      { q: "Data emiten lengkap berapa?", a: "960+ emiten BEI (semua papan: Utama, Pengembangan, Akselerasi, Ekonomi Baru, Pemantauan Khusus). Daftar di-sync periodik dari KSEI." },
      { q: "Apakah Nubuat sudah berizin OJK?", a: "Saat ini Nubuat positioning sebagai analytics tool & educational platform — analog dengan RTI Business atau TradingView. Izin Penasihat Investasi OJK sedang diproses untuk M9–M12 sesuai roadmap. Tidak ada Personalized investment advice tanpa lisensi." },
      { q: "Bagaimana Nubuat melindungi data saya?", a: "Password Argon2id, semua secret (API key, payment token) encrypted AES-256-GCM, audit log untuk semua mutation sensitif, kompliansi UU PDP 27/2022 (data residency Indonesia)." },
    ],
    type: "json",
    description: "Daftar Q&A FAQ. Superadmin bisa edit, tambah, hapus.",
  },

  // ===== FOOTER =====
  {
    key: "landing.footer.tagline",
    value: "Sains di balik setiap trade. Untuk trader retail Indonesia yang tidak mau nyangkut lagi.",
    type: "string",
    description: "Tagline kecil di footer.",
  },
  {
    key: "landing.footer.image_credits",
    value: "Image credits: Unsplash.",
    type: "string",
    description: "Atribusi image credit di footer.",
  },

  // ===== TRIAL ENGINE CONFIG =====
  {
    key: "trial.duration_days",
    value: 7,
    type: "number",
    description: "Durasi trial dalam hari saat user signup dengan ?trial=pro.",
  },
  {
    key: "trial.default_tier",
    value: "pro",
    type: "string",
    description: "Tier default untuk trial baru.",
  },
  {
    key: "trial.fallback_tier",
    value: "free",
    type: "string",
    description: "Tier yang user di-downgrade setelah trial berakhir.",
  },
];

export async function seedLandingContent() {
  logger.info("Seeding landing CMS content...");
  let inserted = 0;
  for (const entry of landingDefaults) {
    const res = await db
      .insert(appConfig)
      .values({
        key: entry.key,
        scope: {},
        value: entry.value,
        type: entry.type,
        category: "landing",
        description: entry.description,
        isSensitive: false,
      })
      .onConflictDoNothing({ target: [appConfig.key, appConfig.scope] });
    inserted++;
  }
  logger.info(`Seeded ${landingDefaults.length} landing CMS keys (category=landing)`);
}
