import { db } from "../../lib/db";
import { appConfig, appSecrets } from "../schema/config";
import { logger } from "../../lib/logger";
import { encryptSecret } from "../../lib/crypto";
import { eq } from "drizzle-orm";

/**
 * Seed default `app_config` values + register expected `app_secrets` slots (empty).
 *
 * - Idempotent: UPSERT pattern.
 * - Admin nantinya update via /admin/config UI (Agent 10).
 * - JANGAN seed nilai actual untuk secrets — biarkan admin yang isi via UI.
 *
 * BOOTSTRAP SECRETS:
 *   Set env var `BOOTSTRAP_<UPPERCASE_KEY>=<value>` saat menjalankan seed pertama kali.
 *   Contoh: BOOTSTRAP_AI_DEEPSEEK_API_KEY=sk-xxx npm run db:seed
 *   Setelah masuk DB (terenkripsi), HAPUS env var tersebut.
 *
 *   Mapping:
 *     BOOTSTRAP_AI_DEEPSEEK_API_KEY   → secret `ai.deepseek.api_key`
 *     BOOTSTRAP_AI_ANTHROPIC_API_KEY  → secret `ai.anthropic.api_key`
 *     BOOTSTRAP_AI_OPENAI_API_KEY     → secret `ai.openai.api_key`
 *     BOOTSTRAP_VENDOR_INVEZGO_API_KEY → secret `vendor.invezgo.api_key`
 *     ... dst (lihat secretSlots di bawah)
 */

interface ConfigEntry {
  key: string;
  value: unknown;
  type: string;
  category: string;
  description: string;
  isSensitive?: boolean;
  scope?: Record<string, string | number | boolean>;
}

