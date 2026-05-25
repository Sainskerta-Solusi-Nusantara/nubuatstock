/**
 * i18n config — supported locales & resolution priority.
 *
 * Priority (highest → lowest):
 *   1. `user.locale` dari session (better-auth) — sudah normalized
 *   2. Cookie `NEXT_LOCALE`
 *   3. `Accept-Language` header (first match)
 *   4. DEFAULT_LOCALE
 *
 * Catatan: kita hanya pakai bagian primary subtag ("id" / "en"), bukan full BCP-47.
 * User profile DB menyimpan `id-ID` / `en-US` — `normalizeLocale` map ke "id" / "en".
 */

export const SUPPORTED_LOCALES = ["id", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Normalize full BCP-47 (id-ID) → primary subtag (id).
 * Returns DEFAULT_LOCALE kalau tidak dikenali.
 */
export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const primary = input.toLowerCase().split(/[-_]/)[0] ?? "";
  return isSupportedLocale(primary) ? primary : DEFAULT_LOCALE;
}

/**
 * Pilih locale berdasarkan urutan priority.
 *
 * @param sources - sumber locale candidate
 */
export function pickLocale(sources: {
  userLocale?: string | null;
  cookieLocale?: string | null;
  header?: string | null;
}): Locale {
  if (sources.userLocale) {
    const normalized = normalizeLocale(sources.userLocale);
    if (isSupportedLocale(normalized)) return normalized;
  }
  if (sources.cookieLocale) {
    const normalized = normalizeLocale(sources.cookieLocale);
    if (isSupportedLocale(normalized)) return normalized;
  }
  if (sources.header) {
    // Accept-Language: "id-ID,en;q=0.7" — ambil first segment.
    const first = sources.header.split(",")[0]?.trim() ?? "";
    const normalized = normalizeLocale(first);
    if (isSupportedLocale(normalized)) return normalized;
  }
  return DEFAULT_LOCALE;
}

/**
 * Full BCP-47 locale untuk DB (`users.locale`) & date formatting.
 */
export function toBcp47(locale: Locale): string {
  switch (locale) {
    case "id":
      return "id-ID";
    case "en":
      return "en-US";
    default:
      return "id-ID";
  }
}
