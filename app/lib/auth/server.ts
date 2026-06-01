import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verifications,
  type UserRole,
} from "@/db/schema/auth";
// UserRole dari db/schema sengaja sempit ("user" | "admin") supaya kolom DB
// tetap kompatibel sama migration lama. Untuk app logic 3-tier (termasuk
// "superadmin"), pakai AppUserRole dari lib/auth/roles.
import type { UserRole as AppUserRole } from "@/lib/auth/roles";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getConfig } from "@/lib/config";
import { env } from "@/lib/env";
import type { AppSession, SessionUser } from "@/lib/types/auth";

import {
  getDefaultLocale,
  getDefaultTimezone,
  getGoogleOAuthCreds,
  getPasswordMinLength,
  getSessionDurationSeconds,
} from "./config";
import { recordAuthEvent } from "./audit";

/**
 * Better-Auth instance.
 *
 * - Drizzle adapter pakai schema kita (lihat db/schema/auth.ts).
 * - User pertama yang signup dengan email match `ADMIN_BOOTSTRAP_EMAIL` (HANYA
 *   env var ini yang boleh dibaca di auth context) otomatis dapat role=admin.
 *   Cek di hook `after` user create. Sisanya tetap role default "user" dari
 *   column default DB.
 * - Konfigurasi runtime (session duration, password min length, google OAuth)
 *   dibaca dari DB. Karena Better-Auth ingin sync config, kita lazy-init &
 *   cache instance-nya — initial call membaca DB sekali.
 */

// Instance di-rebuild tiap AUTH_TTL_MS supaya perubahan config/secret (mis.
// kredensial Google OAuth, durasi sesi) kepakai TANPA perlu redeploy. Sebelum
// ini instance singleton permanen, jadi secret yang di-set setelah cold-start
// tidak pernah ke-wire sampai instance di-recycle / redeploy.
const AUTH_TTL_MS = 5 * 60_000;
let cachedAuth: ReturnType<typeof buildAuth> | null = null;
let cachedAuthAt = 0;
let initPromise: Promise<ReturnType<typeof buildAuth>> | null = null;

async function buildAuthAsync() {
  const [sessionSec, minPwLen, locale, tz, google] = await Promise.all([
    getSessionDurationSeconds(),
    getPasswordMinLength(),
    getDefaultLocale(),
    getDefaultTimezone(),
    getGoogleOAuthCreds(),
  ]);

  return buildAuth({
    sessionDurationSec: sessionSec,
    minPasswordLength: minPwLen,
    defaultLocale: locale,
    defaultTimezone: tz,
    google,
  });
}

interface BuildAuthInput {
  sessionDurationSec: number;
  minPasswordLength: number;
  defaultLocale: string;
  defaultTimezone: string;
  google: { enabled: boolean; clientId?: string; clientSecret?: string };
}

