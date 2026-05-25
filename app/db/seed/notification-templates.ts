import { logger } from "../../lib/logger";
import { db } from "../../lib/db";
import { notificationTemplates } from "../schema/notifications";
import type {
  NewNotificationTemplate,
  NotificationVariableSpec,
} from "../schema/notifications";

/**
 * Seed default notification templates (ID & EN) untuk event utama.
 *
 * Setiap template di-deduplicate by (key, channel, locale, version) — kalau
 * sudah ada, skip. Admin nanti edit via /admin/notifications (Agent 10).
 *
 * Convention `{{var}}` placeholder, escaping di renderer berdasarkan `isHtml`.
 */

interface TemplateSeed {
  key: string;
  channel: NewNotificationTemplate["channel"];
  locale: string;
  subject: string | null;
  body: string;
  isHtml: boolean;
  variables: Record<string, NotificationVariableSpec>;
  description?: string;
}

const required = (
  type: NotificationVariableSpec["type"] = "string",
  description?: string,
): NotificationVariableSpec => ({ type, required: true, description });

const TEMPLATES: TemplateSeed[] = [
  // ===== auth.email_verification =====
  {
    key: "auth.email_verification",
    channel: "email",
    locale: "id-ID",
    subject: "Verifikasi email Nubuat Anda",
    body: `<p>Halo {{name}},</p>
<p>Terima kasih telah mendaftar di Nubuat. Klik tautan berikut untuk memverifikasi email Anda:</p>
<p><a href="{{verifyUrl}}">Verifikasi email saya</a></p>
<p>Tautan ini berlaku selama {{expiresInMinutes}} menit. Jika Anda tidak mendaftar, abaikan email ini.</p>
<p>— Tim Nubuat</p>`,
    isHtml: true,
    variables: {
      name: required(),
      verifyUrl: required(),
      expiresInMinutes: required("number"),
    },
    description: "Email verifikasi setelah signup.",
  },
  {
    key: "auth.email_verification",
    channel: "email",
    locale: "en-US",
    subject: "Verify your Nubuat email",
    body: `<p>Hi {{name}},</p>
<p>Thanks for signing up for Nubuat. Click the link below to verify your email:</p>
<p><a href="{{verifyUrl}}">Verify my email</a></p>
<p>This link is valid for {{expiresInMinutes}} minutes. If you didn't sign up, ignore this email.</p>
<p>— The Nubuat team</p>`,
    isHtml: true,
    variables: {
      name: required(),
      verifyUrl: required(),
      expiresInMinutes: required("number"),
    },
  },
  {
    key: "auth.email_verification",
    channel: "in_app",
    locale: "id-ID",
    subject: "Verifikasi email Anda",
    body: "Verifikasi email Anda untuk mengakses semua fitur Nubuat.",
    isHtml: false,
    variables: {},
  },
  {
    key: "auth.email_verification",
    channel: "in_app",
    locale: "en-US",
    subject: "Verify your email",
    body: "Verify your email to access all Nubuat features.",
    isHtml: false,
    variables: {},
  },

  // ===== auth.password_reset =====
  {
    key: "auth.password_reset",
    channel: "email",
    locale: "id-ID",
    subject: "Atur ulang password Nubuat Anda",
    body: `<p>Halo {{name}},</p>
<p>Kami menerima permintaan untuk mengatur ulang password Anda. Klik tautan di bawah:</p>
<p><a href="{{resetUrl}}">Atur ulang password saya</a></p>
<p>Tautan berlaku selama {{expiresInMinutes}} menit. Jika Anda tidak meminta reset, abaikan email ini & password Anda tetap aman.</p>
<p>— Tim Nubuat</p>`,
    isHtml: true,
    variables: {
      name: required(),
      resetUrl: required(),
      expiresInMinutes: required("number"),
    },
  },
  {
    key: "auth.password_reset",
    channel: "email",
    locale: "en-US",
    subject: "Reset your Nubuat password",
    body: `<p>Hi {{name}},</p>
<p>We received a request to reset your password. Click the link below:</p>
<p><a href="{{resetUrl}}">Reset my password</a></p>
<p>This link is valid for {{expiresInMinutes}} minutes. If you didn't request a reset, ignore this email — your password remains unchanged.</p>
<p>— The Nubuat team</p>`,
    isHtml: true,
    variables: {
      name: required(),
      resetUrl: required(),
      expiresInMinutes: required("number"),
    },
  },

  // ===== auth.mfa_enabled =====
  {
    key: "auth.mfa_enabled",
    channel: "email",
    locale: "id-ID",
    subject: "Verifikasi dua langkah berhasil diaktifkan",
    body: `<p>Halo {{name}},</p>
<p>Verifikasi dua langkah (2FA) telah diaktifkan pada akun Anda pada {{enabledAt}}.</p>
<p>Jika ini bukan Anda, segera hubungi tim support.</p>`,
    isHtml: true,
    variables: { name: required(), enabledAt: required("date") },
  },
  {
    key: "auth.mfa_enabled",
    channel: "in_app",
    locale: "id-ID",
    subject: "2FA aktif",
    body: "Verifikasi dua langkah telah aktif untuk akun Anda.",
    isHtml: false,
    variables: {},
  },
  {
    key: "auth.mfa_enabled",
    channel: "in_app",
    locale: "en-US",
    subject: "2FA enabled",
    body: "Two-step verification is now enabled on your account.",
    isHtml: false,
    variables: {},
  },

  // ===== alert.price_triggered =====
  {
    key: "alert.price_triggered",
    channel: "in_app",
    locale: "id-ID",
    subject: "Alert {{ticker}} terpicu",
    body: "Harga {{ticker}} mencapai {{price}} ({{direction}} dari target Anda).",
    isHtml: false,
    variables: {
      ticker: required(),
      price: required(),
      direction: required(),
    },
  },
  {
    key: "alert.price_triggered",
    channel: "in_app",
    locale: "en-US",
    subject: "Alert {{ticker}} triggered",
    body: "{{ticker}} price reached {{price}} ({{direction}} your target).",
    isHtml: false,
    variables: {
      ticker: required(),
      price: required(),
      direction: required(),
    },
  },
  {
    key: "alert.price_triggered",
    channel: "email",
    locale: "id-ID",
    subject: "Alert harga {{ticker}} terpicu",
    body: `<p>Halo {{name}},</p>
<p>Harga <strong>{{ticker}}</strong> mencapai <strong>Rp {{price}}</strong> ({{direction}} dari target Anda).</p>
<p><a href="{{tickerUrl}}">Lihat detail di Nubuat</a></p>`,
    isHtml: true,
    variables: {
      name: required(),
      ticker: required(),
      price: required(),
      direction: required(),
      tickerUrl: required(),
    },
  },

  // ===== picks.daily_ready =====
  {
    key: "picks.daily_ready",
    channel: "in_app",
    locale: "id-ID",
    subject: "Daily Picks {{date}} siap",
    body: "{{count}} saham pilihan hari ini telah dipublikasikan. Cek sekarang sebelum pasar buka.",
    isHtml: false,
    variables: {
      date: required("date"),
      count: required("number"),
    },
  },
  {
    key: "picks.daily_ready",
    channel: "in_app",
    locale: "en-US",
    subject: "Daily Picks for {{date}} ready",
    body: "{{count}} stock picks for today are now live. Check them before market opens.",
    isHtml: false,
    variables: {
      date: required("date"),
      count: required("number"),
    },
  },
  {
    key: "picks.daily_ready",
    channel: "email",
    locale: "id-ID",
    subject: "Daily Picks {{date}} — {{count}} saham siap",
    body: `<p>Halo {{name}},</p>
<p>Hari ini kami publikasikan <strong>{{count}}</strong> saham pilihan untuk pasar Indonesia.</p>
<p><a href="{{picksUrl}}">Buka Daily Picks</a></p>
<p>Disclaimer: Bukan saran investasi.</p>`,
    isHtml: true,
    variables: {
      name: required(),
      date: required("date"),
      count: required("number"),
      picksUrl: required(),
    },
  },

  // ===== billing.invoice_paid =====
  {
    key: "billing.invoice_paid",
    channel: "in_app",
    locale: "id-ID",
    subject: "Pembayaran berhasil",
    body: "Faktur {{invoiceNumber}} sebesar Rp {{amount}} telah dibayar. Terima kasih!",
    isHtml: false,
    variables: {
      invoiceNumber: required(),
      amount: required(),
    },
  },
  {
    key: "billing.invoice_paid",
    channel: "in_app",
    locale: "en-US",
    subject: "Payment successful",
    body: "Invoice {{invoiceNumber}} for IDR {{amount}} has been paid. Thank you!",
    isHtml: false,
    variables: {
      invoiceNumber: required(),
      amount: required(),
    },
  },
  {
    key: "billing.invoice_paid",
    channel: "email",
    locale: "id-ID",
    subject: "Faktur {{invoiceNumber}} telah dibayar",
    body: `<p>Halo {{name}},</p>
<p>Terima kasih! Pembayaran faktur <strong>{{invoiceNumber}}</strong> sebesar <strong>Rp {{amount}}</strong> telah kami terima.</p>
<p>Paket Anda diperpanjang hingga <strong>{{nextRenewalDate}}</strong>.</p>
<p><a href="{{invoiceUrl}}">Unduh faktur</a></p>`,
    isHtml: true,
    variables: {
      name: required(),
      invoiceNumber: required(),
      amount: required(),
      nextRenewalDate: required("date"),
      invoiceUrl: required(),
    },
  },

  // ===== billing.subscription_expired =====
  {
    key: "billing.subscription_expired",
    channel: "in_app",
    locale: "id-ID",
    subject: "Langganan Anda telah berakhir",
    body: "Paket {{tier}} Anda telah berakhir. Perpanjang untuk akses penuh kembali.",
    isHtml: false,
    variables: { tier: required() },
  },
  {
    key: "billing.subscription_expired",
    channel: "in_app",
    locale: "en-US",
    subject: "Your subscription has ended",
    body: "Your {{tier}} plan has expired. Renew to restore full access.",
    isHtml: false,
    variables: { tier: required() },
  },
  {
    key: "billing.subscription_expired",
    channel: "email",
    locale: "id-ID",
    subject: "Langganan Nubuat {{tier}} Anda berakhir",
    body: `<p>Halo {{name}},</p>
<p>Paket <strong>{{tier}}</strong> Anda telah berakhir pada {{expiredAt}}. Anda kini berada di paket Gratis.</p>
<p><a href="{{renewUrl}}">Perpanjang sekarang</a> untuk akses penuh ke Daily Picks, AI Copilot, dan fitur premium lainnya.</p>`,
    isHtml: true,
    variables: {
      name: required(),
      tier: required(),
      expiredAt: required("date"),
      renewUrl: required(),
    },
  },
];

export async function seedNotificationTemplates() {
  logger.info("Seeding notification_templates...");
  let inserted = 0;
  for (const t of TEMPLATES) {
    await db
      .insert(notificationTemplates)
      .values({
        key: t.key,
        channel: t.channel,
        locale: t.locale,
        subject: t.subject,
        body: t.body,
        isHtml: t.isHtml,
        variables: t.variables,
        isActive: true,
        version: 1,
        description: t.description ?? null,
      })
      .onConflictDoNothing({
        target: [
          notificationTemplates.key,
          notificationTemplates.channel,
          notificationTemplates.locale,
          notificationTemplates.version,
        ],
      });
    inserted += 1;
  }
  logger.info(`Seeded ${inserted} notification template rows (idempotent).`);
}
