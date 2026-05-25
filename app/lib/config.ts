import { eq, and, inArray } from "drizzle-orm";
import { db } from "./db";
import { appConfig, appSecrets } from "@/db/schema/config";
import { decryptSecret } from "./crypto";
import { logger } from "./logger";

/**
 * DB-backed configuration service.
 *
 * - `getConfig<T>(key, opts?)` → membaca dari tabel `app_config` (JSON value).
 * - `getSecret(key)` → membaca dari `app_secrets`, decrypt dengan APP_MASTER_KEY.
 * - In-memory cache 60 detik (override via `app_config` key `runtime.config.cache_ttl_seconds`).
 * - Tidak ada hardcoded fallback. Kalau key tidak ada & tidak ada `defaultValue` → throw.
 *
 * SCOPING:
 * - Beberapa config bisa scoped per tier/user. Pass `scope` opsional.
 *   e.g., getConfig<number>("ai.rate_limit.per_day", { scope: { tier: "pro" } })
 */

type ConfigValue = string | number | boolean | object | null | unknown[];

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const configCache = new Map<string, CacheEntry>();
const secretCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000;

function cacheKey(key: string, scope?: Record<string, string | number | boolean>): string {
  if (!scope) return key;
  const scoped = Object.entries(scope)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("|");
  return `${key}::${scoped}`;
}

export interface GetConfigOptions<T> {
  scope?: Record<string, string | number | boolean>;
  defaultValue?: T;
  ttlMs?: number;
}

export async function getConfig<T extends ConfigValue>(
  key: string,
  opts: GetConfigOptions<T> = {},
): Promise<T> {
  const ck = cacheKey(key, opts.scope);
  const cached = configCache.get(ck);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  try {
    const rows = await db
      .select()
      .from(appConfig)
      .where(
        and(
          eq(appConfig.key, key),
          opts.scope ? eq(appConfig.scope, opts.scope) : eq(appConfig.scope, {}),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      if (opts.defaultValue !== undefined) {
        return opts.defaultValue;
      }
      logger.error({ key, scope: opts.scope }, "Config key not found and no defaultValue");
      throw new ConfigNotFoundError(key, opts.scope);
    }

    const value = rows[0]!.value as T;
    configCache.set(ck, { value, expiresAt: now + (opts.ttlMs ?? DEFAULT_TTL_MS) });
    return value;
  } catch (err) {
    if (err instanceof ConfigNotFoundError) throw err;
    if (opts.defaultValue !== undefined) {
      logger.warn({ key, err }, "Config DB unreachable, using defaultValue");
      return opts.defaultValue;
    }
    throw err;
  }
}

/**
 * Batch fetch — satu SQL query untuk N key, semua di scope default `{}`.
 *
 * Pakai ini di page yang load banyak config sekaligus (landing, dashboard).
 * Cache in-memory tetap dihormati per-key.
 *
 * Returns: object dengan key sebagai property. Kalau key tidak ada di DB,
 * pakai defaultValue (kalau diberikan) — JANGAN throw, supaya page tetap render.
 *
 * Contoh:
 *   const cfg = await getConfigs({
 *     appName: { key: "app.name", default: "Nubuat" },
 *     heroBadge: { key: "landing.hero.badge", default: "Beta" },
 *     ...
 *   });
 *   // cfg.appName: string, cfg.heroBadge: string
 */
export async function getConfigs<
  T extends Record<string, { key: string; default: ConfigValue }>,
>(
  spec: T,
): Promise<{ [K in keyof T]: T[K]["default"] }> {
  const now = Date.now();
  const allKeys = Object.values(spec).map((s) => s.key);

  // Bangun result object dari cache dulu
  const result = {} as { [K in keyof T]: T[K]["default"] };
  const missing: string[] = [];
  for (const propName of Object.keys(spec) as (keyof T)[]) {
    const entry = spec[propName]!;
    const ck = cacheKey(entry.key);
    const cached = configCache.get(ck);
    if (cached && cached.expiresAt > now) {
      result[propName] = cached.value as T[typeof propName]["default"];
    } else {
      missing.push(entry.key);
    }
  }

  // Kalau semua sudah dari cache, langsung return
  if (missing.length === 0) return result;

  // Single SQL query untuk seluruh key yang missing.
  // Saat build (DB unreachable) atau outage runtime, fall back ke defaults
  // supaya page tetap render — defaults sudah disediakan oleh caller.
  let dbMap: Map<string, unknown>;
  try {
    const rows = await db
      .select({ key: appConfig.key, value: appConfig.value })
      .from(appConfig)
      .where(and(inArray(appConfig.key, missing), eq(appConfig.scope, {})));
    dbMap = new Map(rows.map((r) => [r.key, r.value]));
  } catch (err) {
    logger.warn({ missing, err }, "Configs DB unreachable, using defaults");
    for (const propName of Object.keys(spec) as (keyof T)[]) {
      if (propName in result) continue;
      result[propName] = spec[propName]!.default;
    }
    return result;
  }

  for (const propName of Object.keys(spec) as (keyof T)[]) {
    if (propName in result) continue; // sudah dari cache
    const entry = spec[propName]!;
    if (dbMap.has(entry.key)) {
      const value = dbMap.get(entry.key) as T[typeof propName]["default"];
      result[propName] = value;
      configCache.set(cacheKey(entry.key), { value, expiresAt: now + DEFAULT_TTL_MS });
    } else {
      // Fallback ke default
      result[propName] = entry.default;
    }
  }

  return result;
}

export async function getSecret(key: string): Promise<string> {
  const cached = secretCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value as string;
  }

  const rows = await db.select().from(appSecrets).where(eq(appSecrets.key, key)).limit(1);
  if (rows.length === 0) {
    throw new SecretNotFoundError(key);
  }
  const enc = rows[0]!.encryptedValue;
  if (!enc) {
    throw new SecretNotFoundError(key);
  }
  const decrypted = decryptSecret(enc);
  secretCache.set(key, { value: decrypted, expiresAt: now + DEFAULT_TTL_MS });
  return decrypted;
}

export async function hasSecret(key: string): Promise<boolean> {
  try {
    const v = await getSecret(key);
    return v.length > 0;
  } catch {
    return false;
  }
}

export function invalidateConfigCache(key?: string): void {
  if (!key) {
    configCache.clear();
    secretCache.clear();
    return;
  }
  for (const k of configCache.keys()) {
    if (k === key || k.startsWith(`${key}::`)) configCache.delete(k);
  }
  secretCache.delete(key);
}

export class ConfigNotFoundError extends Error {
  override readonly name = "ConfigNotFoundError";
  constructor(public key: string, public scope?: Record<string, unknown>) {
    super(`Config not found: ${key}${scope ? ` (scope=${JSON.stringify(scope)})` : ""}`);
  }
}

export class SecretNotFoundError extends Error {
  override readonly name = "SecretNotFoundError";
  constructor(public key: string) {
    super(`Secret not found or empty: ${key}. Admin must configure via /admin/config.`);
  }
}