function buildAuth(input: BuildAuthInput) {
  const adminBootstrapEmail = env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase().trim();

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (input.google.enabled && input.google.clientId && input.google.clientSecret) {
    socialProviders.google = {
      clientId: input.google.clientId,
      clientSecret: input.google.clientSecret,
    };
  }

  return betterAuth({
    appName: "Nubuat",
    // baseURL eksplisit: tanpa ini better-auth warn "Base URL could not be
    // determined" dan link email verifikasi/reset + callback OAuth bisa salah
    // (dikirim server-side tanpa konteks request). Ambil dari NEXT_PUBLIC_APP_URL
    // (di-set per environment di Vercel); fallback localhost untuk dev.
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    // secret WAJIB di production — tanpa ini better-auth error/throw saat
    // NODE_ENV=production (penyebab sign-in 500 di prod). Baca BETTER_AUTH_SECRET;
    // fallback ke APP_MASTER_KEY (selalu ada, 64-hex stabil) supaya tak pernah kosong.
    secret: process.env.BETTER_AUTH_SECRET ?? env.APP_MASTER_KEY,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        users: users,
        sessions: sessions,
        accounts: accounts,
        verifications: verifications,
      },
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      // autoSignIn tetap true: user langsung punya session setelah signup, TAPI
      // gate emailVerified di app/(app)/layout.tsx yang blokir akses fitur sampai
      // email diverifikasi. Pola ini lebih ramah daripada hard-block login
      // (user bisa lihat halaman "verifikasi dulu" + tombol resend).
      autoSignIn: true,
      minPasswordLength: input.minPasswordLength,
      maxPasswordLength: 256,
      // requireEmailVerification=false: better-auth tidak mem-block sign-in di
      // level core. Enforcement verifikasi dilakukan di app shell (layout (app))
      // supaya UX-nya berupa gate page, bukan error login mentah.
      requireEmailVerification: false,
      // Reset password — link berlaku 1 jam. Email dikirim via Resend (soft-fail
      // kalau email service belum dikonfigurasi: log warn, tidak crash).
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        try {
          const [appName, supportEmail] = await Promise.all([
            getConfig<string>("app.name", { defaultValue: "Nubuat" }),
            getConfig<string>("app.support_email", { defaultValue: "support@nubuat.id" }),
          ]);
          const { sendEmail, renderResetPasswordEmail } = await import(
            "@/lib/notifications/email"
          );
          const { subject, html, text } = renderResetPasswordEmail({
            appName,
            resetUrl: url,
            supportEmail,
          });
          const res = await sendEmail({
            to: user.email,
            subject,
            html,
            text,
            tags: [{ name: "type", value: "reset_password" }],
          });
          if (!res.ok) {
            logger.warn(
              { err: res.error, userId: user.id },
              "reset password email tidak terkirim (email service belum dikonfigurasi?)",
            );
          }
        } catch (err) {
          logger.error({ err, userId: user.id }, "sendResetPassword gagal");
        }
      },
      // Argon2id adalah default better-auth password hasher (via @node-rs/argon2).
      // Kalau better-auth v1.1 sudah ganti ke scrypt, override perlu password.hash.
      // Kita biarkan default — sudah aman per AGENTS.md §7.
    },
    emailVerification: {
      // Kirim email verifikasi otomatis saat signup.
      sendOnSignUp: true,
      // Saat user klik link verifikasi, langsung sign-in supaya UX mulus.
      autoSignInAfterVerification: true,
      // Link verifikasi berlaku 1 jam (selaras dengan copy di renderVerifyEmail).
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        try {
          const [appName, supportEmail] = await Promise.all([
            getConfig<string>("app.name", { defaultValue: "Nubuat" }),
            getConfig<string>("app.support_email", { defaultValue: "support@nubuat.id" }),
          ]);
          const { sendEmail, renderVerifyEmail } = await import(
            "@/lib/notifications/email"
          );
          const { subject, html, text } = renderVerifyEmail({
            appName,
            verifyUrl: url,
            supportEmail,
          });
          const res = await sendEmail({
            to: user.email,
            subject,
            html,
            text,
            tags: [{ name: "type", value: "verify_email" }],
          });
          if (!res.ok) {
            // Soft-fail: jangan crash signup kalau email service belum dikonfigurasi.
            logger.warn(
              { err: res.error, userId: user.id },
              "verification email tidak terkirim",
            );
          }
        } catch (err) {
          logger.error({ err, userId: user.id }, "sendVerificationEmail gagal");
        }
      },
    },
    session: {
      expiresIn: input.sessionDurationSec,
      updateAge: Math.min(input.sessionDurationSec, 60 * 60 * 24),
      // cookieCache DIMATIKAN: di server-render (RSC) cache cookie ini bikin
      // getSession tidak deterministik — pemanggilan kedua dalam satu render bisa
      // balik null (cookie hanya bisa ditulis di Server Action/Route Handler),
      // sehingga user yang login malah "terlempar". Tanpa cache, getSession selalu
      // validasi token ke DB (read-only) → andal di mana pun.
      cookieCache: { enabled: false },
    },
    // Rate-limit bawaan better-auth (berbasis IP) untuk melindungi endpoint auth
    // dari brute-force & abuse. Default storage = in-memory (cukup untuk single
    // instance; untuk multi-instance pakai secondaryStorage). Endpoint sensitif
    // (sign-in/sign-up/reset/verify) di-set lebih ketat lewat customRules.
    // Catatan: agent lain menangani rate-limit endpoint NON-auth (lib/security).
    rateLimit: {
      enabled: true,
      // Window & max default untuk semua endpoint auth.
      window: 60, // detik
      max: 30, // 30 request / IP / menit untuk endpoint auth umum
      customRules: {
        // Brute-force login: 5 percobaan / menit / IP.
        "/sign-in/email": { window: 60, max: 5 },
        // Signup: cegah pembuatan akun massal.
        "/sign-up/email": { window: 60, max: 3 },
        // Reset password request: cegah email bombing.
        "/request-password-reset": { window: 60 * 5, max: 3 },
        "/forget-password": { window: 60 * 5, max: 3 },
        // Resend verifikasi: cegah spam email verifikasi.
        "/send-verification-email": { window: 60 * 5, max: 3 },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
      },
      cookiePrefix: "nubuat",
      useSecureCookies: env.NODE_ENV === "production",
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
        locale: {
          type: "string",
          required: false,
          defaultValue: input.defaultLocale,
          input: false,
        },
        timezone: {
          type: "string",
          required: false,
          defaultValue: input.defaultTimezone,
          input: false,
        },
        phone: { type: "string", required: false, input: false },
        mfaEnabled: { type: "boolean", required: false, defaultValue: false, input: false },
        failedLoginCount: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
      },
    },
    socialProviders,
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            const email = (data.email ?? "").toLowerCase().trim();
            const isBootstrapAdmin =
              !!adminBootstrapEmail && email === adminBootstrapEmail;
            // Bootstrap email → SUPERADMIN (bukan sekadar admin). Lihat ROLES.md.
            return {
              data: {
                ...data,
                email,
                role: isBootstrapAdmin ? ("superadmin" as UserRole) : ("user" as UserRole),
                locale: input.defaultLocale,
                timezone: input.defaultTimezone,
              },
            };
          },
          after: async (createdUser) => {
            await recordAuthEvent({
              actorUserId: createdUser.id,
              action: "signup",
              metadata: { email: createdUser.email, role: createdUser.role ?? "user" },
            });

            // Integration glue — best-effort. Kegagalan di sini TIDAK blokir signup
            // (user tetap berhasil registrasi). Setiap error di-log untuk monitoring.

            // 1. Auto-create subscription. Default = Free. Kalau cookie
            //    `nubuat_trial_intent=1` ada (di-set oleh signup-form ketika
            //    user datang via `/signup?trial=1`), start Trial Pro 7 hari
            //    via `startTrialSubscription`. Cookie selalu di-clear setelah
            //    dibaca supaya tidak bocor ke flow lain.
            let trialIntent = false;
            try {
              const { cookies } = await import("next/headers");
              const store = await cookies();
              const c = store.get("nubuat_trial_intent");
              if (c?.value === "1") {
                trialIntent = true;
                try {
                  store.delete("nubuat_trial_intent");
                } catch {
                  // cookies().delete() throws di Route Handler context lama —
                  // tidak fatal, cookie akan expire dalam 5 menit.
                }
              }
            } catch (err) {
              logger.debug({ err }, "trial intent cookie read skipped (no request context)");
            }

            try {
              const billing = await import("@/lib/billing");
              if (trialIntent) {
                const fn = (billing as {
                  startTrialSubscription?: (args: {
                    userId: string;
                    metadata?: Record<string, unknown>;
                  }) => Promise<unknown>;
                }).startTrialSubscription;
                if (fn) {
                  await fn({
                    userId: createdUser.id,
                    metadata: { source: "signup_query_trial=1" },
                  });
                  logger.info({ userId: createdUser.id }, "trial Pro 7d started at signup");
                } else {
                  // fallback safety — kalau export hilang, jangan blokir signup
                  const free = (billing as {
                    ensureFreeSubscription?: (args: { userId: string }) => Promise<unknown>;
                  }).ensureFreeSubscription;
                  if (free) await free({ userId: createdUser.id });
                }
              } else {
                const fn = (billing as {
                  ensureFreeSubscription?: (args: { userId: string }) => Promise<unknown>;
                }).ensureFreeSubscription;
                if (fn) await fn({ userId: createdUser.id });
              }
            } catch (err) {
              logger.error(
                { err, userId: createdUser.id, trialIntent },
                "subscription bootstrap failed at signup",
              );
            }

            // 2. Auto-create default watchlist "Utama" (Agent 6 helper).
            try {
              const watchlist = await import("@/lib/watchlist");
              const fn = (watchlist as { ensureDefaultWatchlist?: (userId: string) => Promise<unknown> })
                .ensureDefaultWatchlist;
              if (fn) await fn(createdUser.id);
            } catch (err) {
              logger.error({ err, userId: createdUser.id }, "ensureDefaultWatchlist failed at signup");
            }

            // 3. Emit user.created event untuk konsumer lain (notifikasi welcome, dll).
            try {
              const queue = await import("@/lib/queue/events");
              const publishEvent = (queue as { publishEvent?: (channel: string, payload: unknown) => Promise<unknown> })
                .publishEvent;
              if (publishEvent) {
                await publishEvent("user.created", {
                  userId: createdUser.id,
                  email: createdUser.email,
                  role: createdUser.role ?? "user",
                  createdAt: new Date().toISOString(),
                });
              }
            } catch (err) {
              logger.error({ err, userId: createdUser.id }, "publishEvent user.created failed");
            }
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await recordAuthEvent({
              actorUserId: session.userId,
              action: "login_success",
              metadata: { sessionId: session.id },
              ip: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
            });
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

function rebuildAuth() {
  if (!initPromise) {
    initPromise = buildAuthAsync()
      .then((inst) => {
        cachedAuth = inst;
        cachedAuthAt = Date.now();
        return inst;
      })
      .catch((err) => {
        logger.error({ err }, "Failed to init better-auth");
        throw err;
      })
      .finally(() => {
        // Lepas dedup promise agar rebuild berikutnya (setelah TTL) bisa jalan.
        initPromise = null;
      });
  }
  return initPromise;
}

export async function getAuth() {
  // Instance masih segar → langsung pakai.
  if (cachedAuth && Date.now() - cachedAuthAt < AUTH_TTL_MS) return cachedAuth;

  // Instance basi tapi ada → refresh di background (stale-while-revalidate),
  // request ini tetap dilayani instance lama supaya tak ada lonjakan latensi.
  if (cachedAuth) {
    void rebuildAuth().catch(() => {});
    return cachedAuth;
  }

  // Belum ada instance sama sekali (cold start) → harus tunggu build pertama.
  return rebuildAuth();
}

/**
 * `auth` — pakai `await getAuth()` untuk konsumsi tipe-aman. Re-export sebagai
 * konvensi (better-auth idiom `import { auth } from "@/lib/auth"`).
 *
 * Karena instance dibangun async dari DB config, gunakan `getAuth()` di
 * route handler & Server Component. JANGAN destructure `auth.api.xxx` di
 * module top-level — selalu await dulu.
 */
export { getAuth as auth };

// =================== Session Helpers ===================

export async function getSession(): Promise<AppSession | null> {
  try {
    const a = await getAuth();
    const hdrs = await headers();
    const result = (await a.api.getSession({ headers: hdrs })) as
      | { user: Record<string, unknown>; session: Record<string, unknown> }
      | null;
    if (!result) return null;
    return normalizeSession(result);
  } catch (err) {
    logger.warn({ err }, "getSession failed");
    return null;
  }
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

export async function requireRole(
  session: AppSession,
  role: AppUserRole | AppUserRole[],
): Promise<AppSession> {
  const allowed = Array.isArray(role) ? role : [role];
  const actual = session.user.role as AppUserRole;
  if (!allowed.includes(actual)) {
    throw new ForbiddenError(
      `User role ${actual} lacks required ${allowed.join("|")}`,
    );
  }
  return session;
}

/**
 * Allow admin DAN superadmin (hierarchy: superadmin > admin > user).
 * Semua endpoint /api/admin/* yang pakai requireAdmin() otomatis allow superadmin
 * setelah perubahan ini. Lihat ROLES.md §"Implementasi Helper".
 */
export async function requireAdmin(): Promise<AppSession> {
  const s = await requireSession();
  return requireRole(s, ["admin", "superadmin"]);
}

export async function requireSuperadminStrict(): Promise<AppSession> {
  const s = await requireSession();
  return requireRole(s, "superadmin");
}

// =================== Internal: Normalize session ===================

function normalizeSession(raw: {
  user: Record<string, unknown>;
  session: Record<string, unknown>;
}): AppSession {
  const u = raw.user;
  const s = raw.session;
  const sessionUser: SessionUser = {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    name: String(u.name ?? ""),
    role: ((u.role as UserRole | undefined) ?? "user") as UserRole,
    emailVerified: Boolean(u.emailVerified ?? false),
    image: (u.image as string | null) ?? null,
    locale: String(u.locale ?? "id-ID"),
    timezone: String(u.timezone ?? "Asia/Jakarta"),
    mfaEnabled: Boolean(u.mfaEnabled ?? false),
  };
  return {
    user: sessionUser,
    session: {
      id: String(s.id ?? ""),
      expiresAt: new Date(String(s.expiresAt ?? new Date())),
      createdAt: new Date(String(s.createdAt ?? new Date())),
      ipAddress: (s.ipAddress as string | null) ?? null,
      userAgent: (s.userAgent as string | null) ?? null,
    },
    // Flat aliases — Agent 3 expose user.id nested, tapi ratusan endpoint
    // di Agent 5/6/7/8/10 pakai session.userId / session.role flat. Daripada
    // edit ratusan baris, expose flat alias di sini.
    userId: sessionUser.id,
    role: sessionUser.role,
    email: sessionUser.email,
  };
}
