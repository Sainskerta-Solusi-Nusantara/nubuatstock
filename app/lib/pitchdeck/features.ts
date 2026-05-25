/**
 * Katalog fitur Nubuat untuk Feature Guide PDF.
 *
 * Setiap entry = satu fitur unggulan. Path-nya dipakai oleh:
 *   - scripts/capture-pitchdeck-screenshots.ts (Playwright) untuk screenshot
 *   - lib/pitchdeck/feature-pdf.tsx untuk render halaman PDF
 *
 * Screenshot disimpan di `public/pitchdeck/screenshots/<slug>.png` (1280×800).
 *
 * Order list = urutan halaman di PDF. Pertahankan grouping per kategori.
 */

export interface PitchdeckFeature {
  /** Slug = nama file screenshot (tanpa ekstensi). Stabil — jangan rename. */
  slug: string;
  /** Judul tampilan di PDF. */
  title: string;
  /** Kategori untuk grouping section. */
  category:
    | "Discovery"
    | "Analisis"
    | "Workflow"
    | "AI"
    | "Riset"
    | "Performance"
    | "Account";
  /** Path canonical untuk screenshot. Path butuh login (sesi demo). */
  path: string;
  /** 1-paragraf elevator pitch fitur (max ~280 char). */
  pitch: string;
  /** 3-6 bullet detail value/USP. */
  highlights: string[];
  /** Tier akses: free/starter/pro/elite. Default semua kalau "open". */
  tier?: "open" | "starter" | "pro" | "elite";
}

