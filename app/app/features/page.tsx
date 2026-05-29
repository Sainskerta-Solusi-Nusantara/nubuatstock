import Link from "next/link";
import {
  ListChecks,
  Award,
  Activity,
  TrendingUp,
  Calculator,
  Search,
  Layers,
  Compass,
  Newspaper,
  Bot,
  Wallet,
  LineChart,
  Bell,
  Star,
  Command,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { PublicNav } from "@/components/landing/PublicNav";

export const metadata = {
  title: "Fitur — Nubuat",
  description: "Daftar lengkap fitur Nubuat: Daily Picks, AI Copilot, Verdict 0-10, Wyckoff, Elliott Wave, Pattern Recognition, Screener, dan lainnya.",
};

interface FeatureCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  category: "Analisis Inti" | "Discovery" | "Tools" | "AI" | "Trading";
  highlights: string[];
  badge?: "NEW" | "PRO" | "BETA";
}

const FEATURES: FeatureCard[] = [
  {
    icon: ListChecks,
    title: "Daily Picks Engine",
    description: "5 rekomendasi harian dengan entry zone, stop loss, target price, dan reasoning multi-faktor.",
    category: "Analisis Inti",
    highlights: ["Entry/SL/TP konkrit", "Reward/risk ≥ 1.5×", "Performance tracking historis", "Confidence score 0-100"],
  },
  {
    icon: Award,
    title: "Nubuat Verdict 0-10",
    description: "Score komposit 6-faktor (Technical, Momentum, Value, Quality, Growth, Sentiment) dengan transparent breakdown.",
    category: "Analisis Inti",
    highlights: ["6 faktor weighted", "Factor-level signals visible", "Tidak black-box", "Auto-update tiap halaman load"],
  },
  {
    icon: Activity,
    title: "Wyckoff Phase Mapping",
    description: "Deteksi otomatis 4 phase: Accumulation, Markup, Distribution, Markdown dari OHLCV pattern.",
    category: "Analisis Inti",
    highlights: ["Phase timeline visualization", "Confidence score", "Reasoning per phase", "Risk framing context"],
  },
  {
    icon: TrendingUp,
    title: "Elliott Wave Analysis",
    description: "Auto-detect 5-wave impulse + Fibonacci targets dengan Elliott's 3 hard rules validation.",
    category: "Analisis Inti",
    highlights: ["Pivot detection ZigZag", "Multi-timeframe 1D/1W", "Fibonacci retracement + extension", "Subjective bukan crystal ball"],
    badge: "NEW",
  },
  {
    icon: Zap,
    title: "Pattern Recognition",
    description: "Auto-detect 16 chart pattern: Cup&Handle, Bull/Bear Flag, H&S, Double Top/Bottom, Triangle, candlestick patterns.",
    category: "Analisis Inti",
    highlights: ["Continuation + reversal + candlestick", "Breakout/target/stop levels", "Volume confirmation flag", "AI-generated explanation per pattern"],
    badge: "NEW",
  },
  {
    icon: Calculator,
    title: "DCF Valuation",
    description: "Discounted Cash Flow per emiten dengan 10-year projection + sensitivity matrix 5×5.",
    category: "Analisis Inti",
    highlights: ["Auto build dari fundamentals", "Sensitivity table discount × growth", "Margin of safety classification", "FCF projection 10 tahun"],
  },
  {
    icon: Search,
    title: "Stock Screener",
    description: "Filter 980 emiten dengan 13 fundamental + 13 technical filters. Mode Swing Santai (Stoch 10,5,5) included.",
    category: "Discovery",
    highlights: ["13+ technical filters", "13 fundamental filters", "12 strategy presets", "Save custom screens"],
  },
  {
    icon: LineChart,
    title: "Compare Tickers",
    description: "Side-by-side 2-4 emiten dengan chart normalized, fundamentals table best-of-row highlight, verdict comparison.",
    category: "Discovery",
    highlights: ["Chart normalized 100", "12 metric side-by-side", "Best per row auto-highlight", "Verdict + news count"],
  },
  {
    icon: Layers,
    title: "Sector Heatmap",
    description: "Performance ringkasan 11 sektor IDX-IC dengan heatmap visual + ranking table + window selector.",
    category: "Discovery",
    highlights: ["Heatmap proportional MC", "Window 1d/5d/30d/YTD", "Top movers per sektor", "Drill-down ke screener"],
  },
  {
    icon: Compass,
    title: "Rotation Chart (RRG)",
    description: "Relative Rotation Graph 4-quadrant: Leading / Weakening / Lagging / Improving. Identifikasi rotasi modal.",
    category: "Discovery",
    highlights: ["Per sektor + per emiten", "JdK RS-Ratio + RS-Momentum", "Trail rotation history", "Quadrant breakdown"],
    badge: "NEW",
  },
  {
    icon: Newspaper,
    title: "News Feed + AI Sentiment",
    description: "Berita dari 4 RSS sources dengan AI sentiment scoring (bullish/neutral/bearish) + auto ticker tagging.",
    category: "Tools",
    highlights: ["CNBC ID, Detik, Antara, Investing", "Sentiment AI per artikel", "Filter sentiment & ticker", "Per-ticker news tab"],
  },
  {
    icon: Bot,
    title: "AI Copilot",
    description: "LLM-powered chatbot dengan 10 tools: harga, fundamental, news, backtest, screener, dan lainnya.",
    category: "AI",
    highlights: ["DeepSeek + tool use", "Conversational backtest", "Vector RAG research search", "Multi-step queries"],
  },
  {
    icon: Wallet,
    title: "Paper Trading",
    description: "Portfolio virtual Rp 100jt dengan fee simulation realistic (0.15% buy, 0.25% sell). Test strategy tanpa risk.",
    category: "Trading",
    highlights: ["Real-time price execution", "Open positions tracking", "Trade history + P/L", "Leaderboard"],
    badge: "NEW",
  },
  {
    icon: Bell,
    title: "Alerts",
    description: "Trigger notifikasi otomatis untuk price above/below, % change, MA cross, RSI threshold.",
    category: "Tools",
    highlights: ["6 alert types", "In-app + email", "Per-emiten unlimited (Pro)", "Active/paused state"],
  },
  {
    icon: Star,
    title: "Watchlist",
    description: "Track emiten favorit dengan multiple lists, color tags, dan notes per item.",
    category: "Tools",
    highlights: ["Multiple watchlists", "Color coding", "Per-item notes", "Quick reorder"],
  },
  {
    icon: Command,
    title: "Command Palette (Cmd+K)",
    description: "Bloomberg-style keyboard-driven navigation. Tekan Cmd+K dari halaman mana saja.",
    category: "Tools",
    highlights: ["Fuzzy search ticker", "Function codes (EQS, NEWS, BT)", "Screener presets shortcut", "Recent pages"],
  },
];

