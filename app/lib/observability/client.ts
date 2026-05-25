"use client";

/**
 * Client-side observability bootstrap.
 *
 * - Sentry: lazy-init kalau `app_config.observability.sentry.dsn` di-set
 *   (admin via /admin/config). Public DSN dipakai di client — safe untuk expose.
 * - PostHog: lazy-init kalau `app_config.observability.posthog.key` di-set.
 *
 * Modul DIIMPORT secara opsional supaya kalau dep belum di-install atau DSN
 * belum di-set, app tetap jalan tanpa crash.
 *
 * Init dilakukan dari component `<Providers>` (Agent 9) atau langsung dari
 * root layout — call `initObservability(config)` di useEffect.
 */

export interface ClientObservabilityConfig {
  sentryDsn?: string | null;
  sentryEnvironment?: string;
  sentryReleaseId?: string;
  posthogKey?: string | null;
  posthogHost?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

let initialized = false;

export async function initClientObservability(config: ClientObservabilityConfig): Promise<void> {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  // Sentry — soft import; skip kalau dep tidak ada
  if (config.sentryDsn) {
    try {
      // @ts-expect-error optional-dep: install `@sentry/nextjs` to enable client-side Sentry.
      const Sentry = await import("@sentry/nextjs").catch(() => null);
      if (Sentry) {
        Sentry.init({
          dsn: config.sentryDsn,
          environment: config.sentryEnvironment ?? "production",
          release: config.sentryReleaseId,
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 1.0,
          ignoreErrors: ["ResizeObserver loop", "Network request failed"],
        });
        if (config.userId) {
          Sentry.setUser({ id: config.userId, email: config.userEmail });
        }
      }
    } catch {
      // ignore
    }
  }

  // PostHog — soft import
  if (config.posthogKey) {
    try {
      // @ts-expect-error optional-dep: install `posthog-js` to enable client-side PostHog.
      const ph = await import("posthog-js").catch(() => null);
      if (ph) {
        const posthog = (ph.default ?? ph) as { init: (k: string, opts: unknown) => void; identify: (id: string, props?: unknown) => void };
        posthog.init(config.posthogKey, {
          api_host: config.posthogHost ?? "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: true,
          autocapture: true,
        });
        if (config.userId) {
          posthog.identify(config.userId, {
            email: config.userEmail,
            role: config.userRole,
          });
        }
      }
    } catch {
      // ignore
    }
  }
}
