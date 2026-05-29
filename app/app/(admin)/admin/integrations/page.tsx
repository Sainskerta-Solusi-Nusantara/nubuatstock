import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { appConfig, appSecrets } from "@/db/schema/config";
import { IntegrationsManager } from "./manager";

export const dynamic = "force-dynamic";

/**
 * Admin → Integrations.
 *
 * Konfigurasi 3 integrasi pihak ketiga lewat UI (tanpa CLI):
 *  - Google OAuth (social login)  → secret oauth.google.client_id + client_secret
 *  - Email (Resend)               → secret email.resend.api_key + config email.from_address
 *  - AI provider (DeepSeek)       → secret ai.deepseek.api_key + config ai.provider/model
 *
 * Secret disimpan terenkripsi (AES-256-GCM via APP_MASTER_KEY) di app_secrets.
 * Halaman ini TIDAK pernah menampilkan nilai secret — hanya status configured +
 * last rotated. Set/rotate lewat POST /api/admin/secrets/[key]/set; config lewat
 * PATCH /api/admin/config/[id]. Guard admin/superadmin via layout (admin).
 */

type SecretKey =
  | "oauth.google.client_id"
  | "oauth.google.client_secret"
  | "email.resend.api_key"
  | "ai.deepseek.api_key";

type ConfigKey = "email.from_address" | "ai.provider" | "ai.deepseek.default_model";

const SECRET_KEYS: SecretKey[] = [
  "oauth.google.client_id",
  "oauth.google.client_secret",
  "email.resend.api_key",
  "ai.deepseek.api_key",
];

const CONFIG_KEYS: ConfigKey[] = [
  "email.from_address",
  "ai.provider",
  "ai.deepseek.default_model",
];

export default async function AdminIntegrationsPage() {
  const [secretRows, configRows] = await Promise.all([
    db.select().from(appSecrets).where(inArray(appSecrets.key, SECRET_KEYS)),
    db.select().from(appConfig).where(inArray(appConfig.key, CONFIG_KEYS)),
  ]);

  const secrets = Object.fromEntries(
    SECRET_KEYS.map((key) => {
      const row = secretRows.find((r) => r.key === key);
      return [
        key,
        {
          isConfigured: !!row?.encryptedValue && row.encryptedValue.length > 0,
          lastRotatedAt: row?.lastRotatedAt ? row.lastRotatedAt.toISOString() : null,
          keyVersion: row?.keyVersion ?? 1,
        },
      ];
    }),
  ) as Record<SecretKey, { isConfigured: boolean; lastRotatedAt: string | null; keyVersion: number }>;

  const config = Object.fromEntries(
    CONFIG_KEYS.map((key) => {
      const row = configRows.find((r) => r.key === key);
      return [key, { id: row?.id ?? null, value: row?.value ?? null }];
    }),
  ) as Record<ConfigKey, { id: string | null; value: unknown }>;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-neutral-500">
          Konfigurasi integrasi pihak ketiga lewat UI. Secret disimpan terenkripsi
          (AES-256-GCM) di <span className="font-mono">app_secrets</span> dan TIDAK
          pernah ditampilkan kembali — hanya status. Setiap perubahan tercatat di audit
          log.
        </p>
      </header>

      <IntegrationsManager
        secrets={secrets}
        config={config}
        redirectUri={`${appUrl}/api/auth/callback/google`}
      />
    </div>
  );
}
