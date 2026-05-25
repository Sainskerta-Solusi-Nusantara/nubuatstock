import { z } from "zod";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Public i18n types & validation schemas.
 *
 * - `localeSchema` untuk validate input dari API/Form (PATCH user.locale).
 * - `TranslationNamespace` daftarkan namespace yang valid agar import t() ketat.
 */

export type { Locale } from "@/lib/i18n/config";

export const localeSchema = z.enum(SUPPORTED_LOCALES);

export const localeUpdateInputSchema = z.object({
  locale: localeSchema,
});

export type LocaleUpdateInput = z.infer<typeof localeUpdateInputSchema>;

export const TRANSLATION_NAMESPACES = [
  "common",
  "auth",
  "dashboard",
  "watchlist",
  "picks",
  "copilot",
  "subscription",
  "admin",
  "errors",
  "finance",
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];

export interface LocaleSwitcherProps {
  currentLocale: Locale;
  /** Optional callback ketika user pilih locale baru (untuk client component). */
  onChange?: (next: Locale) => void;
}
