import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale, pickLocale, type Locale } from "./config";

/**
 * next-intl request config — dipakai oleh `NextIntlClientProvider` di
 * `app/layout.tsx`. JANGAN ditambah `process.env.X` — semua locale source
 * dari cookie / header / user session.
 *
 * Catatan: import `messages/<locale>.json` lazily agar tidak bundling
 * dua-duanya saat hanya satu yang dipakai.
 */

export default getRequestConfig(async () => {
  const locale = await resolveServerLocale();
  const messages = await loadMessages(locale);
  return {
    locale,
    messages: messages as AbstractIntlMessages,
    timeZone: "Asia/Jakarta",
    now: new Date(),
  };
});

/**
 * Resolve locale di server context. Tidak baca DB (untuk performa), hanya
 * cookie + accept-language header. User-locale (dari DB) di-sync ke cookie
 * via LocaleSwitcher saat user ubah preferensi.
 */
export async function resolveServerLocale(): Promise<Locale> {
  const c = await cookies();
  const h = await headers();
  return pickLocale({
    cookieLocale: c.get(LOCALE_COOKIE_NAME)?.value,
    header: h.get("accept-language"),
  });
}

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  if (!isSupportedLocale(locale)) {
    return (await import(`@/messages/${DEFAULT_LOCALE}.json`)).default;
  }
  return (await import(`@/messages/${locale}.json`)).default;
}
