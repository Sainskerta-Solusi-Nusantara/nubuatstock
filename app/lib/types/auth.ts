import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  accounts,
  authAuditEvents,
  mfaFactors,
  mfaFactorTypes,
  passwordHistory,
  sessions,
  userRoleValues,
  users,
  verificationPurposes,
  verifications,
} from "@/db/schema/auth";

// =================== Re-export DB types ===================

export type {
  Account,
  AuthAuditEvent,
  AuthAuditLogRow,
  MfaFactor,
  MfaFactorType,
  NewAccount,
  NewAuthAuditLog,
  NewMfaFactor,
  NewPasswordHistory,
  NewSession,
  NewUser,
  NewVerification,
  PasswordHistory,
  Session,
  User,
  UserRole,
  Verification,
  VerificationPurpose,
} from "@/db/schema/auth";

// =================== Drizzle-Zod Schemas ===================

export const userSelectSchema = createSelectSchema(users);
export const userInsertSchema = createInsertSchema(users);
export const sessionSelectSchema = createSelectSchema(sessions);
export const accountSelectSchema = createSelectSchema(accounts);
export const verificationSelectSchema = createSelectSchema(verifications);
export const mfaFactorSelectSchema = createSelectSchema(mfaFactors);
export const mfaFactorInsertSchema = createInsertSchema(mfaFactors);
export const passwordHistorySelectSchema = createSelectSchema(passwordHistory);

// =================== Enums ===================

export const userRoleSchema = z.enum(userRoleValues);
export const mfaFactorTypeSchema = z.enum(mfaFactorTypes);
export const verificationPurposeSchema = z.enum(verificationPurposes);
export const authAuditEventSchema = z.enum(authAuditEvents);

// =================== Form Validation Schemas ===================
// Min length divalidasi di runtime tambahan via getConfig("security.password.min_length")
// — schema ini menjamin lower bound minimum 12 sesuai security baseline AGENTS.md §7.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email terlalu pendek")
  .max(254, "Email terlalu panjang")
  .email("Format email tidak valid");

export const passwordSchema = z
  .string()
  .min(12, "Password minimal 12 karakter")
  .max(256, "Password terlalu panjang");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi")
  .max(120, "Nama terlalu panjang");

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi").max(256),
  rememberMe: z.boolean().optional().default(false),
});

export const signupInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

export const resetPasswordInputSchema = z
  .object({
    token: z.string().min(16).max(256),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export const verifyEmailInputSchema = z.object({
  token: z.string().min(16).max(256),
});

export const mfaSetupConfirmInputSchema = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode TOTP harus 6 digit"),
});

export const mfaVerifyInputSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode TOTP harus 6 digit"),
});

// =================== Inferred input types ===================

export type LoginInput = z.infer<typeof loginInputSchema>;
export type SignupInput = z.infer<typeof signupInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
export type MfaSetupConfirmInput = z.infer<typeof mfaSetupConfirmInputSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifyInputSchema>;

// =================== Session shape exposed to app code ===================

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: import("@/db/schema/auth").UserRole;
  emailVerified: boolean;
  image: string | null;
  locale: string;
  timezone: string;
  mfaEnabled: boolean;
}

export interface AppSession {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
    createdAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  };
  // Flat aliases — backward-compat untuk kode yang akses session.userId / session.role
  // langsung tanpa harus dot-walk ke session.user.*
  userId: string;
  role: import("@/db/schema/auth").UserRole;
  email: string;
}
