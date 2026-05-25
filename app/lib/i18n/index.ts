/**
 * Public surface untuk modul i18n.
 *
 * Server-side helpers di-export dari sini. Client-side gunakan
 * `useTranslations` dari `next-intl` langsung.
 */
export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeLocale,
  pickLocale,
  toBcp47,
  type Locale,
} from "./config";

export { resolveServerLocale, loadMessages } from "./request";