export default function FeaturesPage() {
  const categories: FeatureCard["category"][] = ["Analisis Inti", "Discovery", "AI", "Trading", "Tools"];

  return (
    <main className="bg-background">
      <PublicNav />
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="mx-auto max-w-7xl px-4">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Fitur Nubuat</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            16+ modul analisis untuk retail trader Indonesia: Daily Picks, AI Copilot, Verdict 0-10, Wyckoff,
            Elliott Wave, Pattern Recognition, Screener, Compare, Sector Rotation, Paper Trading, dan
            banyak lagi.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup?trial=pro"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Coba Gratis 7 Hari <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold transition hover:bg-accent"
            >
              Lihat Harga
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-10 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold transition hover:bg-accent"
            >
              Tour Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid by category */}
      {categories.map((cat) => {
        const items = FEATURES.filter((f) => f.category === cat);
        return (
          <section key={cat} className="border-b border-border py-12">
            <div className="mx-auto max-w-7xl px-4">
              <h2 className="text-2xl font-bold tracking-tight">{cat}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        {f.badge && (
                          <span className="rounded-full bg-bull px-2 py-0.5 text-[9px] font-bold text-white">
                            {f.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {f.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-primary">✓</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="border-b border-border bg-primary/5 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Mulai analisis IDX yang lebih cerdas</h2>
          <p className="mt-3 text-muted-foreground">
            Trial 7 hari gratis untuk semua fitur tier Pro. Tanpa kartu kredit, tanpa komitmen.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup?trial=pro"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Mulai Trial Gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-semibold hover:bg-accent"
            >
              Lihat Tier &amp; Harga
            </Link>
          </div>
        </div>
      </section>

      <Footer
        appName="Nubuat"
        tagline="Sains di balik setiap trade"
        supportEmail="support@nubuat.id"
        disclaimer="Informasi edukasi — bukan ajakan jual/beli."
        imageCredits="Image credits: Unsplash"
      />
    </main>
  );
}
