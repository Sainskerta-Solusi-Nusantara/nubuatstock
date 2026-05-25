import { z } from "zod";

/**
 * SATU-SATUNYA tempat boleh akses process.env di app code.
 * Aturan: hanya 3 (+1 optional bootstrap) variabel di sini.
 * Sisanya WAJIB dari tabel app_config / app_secrets (lihat lib/config.ts).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  // Unpooled URL untuk migrations & long-running jobs (Neon: gunakan endpoint non-pooler).
  // Optional — kalau kosong, migration fallback ke DATABASE_URL.
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  APP_MASTER_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, {
    message: "APP_MASTER_KEY must be 64 hex characters (32 bytes). Run `npm run generate:key`.",
  }),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment. See AGENTS.md §4 for the env contract.");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

// Runtime safety net — WebCrypto is required by Better-Auth, ULID, and our crypto helper.
if (typeof globalThis.crypto?.subtle === "undefined") {
  console.error("[env] WebCrypto not available — upgrade to Node 20+. Auth and encryption will fail.");
}
