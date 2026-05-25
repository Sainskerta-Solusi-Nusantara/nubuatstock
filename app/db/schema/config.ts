import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * `app_config` — semua config app yang BUKAN secret.
 *
 * - `key` namespaced dengan dot (e.g., `security.cors.allowed_origins`, `ai.rate_limit.per_day`).
 * - `value` JSON arbitrary (string/number/bool/array/object).
 * - `scope` JSON optional untuk per-tier / per-user override (e.g., `{"tier": "pro"}`).
 * - `category` untuk grouping di admin UI.
 * - `description` membantu admin UI.
 * - `type` hint untuk admin UI widget (string|number|boolean|json|select).
 */
export const appConfig = pgTable(
  "app_config",
  {
    id: ulid(),
    key: text("key").notNull(),
    scope: jsonbT<Record<string, string | number | boolean>>("scope").notNull().default({}),
    value: jsonbT<unknown>("value").notNull(),
    type: text("type").notNull().default("string"),
    category: text("category").notNull().default("general"),
    description: text("description"),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("app_config_key_scope_uq").on(t.key, t.scope),
    index("app_config_category_idx").on(t.category),
  ],
);

/**
 * `app_secrets` — API keys, tokens, passwords, encrypted dengan APP_MASTER_KEY (AES-256-GCM).
 *
 * - `key` namespaced (e.g., `ai.anthropic.api_key`, `vendor.invezgo.api_key`).
 * - `encryptedValue` ciphertext base64 (iv+tag+ct, lihat lib/crypto.ts).
 * - `keyVersion` untuk rotation.
 * - `lastRotatedAt` audit.
 * - `description` admin UI hint.
 * - JANGAN return `encryptedValue` ke client; admin UI hanya tampilkan "✓ configured" atau "○ not set".
 */
export const appSecrets = pgTable(
  "app_secrets",
  {
    id: ulid(),
    key: text("key").notNull().unique(),
    encryptedValue: text("encrypted_value"),
    keyVersion: integer("key_version").notNull().default(1),
    description: text("description"),
    lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [uniqueIndex("app_secrets_key_uq").on(t.key)],
);

export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;
export type AppSecret = typeof appSecrets.$inferSelect;
export type NewAppSecret = typeof appSecrets.$inferInsert;
