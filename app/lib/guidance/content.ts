/**
 * Guidance content — single source of truth untuk dokumentasi in-app.
 *
 * Pisahkan dari page UI supaya:
 * - Mudah update tanpa edit layout
 * - Bisa di-reuse untuk AI Buddy context, kalau user tanya "cara pakai X"
 * - Future: bisa migrate ke DB / CMS supaya superadmin bisa edit
 */

export interface GuidanceSection {
  id: string;
  category: string;
  title: string;
  icon: string; // lucide icon name
  summary: string;
  contents: GuidanceBlock[];
}

export type GuidanceBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "code"; lang: string; text: string }
  | { type: "note"; tone: "info" | "warning" | "success"; title: string; body: string }
  | { type: "kv"; rows: Array<{ key: string; value: string }> }
  | { type: "steps"; items: Array<{ title: string; body: string }> };

export const GUIDANCE_SECTIONS: GuidanceSection[] = [
  // ============================ DASHBOARD ============================
  {
    id: "dashboard",
    category: "Mulai dari Sini",
    title: "Dashboard",
    icon: "Home",
    summary: "Halaman utama yang merangkum Daily Picks, watchlist, dan alert aktif. Akses cepat ke semua modul.",
    contents: [
      { type: "paragraph", text: "Setelah login, kamu akan dibawa ke Dashboard. Ini adalah command center harian kamu." },
      { type: "heading", level: 3, text: "Apa yang ada di Dashboard" },
      {
        type: "list",
        items: [
          "**Daily Picks** — Top 5 rekomendasi harian dari engine multi-faktor, dengan entry/SL/TP konkrit.",
          "**Watchlist Snapshot** — Performance ringkasan emiten yang kamu follow.",
          "**Alerts Aktif** — Trigger alerts yang baru saja terpicu.",
          "**Pintasan menu** — link cepat ke Screener, Compare, Sectors, AI Buddy, dan modul lainnya.",
        ],
      },
      { type: "heading", level: 3, text: "Cara pakai" },
      {
        type: "steps",
        items: [
          { title: "Cek Daily Picks pertama", body: "Lihat 5 saham yang di-rekomendasikan hari ini. Klik salah satu untuk masuk ke halaman ticker." },
          { title: "Review watchlist", body: "Pantau emiten yang kamu track — perhatikan yang naik/turun signifikan." },
          { title: "Cek alerts", body: "Kalau ada alert ter-trigger, ambil tindakan (review, sell, atau adjust SL)." },
        ],
      },
    ],
  },

  // ============================ DAILY PICKS ============================
  {
    id: "picks",
    category: "Analisis Inti",
    title: "Daily Picks",
    icon: "ListChecks",
    summary: "Rekomendasi harian dengan entry zone, stop loss, take profit, dan factor reasoning. Bukan saran investasi — gunakan sebagai starting point research.",
    contents: [
      { type: "paragraph", text: "Daily Picks Engine adalah hasil scoring multi-faktor (Technical + Fundamental + Bandarmology + Sentiment + Macro) untuk universe emiten IDX yang lolos filter likuiditas." },
      { type: "heading", level: 3, text: "Cara membaca tiap pick" },
      {
        type: "kv",
        rows: [
          { key: "Entry Zone", value: "Range harga ideal untuk masuk posisi. Jangan kejar di atas range — tunggu pullback." },
          { key: "Stop Loss (SL)", value: "Harga untuk cut loss kalau tesis salah. Berbasis ATR + swing low/high." },
          { key: "Target Profit (TP)", value: "Harga target take profit. Dihitung dari reward/risk ratio min 1.5×." },
          { key: "Confidence", value: "Skor 0-100% berdasarkan kekuatan sinyal multi-faktor. Confidence tinggi ≠ pasti profit — tetap kelola risk." },
          { key: "Reasoning", value: "Faktor-faktor yang mendukung pick ini (mis. 'RSI oversold + breakout MA50 + bandarmology accumulation')." },
        ],
      },
      { type: "note", tone: "warning", title: "Disclaimer penting", body: "Daily Picks adalah analisis algoritmik, BUKAN saran investasi. Selalu validasi sendiri, sesuaikan dengan risk profile kamu, dan jangan all-in." },
      { type: "heading", level: 3, text: "Workflow rekomendasi" },
      {
        type: "steps",
        items: [
          { title: "Pilih pick yang cocok dengan style", body: "Trader agresif: pilih confidence > 80%. Konservatif: confidence > 90% + reasoning fundamental kuat." },
          { title: "Validasi via Verdict + Wyckoff", body: "Klik ticker → cek Nubuat Verdict (target ≥ 6.5) dan Wyckoff Phase (Accumulation / Markup = OK)." },
          { title: "Set order di broker", body: "Buy di entry zone (limit order). Set SL otomatis di harga SL. Cek target sesudah profit run." },
          { title: "Track outcome", body: "Daily Picks Performance dashboard track akurasi tiap pick → adjust expectation kamu." },
        ],
      },
    ],
  },

  // ============================ NUBUAT VERDICT ============================
  {
    id: "verdict",
    category: "Analisis Inti",
    title: "Nubuat Verdict 0–10",
    icon: "Award",
    summary: "Score komposit 6-faktor per ticker. Transparent breakdown — kamu tahu KENAPA verdict-nya begitu.",
    contents: [
      { type: "paragraph", text: "Nubuat Verdict adalah konsolidasi 6 faktor analisis ke dalam 1 angka 0-10. Tampil di Overview tab tiap ticker." },
      { type: "heading", level: 3, text: "6 Faktor & Bobot" },
      {
        type: "kv",
        rows: [
          { key: "Technical Trend (25%)", value: "Posisi harga vs SMA 20/50/200, RSI zone. Bullish stack = bagus." },
          { key: "Momentum (15%)", value: "% change 5d/20d + posisi terhadap 52w high/low." },
          { key: "Value (15%)", value: "PE & PBV ratio. PE < 15 + PBV < 2 = murah." },
          { key: "Quality (15%)", value: "ROE, profit margin, current ratio, DER. ROE > 15% = berkualitas." },
          { key: "Growth (15%)", value: "Revenue & earnings YoY growth. >20% = growth story." },
          { key: "News Sentiment (15%)", value: "Avg sentiment 30 hari dari news + jumlah coverage." },
        ],
      },
      { type: "heading", level: 3, text: "Skala Label" },
      {
        type: "kv",
        rows: [
          { key: "8.0 - 10.0", value: "🟢 STRONG BUY — konvergensi multi-faktor sangat kuat" },
          { key: "6.5 - 7.9", value: "🟢 BUY — setup bagus, layak diperhatikan" },
          { key: "4.5 - 6.4", value: "🟡 HOLD — campuran sinyal, tunggu konfirmasi" },
          { key: "3.0 - 4.4", value: "🟠 SELL — banyak red flag" },
          { key: "0.0 - 2.9", value: "🔴 STRONG SELL — hindari" },
        ],
      },
      { type: "note", tone: "info", title: "Transparency", body: "Setiap faktor di-breakdown dengan signal individu (mis. 'RSI overbought 75.2' atau 'PE rich 35.1'). Kamu bisa lihat KENAPA score 6.4 — bukan 'black box AI'." },
      { type: "note", tone: "warning", title: "Limitations", body: "Verdict adalah snapshot saat ini, bukan prediksi. Score 8 ≠ pasti naik. Score 3 ≠ pasti turun. Gunakan sebagai filter awal — selalu cross-check dengan analisis kamu." },
    ],
  },

  // ============================ TICKER PAGE ============================
  {
    id: "ticker",
    category: "Analisis Inti",
    title: "Halaman Ticker (Per Emiten)",
    icon: "LineChart",
    summary: "Pusat analisis 360° per emiten dengan 8 tab: Overview, Technical, Fundamental, Bandarmology, Brokermology, News, Research, AI.",
    contents: [
      { type: "paragraph", text: "Akses lewat URL /ticker/BBRI atau lewat search di Command Palette (Cmd+K). Tab navigation di atas chart." },
      { type: "heading", level: 3, text: "Tab Overview" },
      { type: "paragraph", text: "Landing tab — menampilkan:" },
      {
        type: "list",
        items: [
          "**Nubuat Verdict** (0-10 score + factor breakdown)",
          "**Chart 5 tahun** dengan SMA 20/50 default",
          "**Key Stats** — Market cap, shares outstanding, free float, beta",
          "**Corporate Actions** ringkasan dividen, split, RUPS",
        ],
      },
      { type: "heading", level: 3, text: "Tab Technical" },
      {
        type: "list",
        items: [
          "**Wyckoff Phase Mapping** — phase saat ini (Accumulation / Markup / Distribution / Markdown) + timeline history",
          "**Multi-timeframe chart** dengan toggle indikator (SMA, RSI, MACD, Bollinger, dll)",
          "**Drawing tools** — trendline, channel, fibonacci (manual)",
        ],
      },
      { type: "heading", level: 3, text: "Tab Fundamental" },
      {
        type: "list",
        items: [
          "**DCF Intrinsic Valuation** — 10-year FCF projection, terminal value, intrinsic value per share, margin of safety, sensitivity matrix",
          "**Profil Emiten** + link website resmi",
          "**Financial ratios** — PE, PBV, ROE, profit margin, DER, dll",
          "**Earnings history** + quarterly snapshot",
        ],
      },
      { type: "heading", level: 3, text: "Tab Bandarmology" },
      {
        type: "list",
        items: [
          "**Smart Money Verdict** — Buying / Selling / Neutral berdasarkan agregasi sinyal",
          "**A/D Line** (Accumulation/Distribution Chaikin)",
          "**OBV** (On-Balance Volume)",
          "**MFI 14** (Money Flow Index — volume-weighted RSI)",
          "**Buy/Sell Pressure** dari close vs midpoint daily range",
          "**Volume Spike Detection** (5d vs 60d)",
          "**Foreign Flow & Broker Activity** (saat data sudah di-ingest)",
        ],
      },
      { type: "heading", level: 3, text: "Tab News" },
      {
        type: "paragraph",
        text: "Berita terbaru yang tag emiten ini (auto-detected dari konteks: kode di kurung, awalan 'saham', atau nama perusahaan). Dengan sentiment tag (Bullish/Neutral/Bearish + score).",
      },
      { type: "heading", level: 3, text: "Tab Research" },
      {
        type: "paragraph",
        text: "Catatan analis internal Nubuat — laporan riset detail dengan rating (Strong Buy/Buy/Hold/Sell), target price, target horizon (3-12 bulan), dan thesis/catalyst.",
      },
      { type: "heading", level: 3, text: "Tab AI" },
      {
        type: "paragraph",
        text: "Buka AI Buddy dengan konteks ticker ini pre-loaded. Tanya apa pun tentang emiten: 'Kenapa BBRI turun?', 'Bandingkan BBRI vs BMRI', 'Apa risiko BBRI 6 bulan ke depan?'.",
      },
    ],
  },

  // ============================ WYCKOFF ============================
  {
    id: "wyckoff",
    category: "Analisis Inti",
    title: "Wyckoff Phase Mapping",
    icon: "Activity",
    summary: "4 phase klasik Wyckoff yang otomatis ter-deteksi dari OHLCV pattern. Konteks risk framing.",
    contents: [
      { type: "paragraph", text: "Wyckoff theory menyatakan pasar bergerak dalam 4 phase berulang. Algorithm Nubuat auto-detect phase saat ini." },
      { type: "heading", level: 3, text: "4 Phase" },
      {
        type: "kv",
        rows: [
          { key: "📦 Accumulation", value: "Smart money akumulasi di harga rendah. Range-bound, volume mengecil, volatility compressed. Setup pre-breakout." },
          { key: "📈 Markup", value: "Trend uptrend kuat. SMA stack bullish (20 > 50 > 200), RSI healthy (50-70). Smart money sudah masuk, retail FOMO." },
          { key: "📤 Distribution", value: "Smart money distribusi ke retail di harga tinggi. Range-bound setelah uptrend, gagal break high, RSI divergence." },
          { key: "📉 Markdown", value: "Trend downtrend setelah distribusi. SMA stack bearish, RSI weak. Retail panic, smart money menunggu lebih rendah." },
        ],
      },
      { type: "heading", level: 3, text: "Cara membaca card Wyckoff" },
      {
        type: "list",
        items: [
          "**Current Phase badge** — phase aktif dengan label besar",
          "**Confidence** — 0-100%, seberapa yakin algoritma. < 50% = ambigu",
          "**Since [date]** — phase ini sudah berapa lama berjalan",
          "**Reasoning** — alasan algoritma pilih phase ini (mis. 'Trend up 12% + SMA20 > SMA50 + Volume up 15%')",
          "**Phase Timeline** — visualisasi 4 phase histori sliding window 60-bar steps 20",
          "**Stats** — Range 20d/60d + volatility ratio (compressing/stable/expanding)",
        ],
      },
      { type: "heading", level: 3, text: "Strategy per phase" },
      {
        type: "kv",
        rows: [
          { key: "Accumulation", value: "Buy zone — siapkan posisi bertahap (DCA). Volatility compression = pre-breakout signal." },
          { key: "Markup", value: "Hold + tambah pada pullback. Jangan jual prematur — trend bisa lama." },
          { key: "Distribution", value: "Trim posisi, tighten SL. Jangan tambah meskipun harga masih tinggi." },
          { key: "Markdown", value: "Hindari / short (kalau punya akses). Tunggu setup Accumulation berikutnya." },
        ],
      },
    ],
  },

  // ============================ BANDARMOLOGY ============================
  {
    id: "bandarmology",
    category: "Analisis Inti",
    title: "Bandarmology",
    icon: "Users",
    summary: "Membaca jejak smart money — bukan teori konspirasi, tapi statistik aliran dana via volume-based indicators.",
    contents: [
      { type: "paragraph", text: "Tab Bandarmology di halaman ticker menampilkan 5 metrik utama dari quotes_eod data:" },
      { type: "heading", level: 3, text: "A/D Line (Accumulation/Distribution)" },
      { type: "paragraph", text: "**Chaikin formula** — cumulative money flow berdasarkan posisi close dalam daily range. Naik = akumulasi (smart money buying at high range); turun = distribusi (selling at low range)." },
      { type: "note", tone: "info", title: "Cara baca", body: "Lihat A/D Line 20d change. Positif = trend akumulasi. Negatif = distribusi. Divergen dari harga = early warning." },
      { type: "heading", level: 3, text: "OBV (On-Balance Volume)" },
      { type: "paragraph", text: "**Granville theory** — cumulative volume yang add di hari naik, subtract di hari turun. Diverge dengan harga = sinyal smart money exit/entry awal." },
      { type: "heading", level: 3, text: "MFI 14 (Money Flow Index)" },
      { type: "paragraph", text: "RSI versi volume-weighted. Range 0-100. > 80 = overbought (distribusi); < 20 = oversold (akumulasi). Lebih konservatif dari RSI biasa." },
      { type: "heading", level: 3, text: "Buy/Sell Pressure 20d" },
      { type: "paragraph", text: "Average posisi close vs midpoint daily range. Positif = buyer dominant (close di atas tengah); Negatif = seller dominant. Range -100 sampai +100." },
      { type: "heading", level: 3, text: "Volume Spike Detection" },
      { type: "paragraph", text: "Rasio avg volume 5d vs 60d. > 1.5× = high interest (bisa breakout atau distribusi). < 0.7× = drying up." },
      { type: "note", tone: "warning", title: "Foreign Flow & Broker Activity", body: "Data ingestion belum aktif. Metrik volume-based di atas tetap aktif dan bisa mendeteksi smart money pattern dari data harga. Foreign flow + broker leaderboard akan tersedia setelah vendor IDX di-setup di admin panel." },
    ],
  },

  // ============================ DCF ============================
  {
    id: "dcf",
    category: "Analisis Inti",
    title: "DCF Valuation",
    icon: "Calculator",
    summary: "Discounted Cash Flow calculator dengan 5×5 sensitivity matrix. Per ticker di Fundamental tab.",
    contents: [
      { type: "paragraph", text: "DCF menghitung intrinsic value per share berdasarkan proyeksi 10-tahun FCF + terminal value, di-discount ke present value." },
      { type: "heading", level: 3, text: "Formula" },
      { type: "code", lang: "text", text: "PV(FCFn) = Σ FCFn / (1 + r)^n     for n = 1..10\nTerminal Value = FCF_10 × (1 + g_term) / (r - g_term)\nPV(TV) = TV / (1 + r)^10\nEquity Value = Σ PV(FCFn) + PV(TV)\nIntrinsic Value/Share = Equity Value / Shares Outstanding\nMargin of Safety = (Intrinsic - Current) / Current × 100" },
      { type: "heading", level: 3, text: "Default assumptions" },
      {
        type: "kv",
        rows: [
          { key: "Initial FCF", value: "EPS × Shares Outstanding (Net Income proxy karena CapEx detail belum lengkap)" },
          { key: "Growth Y1-5", value: "Revenue Growth YoY (cap di 25%)" },
          { key: "Growth Y6-10", value: "Setengah Growth Y1-5 (tapering)" },
          { key: "Terminal Growth", value: "4% (proxy long-run GDP nominal Indonesia)" },
          { key: "Discount Rate", value: "CAPM: 6.5% risk-free + beta × 5.5% equity premium" },
        ],
      },
      { type: "heading", level: 3, text: "Cara baca verdict" },
      {
        type: "kv",
        rows: [
          { key: "🟢🟢 Deeply Undervalued (+40%)", value: "DCF jauh di atas harga pasar — strong buy candidate" },
          { key: "🟢 Undervalued (+15-40%)", value: "Margin of safety bagus" },
          { key: "🟡 Fair Value (±15%)", value: "Pasar pricing wajar — tidak ada edge valuasi" },
          { key: "🟠 Overvalued (-15-40%)", value: "Premium karena growth story atau sentiment" },
          { key: "🔴 Deeply Overvalued (-40%)", value: "Risiko correction tinggi" },
        ],
      },
      { type: "heading", level: 3, text: "Sensitivity Matrix" },
      { type: "paragraph", text: "Tabel 5×5 menunjukkan intrinsic value per share di berbagai kombinasi discount rate (rows) × growth rate (cols). Sel hijau = di atas harga sekarang; merah = di bawah; ring biru = asumsi default kamu." },
      { type: "note", tone: "warning", title: "Caveats", body: "DCF SANGAT SENSITIF terhadap input — output adalah RANGE, bukan angka pasti. Banks/insurance: DCF kurang akurat (gunakan DDM). Data CapEx belum lengkap → FCF ≈ Net Income (proxy)." },
    ],
  },

  // ============================ NEWS ============================
  {
    id: "news",
    category: "Analisis Inti",
    title: "News Feed",
    icon: "Newspaper",
    summary: "Berita keuangan dari 4 sumber publik (CNBC ID, Detik, Antara, Investing.com) dengan sentiment scoring AI per artikel.",
    contents: [
      { type: "paragraph", text: "RSS feed di-ingest tiap 15 menit. Setiap artikel di-score sentimen (bullish / neutral / bearish) oleh model AI." },
      { type: "heading", level: 3, text: "Cara baca card berita" },
      {
        type: "list",
        items: [
          "**Source badge** — nama media (CNBC Indonesia / Detik Finance / Antara / Investing.com) + waktu publish relatif",
          "**Sentiment badge** — Bullish (hijau) / Neutral (abu) / Bearish (merah) + score numerik -1.0 sampai +1.0",
          "**Ticker chips** — kalau artikel menyebut emiten spesifik, di-tag otomatis. Klik chip → langsung ke /ticker/[kode]",
          "**Image thumbnail** + summary 2 baris",
        ],
      },
      { type: "heading", level: 3, text: "Filter di /news" },
      {
        type: "list",
        items: [
          "**Sumber** — filter per media",
          "**Sentimen** — hanya tampilkan Bullish / Neutral / Bearish",
          "**Ticker** — berita yang tag emiten tertentu (mis. ticker=BBRI)",
          "**Cari judul** — keyword search",
        ],
      },
      { type: "heading", level: 3, text: "Stats 24 jam" },
      { type: "paragraph", text: "Dashboard atas tampilkan total artikel, breakdown bullish/neutral/bearish, dan source health (last successful fetch per sumber)." },
      { type: "note", tone: "info", title: "Per-ticker news", body: "Di halaman /ticker/[kode] tab News, hanya artikel yang tag ticker tsb yang muncul, plus mini-summary: bullish/neutral/bearish count." },
    ],
  },

  // ============================ SCREENER ============================
  {
    id: "screener",
    category: "Discovery",
    title: "Stock Screener",
    icon: "Search",
    summary: "Filter universe 980 emiten IDX dengan 13 filter fundamental + 6 preset strategy.",
    contents: [
      { type: "paragraph", text: "Screener cocok untuk menemukan emiten yang match kriteria spesifik dari ribuan kandidat." },
      { type: "heading", level: 3, text: "6 Preset Strategy" },
      {
        type: "kv",
        rows: [
          { key: "Value Hunter", value: "PE < 15, PBV < 2, ROE > 10%, DER < 1.5. Inspired by Benjamin Graham." },
          { key: "Growth Story", value: "Revenue growth > 20%, profit margin > 10%, ROE > 15%. Inspired by Peter Lynch." },
          { key: "Dividend Aristocrat", value: "Yield > 4%, ROE > 10%, DER < 1.5. Income investing." },
          { key: "Quality Wide-Moat", value: "ROE > 15%, margin > 15%, DER < 1.0, current ratio > 1.5. Buffett-style." },
          { key: "Small-Cap Rocket", value: "Market cap < Rp10T + growth > 15%. High risk-reward." },
          { key: "Blue Chip IDX", value: "Market cap > Rp50T + ROE > 10%. Core defensive." },
        ],
      },
      { type: "heading", level: 3, text: "Custom Filters" },
      {
        type: "list",
        items: [
          "**Sektor** & sub-sektor (IDX-IC classification)",
          "**Papan listing** (Utama / Pengembangan / Akselerasi)",
          "**Syariah only** checkbox",
          "**Market Cap** min/max (untuk filter ukuran)",
          "**P/E**, **P/BV** min/max (valuasi)",
          "**Min ROE**, **Min Profit Margin** (kualitas)",
          "**Min Revenue Growth** (pertumbuhan)",
          "**Max Debt/Equity** (leverage)",
          "**Min Dividend Yield** (income)",
        ],
      },
      { type: "heading", level: 3, text: "Sort & Pagination" },
      { type: "paragraph", text: "Klik header kolom (Market Cap, P/E, P/BV, ROE, dll) untuk sort. Klik ulang untuk reverse direction. 50 result per halaman dengan pagination Next/Prev." },
      { type: "heading", level: 3, text: "Workflow Discovery" },
      {
        type: "steps",
        items: [
          { title: "Mulai dengan preset", body: "Pilih preset yang match philosophy kamu (Value/Growth/Quality/dll)." },
          { title: "Tweak filter", body: "Naikkan/turunkan threshold sesuai konteks pasar saat ini." },
          { title: "Shortlist 5-10 kandidat", body: "Sort by metric paling penting buat kamu (mis. ROE desc untuk quality)." },
          { title: "Deep dive per ticker", body: "Klik ticker → cek Verdict, Wyckoff, DCF, News. Eliminasi yang red flag." },
        ],
      },
    ],
  },

  // ============================ COMPARE ============================
  {
    id: "compare",
    category: "Discovery",
    title: "Compare Tickers",
    icon: "GitCompareArrows",
    summary: "Side-by-side 2-4 emiten: chart normalized + fundamentals + verdict + news count.",
    contents: [
      { type: "paragraph", text: "/compare?tickers=BBRI,BMRI,BBCA — bandingkan ticker apple-to-apple dengan auto-highlight 'best in row'." },
      { type: "heading", level: 3, text: "5 Quick Compares default" },
      {
        type: "list",
        items: [
          "**Big 4 Banks** — BBCA, BMRI, BBRI, BBNI",
          "**Tech** — GOTO, EMTK, DMMX",
          "**Auto + Heavy Eq** — ASII, IMAS, UNTR",
          "**Pharma** — KLBF, SIDO, KAEF",
          "**Metals** — ANTM, MDKA, INCO",
        ],
      },
      { type: "heading", level: 3, text: "Performance Chart Normalized" },
      { type: "paragraph", text: "Harga semua ticker di-normalize ke 100 di awal periode. Apple-to-apple comparison % performance — bukan harga absolut." },
      { type: "heading", level: 3, text: "Fundamentals Side-by-Side" },
      { type: "paragraph", text: "Tabel 12 metric (Market Cap, PE, PBV, ROE, Profit Margin, DER, Revenue/Earnings Growth, Dividend Yield, Beta, 52w High/Low). **Cell paling baik per row di-highlight hijau bold** — quick scan winner per metric." },
      { type: "heading", level: 3, text: "Nubuat Verdict Comparison" },
      { type: "paragraph", text: "Per ticker tampil verdict 0-10 + factor breakdown (6 bar mini per ticker). Bandingkan strength setiap faktor across tickers." },
      { type: "heading", level: 3, text: "News Coverage 30d" },
      { type: "paragraph", text: "Per ticker tampil count bullish/neutral/bearish news 30 hari terakhir. Lebih banyak coverage = lebih liquid information flow." },
    ],
  },

  // ============================ SECTORS ============================
  {
    id: "sectors",
    category: "Discovery",
    title: "Sector Heatmap",
    icon: "Layers",
    summary: "Performance ringkasan 11 sektor IDX-IC dengan heatmap visual + ranking table.",
    contents: [
      { type: "paragraph", text: "11 sektor IDX-IC: Keuangan, Perindustrian, Konsumen Primer, Konsumen Non-Primer, Energi, Barang Baku, Properti, Infrastruktur, Teknologi, Kesehatan, Transportasi." },
      { type: "heading", level: 3, text: "Window Selector" },
      { type: "paragraph", text: "Tab atas: 1 hari / 5 hari / 30 hari / YTD. Heatmap update sesuai window." },
      { type: "heading", level: 3, text: "Heatmap Grid" },
      {
        type: "list",
        items: [
          "**Ukuran cell** proportional terhadap total market cap sektor (sektor besar = cell besar)",
          "**Warna** = return rata-rata (weighted by market cap) — 7-step scale dari merah gelap (< -5%) ke hijau gelap (> 5%)",
          "**Klik cell** → drill-down ke /screener?sector=X (filter screener ke sektor itu)",
          "**Label cell** — kode sektor + nama + return % + emiten count + % market cap weight",
        ],
      },
      { type: "heading", level: 3, text: "Sector Ranking Table" },
      { type: "paragraph", text: "Tabel detail per sektor: Emiten count, Mkt Cap, return 1d/5d/30d/YTD, avg P/E, avg P/BV, avg ROE, avg Dividend Yield, Top Mover (gainer + loser dari 1d return)." },
      { type: "heading", level: 3, text: "Use Cases" },
      {
        type: "list",
        items: [
          "**Sector rotation analysis** — lihat sektor mana yang outperforming this week",
          "**Cheap sector discovery** — sort by avg P/E ascending → cari sektor undervalued",
          "**High-yield sector** — sort by avg dividend yield untuk income hunting",
          "**Risk-off detection** — kalau semua sektor merah, broad market sell-off",
        ],
      },
    ],
  },

  // ============================ WATCHLIST ============================
  {
    id: "watchlist",
    category: "Tools",
    title: "Watchlist",
    icon: "Star",
    summary: "Track emiten yang kamu follow dengan note + sort order. Default watchlist 'Utama' otomatis dibuat saat signup.",
    contents: [
      { type: "paragraph", text: "Tiap user bisa buat multiple watchlist (mis. 'Banking', 'Tech', 'Watch Pre-Earnings')." },
      { type: "heading", level: 3, text: "Cara pakai" },
      {
        type: "steps",
        items: [
          { title: "Tambah ticker", body: "Buka /watchlist, klik 'Add', search/pilih ticker." },
          { title: "Tambah note (opsional)", body: "Catat alasan kenapa kamu follow ticker ini (mis. 'Tunggu break Rp1500')." },
          { title: "Reorder", body: "Drag untuk urutkan prioritas." },
          { title: "Buat watchlist baru", body: "Misal pisahkan 'Trade' vs 'Long-term invest'." },
        ],
      },
      { type: "heading", level: 3, text: "Color coding" },
      { type: "paragraph", text: "Tiap watchlist bisa di-tag warna untuk identifikasi cepat." },
    ],
  },

  // ============================ ALERTS ============================
  {
    id: "alerts",
    category: "Tools",
    title: "Alerts",
    icon: "Bell",
    summary: "Trigger notifikasi otomatis saat kondisi harga/indikator terpenuhi.",
    contents: [
      { type: "paragraph", text: "Alerts di-evaluate post-EoD (daily). Notifikasi via in-app + email." },
      { type: "heading", level: 3, text: "Tipe alert yang di-support" },
      {
        type: "kv",
        rows: [
          { key: "Price Above", value: "Trigger kalau harga ≥ threshold" },
          { key: "Price Below", value: "Trigger kalau harga ≤ threshold" },
          { key: "% Change", value: "Trigger kalau perubahan harian/mingguan melampaui %" },
          { key: "Volume Spike", value: "Trigger kalau volume > N × avg 20d" },
          { key: "MA Cross", value: "Trigger pada golden/death cross SMA20/SMA50" },
          { key: "RSI Threshold", value: "Trigger kalau RSI > 70 atau < 30" },
        ],
      },
      { type: "heading", level: 3, text: "Status alert" },
      {
        type: "kv",
        rows: [
          { key: "Active", value: "Aktif, dievaluasi setiap hari" },
          { key: "Paused", value: "Di-pause sementara, tidak di-evaluate" },
          { key: "Triggered", value: "Sudah trigger — bisa re-arm atau archive" },
          { key: "Expired", value: "Sudah lewat tanggal expiry" },
        ],
      },
    ],
  },

  // ============================ AI COPILOT ============================
  {
    id: "copilot",
    category: "Tools",
    title: "AI Buddy",
    icon: "Bot",
    summary: "LLM-powered chatbot dengan tool access ke data Nubuat. Bisa jawab kompleks, multi-step, dengan kutipan sumber.",
    contents: [
      { type: "paragraph", text: "AI Buddy memakai 9 tools yang akses live data: harga, fundamentals, watchlist, picks, news, screener, dll." },
      { type: "heading", level: 3, text: "Contoh prompt yang bekerja baik" },
      {
        type: "list",
        items: [
          "\"Kenapa BBRI turun hari ini?\" — AI cek berita + flow data",
          "\"Bandingkan BBRI vs BMRI dari sisi PE forward dan ROE\"",
          "\"Screen saham coal dengan ROE > 15% dan PE < 12\"",
          "\"Apa risiko utama investasi GOTO 6 bulan ke depan?\"",
          "\"Berita bullish hari ini\"",
          "\"Daily Picks hari ini dan reasoning-nya\"",
          "\"Apa itu Wyckoff Distribution phase?\"",
        ],
      },
      { type: "heading", level: 3, text: "Tools yang tersedia" },
      {
        type: "kv",
        rows: [
          { key: "get_quote", value: "Snapshot harga ticker" },
          { key: "get_ohlcv", value: "Historical OHLCV" },
          { key: "get_company_info", value: "Profil + key stats" },
          { key: "search_companies", value: "Search ticker by name/code" },
          { key: "compute_indicators", value: "Hitung RSI/MACD/MA on-the-fly" },
          { key: "get_user_watchlist", value: "List watchlist user" },
          { key: "get_daily_picks", value: "Picks aktif hari ini" },
          { key: "get_recent_news", value: "Berita terbaru dengan filter sentimen/ticker" },
        ],
      },
      { type: "heading", level: 3, text: "Tips prompting" },
      {
        type: "list",
        items: [
          "**Specific lebih baik** — \"BBRI vs BMRI ROE forward 12 bulan\" > \"banking apa bagus?\"",
          "**Multi-step OK** — \"Cari saham PE < 10 ROE > 20%, lalu kasih DCF estimate masing-masing\"",
          "**Context lokal** — AI tahu istilah IDX (papan utama, papan pengembangan, papan akselerasi, JII, ISSI, IDX30, dll)",
          "**Sumber transparent** — AI cite tool yang dipakai, mis. 'berdasarkan get_recent_news...'",
        ],
      },
      { type: "note", tone: "warning", title: "Bukan financial advisor", body: "AI memberikan analisis data — bukan rekomendasi investasi. Selalu validasi sendiri sebelum action." },
    ],
  },

  // ============================ BACKTEST ============================
  {
    id: "backtest",
    category: "Tools",
    title: "Backtest Engine",
    icon: "LineChart",
    summary: "Test strategy historis dengan walk-forward simulation. Output equity curve + trade-by-trade detail.",
    contents: [
      { type: "paragraph", text: "Pilih ticker + strategy preset → engine simulate buy/sell signals across historical data." },
      { type: "heading", level: 3, text: "Strategy presets" },
      {
        type: "list",
        items: [
          "**Buy-and-Hold** (baseline)",
          "**SMA Crossover** (golden/death cross)",
          "**RSI Mean Reversion** (buy < 30, sell > 70)",
          "**MACD Trend Following**",
          "**Bollinger Band Reversal**",
        ],
      },
      { type: "heading", level: 3, text: "Output metrics" },
      {
        type: "kv",
        rows: [
          { key: "Total Return %", value: "Profit absolut" },
          { key: "Annualized Return %", value: "CAGR" },
          { key: "Max Drawdown %", value: "Penurunan terbesar peak-to-trough" },
          { key: "Sharpe Ratio", value: "Risk-adjusted return (> 1.0 = bagus)" },
          { key: "Win Rate", value: "% trade profitable" },
          { key: "Profit Factor", value: "Gross profit / gross loss (> 1.5 = bagus)" },
          { key: "Avg Holding Days", value: "Rata-rata durasi per trade" },
        ],
      },
      { type: "heading", level: 3, text: "Visualizations" },
      {
        type: "list",
        items: [
          "**Equity Curve** — saldo portfolio over time",
          "**Drawdown Chart** — underwater equity",
          "**Trade Markers** — entry/exit di chart harga",
          "**Trade Log** — detail setiap trade (entry/exit price, return %, holding days)",
        ],
      },
      { type: "note", tone: "warning", title: "Past performance ≠ future results", body: "Backtest cuma menunjukkan apa yang TERJADI di masa lalu. Strategy yang work historis bisa fail di masa depan karena regime change." },
    ],
  },

  // ============================ CALENDAR ============================
  {
    id: "calendar",
    category: "Tools",
    title: "Calendar Aksi Korporasi",
    icon: "Calendar",
    summary: "Cum/ex-date dividen, stock split, rights issue, IPO, delisting. 30 hari ke belakang + 60 hari ke depan.",
    contents: [
      { type: "paragraph", text: "Sumber: dividend history Yahoo + IDX e-Reporting + manual entry admin." },
      { type: "heading", level: 3, text: "Cara baca event" },
      {
        type: "list",
        items: [
          "**Ticker + logo** kiri",
          "**Type badge** — dividend (hijau) / split (biru) / rights (ungu) / IPO (hijau) / delisting (merah)",
          "**Tanggal** = ex-date (cum date = 1 hari sebelumnya)",
          "**Detail** — periode dividen atau ratio split",
          "**Amount** untuk dividen (Rp/lembar)",
        ],
      },
      { type: "note", tone: "info", title: "Cum vs Ex date", body: "Untuk dapat dividen, harus pegang saham pada cum date. Beli di ex-date = sudah tidak dapat dividen. Tanggal di Nubuat = ex-date." },
      { type: "heading", level: 3, text: "Filter" },
      {
        type: "list",
        items: [
          "**Date range** — adjust window",
          "**Ticker** — event untuk emiten spesifik",
          "**Type** — hanya dividen / split / rights / dll",
        ],
      },
    ],
  },

  // ============================ RESEARCH ============================
  {
    id: "research",
    category: "Tools",
    title: "Riset (Research Reports)",
    icon: "FileText",
    summary: "Laporan analisis ala sell-side sekuritas — rating + target price + thesis. PDF downloadable.",
    contents: [
      { type: "paragraph", text: "Reports dibuat analis internal Nubuat. Struktur mengikuti industri." },
      { type: "heading", level: 3, text: "Komponen laporan" },
      {
        type: "list",
        items: [
          "**Header** — ticker, rating (Strong Buy/Buy/Hold/Sell/Strong Sell/Not Rated), target price, time horizon (3 bulan / 3-12 bulan / 12+ bulan)",
          "**Report type** — Initiation / Update / Earnings Review / Thematic / Sector / Macro / Flash",
          "**Executive Summary** (bullets)",
          "**Investment Thesis** — alasan utama",
          "**Catalyst** — event yang bisa unlock value",
          "**Valuation** — metodologi (DCF / DDM / Relative / Sum-of-parts)",
          "**Risk Factors**",
          "**Financial Snapshot**",
          "**Analyst & Disclaimer**",
        ],
      },
      { type: "heading", level: 3, text: "Fitur" },
      {
        type: "list",
        items: [
          "**Search semantic** powered by vector embeddings — cari konsep, bukan keyword",
          "**Filter** by rating, sector, analyst, date",
          "**PDF download** — formatted dengan chart embed",
          "**Per-ticker tab Research** — semua laporan untuk emiten itu dalam 1 view",
        ],
      },
    ],
  },

  // ============================ COMMAND PALETTE ============================
  {
    id: "command-palette",
    category: "Tools",
    title: "Command Palette (Cmd+K)",
    icon: "Command",
    summary: "Keyboard-driven navigation ala Bloomberg. Tekan Cmd+K (Mac) atau Ctrl+K (Win/Linux) di mana saja.",
    contents: [
      { type: "paragraph", text: "Command Palette adalah cara tercepat navigasi Nubuat tanpa lepas keyboard." },
      { type: "heading", level: 3, text: "Cara pakai" },
      {
        type: "steps",
        items: [
          { title: "Buka palette", body: "Tekan **Cmd+K** (Mac) atau **Ctrl+K** (Win/Linux). Bisa di-trigger dari halaman apa pun." },
          { title: "Ketik query", body: "Ticker (BBRI), keyword (news, screener), atau kode fungsi (EQS, NEWS, BT)." },
          { title: "Pilih hasil", body: "Arrow keys ↑↓ untuk navigate, **Enter** untuk pilih." },
          { title: "Escape untuk close", body: "**Esc** untuk tutup palette." },
        ],
      },
      { type: "heading", level: 3, text: "Bloomberg-style function codes" },
      {
        type: "kv",
        rows: [
          { key: "EQS", value: "Equity Screener" },
          { key: "NEWS", value: "News Feed" },
          { key: "CAL", value: "Corporate Action Calendar" },
          { key: "PICK", value: "Daily Picks" },
          { key: "BT", value: "Backtest Engine" },
          { key: "RSH", value: "Riset Reports" },
          { key: "AI", value: "AI Buddy" },
        ],
      },
      { type: "heading", level: 3, text: "Group yang tersedia" },
      {
        type: "list",
        items: [
          "**Jump** — ketik kode ticker (BBRI, GOTO) → instant jump ke halaman ticker",
          "**Ticker** — fuzzy search by code/nama perusahaan",
          "**Navigation** — semua menu utama (Dashboard, Picks, News, Screener, Compare, Sectors, dll)",
          "**Functions** — kode singkat (EQS, NEWS, BT)",
          "**Screener Presets** — direct jump ke screener dengan preset aktif (Value Hunter, Growth Story, dll)",
          "**News Filters** — Bullish / Bearish / Neutral news",
          "**Recent** — page yang baru di-visit",
        ],
      },
    ],
  },

  // ============================ SUBSCRIPTION ============================
  {
    id: "subscription",
    category: "Account",
    title: "Subscription & Tier",
    icon: "CreditCard",
    summary: "Free / Starter / Pro / Elite / Institutional. Trial 7 hari tier Pro gratis. Auto-downgrade ke Free setelah trial.",
    contents: [
      { type: "paragraph", text: "Tier menentukan akses fitur. Lihat halaman /subscription untuk detail tier comparison." },
      { type: "heading", level: 3, text: "Tier breakdown (high level)" },
      {
        type: "kv",
        rows: [
          { key: "Free", value: "Dashboard, watchlist (1), news basic, ticker page basic" },
          { key: "Trial 7 hari", value: "Semua fitur tier Pro (auto-downgrade ke Free setelahnya)" },
          { key: "Starter", value: "+ alerts, screener, daily picks, multiple watchlist" },
          { key: "Pro", value: "+ AI Buddy, DCF, Verdict, Wyckoff, Bandarmology, backtest, research" },
          { key: "Elite", value: "+ L2 depth, paper trading, API access, AI Deep Mode" },
          { key: "Institutional", value: "+ multi-seat, white-label, dedicated support & SLA" },
        ],
      },
      { type: "note", tone: "info", title: "Trial auto-expiry", body: "Trial otomatis berakhir setelah 7 hari. Akun di-downgrade ke Free tanpa charge. Kamu bisa upgrade kapan saja di /subscription." },
    ],
  },

  // ============================ PAPER TRADING ============================
  {
    id: "paper-trading",
    category: "Tools",
    title: "Paper Trading & Hall of Fame",
    icon: "Award",
    summary: "Latihan trading dengan modal virtual Rp 100 juta — uji strategi tanpa risiko uang asli, lalu adu peringkat di leaderboard.",
    contents: [
      { type: "paragraph", text: "Paper Trading memberi kamu portofolio virtual Rp 100.000.000 untuk simulasi beli/jual saham IDX dengan harga nyata (EOD). Cocok buat belajar eksekusi, uji disiplin entry/exit, dan validasi strategi sebelum pakai uang sungguhan." },
      { type: "steps", items: [
        { title: "Buka /portfolio", body: "Portofolio virtual otomatis dibuat dengan saldo Rp 100 juta." },
        { title: "Beli saham", body: "Pilih ticker + jumlah lot (kelipatan 100). Fill pakai harga terakhir + slippage 15 bps + fee, biar realistis." },
        { title: "Pantau posisi", body: "Lihat unrealized P/L, nilai posisi, dan total return % yang di-mark-to-market." },
        { title: "Jual & evaluasi", body: "Tutup posisi, cek realized P/L. Belajar dari yang nyangkut maupun yang cuan." },
      ] },
      { type: "note", tone: "info", title: "Hall of Fame", body: "Buka /leaderboard untuk lihat peringkat trader berdasarkan return %. Nama di-mask demi privasi, snapshot di-update harian. Paper trading GRATIS untuk semua." },
      { type: "note", tone: "warning", title: "Ingat", body: "Hasil simulasi pakai uang virtual & harga EOD — tidak menjamin hasil nyata. Anggap sarana latihan & edukasi." },
    ],
  },

  // ============================ TERMINAL PRO ============================
  {
    id: "workspace",
    category: "Tools",
    title: "Terminal Pro (Workspace)",
    icon: "Layers",
    summary: "Workspace multi-chart untuk pantau banyak emiten sekaligus, simpan & bagikan layout, plus function code ala Bloomberg.",
    contents: [
      { type: "paragraph", text: "Terminal Pro (/workspace) adalah ruang kerja multi-chart: tampilkan beberapa emiten berdampingan dalam grid (1/2/4 panel). Cocok untuk memantau watchlist aktif atau membandingkan beberapa saham secara visual. Fitur tier Pro." },
      { type: "steps", items: [
        { title: "Pilih layout", body: "Atur grid 1, 2, atau 4 panel sesuai kebutuhan." },
        { title: "Isi tiap panel", body: "Ketik kode emiten + interval di tiap panel untuk memuat chart-nya." },
        { title: "Pakai function code", body: "Ketik kode ala-Bloomberg: DES (deskripsi), FA (fundamental), GIP (chart), EQS (screener), RV (compare), BMAP (bandarmology), N (news)." },
        { title: "Simpan & bagikan", body: "Layout di-encode ke URL — klik 'Bagikan' untuk salin link. Buka link itu kapan saja untuk memulihkan workspace." },
      ] },
      { type: "note", tone: "info", title: "Tier", body: "Terminal Pro tersedia mulai tier Pro. Tier lebih rendah melihat ajakan upgrade." },
    ],
  },

  // ============================ NOTIFIKASI & WHATSAPP ============================
  {
    id: "notifications",
    category: "Account",
    title: "Notifikasi & WhatsApp",
    icon: "Bell",
    summary: "Atur kanal & jenis notifikasi — termasuk alert lewat WhatsApp dengan kontrol anti-spam (opt-in, jam tenang, batas harian).",
    contents: [
      { type: "paragraph", text: "Nubuat bisa memberi tahu kamu lewat beberapa kanal: dalam aplikasi (lonceng di header), email, dan WhatsApp. Atur semuanya di /settings/notifications." },
      { type: "heading", level: 3, text: "Kanal" },
      { type: "list", items: [
        "Dalam aplikasi — notifikasi muncul di lonceng & halaman /notifications.",
        "Email — dikirim ke email akunmu (perlu email sender aktif).",
        "WhatsApp — alert dikirim ke nomor WA-mu. Wajib opt-in dulu (centang persetujuan).",
      ] },
      { type: "heading", level: 3, text: "Jenis notifikasi" },
      { type: "list", items: [
        "Alert harga — saat alert yang kamu pasang ter-trigger.",
        "Daily Picks — saham pilihan harian.",
        "Berita — berita penting emiten yang kamu pantau.",
      ] },
      { type: "note", tone: "success", title: "Anti-spam", body: "Atur 'jam tenang' (notifikasi WA ditahan di rentang jam itu) dan 'batas harian' (maks alert WA/hari). Nubuat tidak akan membanjiri kamu — kebalikan dari grup sinyal WA yang spam." },
      { type: "note", tone: "info", title: "Lonceng", body: "Ikon lonceng di header menampilkan notifikasi terbaru + jumlah belum dibaca. Klik 'Tandai semua dibaca' atau buka /notifications untuk riwayat lengkap." },
    ],
  },

  // ============================ AJAK TEMAN (REFERRAL) ============================
  {
    id: "referral",
    category: "Account",
    title: "Ajak Teman (Referral)",
    icon: "Users",
    summary: "Bagikan kode referral, ajak teman gabung, dan dapat kredit yang bisa dipakai memotong tagihan langganan.",
    contents: [
      { type: "paragraph", text: "Setiap akun punya kode referral unik. Bagikan link-mu; saat teman mendaftar dan memenuhi syarat (mis. mulai trial/berlangganan), kamu dapat kredit." },
      { type: "steps", items: [
        { title: "Buka /referral", body: "Lihat kode & link referral kamu, plus statistik (diundang, qualified, total reward)." },
        { title: "Bagikan link", body: "Salin link dan kirim ke teman. Yang daftar lewat link itu terhubung ke kamu." },
        { title: "Dapat kredit", body: "Saat referral memenuhi syarat, kredit masuk otomatis." },
        { title: "Pakai kredit", body: "Kredit otomatis memotong nilai invoice saat kamu upgrade/perpanjang langganan." },
      ] },
    ],
  },

  // ============================ CAPITAL FLOW ============================
  {
    id: "capital-flow",
    category: "Discovery",
    title: "Capital Flow",
    icon: "Activity",
    summary: "Pantau aliran modal di pasar — ke mana uang mengalir antar sektor & emiten.",
    contents: [
      { type: "paragraph", text: "Capital Flow (/capital-flow) memvisualisasikan aliran dana di pasar berdasarkan data harga & volume — membantu melihat sektor/emiten yang sedang diakumulasi atau ditinggalkan." },
      { type: "note", tone: "info", title: "Lihat juga", body: "Gabungkan dengan Sector Heatmap (/sectors) dan Rotation/RRG (/rotation) untuk gambaran rotasi sektor yang lebih lengkap." },
    ],
  },

  // ============================ BANTUAN & FEEDBACK ============================
  {
    id: "support",
    category: "Account",
    title: "Bantuan & Feedback",
    icon: "FileText",
    summary: "Buat tiket bantuan, kirim feedback, atau cari jawaban cepat di Help Center.",
    contents: [
      { type: "paragraph", text: "Butuh bantuan atau punya masukan? Nubuat menyediakan beberapa jalur." },
      { type: "list", items: [
        "Help Center (/help) — FAQ dengan pencarian: akun, langganan, paper trading, AI Buddy, pembayaran, data, dll.",
        "Tiket Bantuan (/support) — buat tiket untuk masalah spesifik, lacak balasannya dalam satu thread.",
        "Kirim Feedback — lewat kartu 'Butuh bantuan?' di Dashboard, beri rating + pesan singkat.",
      ] },
    ],
  },
];

export const GUIDANCE_CATEGORIES = [
  "Mulai dari Sini",
  "Analisis Inti",
  "Discovery",
  "Tools",
  "Account",
] as const;
