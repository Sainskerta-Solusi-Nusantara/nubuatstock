import { getConfig, getSecret, hasSecret } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Server-side Sentry init — dipanggil sekali saat process boot.
 *
 * DSN diambil dari `app_secrets` (encrypted) supaya bisa rotate via /admin/secrets
 * tanpa redeploy. Soft-fail kalau Sentry tidak terinstall atau DSN tidak ada.
 */

let initialized = false;

export async function initServerObservability(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const hasDsn = await hasSecret("observability.sentry.dsn_server");
    if (!hasDsn) return;

    // @ts-expect-error optional-dep: install `@sentry/node` to enable server-side Sentry.
    const Sentry = await import("@sentry/node").catch(() => null);
    if (!Sentry) {
      logger.warn("@sentry/node not installed — server observability disabled");
      return;
    }

    const dsn = await getSecret("observability.sentry.dsn_server");
    const env = await getConfig<string>("observability.sentry.environment", {
      defaultValue: process.env.NODE_ENV ?? "development",
    });

    Sentry.init({
      dsn,
      environment: env,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.05,
      includeLocalVariables: true,
      ignoreErrors: ["ConfigNotFoundError", "SecretNotFoundError"],
    });
    logger.info({ env }, "Sentry server initialized");
  } catch (err) {
    logger.warn({ err }, "Failed to init server observability — continuing without");
  }
}

/**
 * Helper untuk fetch client-side observability config (Sentry DSN public + PostHog key).
 * Dipanggil dari root layout untuk pass ke <Providers> client component.
 */
export async function getClientObservabilityConfig(): Promise<{
  sentryDsn: string | null;
  sentryEnvironment: string;
  posthogKey: string | null;
  posthogHost: string;
}> {
  const env = process.env.NODE_ENV ?? "development";
  let sentryDsn: string | null = null;
  let posthogKey: string | null = null;

  try {
    sentryDsn = await getSecret("observability.sentry.dsn_public");
  } catch {
    /* ignore */
  }
  try {
    posthogKey = await getSecret("observability.posthog.key");
  } catch {
    /* ignore */
  }

  const posthogHost = await getConfig<string>("observability.posthog.host", {
    defaultValue: "https://us.i.posthog.com",
  });

  return { sentryDsn, sentryEnvironment: env, posthogKey, posthogHost };
}
