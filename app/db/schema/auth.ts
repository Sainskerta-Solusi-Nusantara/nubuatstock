import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jsonbT, softDelete, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * Auth schema — better-auth compatible dengan Drizzle adapter.
 *
 * Catatan:
 * - PK pakai ULID (text). Better-auth menerima string PK.
 * - `email` pakai `citext`-style normalization di app layer (lowercase) karena
 *   beberapa extension belum tentu tersedia; uniqueIndex pakai `lower(email)`
 *   diatur lewat Drizzle SQL expression supaya case-insensitive.
 * - Semua tabel pakai `withTimestamps`. Soft delete hanya untuk `users`.
 * - Field tambahan di luar core better-auth (role, locale, mfa_enabled, dll)
 *   dideklarasikan di `additionalFields` config better-auth supaya plugin tahu.
 */

// =================== users ===================

export const userRoleValues = ["user", "admin"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const users = pgTable(
  "users",
  {
    id: ulid(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: "date" }),
    name: text("name").notNull().default(""),
    image: text("image_url"),
    role: text("role").$type<UserRole>().notNull().default("user"),
    locale: text("locale").notNull().default("id-ID"),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    phone: text("phone"),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true, mode: "date" }),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    lastLoginIp: text("last_login_ip"),
    // UU PDP — account deletion (soft delete + 30-day grace period).
    // `deletionRequestedAt`  = kapan user minta hapus akun.
    // `scheduledDeletionAt`  = waktu eksekusi hard-delete permanen (request + 30 hari).
    //                          Worker/cron akan men-sweep baris dengan
    //                          scheduledDeletionAt <= now() untuk purge permanen.
    deletionRequestedAt: timestamp("deletion_requested_at", {
      withTimezone: true,
      mode: "date",
    }),
    scheduledDeletionAt: timestamp("scheduled_deletion_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    index("users_role_idx").on(t.role),
    index("users_deleted_at_idx").on(t.deletedAt),
    index("users_scheduled_deletion_at_idx").on(t.scheduledDeletionAt),
  ],
);

// =================== sessions ===================
// Better-auth membutuhkan `token` (atau `tokenHash`) + `expiresAt`. Kita simpan
// hash-nya (sha256) untuk mitigasi DB-leak; better-auth core support token plain,
// tapi kita override via custom hashing kalau diperlukan. Default v1.1: pakai
// kolom `token` plaintext yang random 32-byte. Kita beri keduanya supaya
// fleksibel — token (plain) untuk handler & tokenHash (mirror) opsional.

export const sessions = pgTable(
  "sessions",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ip"),
    userAgent: text("user_agent"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.token),
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

// =================== accounts (OAuth + credential linking) ===================

export const accounts = pgTable(
  "accounts",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    accountId: text("provider_account_id").notNull(),
    providerId: text("provider").notNull(),
    accessToken: text("access_token_enc"),
    refreshToken: text("refresh_token_enc"),
    idToken: text("id_token_enc"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password_hash"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("accounts_provider_account_uq").on(t.providerId, t.accountId),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

// =================== verification (email verify / reset / mfa setup) ===================

export const verificationPurposes = [
  "email_verify",
  "password_reset",
  "mfa_setup",
  "magic_link",
] as const;
export type VerificationPurpose = (typeof verificationPurposes)[number];

/**
 * Tabel `verification` (sesuai naming better-auth). Field `identifier` di better-auth
 * default berisi `${purpose}:${userIdOrEmail}` — kita simpan `purpose` & `userId`
 * terpisah untuk audit jelas.
 */
export const verifications = pgTable(
  "verification_tokens",
  {
    id: ulid(),
    identifier: text("identifier").notNull(),
    value: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    purpose: text("purpose").$type<VerificationPurpose>().notNull().default("email_verify"),
    userId: text("user_id"),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("verifications_identifier_idx").on(t.identifier),
    index("verifications_user_id_idx").on(t.userId),
    index("verifications_purpose_idx").on(t.purpose),
    index("verifications_expires_at_idx").on(t.expiresAt),
  ],
);

// =================== MFA Factors ===================

export const mfaFactorTypes = ["totp", "webauthn", "backup_code"] as const;
export type MfaFactorType = (typeof mfaFactorTypes)[number];

export const mfaFactors = pgTable(
  "mfa_factors",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    factorType: text("factor_type").$type<MfaFactorType>().notNull(),
    label: text("label"),
    secretEnc: text("secret_enc").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [
    index("mfa_factors_user_id_idx").on(t.userId),
    index("mfa_factors_type_idx").on(t.factorType),
  ],
);

// =================== Password history (prevent reuse of last 5) ===================

export const passwordHistory = pgTable(
  "password_history",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("password_history_user_id_idx").on(t.userId)],
);

// =================== Audit log fallback (Agent 11/10 owns audit) ===================
// Lokal fallback agar event signup/login bisa direkam meskipun Agent 11 belum
// selesai. Schema kompatibel dengan struktur standard yang akan dimerge ke
// `audit_log` table (lihat AGENTS.md §7).

export const authAuditEvents = [
  "signup",
  "login_success",
  "login_failed",
  "logout",
  "password_reset_requested",
  "password_reset_completed",
  "email_verified",
  "mfa_enabled",
  "mfa_disabled",
  "account_locked",
  "account_unlocked",
] as const;
export type AuthAuditEvent = (typeof authAuditEvents)[number];

export const authAuditLog = pgTable(
  "auth_audit_log",
  {
    id: ulid(),
    actorUserId: text("actor_user_id"),
    action: text("action").$type<AuthAuditEvent>().notNull(),
    targetType: text("target_type").notNull().default("user"),
    targetId: text("target_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonbT<Record<string, unknown>>("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("auth_audit_log_actor_idx").on(t.actorUserId),
    index("auth_audit_log_action_idx").on(t.action),
    index("auth_audit_log_created_at_idx").on(t.createdAt),
  ],
);

// =================== Drizzle inferred types ===================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type MfaFactor = typeof mfaFactors.$inferSelect;
export type NewMfaFactor = typeof mfaFactors.$inferInsert;

export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type NewPasswordHistory = typeof passwordHistory.$inferInsert;

export type AuthAuditLogRow = typeof authAuditLog.$inferSelect;
export type NewAuthAuditLog = typeof authAuditLog.$inferInsert;
