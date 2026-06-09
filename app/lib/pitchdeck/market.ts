export const MARKET_SIZE = {
  tam: {
    label: "TAM — Total Addressable Market",
    description: "Seluruh investor pasar modal Indonesia",
    population: "14.4 juta SID (KSEI Mei 2026)",
    annualSpend: "Rp 7.2 Triliun/tahun",
    calculation: "14.4M users × Rp 500k/tahun (avg willingness-to-pay untuk financial tools)",
  },
  sam: {
    label: "SAM — Serviceable Available Market",
    description: "Retail trader aktif yang trading min 1×/minggu",
    population: "~4 juta aktif",
    annualSpend: "Rp 4.8 Triliun/tahun",
    calculation: "4M aktif × Rp 1.2jt/tahun (10% lebih willing-to-pay untuk tools)",
  },
  som: {
    label: "SOM — Serviceable Obtainable Market (3 tahun)",
    description: "Trader aktif yang frustrasi dengan tool existing dan ready untuk subscribe",
    population: "±300K user (5-7% pasar)",
    annualSpend: "Rp 360 Mrd/tahun",
    calculation: "300K × Rp 1.2jt (mix tier Starter–Elite annual)",
  },
};

export const COMPETITORS = [
  {
    name: "Stockbit",
    category: "Broker + Community + Analitik",
    strengths: ["Komunitas terbesar Indonesia", "Fundachart, ratusan indikator", "Free dengan buka rekening saham"],
    weaknesses: ["Broker-tied (conflict of interest)", "UX padat, beginner overload", "AI kurang capable"],
    pricing: "Free (bundled with broker)",
    nubuatAdvantage: "Independent (no broker conflict), AI-first, clean UX",
  },
  {
    name: "RTI Business",
    category: "Data terminal",
    strengths: ["Data terlengkap", "Foreign flow real-time", "Standard industri"],
    weaknesses: ["UX dated dari era 2010-an", "Tidak ada AI/rekomendasi", "Static charts"],
    pricing: "Free (ads-supported) / Premium ~Rp 200k/bln",
    nubuatAdvantage: "Modern UX, AI Buddy, mobile-native",
  },
  {
    name: "HOTS Mirae Asset",
    category: "Broker trading platform",
    strengths: ["Multichart, eksekusi cepat", "Foreign transaction detail"],
    weaknesses: ["Windows-style desktop kuno", "Broker-tied", "No AI"],
    pricing: "Bundled with Mirae account",
    nubuatAdvantage: "Browser-first, cross-broker compatibility, AI-driven analysis",
  },
  {
    name: "IPOT (Indo Premier)",
    category: "Broker + Robot Trading",
    strengths: ["Robot trading auto execution", "Decent screener"],
    weaknesses: ["Broker-tied", "Riset terbatas", "Tidak ada deep analytics"],
    pricing: "Bundled",
    nubuatAdvantage: "Open AI Buddy vs closed robot, multi-lens analysis",
  },
  {
    name: "AlphaFlow (klinikpenyesalan.com)",
    category: "Smart money flow analytics (niche)",
    strengths: ["Smart Money Tracker", "Wyckoff phase", "Verdict scoring 0-10"],
    weaknesses: ["Belum punya fundamental analysis", "No research aggregation", "No mobile native"],
    pricing: "Rp 99k/bulan",
    nubuatAdvantage: "Multi-lens (bukan flow saja), Research module, mobile/desktop, broader feature set",
  },
  {
    name: "TradingView",
    category: "Charting global",
    strengths: ["Charting terbaik dunia", "Pine Script", "Replay feature"],
    weaknesses: ["Data IDX delayed/expensive", "Bukan Indonesia-specific", "USD pricing mahal"],
    pricing: "$14.95–59.95/bulan (~Rp 250k–1jt)",
    nubuatAdvantage: "Indonesia-native data + AI + research + setengah harga",
  },
  {
    name: "Bloomberg Terminal",
    category: "Institusional",
    strengths: ["Gold standard institutional"],
    weaknesses: ["Tidak Indonesia-centric", "USD ~2k/bulan tidak terjangkau retail"],
    pricing: "USD 24k+/tahun",
    nubuatAdvantage: "Bloomberg-grade analytics di harga retail Indonesia",
  },
];

