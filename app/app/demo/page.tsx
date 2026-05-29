import Link from "next/link";
import { ArrowRight, Play, ListChecks, Award, Activity, TrendingUp, Search, Bot, Wallet } from "lucide-react";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: "Demo Tour — Nubuat",
  description: "Tour fitur Nubuat: cara pakai Daily Picks, Verdict, Wyckoff, Elliott Wave, Pattern Recognition, dan AI Buddy.",
};

interface DemoStep {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  walkthrough: string[];
  cta?: { label: string; href: string };
}

const STEPS: DemoStep[] = [
  {
    step: 1,
    icon: ListChecks,
    title: "Mulai dari Daily Picks",
    description: "Setiap pagi, engine multi-faktor scan 980 emiten dan rekomendasikan top 5 dengan entry/SL/TP konkrit.",
    walkthrough: [
      "Buka Dashboard → lihat Daily Picks card",
      "Klik pick → halaman ticker lengkap dengan Verdict + Wyckoff + DCF",
      "Confidence 0-100% bantu prioritas — &gt; 80 = high conviction",
      "Entry/SL/TP siap copy ke broker — bukan cuma 'buy' tanpa context",
    ],
    cta: { label: "Lihat halaman dashboard", href: "/" },
  },
  {
    step: 2,
    icon: Award,
    title: "Validasi dengan Nubuat Verdict 0-10",
    description: "Score komposit 6-faktor (Technical, Momentum, Value, Quality, Growth, Sentiment) dengan transparent breakdown.",
    walkthrough: [
      "Tab Overview di halaman ticker tampil Verdict card",
      "Klik faktor untuk lihat signal individual (mis. 'RSI overbought 75' atau 'PE rich 32')",
      "Skor &gt; 6.5 = BUY label, 8.0+ = STRONG BUY",
      "Bukan black-box — Anda tahu KENAPA score 7.2",
    ],
  },
  {
    step: 3,
    icon: Activity,
    title: "Konfirmasi pakai Wyckoff Phase + Elliott Wave",
    description: "Auto-detected phase pasar (Accumulation/Markup/Distribution/Markdown) + 5-wave impulse count.",
    walkthrough: [
      "Tab Technical → Wyckoff Phase Mapping di atas chart",
      "Phase Accumulation/Markup = setup OK untuk long",
      "Elliott Wave 1D + 1W timeframe — Fibonacci targets auto-computed",
      "Pattern Recognition: 16 chart pattern (Cup &amp; Handle, Bull Flag, dll) + 7 candlestick",
    ],
  },
  {
    step: 4,
    icon: TrendingUp,
    title: "Cek Fundamental dengan DCF Calculator",
    description: "DCF Intrinsic Value per share + Margin of Safety + Sensitivity Matrix 5×5.",
    walkthrough: [
      "Tab Fundamental → DCF card auto-populated dari Yahoo Finance",
      "Default assumptions reasonable: 4% terminal growth, CAPM discount rate",
      "Sensitivity matrix tunjukkan intrinsic value di berbagai skenario",
      "Margin of safety &gt; 15% = undervalued, &lt; -15% = overvalued",
    ],
  },
  {
    step: 5,
    icon: Search,
    title: "Discover Pakai Screener",
    description: "Filter 980 emiten dengan 26 filter (13 fundamental + 13 technical). 12 preset strategy ready-to-use.",
    walkthrough: [
      "Buka /screener — klik preset 'Mode Swing Santai' (Stoch 10,5,5 oversold)",
      "Atau filter custom: PE &lt; 15 + ROE &gt; 12% + dividend yield &gt; 4%",
      "Save sebagai 'My Screen' — load anytime",
      "Klik tickers untuk drill-down per emiten",
    ],
    cta: { label: "Buka Screener", href: "/screener?preset=swing-santai" },
  },
  {
    step: 6,
    icon: Bot,
    title: "Tanya AI Buddy Apa Saja",
    description: "LLM chatbot dengan 10 tools — bisa run backtest, screener, news search, semua dengan natural language.",
    walkthrough: [
      "Buka /copilot atau tab AI di halaman ticker",
      "Tanya: 'Kenapa BBRI turun hari ini?' → AI cek news + flow",
      "'Backtest BBRI strategy RSI 30/70 5 tahun terakhir' → run backtest + kasih metrics",
      "'Screen saham mining ROE &gt; 15%' → run screener + kasih shortlist",
    ],
    cta: { label: "Tanya AI Buddy", href: "/copilot" },
  },
  {
    step: 7,
    icon: Wallet,
    title: "Test Strategy di Paper Trading",
    description: "Portfolio virtual Rp 100jt dengan fee realistic. Test strategi tanpa risk uang sungguhan.",
    walkthrough: [
      "Buka /portfolio → default portfolio dengan Rp 100jt cash sudah disetup",
      "Halaman ticker → klik 'Paper Buy' atau 'Paper Sell'",
      "Fee 0.15% buy + 0.25% sell (broker Indonesia realistic)",
      "Track open positions, trade history, dan leaderboard",
    ],
    cta: { label: "Buka Paper Trading", href: "/portfolio" },
  },
];

export default function DemoPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="mx-auto max-w-7xl px-4">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-4 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            Demo Tour 7 Langkah
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
            Lihat bagaimana retail trader Indonesia memakai Nubuat dari pagi sampai eksekusi posisi.
            Tutorial step-by-step dengan link langsung ke fitur yang dimaksud.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/demo/play"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              <Play className="h-4 w-4 fill-current" /> Putar Walkthrough Interaktif
            </Link>
            <Link
              href="/signup?trial=1"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold hover:bg-accent"
            >
              Trial 7 Hari <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 space-y-12">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="flex gap-4 sm:gap-6">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  {s.step < STEPS.length && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">{s.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {s.walkthrough.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Play className="mt-1 h-3 w-3 shrink-0 text-primary" />
                        <span className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: w }} />
                      </li>
                    ))}
                  </ul>
                  {s.cta && (
                    <Link
                      href={s.cta.href}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {s.cta.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary/5 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold">Siap mulai analisis IDX yang lebih cerdas?</h2>
          <p className="mt-2 text-muted-foreground">
            Trial 7 hari untuk semua fitur tier Pro. Tanpa kartu kredit, tanpa komitmen.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/signup?trial=1"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Mulai Trial Gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-semibold hover:bg-accent"
            >
              Lihat Semua Fitur
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
