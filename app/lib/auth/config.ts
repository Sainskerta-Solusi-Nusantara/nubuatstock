import { getConfig, hasSecret, getSecret } from "@/lib/config";

/**
 * Auth-related runtime config readers. SEMUA nilai datang dari `app_config` /
 * `app_secrets` — JANGAN hardcode di module-level.
 *
 * Setiap helper di sini async karena membaca DB (lib/config in-memory cache 60s
 * jadi overhead negligible per request).
 */

const AUTH_CONFIG_KEYS = {
  sessionDurationSeconds: "security.session.duration_seconds",
  passwordMinLength: "security.password.min_length",
  rateLimitGlobalRps: "security.rate_limit.global_rps",
  appName: "app.name",
  appLocale: "runtime.locale_default",
  appTimezone: "runtime.timezone",
} as const;

const GOOGLE_OAUTH_KEYS = {
  clientId: "oauth.google.client_id",
  clientSecret: "oauth.google.client_secret",
} as const;

export async function getSessionDurationSeconds(): Promise<number> {
  return getConfig<number>(AUTH_CONFIG_KEYS.sessionDurationSeconds, {
    defaultValue: 60 * 60 * 24 * 30,
  });
}

export async function getPasswordMinLength(): Promise<number> {
  return getConfig<number>(AUTH_CONFIG_KEYS.passwordMinLength, { defaultValue: 12 });
}

export async function getAppName(): Promise<string> {
  return getConfig<string>(AUTH_CONFIG_KEYS.appName, { defaultValue: "Nubuat" });
}

export async function getDefaultLocale(): Promise<string> {
  return getConfig<string>(AUTH_CONFIG_KEYS.appLocale, { defaultValue: "id-ID" });
}

export async function getDefaultTimezone(): Promise<string> {
  return getConfig<string>(AUTH_CONFIG_KEYS.appTimezone, { defaultValue: "Asia/Jakarta" });
}

export interface GoogleOAuthCreds {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
}

export async function getGoogleOAuthCreds(): Promise<GoogleOAuthCreds> {
  const [hasId, hasSecretVal] = await Promise.all([
    hasSecret(GOOGLE_OAUTH_KEYS.clientId),
    hasSecret(GOOGLE_OAUTH_KEYS.clientSecret),
  ]);
  if (!hasId || !hasSecretVal) {
    return { enabled: false };
  }
  const [clientId, clientSecret] = await Promise.all([
    getSecret(GOOGLE_OAUTH_KEYS.clientId),
    getSecret(GOOGLE_OAUTH_KEYS.clientSecret),
  ]);
  return { enabled: true, clientId, clientSecret };
}