export const CUSTOMER_PERSONAS = [
  {
    name: "Budi — Trader Awam (Free → Starter)",
    demographics: "27 tahun, software engineer, AUM Rp 50jt, Jakarta",
    behavior: "Beli saham karena rekomendasi grup Telegram, 60% portfolio nyangkut, frustrasi tapi belum mau berhenti trading",
    needs: "Kerangka analisis simple, alert otomatis, daily picks dengan SR/SL/TP eksplisit supaya tidak tebak-tebakan",
    targetTier: "Starter Rp 99k/bln (setelah 1-day trial)",
    valueAlign: "Daily Picks + AI Buddy menjelaskan setiap entry — feel 'guided' tapi tetap mandiri",
  },
  {
    name: "Sari — Swing Trader Aktif (Pro)",
    demographics: "34 tahun, manager finance, AUM Rp 500jt, multi-position",
    behavior: "Aktif trading 2-3 entry/minggu, baca riset sekuritas, butuh data broker flow & multi-timeframe analysis",
    needs: "Brokermology full, foreign flow intraday, multi-chart workspace, research aggregator untuk hemat waktu riset",
    targetTier: "Pro Rp 299k/bln",
    valueAlign: "Bandarmology + Brokermology data yang biasanya hanya di-akses lewat lisensi mahal",
  },
  {
    name: "Andre — Day Trader / Power User (Elite)",
    demographics: "29 tahun, full-time trader, AUM Rp 2-5Mrd, trade harian",
    behavior: "Eksekusi 5-10 trade/hari, butuh latency rendah, L2 depth, paper trading untuk test strategy baru",
    needs: "Real-time tick, foreign flow 5m, paper trading, strategy backtest, API access untuk custom indicator",
    targetTier: "Elite Rp 899k/bln",
    valueAlign: "Toolset pro-grade tanpa subscribe Bloomberg/Refinitiv",
  },
  {
    name: "Maya — Fundamental Investor (Pro/Elite)",
    demographics: "42 tahun, founder UMKM, AUM Rp 1Mrd, hold 1-3 tahun",
    behavior: "Buy-and-hold, fokus dividend yielder & growth, baca laporan keuangan rinci",
    needs: "DCF/valuasi otomatis, peer comparison, financial trend 10 tahun, research dengan target price konsensus",
    targetTier: "Pro Rp 299k/bln (Elite kalau dapat lifetime deal)",
    valueAlign: "Research Aggregator + AI yang bisa summary 5 sekuritas dalam 1 query",
  },
  {
    name: "PT XYZ Sekuritas — Institusional Lead",
    demographics: "Sekuritas tier 2, 50-150 dealer, butuh internal research tools",
    behavior: "Cari white-label analytics, multi-seat license, custom data feed",
    needs: "Multi-seat, white-label branding, dedicated support, custom data export",
    targetTier: "Institutional Rp 25jt+/bln",
    valueAlign: "B2B revenue stream, akselerasi profit margin",
  },
];

export const WHY_NOW = [
  {
    title: "Penetrasi investor saham menanjak",
    body: "SID di KSEI tumbuh dari 2.5M (2019) → 14.4M (2026), CAGR 33%. Mayoritas pendatang baru milenial/Gen-Z yang demand tools setara profesional tapi affordable.",
  },
  {
    title: "AI sudah cukup baik & murah",
    body: "LLM generasi baru (2024+) menawarkan kualitas mendekati GPT-4 dengan harga 90% lebih murah. Memungkinkan AI Buddy dengan unit economics yang viable untuk B2C Indonesia.",
  },
  {
    title: "Kompetitor lokal stagnan",
    body: "Stockbit dominan tapi UX dan analitik tidak banyak berubah 3 tahun terakhir. RTI Business UI dari era 2010. Window terbuka untuk produk modern.",
  },
  {
    title: "Regulasi OJK mulai mendukung fintech advisory",
    body: "POJK 32/2025 dan SEOJK terbaru membuka jalur lisensi Penasihat Investasi yang lebih jelas. 2-3 tahun lalu masih grey area.",
  },
  {
    title: "Infrastruktur cloud serverless matang",
    body: "Neon, Upstash, Vercel/Fly memungkinkan startup bootstrap tanpa CapEx infrastructure. Scale on-demand. Mengurangi upfront capital 5-10×.",
  },
  {
    title: "Pasca-kenaikan suku bunga BI, saham comeback",
    body: "Cycle pelunakan BI rate memulai re-rating equity. Volume retail trading naik. Window opportunity 2-3 tahun untuk capture market share.",
  },
];

export const GO_TO_MARKET = [
  {
    phase: "Pre-Launch (M0–M3)",
    channels: ["Closed alpha 500 user invite-only", "Community: Discord/Telegram beta tester", "Founder content di X/Twitter & LinkedIn"],
    cac: "Rp 0–50K/user (organic word-of-mouth)",
    target: "500 user untuk validate PMF + collect testimonial",
  },
  {
    phase: "Beta Public Launch (M3–M6)",
    channels: ["Product Hunt launch", "Komunitas trading Telegram (paid takeover)", "YouTube influencer (Indo-trading channels)", "SEO content: 'cara analisis saham', '[ticker] valuasi'"],
    cac: "Rp 100–300K/user (paid + organic mix)",
    target: "5K signup, 250 paying (5% conversion)",
  },
  {
    phase: "Scale (M6–M18)",
    channels: ["Performance marketing (Meta + Google Ads)", "Affiliate program (10–20% recurring commission)", "Partnership dengan komunitas/edukator", "PR media keuangan (Kontan, Investor)"],
    cac: "Rp 200–400K/user",
    target: "50K signup, 2.5K paying. LTV/CAC ≥ 3:1 untuk justify scaling spend",
  },
  {
    phase: "Mainstream (M18+)",
    channels: ["TV ads + outdoor (saat budget allow)", "B2B sales tim untuk Institutional tier", "International expansion (Malaysia, Singapura, Thailand, Vietnam)"],
    cac: "Rp 300–500K/user (mainstream higher)",
    target: "500K+ user, regional dominance",
  },
];
