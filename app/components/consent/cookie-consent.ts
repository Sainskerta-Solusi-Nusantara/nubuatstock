/**
 * Cookie consent state — utilitas ringan (tanpa dependency eksternal).
 *
 * Menyimpan pilihan user di `localStorage` dengan key `nubuat_cookie_consent`.
 * Dipakai oleh `<CookieConsentBanner>` untuk menampilkan banner sekali, dan
 * bisa dipakai gating analytics non-esensial (PostHog/GA) sebelum init.
 *
 * Catatan: cookie esensial (auth/session) TIDAK digate — hanya analitik &
 * peningkatan layanan yang butuh consent (best practice ID + syarat EU).
 */

export const COOKIE_CONSENT_KEY = "nubuat_cookie_consent";

/** Versi schema — bump kalau kategori cookie berubah supaya user re-consent. */
export const COOKIE_CONSENT_VERSION = 1;

export type ConsentChoice = "accepted" | "rejected";

export interface CookieConsentState {
  /** "accepted" = setuju analitik; "rejected" = hanya cookie esensial. */
  choice: ConsentChoice;
  /** ISO timestamp saat pilihan dibuat. */
  decidedAt: string;
  /** Versi schema saat pilihan dibuat. */
  version: number;
}

/** Custom event name yang dipancarkan saat consent berubah (same-tab updates). */
export const COOKIE_CONSENT_EVENT = "nubuat:cookie-consent";

export function readConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (
      (parsed.choice === "accepted" || parsed.choice === "rejected") &&
      typeof parsed.version === "number"
    ) {
      // Schema bump → anggap belum decide supaya banner muncul lagi.
      if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
      return {
        choice: parsed.choice,
        decidedAt: parsed.decidedAt ?? new Date().toISOString(),
        version: parsed.version,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): CookieConsentState {
  const state: CookieConsentState = {
    choice,
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
      window.dispatchEvent(
        new CustomEvent<CookieConsentState>(COOKIE_CONSENT_EVENT, { detail: state }),
      );
    } catch {
      // localStorage tidak tersedia (private mode dll) — abaikan.
    }
  }
  return state;
}

/** True kalau user sudah memberi consent eksplisit untuk cookie analitik. */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.choice === "accepted";
}