export const PITCHDECK_FEATURES: PitchdeckFeature[] = [
  // ───── Discovery ─────
  {
    slug: "dashboard",
    title: "Dashboard Utama",
    category: "Discovery",
    path: "/dashboard",
    pitch:
      "Cockpit harian: ringkasan portfolio, Daily Picks rule-based, news sentiment, dan corporate action terdekat — semua dalam satu layar yang bisa dipindai dalam <30 detik.",
    highlights: [
      "Snapshot portfolio + P&L real-time",
      "Daily Picks engine dengan SR/SL/TP konkret",
      "Top movers, news terbaru, dan sektor heatmap mini",
      "Personalisasi widget per tier subscription",
    ],
  },
  {
    slug: "screener",
    title: "Stock Screener Multi-Filter",
    category: "Discovery",
    path: "/screener",
    pitch:
      "Filter 980+ emiten BEI berdasarkan kombinasi fundamental, teknikal (Stochastic 10/5/5, RSI, MA), bandarmology, dan pattern. Strategi 'Mode Swing Santai' siap pakai untuk trader part-time.",
    highlights: [
      "12 preset strategi termasuk Swing Santai, Value Hunter, Breakout",
      "Filter teknikal: Stochastic 10/5/5, RSI/MA crossover, volume spike",
      "Save custom screen + alert otomatis kalau hasil berubah",
      "Export CSV / share link",
    ],
  },
  {
    slug: "sectors",
    title: "Sector Heatmap",
    category: "Discovery",
    path: "/sectors",
    pitch:
      "Peta panas 12 sektor IDX-IC dengan return harian/mingguan/bulanan, capital flow, dan top mover per sektor. Cari sektor yang lagi mengalir uangnya sebelum komoditas-nya tahu.",
    highlights: [
      "12 sektor IDX-IC dengan color-coded return",
      "Drill-down top 5 mover per sektor",
      "Multi-timeframe: 1D / 1W / 1M / YTD",
      "Klik sektor → daftar emiten + sorting metrik",
    ],
  },
  {
    slug: "rotation",
    title: "Rotation Chart (RRG)",
    category: "Discovery",
    path: "/rotation",
    pitch:
      "Relative Rotation Graph 4-kuadran untuk visualisasi rotasi sektor/saham vs IHSG. Identifikasi leader/laggard dalam siklus sektor dengan satu pandangan.",
    highlights: [
      "4-kuadran: Leading / Weakening / Lagging / Improving",
      "Trail historis 8 periode untuk arah momentum",
      "Toggle sektor vs saham individual",
      "Filter custom basket dari watchlist",
    ],
  },
  {
    slug: "capital-flow",
    title: "Capital Flow Heatmap",
    category: "Discovery",
    path: "/capital-flow",
    pitch:
      "Heatmap aliran modal (volume × harga) antar sektor dan emiten. Lihat ke mana smart money pindah dari minggu ke minggu — tanpa harus ngubek broker summary manual.",
    highlights: [
      "Net inflow/outflow per sektor & top emiten",
      "Timeframe 1D / 1W / 1M",
      "Highlight anomali (spike volume + price action)",
      "Drill-down ke broker summary per emiten",
    ],
  },

  // ───── Analisis ─────
  {
    slug: "ticker-detail",
    title: "Ticker Detail Page",
    category: "Analisis",
    path: "/ticker/BBRI",
    pitch:
      "Halaman analisis lengkap satu emiten: Nubuat Verdict 0-10 dengan 6 faktor, chart multi-TF dengan Elliott Wave, pattern overlay, fundamental, dan AI narrative — semua di satu halaman.",
    highlights: [
      "Nubuat Verdict 0-10 dengan breakdown 6 faktor (Technical, Momentum, Value, Quality, Growth, Sentiment)",
      "Multi-TF chart dengan Elliott Wave + pattern annotations",
      "Wyckoff Phase detection (Accumulation/Markup/Distribution/Markdown)",
      "Fundamental snapshot + valuation suite (DCF, DDM, Graham, Lynch)",
      "AI narrative dalam Bahasa Indonesia",
    ],
  },
  {
    slug: "compare",
    title: "Ticker Compare Tool",
    category: "Analisis",
    path: "/compare?tickers=BBRI,BBCA,BMRI",
    pitch:
      "Bandingkan hingga 4 emiten side-by-side: verdict score, fundamental, teknikal, dividend, dan price action 5 tahun. Ideal untuk memilih kandidat di sektor sama.",
    highlights: [
      "4 emiten side-by-side, 30+ metrik",
      "Normalisasi harga (rebase 100) untuk relative performance",
      "Verdict comparison + radar chart factor",
      "Export ke PDF / share permalink",
    ],
  },
  {
    slug: "backtest",
    title: "Backtest Engine",
    category: "Analisis",
    path: "/backtest",
    pitch:
      "Uji strategi trading dengan historical data 5 tahun. 4 preset strategi siap pakai (MA crossover, RSI mean-reversion, Breakout, Multi-timeframe) plus engine custom rule.",
    highlights: [
      "4 preset strategi + engine custom",
      "Metrik lengkap: total return, win rate, Sharpe, max drawdown, profit factor",
      "Equity curve + trade-by-trade log",
      "AI conversational backtest — tanya 'gimana kalau RSI 30 di BBRI?' langsung",
    ],
    tier: "starter",
  },
  {
    slug: "picks",
    title: "Daily Picks Engine",
    category: "Analisis",
    path: "/picks",
    pitch:
      "Rule-based engine menghasilkan ide trading harian dengan SR/SL/TP konkret. Track record T+1/T+5/T+20 transparan dipublikasikan setiap hari — tidak ada cherry-picking.",
    highlights: [
      "Rule-based (tanpa override manual) — fully auditable",
      "SR/SL/TP konkret dengan reasoning per pick",
      "Track record T+1, T+5, T+20 publik",
      "Confidence score + alasan filter",
    ],
  },

  // ───── Workflow ─────
  {
    slug: "watchlist",
    title: "Watchlist + Alerts",
    category: "Workflow",
    path: "/watchlist",
    pitch:
      "Watchlist unlimited dengan multi-channel alerts (in-app, email, webhook). Set trigger berdasarkan harga, volume, breakout, atau verdict change — tanpa harus ngecek manual.",
    highlights: [
      "Watchlist unlimited (Pro tier)",
      "Trigger: price level, % move, volume spike, verdict change, pattern breakout",
      "Channel: in-app, email, webhook custom",
      "Anti-spam: cooldown per alert + digest mode",
    ],
  },
  {
    slug: "portfolio",
    title: "Paper Trading Portfolio",
    category: "Workflow",
    path: "/portfolio",
    pitch:
      "Simulasi portfolio dengan fee real-broker untuk uji strategi tanpa risiko modal. Track P&L, win rate, dan Sharpe ratio — siap upgrade ke broker real saat strategi terbukti.",
    highlights: [
      "Simulasi entry/exit dengan fee broker realistis",
      "P&L tracking + analytics (win rate, Sharpe, max drawdown)",
      "Multi-portfolio (max 5 di Pro)",
      "Export ke CSV untuk pajak / pencatatan",
    ],
  },
  {
    slug: "calendar",
    title: "Corporate Action Calendar",
    category: "Workflow",
    path: "/calendar",
    pitch:
      "Kalender RUPS, dividen, stock split, dan corporate action lainnya. Reminder otomatis untuk holding di watchlist supaya tidak miss recording date.",
    highlights: [
      "Cum/ex date dividen + estimasi yield",
      "RUPS, stock split, rights issue, M&A",
      "Filter by emiten di watchlist",
      "Email reminder 3 hari sebelum cum date",
    ],
  },
  {
    slug: "alerts",
    title: "Alerts Center",
    category: "Workflow",
    path: "/alerts",
    pitch:
      "Pusat notifikasi semua trigger Anda — price alerts, breakout, verdict change, news sentiment, dan corporate action. Inbox-style dengan filter dan mark-as-read.",
    highlights: [
      "Multi-trigger: price, %, volume, verdict, pattern, news",
      "Inbox-style dengan filter unread/category",
      "Snooze + dismiss bulk",
      "Push notification PWA",
    ],
  },

  // ───── AI ─────
  {
    slug: "copilot",
    title: "AI Copilot",
    category: "AI",
    path: "/copilot",
    pitch:
      "Asisten DeepSeek dalam Bahasa Indonesia yang menjawab pertanyaan trading dengan 7 tools terintegrasi (ticker data, news search, backtest, RAG riset). Tanya 'BBRI bagus engga sekarang?' — dapat jawaban grounded.",
    highlights: [
      "DeepSeek chat dengan 7 tools (ticker, news, backtest, screener, RAG, compare, calendar)",
      "Prompt caching 86% hit — respons cepat & cost efisien",
      "Tier-based quota dengan cost tracking transparan",
      "Audit log lengkap untuk compliance",
    ],
  },
  {
    slug: "news",
    title: "News Feed + Sentiment",
    category: "AI",
    path: "/news",
    pitch:
      "Agregator berita pasar dengan AI sentiment scoring (-1..+1). Filter per emiten di watchlist, per sektor, atau cari kata kunci. Sentiment time-series untuk lihat shift mood.",
    highlights: [
      "Sumber: Detik, CNBC Indonesia, Kontan, Bisnis.com, Investasi.kontan",
      "AI sentiment scoring per artikel (DeepSeek)",
      "Filter per emiten/sektor",
      "Sentiment time-series chart 30 hari",
    ],
  },

  // ───── Riset ─────
  {
    slug: "research",
    title: "Research Library",
    category: "Riset",
    path: "/research",
    pitch:
      "Library laporan riset internal + Vector RAG semantic search. Cari 'tesis investasi sektor batubara 2026' — dapat artikel paling relevan dengan AI summary, bukan keyword match.",
    highlights: [
      "Vector embedding semua laporan (pgvector)",
      "Semantic search dengan AI summary preview",
      "PDF download dengan chart embed",
      "Filter by author, tag, tanggal",
    ],
  },
  {
    slug: "guidance",
    title: "Menu Guidance",
    category: "Riset",
    path: "/guidance",
    pitch:
      "Panduan lengkap cara membaca dan menggunakan setiap fitur Nubuat dalam Bahasa Indonesia. Disertai contoh dan use case real untuk trader pemula sampai senior.",
    highlights: [
      "Panduan per fitur dengan screenshot",
      "Glossary istilah teknikal + bandarmologi",
      "Use case studi untuk trader pemula sampai senior",
      "Tutorial video pendek (embed) per major flow",
    ],
  },

  // ───── Account ─────
  {
    slug: "subscription",
    title: "Subscription Management",
    category: "Account",
    path: "/subscription",
    pitch:
      "Kelola subscription, billing, dan tier upgrade. Trial 7 hari Pro tanpa kartu kredit. Pembayaran via Midtrans/Xendit (gateway lokal Indonesia).",
    highlights: [
      "4 tier: Free / Starter / Pro / Elite",
      "Trial 7 hari Pro tanpa kartu kredit",
      "Midtrans + Xendit payment gateway",
      "Invoice riwayat + download PDF",
    ],
  },
];

export function groupByCategory(): Array<{
  category: PitchdeckFeature["category"];
  items: PitchdeckFeature[];
}> {
  const map = new Map<PitchdeckFeature["category"], PitchdeckFeature[]>();
  for (const f of PITCHDECK_FEATURES) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category)!.push(f);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}
