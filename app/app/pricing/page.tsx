import Link from "next/link";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "Pricing — Nubuat",
  description: "Tier transparan: Free, Starter Rp 49rb/bln, Pro Rp 99rb/bln, Enterprise custom. Trial 7 hari Pro features gratis.",
};

interface Tier {
  id: string;
  name: string;
  priceLabel: string;
  priceSubLabel?: string;
  description: string;
  popular?: boolean;
  cta: { label: string; href: string };
  features: Array<{ label: string; included: boolean; note?: string }>;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "Rp 0",
    priceSubLabel: "selamanya",
    description: "Cocok untuk eksplorasi awal — dashboard + watchlist basic.",
    cta: { label: "Mulai Gratis", href: "/signup" },
    features: [
      { label: "Dashboard + Morning Brief", included: true },
      { label: "1 watchlist (5 ticker)", included: true },
      { label: "News feed basic (no sentiment)", included: true },
      { label: "Ticker page (price + key stats)", included: true },
      { label: "Sector heatmap", included: true },
      { label: "Daily Picks (preview top 1)", included: true, note: "5 picks di Pro" },
      { label: "AI Copilot", included: false },
      { label: "Verdict 0-10 + Wyckoff + Elliott", included: false },
      { label: "DCF + Pattern Recognition", included: false },
      { label: "Alerts + Backtest + Paper Trading", included: false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "Rp 49.000",
    priceSubLabel: "/bulan",
    description: "Active trader yang butuh alerts + screener + AI sentiment news.",
    cta: { label: "Upgrade ke Starter", href: "/signup?tier=starter" },
    features: [
      { label: "Semua fitur Free", included: true },
      { label: "Daily Picks lengkap (5 picks)", included: true },
      { label: "Watchlist unlimited + tags", included: true },
      { label: "Alerts (6 types)", included: true },
      { label: "News + AI sentiment scoring", included: true },
      { label: "Screener (13 fundamental filters)", included: true },
      { label: "Saved Custom Screens", included: true },
      { label: "AI Copilot (limited 50 query/bulan)", included: true },
      { label: "Verdict + Wyckoff + Patterns + DCF", included: false },
      { label: "Elliott Wave + RRG + Paper Trading", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "Rp 99.000",
    priceSubLabel: "/bulan",
    description: "Power user — semua modul analisis + AI unlimited + Paper Trading.",
    popular: true,
    cta: { label: "Trial 7 Hari Gratis", href: "/signup?tier=pro&trial=1" },
    features: [
      { label: "Semua fitur Starter", included: true },
      { label: "AI Copilot unlimited + conversational backtest", included: true },
      { label: "Nubuat Verdict 0-10 (6 faktor)", included: true },
      { label: "Wyckoff Phase Mapping", included: true },
      { label: "Elliott Wave Analysis (1D + 1W)", included: true },
      { label: "Pattern Recognition (16 types + AI explain)", included: true },
      { label: "DCF Valuation + sensitivity matrix", included: true },
      { label: "Bandarmology (A/D, OBV, MFI)", included: true },
      { label: "Screener Technical Filters + Mode Swing Santai", included: true },
      { label: "Rotation Chart (RRG) + Capital Flow", included: true },
      { label: "Compare Tickers + Sector Heatmap", included: true },
      { label: "Paper Trading Rp 100jt + Leaderboard", included: true },
      { label: "Backtest Engine + Performance Track", included: true },
      { label: "Research Reports + PDF download", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    priceSubLabel: "kontak kami",
    description: "Sekuritas, family office, atau institusi — API access + white-label.",
    cta: { label: "Hubungi Sales", href: "mailto:sales@nubuat.id" },
    features: [
      { label: "Semua fitur Pro", included: true },
      { label: "API access (REST + webhooks)", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Custom integration (broker, ERP)", included: true },
      { label: "White-label option", included: true },
      { label: "Priority data feeds + SLA", included: true },
      { label: "Custom research analyst on-demand", included: true },
      { label: "Multi-user team management", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="mx-auto max-w-7xl px-4">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-4 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            Pricing Transparan
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
            Trial 7 hari gratis untuk semua Pro features. Tanpa kartu kredit. Auto-downgrade ke Free
            kalau tidak upgrade. <strong>No hidden fees, no auto-renew tricks.</strong>
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-4 lg:grid-cols-4">
            {TIERS.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "relative flex flex-col rounded-lg border bg-card p-6 transition",
                  t.popular ? "border-primary shadow-lg" : "border-border",
                )}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <h2 className="text-xl font-bold">{t.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">{t.priceLabel}</span>
                  {t.priceSubLabel && (
                    <span className="text-sm text-muted-foreground">{t.priceSubLabel}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>

                <Link
                  href={t.cta.href}
                  className={cn(
                    "mt-5 inline-flex h-10 items-center justify-center gap-1 rounded-md px-4 text-sm font-semibold transition",
                    t.popular
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "border border-border bg-background hover:bg-accent",
                  )}
                >
                  {t.cta.label}
                </Link>

                <ul className="mt-6 space-y-2 text-xs">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      {f.included ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bull" />
                      ) : (
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={f.included ? "" : "text-muted-foreground/60 line-through"}>
                        {f.label}
                        {f.note && <span className="ml-1 text-[10px] text-muted-foreground">({f.note})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison vs Competitors */}
      <section className="border-y border-border bg-card/40 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold tracking-tight">Compare vs Kompetitor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nubuat Pro Rp 99rb/bln — semua modul. Bandingkan dengan tools lain di market.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Fitur</th>
                  <th className="px-3 py-2 text-center">Nubuat Pro<br/><span className="text-[10px] font-normal text-muted-foreground">Rp 99rb/bln</span></th>
                  <th className="px-3 py-2 text-center">Stockbit Pro<br/><span className="text-[10px] font-normal text-muted-foreground">Free (broker-tied)</span></th>
                  <th className="px-3 py-2 text-center">RTI Business<br/><span className="text-[10px] font-normal text-muted-foreground">Premium</span></th>
                  <th className="px-3 py-2 text-center">AlphaFlow<br/><span className="text-[10px] font-normal text-muted-foreground">Rp 99rb/bln</span></th>
                  <th className="px-3 py-2 text-center">TradingView<br/><span className="text-[10px] font-normal text-muted-foreground">USD 15-60</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Verdict / Multi-factor Score", "✓ 6 faktor transparent", "—", "—", "✓ Wyckoff only", "—"],
                  ["Wyckoff Phase Auto", "✓", "—", "—", "✓", "—"],
                  ["Elliott Wave Auto Count", "✓ 1D + 1W", "—", "—", "—", "Manual only"],
                  ["Pattern Recognition", "✓ 16 types + AI explain", "Basic", "—", "—", "✓"],
                  ["DCF Calculator", "✓ + sensitivity", "—", "—", "—", "—"],
                  ["AI Copilot LLM", "✓ Unlimited", "—", "—", "—", "—"],
                  ["Bandarmology", "✓ A/D OBV MFI", "—", "Foreign flow", "✓ Smart money flow", "—"],
                  ["Paper Trading", "✓ Rp 100jt", "✓", "—", "—", "✓"],
                  ["Backtest Engine", "✓ + AI conversational", "—", "—", "Walk-forward internal", "✓ Pine"],
                  ["Indonesia-native", "✓", "✓", "✓", "✓", "Global only"],
                  ["Mobile native app", "Roadmap", "✓", "—", "Web-first", "✓"],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={cn(
                          "px-3 py-2",
                          j === 0 ? "text-left font-medium" : "text-center text-xs",
                          j === 1 && "bg-primary/5 font-semibold text-primary",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground italic">
            Disclaimer: Comparison berdasarkan public info per Mei 2026. Fitur kompetitor bisa berubah.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-bold tracking-tight text-center">Pertanyaan Umum</h2>
          <div className="mt-6 space-y-3">
            {[
              {
                q: "Apa beda trial dengan free tier?",
                a: "Trial 7 hari otomatis dapat akses ke SEMUA Pro features tanpa charge. Setelah 7 hari, akun di-downgrade ke Free secara otomatis (tidak charge kartu kredit, bahkan tidak diminta input). Kalau mau tetap pakai Pro, manual upgrade dari /subscription.",
              },
              {
                q: "Bisa cancel kapan saja?",
                a: "Ya. Cancel langsung effective di akhir billing period — tidak ada penalty. Refund pro-rated tersedia untuk billing tahunan.",
              },
              {
                q: "Payment method apa saja?",
                a: "GoPay, OVO, DANA, ShopeePay, transfer bank (BCA/Mandiri/BRI/BNI), kartu kredit (Visa/Master). Via Midtrans/Xendit.",
              },
              {
                q: "Apakah ada limit query AI Copilot?",
                a: "Starter: 50 query/bulan. Pro: unlimited (fair use policy). Enterprise: custom quota.",
              },
              {
                q: "Data real-time atau delayed?",
                a: "Saat ini Nubuat pakai EoD (end-of-day) data dari Yahoo Finance. Real-time intraday (delay 15 menit atau live) di-roadmap Q3 2026.",
              },
              {
                q: "Bisa upgrade ke Enterprise berapa lama?",
                a: "Onboarding ~3-5 hari kerja: technical scoping, contract, integration setup, account provisioning, training session.",
              },
            ].map((item, i) => (
              <details key={i} className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary/5 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold">Tetap ragu?</h2>
          <p className="mt-2 text-muted-foreground">
            Coba dulu 7 hari gratis. Kalau tidak cocok, biarkan auto-downgrade ke Free.
          </p>
          <Link
            href="/signup?trial=1"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Mulai Trial Gratis <ArrowRight className="h-4 w-4" />
          </Link>
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
