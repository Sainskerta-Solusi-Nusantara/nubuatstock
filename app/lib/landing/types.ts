import { z } from "zod";

/**
 * Zod schemas untuk semua content landing yang disimpan di app_config (category="landing").
 * Schema ini juga dipakai superadmin landing editor untuk validate input sebelum write ke DB.
 */

export const statSchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(30),
});

export const painpointItemSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
});

export const featureItemSchema = z.object({
  id: z.string().min(1).max(40),
  badge: z.string().min(1).max(30),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
});

export const emitenTickerSchema = z.object({
  kode: z.string().min(3).max(5).regex(/^[A-Z][A-Z0-9]{2,4}$/),
  nama: z.string().min(1).max(120),
  sektor: z.string().min(1).max(60),
  tag: z.string().min(1).max(60),
  // Optional logo override per item (admin bisa set manual via CMS).
  // Default: di-resolve runtime dari companies.logo_url + Clearbit/Favicon fallback.
  logoUrl: z.string().url().nullable().optional(),
});

export const stepSchema = z.object({
  n: z.string().min(1).max(4),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
});

export const faqItemSchema = z.object({
  q: z.string().min(1).max(200),
  a: z.string().min(1).max(1500),
});

export type Stat = z.infer<typeof statSchema>;
export type PainpointItem = z.infer<typeof painpointItemSchema>;
export type FeatureItem = z.infer<typeof featureItemSchema>;
export type EmitenTicker = z.infer<typeof emitenTickerSchema>;
export type Step = z.infer<typeof stepSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;

/**
 * Daftar lengkap key landing CMS — dipakai superadmin editor untuk auto-generate form.
 */
export const LANDING_CONFIG_KEYS = [
  // Hero
  "landing.hero.badge",
  "landing.hero.headline_lead",
  "landing.hero.headline_bearish",
  "landing.hero.headline_middle",
  "landing.hero.headline_bullish",
  "landing.hero.headline_tail",
  "landing.hero.subheadline",
  "landing.hero.cta_primary",
  "landing.hero.cta_secondary",
  "landing.hero.cta_note",
  "landing.hero.stats",
  "landing.hero.background_image",
  // Painpoints
  "landing.painpoints.headline_lead",
  "landing.painpoints.headline_highlight",
  "landing.painpoints.subtitle",
  "landing.painpoints.items",
  "landing.painpoints.footnote",
  // Features
  "landing.features.headline_lead",
  "landing.features.headline_highlight",
  "landing.features.subtitle",
  "landing.features.items",
  // Emiten
  "landing.emiten.headline",
  "landing.emiten.subtitle",
  "landing.emiten.tickers",
  // How
  "landing.how.headline_lead",
  "landing.how.headline_highlight",
  "landing.how.subtitle",
  "landing.how.steps",
  // Trial
  "landing.trial.headline",
  "landing.trial.description",
  "landing.trial.cta",
  "landing.trial.inclusions",
  // FAQ
  "landing.faq.headline",
  "landing.faq.items",
  // Footer
  "landing.footer.tagline",
  "landing.footer.image_credits",
] as const;

export type LandingConfigKey = (typeof LANDING_CONFIG_KEYS)[number];

export const VALIDATORS: Partial<Record<LandingConfigKey, z.ZodTypeAny>> = {
  "landing.hero.stats": z.array(statSchema).min(1).max(8),
  "landing.painpoints.items": z.array(painpointItemSchema).min(1).max(12),
  "landing.features.items": z.array(featureItemSchema).min(1).max(20),
  "landing.emiten.tickers": z.array(emitenTickerSchema).min(1).max(30),
  "landing.how.steps": z.array(stepSchema).min(1).max(8),
  "landing.trial.inclusions": z.array(z.string().min(1).max(200)).min(1).max(20),
  "landing.faq.items": z.array(faqItemSchema).min(1).max(30),
};
