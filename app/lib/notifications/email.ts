import { getConfig, getSecret, hasSecret } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Email service via Resend (resend.com).
 *
 * - API key di `app_secrets` key `email.resend.api_key` (encrypted)
 * - From address di `app_config` key `email.from_address` (default: noreply@nubuat.id)
 * - Reply-to di `app_config` key `email.reply_to` (default: support@nubuat.id)
 *
 * Soft-fail: kalau Resend SDK tidak ter-install atau API key kosong, log warning
 * dan return null — caller harus handle (jangan crash signup flow).
 */

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

let cachedClient: { send: (opts: unknown) => Promise<{ data: { id: string } | null; error: unknown }> } | null = null;
let cacheChecked = false;

async function getClient() {
  if (cacheChecked) return cachedClient;
  cacheChecked = true;

  try {
    const has = await hasSecret("email.resend.api_key");
    if (!has) {
      logger.info("email.resend.api_key tidak di-set → email service disabled");
      return null;
    }
    const Resend = (await import("resend").catch(() => null)) as
      | { Resend: new (apiKey: string) => { emails: { send: (opts: unknown) => Promise<{ data: { id: string } | null; error: unknown }> } } }
      | null;
    if (!Resend) {
      logger.warn("resend SDK tidak ter-install. Jalankan: npm install resend");
      return null;
    }
    const apiKey = await getSecret("email.resend.api_key");
    const instance = new Resend.Resend(apiKey);
    cachedClient = instance.emails;
    return cachedClient;
  } catch (err) {
    logger.error({ err }, "Failed to init Resend client");
    return null;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = await getClient();
  if (!client) {
    return { ok: false, error: "email_service_not_configured" };
  }

  try {
    const from = await getConfig<string>("email.from_address", { defaultValue: "Nubuat <noreply@nubuat.id>" });
    const defaultReplyTo = await getConfig<string>("email.reply_to", { defaultValue: "support@nubuat.id" });

    const res = await client.send({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo ?? defaultReplyTo,
      tags: input.tags,
    });

    if (res.error) {
      logger.warn({ err: res.error, to: input.to, subject: input.subject }, "Resend send failed");
      return { ok: false, error: String(res.error) };
    }
    return { ok: true, messageId: res.data?.id };
  } catch (err) {
    logger.error({ err: (err as Error).message }, "Email send exception");
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Pre-baked email templates. Untuk advanced (logo, dark mode, dll), pakai
 * notification_templates table (Agent 12) + render via lib/notifications/render.
 */

const BRAND_HEADER = (appName: string) => `
<table style="width:100%;background:#0f1419;padding:24px 32px;">
  <tr>
    <td>
      <div style="font-family:-apple-system,Inter,Segoe UI,sans-serif;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">
        ${appName}
      </div>
      <div style="font-family:-apple-system,Inter,Segoe UI,sans-serif;color:#9ca3af;font-size:12px;margin-top:2px;">
        Sains di balik setiap trade
      </div>
    </td>
  </tr>
</table>`;

const BRAND_FOOTER = (appName: string, supportEmail: string) => `
<table style="width:100%;background:#f9fafb;padding:20px 32px;margin-top:24px;border-top:1px solid #e5e7eb;">
  <tr>
    <td style="font-family:-apple-system,Inter,Segoe UI,sans-serif;color:#6b7280;font-size:12px;line-height:1.5;">
      Kamu menerima email ini karena terdaftar di ${appName}.<br>
      Pertanyaan? Email <a href="mailto:${supportEmail}" style="color:#15803d;">${supportEmail}</a>.<br>
      <br>
      <em>Informasi & analisis di ${appName} untuk edukasi semata, bukan ajakan jual/beli efek.</em>
    </td>
  </tr>
</table>`;

const baseStyle = "font-family:-apple-system,Inter,Segoe UI,sans-serif;color:#0f172a;line-height:1.6;";

export interface WelcomeEmailParams {
  appName: string;
  userName: string;
  trialActive?: boolean;
  trialEndsAt?: Date;
  supportEmail: string;
}

export function renderWelcomeEmail(p: WelcomeEmailParams): { subject: string; html: string; text: string } {
  const trialBlock = p.trialActive && p.trialEndsAt
    ? `<div style="background:#dcfce7;border-left:4px solid #16a34a;padding:12px 16px;margin:20px 0;border-radius:4px;">
        <strong>Trial kamu aktif!</strong><br>
        Akses penuh tier Pro sampai <strong>${p.trialEndsAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>.
        Tidak ada charge mendadak — auto turun ke Free kalau tidak upgrade.
       </div>`
    : "";

  const subject = `Selamat datang di ${p.appName}, ${p.userName}!`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;">
${BRAND_HEADER(p.appName)}
<table style="width:100%;max-width:560px;margin:0 auto;padding:32px;${baseStyle}">
<tr><td>
<h1 style="font-size:24px;margin:0 0 16px;">Halo ${p.userName} 👋</h1>
<p>Terima kasih sudah daftar di <strong>${p.appName}</strong>. Kamu baru saja punya akses ke platform analisis saham Indonesia berbasis data.</p>
${trialBlock}
<h2 style="font-size:16px;margin:24px 0 12px;">Coba 3 hal ini di hari pertama:</h2>
<ol style="padding-left:20px;">
<li><strong>Set watchlist</strong> — tambah 5-10 saham yang kamu pantau, dapat alert harga otomatis.</li>
<li><strong>Buka Daily Picks pagi</strong> — sebelum bursa buka, dapat 3-10 setup dengan SR/SL/TP konkrit.</li>
<li><strong>Tanya AI Buddy</strong> — "Bandingkan BBRI vs BMRI", "Kenapa GOTO turun hari ini?". Bahasa Indonesia, jawaban dengan sumber.</li>
</ol>
<div style="margin:28px 0;">
<a href="https://nubuat.id/dashboard" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Buka Dashboard</a>
</div>
<p style="color:#6b7280;font-size:13px;">Mulai bingung? Reply email ini — tim kami baca semua pesan.</p>
</td></tr>
</table>
${BRAND_FOOTER(p.appName, p.supportEmail)}
</body></html>`;

  const text = `Halo ${p.userName},

Terima kasih sudah daftar di ${p.appName}!

${p.trialActive && p.trialEndsAt ? `🎉 Trial kamu aktif sampai ${p.trialEndsAt.toLocaleDateString("id-ID")}.\n\n` : ""}Coba 3 hal di hari pertama:
1. Set watchlist saham yang kamu pantau
2. Buka Daily Picks pagi (sebelum jam 9)
3. Tanya AI Buddy dalam bahasa Indonesia

Buka: https://nubuat.id/dashboard

Mulai bingung? Reply email ini.

— ${p.appName}
Informasi & analisis untuk edukasi semata, bukan ajakan jual/beli efek.`;

  return { subject, html, text };
}

/**
 * Trial drip campaign (IMPROVEMENT_PLAN §8.5 #35).
 *
 * Tiga tahap selama trial Pro 7 hari, mendorong konversi ke paid:
 *  - "d3"  (hari ke-3): perkenalkan fitur Pro yang sering dilewatkan.
 *  - "d5"  (hari ke-5): trial tinggal 2 hari + value recap / social proof.
 *  - "d6"  (hari ke-6, H-1): besok turun ke Free → ajakan upgrade.
 *
 * Satu fungsi param-based supaya copy & layout konsisten antar tahap.
 */
export type TrialDripStage = "d3" | "d5" | "d6";

export interface TrialDripEmailParams {
  appName: string;
  userName: string;
  stage: TrialDripStage;
  /** Kapan trial habis — untuk kalimat "tinggal N hari" & tanggal. */
  trialEndsAt: Date;
  /** URL halaman langganan untuk CTA upgrade (default: https://nubuat.id/subscription). */
  subscriptionUrl?: string;
  supportEmail: string;
}

function trialDripCopy(p: TrialDripEmailParams): {
  subject: string;
  heading: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  closing: string;
} {
  switch (p.stage) {
    case "d3":
      return {
        subject: `Sudah coba fitur ini di ${p.appName}?`,
        heading: `Halo ${p.userName}, ini yang sering dilewatkan`,
        intro:
          "Trial Pro kamu lagi jalan. Banyak yang belum sempat mencoba 3 fitur Pro paling powerful ini — sayang kalau terlewat:",
        bullets: [
          "<strong>Bandarmology</strong> — lihat akumulasi/distribusi bandar lewat broker summary & foreign flow per saham.",
          "<strong>Research Aggregator</strong> — rangkuman riset sekuritas (target price, rating) dalam satu tempat.",
          "<strong>Data real-time</strong> — harga & order book tanpa delay, plus alert real-time untuk watchlist kamu.",
        ],
        ctaLabel: "Coba sekarang",
        closing: "Tinggal buka dashboard dan klik salah satu fitur di atas — semua sudah aktif selama trial.",
      };
    case "d5":
      return {
        subject: `Trial Pro kamu tinggal 2 hari`,
        heading: `${p.userName}, trial Pro tinggal 2 hari lagi`,
        intro:
          "Sebentar lagi trial kamu habis. Trader yang upgrade bilang ini yang paling kena buat mereka selama pakai Pro:",
        bullets: [
          "Daily Picks dengan SR/SL/TP konkrit tiap pagi sebelum bursa buka.",
          "Bandarmology + foreign flow buat baca pergerakan bandar lebih awal.",
          "AI Buddy tanpa batas harian — tanya apa saja soal saham IDX dengan sumber.",
        ],
        ctaLabel: "Lihat paket Pro",
        closing: "Upgrade sekarang biar akses Pro kamu nggak putus saat trial berakhir.",
      };
    case "d6":
    default:
      return {
        subject: `Besok akunmu turun ke Free — upgrade sekarang`,
        heading: `${p.userName}, besok trial Pro kamu berakhir`,
        intro:
          "Besok akun kamu otomatis turun ke tier Free. Kamu akan kehilangan akses ke fitur Pro yang sudah kamu pakai selama ini:",
        bullets: [
          "Bandarmology penuh & foreign flow per saham.",
          "Research Aggregator (target price & rating sekuritas).",
          "Data real-time + AI Buddy tanpa batas harian.",
        ],
        ctaLabel: "Upgrade ke Pro sekarang",
        closing: "Upgrade hari ini biar tetap Pro tanpa jeda. Cuma butuh beberapa menit.",
      };
  }
}

export function renderTrialDripEmail(p: TrialDripEmailParams): { subject: string; html: string; text: string } {
  const c = trialDripCopy(p);
  const subscriptionUrl = p.subscriptionUrl ?? "https://nubuat.id/subscription";
  const endsLabel = p.trialEndsAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const bulletsHtml = c.bullets
    .map((b) => `<li style="margin-bottom:8px;">${b}</li>`)
    .join("\n");
  const bulletsText = c.bullets
    .map((b) => `- ${b.replace(/<[^>]+>/g, "")}`)
    .join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;">
${BRAND_HEADER(p.appName)}
<table style="width:100%;max-width:560px;margin:0 auto;padding:32px;${baseStyle}">
<tr><td>
<h1 style="font-size:22px;margin:0 0 16px;">${c.heading}</h1>
<p>${c.intro}</p>
<ul style="padding-left:20px;margin:16px 0;">
${bulletsHtml}
</ul>
<div style="background:#f1f5f9;border-left:4px solid #16a34a;padding:12px 16px;margin:20px 0;border-radius:4px;color:#334155;font-size:14px;">
  Akses Pro kamu aktif sampai <strong>${endsLabel}</strong>.
</div>
<div style="margin:28px 0;">
<a href="${subscriptionUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${c.ctaLabel}</a>
</div>
<p style="color:#6b7280;font-size:13px;">${c.closing}</p>
</td></tr>
</table>
${BRAND_FOOTER(p.appName, p.supportEmail)}
</body></html>`;

  const text = `${c.heading}

${c.intro}

${bulletsText}

Akses Pro kamu aktif sampai ${endsLabel}.

${c.ctaLabel}: ${subscriptionUrl}

${c.closing}

— ${p.appName}
Informasi & analisis untuk edukasi semata, bukan ajakan jual/beli efek.`;

  return { subject: c.subject, html, text };
}

export interface VerifyEmailParams {
  appName: string;
  verifyUrl: string;
  supportEmail: string;
}

export function renderVerifyEmail(p: VerifyEmailParams): { subject: string; html: string; text: string } {
  return {
    subject: `Verifikasi email kamu di ${p.appName}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#fff;">
${BRAND_HEADER(p.appName)}
<table style="width:100%;max-width:560px;margin:0 auto;padding:32px;${baseStyle}">
<tr><td>
<h1 style="font-size:22px;margin:0 0 16px;">Verifikasi email kamu</h1>
<p>Klik tombol di bawah untuk konfirmasi email kamu di ${p.appName}. Link berlaku 1 jam.</p>
<div style="margin:24px 0;">
<a href="${p.verifyUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Verifikasi Email</a>
</div>
<p style="color:#6b7280;font-size:12px;">Atau copy-paste ke browser:<br><code style="word-break:break-all;">${p.verifyUrl}</code></p>
<p style="color:#6b7280;font-size:12px;">Kalau bukan kamu yang daftar, abaikan email ini.</p>
</td></tr></table>
${BRAND_FOOTER(p.appName, p.supportEmail)}</body></html>`,
    text: `Verifikasi email kamu di ${p.appName}\n\nKlik link berikut (berlaku 1 jam):\n${p.verifyUrl}\n\nKalau bukan kamu, abaikan email ini.`,
  };
}

export interface ResetPasswordParams {
  appName: string;
  resetUrl: string;
  supportEmail: string;
}

export function renderResetPasswordEmail(p: ResetPasswordParams): { subject: string; html: string; text: string } {
  return {
    subject: `Reset password ${p.appName}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#fff;">
${BRAND_HEADER(p.appName)}
<table style="width:100%;max-width:560px;margin:0 auto;padding:32px;${baseStyle}">
<tr><td>
<h1 style="font-size:22px;margin:0 0 16px;">Reset password</h1>
<p>Kami menerima permintaan reset password untuk akun kamu. Klik tombol di bawah untuk set password baru. Link berlaku 1 jam.</p>
<div style="margin:24px 0;">
<a href="${p.resetUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
</div>
<p style="color:#6b7280;font-size:12px;">Kalau bukan kamu yang request, abaikan email ini. Password tidak akan berubah.</p>
</td></tr></table>
${BRAND_FOOTER(p.appName, p.supportEmail)}</body></html>`,
    text: `Reset password ${p.appName}\n\nKlik link berikut (berlaku 1 jam):\n${p.resetUrl}\n\nKalau bukan kamu, abaikan email ini.`,
  };
}