const defaults: ConfigEntry[] = [
  // ===== SECURITY =====
  {
    key: "security.cors.allowed_origins",
    value: ["http://localhost:3000"],
    type: "json",
    category: "security",
    description: "Daftar origin yang diizinkan untuk request cross-origin. Tambahkan domain produksi setelah deploy.",
  },
  {
    key: "security.csp.report_only",
    value: true,
    type: "boolean",
    category: "security",
    description: "Mode CSP report-only saat awal launch. Set false setelah validasi.",
  },
  {
    key: "security.rate_limit.global_rps",
    value: 100,
    type: "number",
    category: "security",
    description: "Rate limit global per IP per detik.",
  },
  {
    key: "security.session.duration_seconds",
    value: 86400 * 30,
    type: "number",
    category: "security",
    description: "Durasi session (default 30 hari).",
  },
  {
    key: "security.password.min_length",
    value: 12,
    type: "number",
    category: "security",
    description: "Panjang minimum password.",
  },

  // ===== RUNTIME =====
  {
    key: "runtime.config.cache_ttl_seconds",
    value: 60,
    type: "number",
    category: "runtime",
    description: "TTL cache config in-memory.",
  },
  {
    key: "runtime.timezone",
    value: "Asia/Jakarta",
    type: "string",
    category: "runtime",
    description: "Timezone default app.",
  },
  {
    key: "runtime.locale_default",
    value: "id-ID",
    type: "string",
    category: "runtime",
    description: "Locale default app.",
  },

  // ===== AI =====
  // Provider aktif. Ubah ke "anthropic" atau "openai" untuk swap di runtime.
  {
    key: "ai.provider",
    value: "deepseek",
    type: "string",
    category: "ai",
    description: "Provider AI aktif (deepseek | anthropic | openai). Per-provider config di key terkait di bawah.",
  },

  // --- DeepSeek (default) ---
  {
    key: "ai.deepseek.base_url",
    value: "https://api.deepseek.com/v1",
    type: "string",
    category: "ai",
    description: "Base URL API DeepSeek (OpenAI-compatible).",
  },
  {
    key: "ai.deepseek.default_model",
    value: "deepseek-v4-flash",
    type: "string",
    category: "ai",
    description: "Model DeepSeek default untuk AI Copilot.",
  },
  {
    key: "ai.deepseek.deep_model",
    value: "deepseek-v4-flash",
    type: "string",
    category: "ai",
    description: "Model untuk deep research mode (tier Pro+).",
  },
  {
    key: "ai.deepseek.max_tokens",
    value: 4096,
    type: "number",
    category: "ai",
    description: "Max output tokens per response.",
  },
  {
    key: "ai.deepseek.temperature",
    value: 0.3,
    type: "number",
    category: "ai",
    description: "Temperature default untuk AI generation.",
  },
  {
    key: "ai.deepseek.timeout_ms",
    value: 60000,
    type: "number",
    category: "ai",
    description: "Timeout request ke DeepSeek API (ms).",
  },
  {
    key: "ai.deepseek.context_caching",
    value: true,
    type: "boolean",
    category: "ai",
    description: "Aktifkan context caching DeepSeek (otomatis di API mereka, ini flag observability).",
  },

  // --- Anthropic (fallback / future swap) ---
  {
    key: "ai.anthropic.default_model",
    value: "claude-sonnet-4-6",
    type: "string",
    category: "ai",
    description: "Model Anthropic kalau provider di-swap ke 'anthropic'.",
  },
  {
    key: "ai.anthropic.deep_model",
    value: "claude-opus-4-7",
    type: "string",
    category: "ai",
    description: "Model Anthropic untuk deep mode.",
  },

  // --- OpenAI (fallback / future swap) ---
  {
    key: "ai.openai.base_url",
    value: "https://api.openai.com/v1",
    type: "string",
    category: "ai",
    description: "Base URL OpenAI.",
  },
  {
    key: "ai.openai.default_model",
    value: "gpt-4o-mini",
    type: "string",
    category: "ai",
    description: "Model OpenAI default kalau di-swap.",
  },

  // --- System prompt versioning (actual prompt text di tabel ai_prompts oleh Agent 7) ---
  {
    key: "ai.system_prompt_version",
    value: "v1",
    type: "string",
    category: "ai",
    description: "Versi system prompt aktif. Aktualnya disimpan di tabel ai_prompts (Agent 7).",
  },

  // ===== MARKET DATA =====
  {
    key: "market_data.default_vendor",
    value: "yahoo_finance",
    type: "string",
    category: "market_data",
    description: "Vendor default (yahoo_finance | invezgo | ohlc_dev | itick | idx_direct).",
  },
  {
    key: "market_data.eod_ingest_cron",
    value: "0 16 * * 1-5",
    type: "string",
    category: "market_data",
    description: "Cron pre-market data ingest (default 16:00 WIB Senin-Jumat).",
  },
  {
    key: "market_data.intraday_refresh_seconds",
    value: 60,
    type: "number",
    category: "market_data",
    description: "Interval polling intraday (detik) untuk vendor yang tidak push.",
  },

  // ===== NEWS =====
  {
    key: "news.ingest_cron",
    value: "*/15 * * * *",
    type: "string",
    category: "news",
    description: "Cron RSS feed ingest (default tiap 15 menit).",
  },
  {
    key: "news.sentiment_backfill_cron",
    value: "10 * * * *",
    type: "string",
    category: "news",
    description: "Cron backfill sentiment scoring untuk artikel yang belum di-analyze (default tiap jam menit ke-10).",
  },
  {
    key: "news.retention_days",
    value: 90,
    type: "number",
    category: "news",
    description: "Berapa hari artikel berita disimpan sebelum di-archive (soft delete).",
  },

  // ===== PICKS =====
  {
    key: "picks.universe_min_avg_value_idr",
    value: 1_000_000_000,
    type: "number",
    category: "picks",
    description: "Likuiditas minimum (rata-rata nilai transaksi 20 hari) untuk masuk universe Daily Picks.",
  },
  {
    key: "picks.min_rr_ratio",
    value: 1.5,
    type: "number",
    category: "picks",
    description: "Reward/risk minimum untuk publish pick.",
  },
  {
    key: "picks.max_per_day",
    value: 10,
    type: "number",
    category: "picks",
    description: "Maksimum jumlah picks dipublikasikan per hari.",
  },
  {
    key: "picks.generation_cron",
    value: "30 7 * * 1-5",
    type: "string",
    category: "picks",
    description: "Cron generation Daily Picks (default 07:30 WIB).",
  },
  {
    key: "picks.scoring_weights",
    value: {
      technical: 0.30,
      bandarmology: 0.25,
      fundamental: 0.20,
      sentiment: 0.10,
      macro: 0.10,
      risk_penalty: 0.05,
    },
    type: "json",
    category: "picks",
    description: "Bobot multi-factor scoring (harus total = 1).",
  },

  // ===== EMAIL =====
  {
    key: "email.from_address",
    value: "Nubuat <noreply@nubuat.id>",
    type: "string",
    category: "email",
    description: "From address untuk email transactional (Resend). Format: \"Nama <email@domain>\". Domain harus sudah diverifikasi di Resend.",
  },

  // ===== NOTIFICATION =====
  {
    key: "notifications.default_channels",
    value: ["in_app", "email"],
    type: "json",
    category: "notifications",
    description: "Channel default untuk notifikasi user.",
  },

  // ===== APP META =====
  {
    key: "app.name",
    value: "Nubuat",
    type: "string",
    category: "app",
    description: "Nama aplikasi yang ditampilkan.",
  },
  {
    key: "app.tagline",
    value: "Nubuat 👍 - Nubie Berbuat Mulanya Nyangkut Menuju Yahud",
    type: "string",
    category: "app",
    description: "Tagline yang ditampilkan di landing & email.",
  },
  {
    key: "app.support_email",
    value: "support@nubuat.id",
    type: "string",
    category: "app",
    description: "Email support yang ditampilkan ke user.",
  },
  {
    key: "app.disclaimer_text",
    value: "Seluruh informasi, analisis, dan rekomendasi yang disajikan adalah untuk tujuan edukasi dan informasi semata, bukan ajakan untuk membeli atau menjual efek. Keputusan investasi adalah tanggung jawab pribadi. Kinerja masa lalu bukan jaminan kinerja masa depan.",
    type: "string",
    category: "app",
    description: "Disclaimer wajib untuk semua rekomendasi & daily picks.",
  },
];

