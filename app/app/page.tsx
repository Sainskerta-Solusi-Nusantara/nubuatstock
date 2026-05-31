import { inArray } from "drizzle-orm";
import { getConfigs } from "@/lib/config";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { Hero } from "@/components/landing/Hero";
import { Painpoints } from "@/components/landing/Painpoints";
import { Features } from "@/components/landing/Features";
import { EmitenShowcase } from "@/components/landing/EmitenShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AcademyTeaser } from "@/components/landing/AcademyTeaser";
import { TrialCTA } from "@/components/landing/TrialCTA";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { PublicNav } from "@/components/landing/PublicNav";
import type {
  Stat,
  PainpointItem,
  FeatureItem,
  EmitenTicker,
  Step,
  FaqItem,
} from "@/lib/landing/types";

export const revalidate = 60;

/** Resolve logo_url dari companies table (1 SQL query). */
async function enrichTickersWithLogos(tickers: EmitenTicker[]): Promise<EmitenTicker[]> {
  if (tickers.length === 0) return tickers;
  const kodes = tickers.map((t) => t.kode);
  try {
    const rows = await db
      .select({ kode: companies.kode, logoUrl: companies.logoUrl, nama: companies.namaPerusahaan })
      .from(companies)
      .where(inArray(companies.kode, kodes));
    const map = new Map(rows.map((r) => [r.kode, r] as const));
    return tickers.map((t) => ({
      ...t,
      logoUrl: t.logoUrl ?? map.get(t.kode)?.logoUrl ?? null,
      nama: map.get(t.kode)?.nama ?? t.nama,
    }));
  } catch {
    return tickers;
  }
}

export default async function LandingPage() {
  // Single batch query — 40 keys → 1 SQL with IN clause.
  // TTFB turun signifikan dibanding 40 Promise.all sebelumnya.
  const c = await getConfigs({
    appName: { key: "app.name", default: "Nubuat" },
    tagline: { key: "app.tagline", default: "Nubuat 👍 - Nubie Berbuat Mulanya Nyangkut Menuju Yahud" },
    supportEmail: { key: "app.support_email", default: "support@nubuat.id" },
    disclaimer: { key: "app.disclaimer_text", default: "Informasi edukasi — bukan ajakan jual/beli." },

    heroBadge: { key: "landing.hero.badge", default: "Beta launch" },
    heroLead: { key: "landing.hero.headline_lead", default: "Berhenti" },
    heroBearish: { key: "landing.hero.headline_bearish", default: "nyangkut" },
    heroMiddle: { key: "landing.hero.headline_middle", default: ". Mulai" },
    heroBullish: { key: "landing.hero.headline_bullish", default: "profit" },
    heroTail: { key: "landing.hero.headline_tail", default: "dari data." },
    heroSub: { key: "landing.hero.subheadline", default: "menganalisis setiap entry." },
    heroCta1: { key: "landing.hero.cta_primary", default: "Coba Gratis 7 Hari" },
    heroCta2: { key: "landing.hero.cta_secondary", default: "Lihat fitur" },
    heroNote: { key: "landing.hero.cta_note", default: "Tanpa kartu kredit." },
    heroStats: { key: "landing.hero.stats", default: [] as Stat[] },
    heroBg: {
      key: "landing.hero.background_image",
      default: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=70&fm=webp&auto=format",
    },

    ppLead: { key: "landing.painpoints.headline_lead", default: "Trader retail Indonesia kalah karena" },
    ppHighlight: { key: "landing.painpoints.headline_highlight", default: "empat hal yang sama" },
    ppSubtitle: { key: "landing.painpoints.subtitle", default: "" },
    ppItems: { key: "landing.painpoints.items", default: [] as PainpointItem[] },
    ppFootnote: { key: "landing.painpoints.footnote", default: "" },

    ftLead: { key: "landing.features.headline_lead", default: "Semua yang kamu butuhkan untuk" },
    ftHighlight: { key: "landing.features.headline_highlight", default: "trading yang disiplin" },
    ftSubtitle: { key: "landing.features.subtitle", default: "" },
    ftItems: { key: "landing.features.items", default: [] as FeatureItem[] },

    emHead: { key: "landing.emiten.headline", default: "Emiten favorit ritel" },
    emSubtitle: { key: "landing.emiten.subtitle", default: "" },
    emTickersRaw: { key: "landing.emiten.tickers", default: [] as EmitenTicker[] },

    howLead: { key: "landing.how.headline_lead", default: "4 langkah dari nyangkut ke" },
    howHighlight: { key: "landing.how.headline_highlight", default: "disiplin" },
    howSubtitle: { key: "landing.how.subtitle", default: "" },
    howSteps: { key: "landing.how.steps", default: [] as Step[] },

    trialHead: { key: "landing.trial.headline", default: "Coba 7 hari, gratis penuh" },
    trialDesc: { key: "landing.trial.description", default: "" },
    trialCtaText: { key: "landing.trial.cta", default: "Mulai Trial" },
    trialInclusions: { key: "landing.trial.inclusions", default: [] as string[] },

    faqHead: { key: "landing.faq.headline", default: "Pertanyaan yang sering ditanya" },
    faqItems: { key: "landing.faq.items", default: [] as FaqItem[] },

    footerTagline: { key: "landing.footer.tagline", default: "" },
    footerCredits: { key: "landing.footer.image_credits", default: "Image credits: Unsplash" },
  });

  const emTickers = await enrichTickersWithLogos(c.emTickersRaw);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNav appName={c.appName} ctaText={c.heroCta1} />
      <Hero
        appName={c.appName}
        tagline={c.tagline}
        badge={c.heroBadge}
        headlineLead={c.heroLead}
        headlineBearish={c.heroBearish}
        headlineMiddle={c.heroMiddle}
        headlineBullish={c.heroBullish}
        headlineTail={c.heroTail}
        subheadline={c.heroSub}
        ctaPrimary={c.heroCta1}
        ctaSecondary={c.heroCta2}
        ctaNote={c.heroNote}
        stats={c.heroStats}
        backgroundImage={c.heroBg}
      />
      <Painpoints
        headlineLead={c.ppLead}
        headlineHighlight={c.ppHighlight}
        subtitle={c.ppSubtitle}
        items={c.ppItems}
        footnote={c.ppFootnote}
      />
      <Features
        headlineLead={c.ftLead}
        headlineHighlight={c.ftHighlight}
        subtitle={c.ftSubtitle}
        items={c.ftItems}
      />
      <EmitenShowcase headline={c.emHead} subtitle={c.emSubtitle} tickers={emTickers} />
      <HowItWorks
        headlineLead={c.howLead}
        headlineHighlight={c.howHighlight}
        subtitle={c.howSubtitle}
        steps={c.howSteps}
      />
      <AcademyTeaser />
      <TrialCTA
        headline={c.trialHead}
        description={c.trialDesc}
        cta={c.trialCtaText}
        inclusions={c.trialInclusions}
      />
      <FAQ headline={c.faqHead} items={c.faqItems} />
      <Footer
        appName={c.appName}
        tagline={c.footerTagline}
        supportEmail={c.supportEmail}
        disclaimer={c.disclaimer}
        imageCredits={c.footerCredits}
      />
    </main>
  );
}

