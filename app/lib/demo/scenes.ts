/**
 * Demo Storyboard — 8 scene walkthrough untuk Nubuat.
 *
 * Setiap scene punya:
 *   - title (header text)
 *   - narration (bahasa Indonesia, ~30-50 kata = 12-18 detik bicara natural)
 *   - durationMs (autoplay)
 *   - visual (komponen yang di-mount: dashboard mockup, ticker page, dll)
 *   - keyActions (bullet point yang tampil di overlay)
 *   - cta (optional link untuk skip langsung ke fitur real)
 *
 * Total target durasi: ~3 menit (180 detik) untuk full walkthrough.
 *
 * Script ini juga export-able sebagai dokumen untuk produksi video real
 * (Loom/OBS recording oleh tim marketing).
 */

export type SceneVisual =
  | "intro"
  | "dashboard"
  | "daily_picks"
  | "ticker_overview"
  | "verdict"
  | "wyckoff"
  | "screener"
  | "ai_copilot"
  | "paper_trading"
  | "outro";

export interface DemoScene {
  id: string;
  index: number;
  title: string;
  /** Narration script (~15 detik bicara natural) */
  narration: string;
  /** Auto-advance duration */
  durationMs: number;
  visual: SceneVisual;
  /** Highlights yang tampil sebagai bullet list overlay */
  keyActions: string[];
  /** Optional: link langsung ke fitur real */
  cta?: { label: string; href: string };
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: "intro",
    index: 0,
    title: "Welcome ke Nubuat",
    narration:
      "Selamat datang di Nubuat — platform analisis saham Indonesia berbasis AI. Dalam 3 menit ke depan, kamu akan lihat bagaimana retail trader Indonesia memakai Nubuat dari pagi sampai eksekusi posisi, lengkap dengan technical analysis, fundamental valuation, dan AI copilot.",
    durationMs: 15000,
    visual: "intro",
    keyActions: [
      "🤖 AI-powered analysis untuk 980+ emiten IDX",
      "📊 16 modul: Verdict, Wyckoff, Elliott, DCF, Paper Trading, dll",
      "🎯 Daily Picks dengan entry/SL/TP konkrit",
      "💬 AI Copilot bilingual (ID/EN)",
    ],
  },
  {
    id: "dashboard",
    index: 1,
    title: "Morning Brief & Dashboard",
    narration:
      "Setiap pagi jam 7, Nubuat generate Morning Brief otomatis — ringkasan kondisi IHSG, top 5 daily picks, berita penting 24 jam terakhir, dan kalender aksi korporasi. Kamu tahu apa yang penting sebelum market buka.",
    durationMs: 16000,
    visual: "dashboard",
    keyActions: [
      "AI-generated headline kondisi market",
      "Top 5 Daily Picks dengan reasoning",
      "Berita 24 jam dengan sentiment scoring",
      "Calendar aksi korporasi 7 hari ke depan",
    ],
    cta: { label: "Buka Dashboard", href: "/" },
  },
  {
    id: "daily_picks",
    index: 2,
    title: "Daily Picks dengan SL/TP Konkrit",
    narration:
      "Setiap pick datang dengan entry zone, stop loss, dan target profit yang spesifik — bukan cuma rekomendasi BUY tanpa konteks. Reward-to-risk minimum 1.5x. Confidence 0 sampai 100 persen bantu kamu prioritas mana yang high conviction.",
    durationMs: 17000,
    visual: "daily_picks",
    keyActions: [
      "Entry zone (range harga ideal masuk)",
      "Stop loss berbasis ATR + swing low",
      "Target profit dengan R/R ≥ 1.5×",
      "Confidence score + multi-factor reasoning",
      "Performance tracking historis tiap pick",
    ],
    cta: { label: "Lihat Picks Hari Ini", href: "/picks" },
  },
  {
    id: "verdict",
    index: 3,
    title: "Nubuat Verdict 0-10",
    narration:
      "Setiap emiten dapat skor konsensus 0 sampai 10 dari 6 faktor: Technical, Momentum, Value, Quality, Growth, dan News Sentiment. Berbeda dari rating black-box — kamu bisa lihat KENAPA skornya begitu dengan factor-level breakdown.",
    durationMs: 16000,
    visual: "verdict",
    keyActions: [
      "6 faktor weighted (Technical 25%, sisanya 15%)",
      "Transparent factor-level signals",
      "Label: STRONG BUY / BUY / HOLD / SELL / STRONG SELL",
      "Update real-time tiap halaman load (cached)",
    ],
    cta: { label: "Lihat Verdict BBRI", href: "/ticker/BBRI" },
  },
  {
    id: "wyckoff",
    index: 4,
    title: "Wyckoff Phase + Elliott Wave + Patterns",
    narration:
      "Auto-detected analisis teknikal advanced: Wyckoff phase (Accumulation, Markup, Distribution, Markdown), Elliott Wave count multi-timeframe 1D dan 1W, plus 16 chart patterns termasuk Cup and Handle, Bull Flag, Double Top, dan candlestick patterns — semua dengan AI explanation.",
    durationMs: 18000,
    visual: "wyckoff",
    keyActions: [
      "Wyckoff: 4 phase dengan confidence + reasoning",
      "Elliott Wave: 5-wave impulse + Fibonacci targets",
      "16 chart patterns auto-detect",
      "Pattern levels overlay di chart (breakout/TP/SL)",
      '"Explain with AI" untuk narrative per pattern',
    ],
  },
  {
    id: "screener",
    index: 5,
    title: "Screener dengan Mode Strategy",
    narration:
      "Filter 980 emiten dengan 26 kriteria — fundamental dan technical. Pakai preset strategy seperti Mode Swing Santai untuk Stochastic 10,5,5 oversold, Value Hunter untuk low PE PBV, atau Mode Breakout Hunter untuk Bollinger squeeze. Save filter favorit kamu.",
    durationMs: 17000,
    visual: "screener",
    keyActions: [
      "13 fundamental + 13 technical filters",
      "12 preset strategy (Swing Santai, Value Hunter, dll)",
      "Stochastic 10,5,5 untuk Swing favorite Indonesia",
      "Save custom screens dengan alerts",
    ],
    cta: { label: "Coba Mode Swing Santai", href: "/screener?preset=swing-santai" },
  },
  {
    id: "ai_copilot",
    index: 6,
    title: "AI Copilot dengan 10 Tools",
    narration:
      "Tanyakan apa saja: kenapa BBRI turun hari ini, bandingkan BMRI dengan BBCA, atau backtest strategi RSI 30 70 untuk GOTO. AI Copilot pakai DeepSeek dengan 10 tools yang akses live data — bukan jawaban generic. Setiap output cite sumber data.",
    durationMs: 17000,
    visual: "ai_copilot",
    keyActions: [
      "10 tools: quote, indicators, news, backtest, screener",
      "Conversational backtest natural language",
      "Pattern explanation on-demand",
      "Source citation per fakta",
      "Markdown rendering dengan auto-link ticker",
    ],
    cta: { label: "Tanya AI Copilot", href: "/copilot" },
  },
  {
    id: "paper_trading",
    index: 7,
    title: "Paper Trading Risk-Free",
    narration:
      "Virtual portfolio Rp 100 juta untuk test strategi tanpa risk uang sungguhan. Eksekusi pakai harga real, fee broker realistis 0.15 persen buy dan 0.25 persen sell. Track open positions, P/L unrealized, dan compete di leaderboard.",
    durationMs: 15000,
    visual: "paper_trading",
    keyActions: [
      "Default portfolio Rp 100jt auto-created",
      "Fee simulation realistic Indonesia",
      "Open positions + trade history",
      "Realized + unrealized P/L tracking",
      "Leaderboard weekly/monthly",
    ],
    cta: { label: "Buka Paper Trading", href: "/portfolio" },
  },
  {
    id: "outro",
    index: 8,
    title: "Mulai Trial 7 Hari Gratis",
    narration:
      "Semua fitur tier Pro bisa dicoba gratis 7 hari tanpa kartu kredit. Setelah trial, akun otomatis downgrade ke Free — tidak ada hidden fees, tidak ada auto-renew tricks. Klik tombol di bawah untuk daftar dan mulai analisis IDX yang lebih cerdas.",
    durationMs: 13000,
    visual: "outro",
    keyActions: [
      "✅ 7 hari fitur tier Pro gratis",
      "✅ Tanpa kartu kredit",
      "✅ Auto-downgrade ke Free (no charge surprise)",
      "✅ 980+ emiten coverage",
      "✅ Cancel kapan saja",
    ],
    cta: { label: "Mulai Trial Gratis", href: "/signup?trial=1" },
  },
];

/** Total duration scene-by-scene, untuk progress bar */
export const TOTAL_DURATION_MS = DEMO_SCENES.reduce((acc, s) => acc + s.durationMs, 0);

/** Helper: cari scene di waktu tertentu */
export function getSceneAtTime(elapsedMs: number): { scene: DemoScene; elapsedInScene: number } | null {
  let cumulative = 0;
  for (const s of DEMO_SCENES) {
    if (elapsedMs < cumulative + s.durationMs) {
      return { scene: s, elapsedInScene: elapsedMs - cumulative };
    }
    cumulative += s.durationMs;
  }
  return null;
}