interface SecretSlot {
  key: string;
  description: string;
  bootstrapEnv: string;
}

const secretSlots: SecretSlot[] = [
  { key: "ai.deepseek.api_key", description: "API key DeepSeek untuk AI Copilot.", bootstrapEnv: "BOOTSTRAP_AI_DEEPSEEK_API_KEY" },
  { key: "ai.anthropic.api_key", description: "API key Anthropic (kalau provider di-swap ke anthropic).", bootstrapEnv: "BOOTSTRAP_AI_ANTHROPIC_API_KEY" },
  { key: "ai.openai.api_key", description: "API key OpenAI (kalau provider di-swap ke openai).", bootstrapEnv: "BOOTSTRAP_AI_OPENAI_API_KEY" },
  { key: "vendor.invezgo.api_key", description: "API key Invezgo.", bootstrapEnv: "BOOTSTRAP_VENDOR_INVEZGO_API_KEY" },
  { key: "vendor.ohlc_dev.api_key", description: "API key OHLC.dev.", bootstrapEnv: "BOOTSTRAP_VENDOR_OHLC_DEV_API_KEY" },
  { key: "vendor.itick.api_key", description: "API key iTick.", bootstrapEnv: "BOOTSTRAP_VENDOR_ITICK_API_KEY" },
  { key: "payment.midtrans.server_key", description: "Server key Midtrans.", bootstrapEnv: "BOOTSTRAP_PAYMENT_MIDTRANS_SERVER_KEY" },
  { key: "payment.midtrans.client_key", description: "Client key Midtrans.", bootstrapEnv: "BOOTSTRAP_PAYMENT_MIDTRANS_CLIENT_KEY" },
  { key: "payment.xendit.api_key", description: "Secret key Xendit.", bootstrapEnv: "BOOTSTRAP_PAYMENT_XENDIT_API_KEY" },
  { key: "smtp.password", description: "Password SMTP untuk pengiriman email transactional.", bootstrapEnv: "BOOTSTRAP_SMTP_PASSWORD" },
  { key: "email.resend.api_key", description: "API key Resend untuk pengiriman email transactional.", bootstrapEnv: "BOOTSTRAP_EMAIL_RESEND_API_KEY" },
  { key: "oauth.google.client_id", description: "OAuth Google Client ID untuk social login.", bootstrapEnv: "BOOTSTRAP_OAUTH_GOOGLE_CLIENT_ID" },
  { key: "oauth.google.client_secret", description: "OAuth Google Client Secret untuk social login.", bootstrapEnv: "BOOTSTRAP_OAUTH_GOOGLE_CLIENT_SECRET" },
];

export async function seedConfig() {
  logger.info("Seeding app_config defaults...");
  for (const entry of defaults) {
    await db
      .insert(appConfig)
      .values({
        key: entry.key,
        scope: entry.scope ?? {},
        value: entry.value,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        isSensitive: entry.isSensitive ?? false,
      })
      .onConflictDoNothing({ target: [appConfig.key, appConfig.scope] });
  }
  logger.info(`Seeded ${defaults.length} app_config entries`);

  logger.info("Registering app_secrets slots...");
  let bootstrapCount = 0;
  for (const slot of secretSlots) {
    const bootstrapValue = process.env[slot.bootstrapEnv];
    let encryptedValue: string | null = null;
    if (bootstrapValue && bootstrapValue.trim().length > 0) {
      encryptedValue = encryptSecret(bootstrapValue.trim());
      bootstrapCount += 1;
      logger.info({ slot: slot.key, envVar: slot.bootstrapEnv }, "Bootstrapping secret from env (encrypted)");
    }

    // Insert kalau belum ada; kalau ada & ada bootstrap baru → update.
    const existing = await db.select().from(appSecrets).where(eq(appSecrets.key, slot.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(appSecrets).values({
        key: slot.key,
        encryptedValue,
        description: slot.description,
        lastRotatedAt: encryptedValue ? new Date() : null,
      });
    } else if (encryptedValue) {
      await db
        .update(appSecrets)
        .set({ encryptedValue, lastRotatedAt: new Date(), description: slot.description })
        .where(eq(appSecrets.key, slot.key));
    }
  }
  logger.info(`Registered ${secretSlots.length} slots; bootstrapped ${bootstrapCount} from env`);

  if (bootstrapCount > 0) {
    logger.warn(
      "⚠️  Bootstrap env vars detected. HAPUS env BOOTSTRAP_* dari .env kamu setelah seed berhasil — nilai sudah aman di DB (terenkripsi).",
    );
  }
}
