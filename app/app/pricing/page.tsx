import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { PublicNav } from "@/components/landing/PublicNav";
import { listPublicTiers } from "@/lib/billing";
import { cn } from "@/lib/utils/cn";

// DB-driven: render per-request (jangan prerender statis saat DB belum reachable
// di build sandbox). Tetap SSR → SEO-friendly.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing — Nubuat",
  description:
    "Tier transparan: Free, Starter Rp 99rb/bln, Pro Rp 299rb/bln, Elite Rp 899rb/bln. Trial 7 hari Pro gratis.",
};

/**
 * Pricing dibaca langsung dari DB via `listPublicTiers()` — tidak ada literal
 * harga / nama tier di kode (lihat komentar db/seed/tiers.ts). Tier baru atau
 * perubahan harga di admin /admin/billing langsung tampil di sini setelah seed.
 */
function formatIdr(value: number): string {
  if (value <= 0) return "Rp 0";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default async function PricingPage() {
  let publicTiers: Awaited<ReturnType<typeof listPublicTiers>> = [];
  try {
    publicTiers = await listPublicTiers();
  } catch {
    // DB belum reachable (mis. build sandbox) — render shell; ISR/runtime isi nanti.
    publicTiers = [];
  }
  // Urut sesuai sortOrder dari DB (listPublicTiers sudah orderBy sortOrder).
  const tiers = publicTiers.map(({ tier }) => {
    const isFree = tier.priceMonthlyIdr <= 0;
    const popular = tier.badge === "Most Popular";
    let href = "/signup";
    if (tier.kode === "starter") href = "/signup?trial=pro";
    else if (!isFree) href = `/signup?tier=${tier.kode}`;
    return {
      id: tier.kode,
      name: tier.nama,
      tagline: tier.tagline ?? "",
      priceLabel: formatIdr(tier.priceMonthlyIdr),
      priceSubLabel: isFree ? "selamanya" : "/bulan",
      trialDays: tier.trialDays,
      popular,
      ctaLabel: tier.ctaLabel ?? (isFree ? "Mulai Gratis" : "Mulai"),
      ctaHref: href,
      features: tier.features ?? [],
    };
  });

  const gridCols =
    tiers.length >= 4 ? "lg:grid-cols-4" : tiers.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <main className="bg-background">
      <PublicNav />
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="mx-auto max-w-7xl px-4">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-4 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            Pricing Transparan
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
            Trial 7 hari gratis untuk tier Pro. Tanpa kartu kredit. Auto-downgrade ke Free
            kalau tidak upgrade. <strong>No hidden fees, no auto-renew tricks.</strong>
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className={cn("grid gap-4", gridCols)}>
            {tiers.map((t) => (
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
                  <span className="text-sm text-muted-foreground">{t.priceSubLabel}</span>
                </div>
                {t.tagline && <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>}

                <Link
                  href={t.ctaHref}
                  className={cn(
                    "mt-5 inline-flex h-10 items-center justify-center gap-1 rounded-md px-4 text-sm font-semibold transition",
                    t.popular
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "border border-border bg-background hover:bg-accent",
                  )}
                >
                  {t.ctaLabel}
                </Link>

                <ul className="mt-6 space-y-2 text-xs">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bull" />
                      <span>{f}</span>
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
            Nubuat Pro Rp 299rb/bln — semua modul. Bandingkan dengan tools lain di market.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Fitur</th>
                  <th className="px-3 py-2 text-center">Nubuat Pro<br/><span className="text-[10px] font-normal text-muted-foreground">Rp 299rb/bln</span></th>
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
                  ["AI Buddy LLM", "✓ Unlimited", "—", "—", "—", "—"],
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
                a: "Trial 7 hari otomatis dapat akses ke semua fitur tier Pro tanpa charge. Setelah 7 hari, akun di-downgrade ke Free secara otomatis (tidak charge kartu kredit, bahkan tidak diminta input). Kalau mau tetap pakai tier berbayar (Starter atau Pro), manual upgrade dari /subscription.",
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
                q: "Apakah ada limit query AI Buddy?",
                a: "Free: 5 query/hari. Starter: 50 query/hari. Pro: 500 query/hari. Elite: unlimited (fair use policy). Institutional: custom quota.",
              },
              {
                q: "Data real-time atau delayed?",
                a: "Saat ini Nubuat pakai EoD (end-of-day) data dari Yahoo Finance. Real-time intraday (delay 15 menit atau live) di-roadmap Q3 2026.",
              },
              {
                q: "Bisa upgrade ke Institutional berapa lama?",
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
            Coba dulu 7 hari gratis (tier Pro). Kalau tidak cocok, biarkan auto-downgrade ke Free.
          </p>
          <Link
            href="/signup?trial=pro"
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
