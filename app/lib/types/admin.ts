import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  featureFlags,
  userFlagOverrides,
  type RolloutStrategy,
} from "@/db/schema/feature-flags";

// =================== Re-export DB types ===================

export type {
  FeatureFlag,
  NewFeatureFlag,
  NewUserFlagOverride,
  RolloutStrategy,
  UserFlagOverride,
} from "@/db/schema/feature-flags";

// =================== Drizzle-Zod Schemas ===================

export const featureFlagSelectSchema = createSelectSchema(featureFlags);
export const featureFlagInsertSchema = createInsertSchema(featureFlags);
export const userFlagOverrideSelectSchema = createSelectSchema(userFlagOverrides);
export const userFlagOverrideInsertSchema = createInsertSchema(userFlagOverrides);

// =================== Rollout Strategy Zod ===================

export const rolloutStrategySchema: z.ZodType<RolloutStrategy> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("off") }),
  z.object({ type: z.literal("percentage"), value: z.number().min(0).max(100) }),
  z.object({ type: z.literal("tier_min"), value: z.string().min(1).max(40) }),
  z.object({ type: z.literal("user_list"), value: z.array(z.string().min(1)).max(10_000) }),
  z.object({ type: z.literal("role"), value: z.enum(["user", "admin"]) }),
]);

// =================== Admin API Inputs ===================

export const updateConfigInputSchema = z.object({
  value: z.unknown(),
  type: z.string().max(40).optional(),
  description: z.string().max(2000).optional().nullable(),
});
export type UpdateConfigInput = z.infer<typeof updateConfigInputSchema>;

export const setSecretInputSchema = z.object({
  value: z.string().min(1).max(8192),
  description: z.string().max(2000).optional().nullable(),
});
export type SetSecretInput = z.infer<typeof setSecretInputSchema>;

export const updateFeatureFlagInputSchema = z.object({
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  defaultValue: z.unknown().optional(),
  rolloutStrategy: rolloutStrategySchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagInputSchema>;

export const createFeatureFlagInputSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z][a-z0-9_.-]*$/, "Key harus huruf kecil + dot/underscore/dash"),
  description: z.string().max(2000).default(""),
  category: z.string().min(1).max(80).default("general"),
  defaultValue: z.unknown(),
  rolloutStrategy: rolloutStrategySchema.default({ type: "all" }),
  isActive: z.boolean().default(true),
});
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagInputSchema>;

export const setUserFlagOverrideInputSchema = z.object({
  flagKey: z.string().min(1).max(120),
  value: z.unknown(),
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});
export type SetUserFlagOverrideInput = z.infer<typeof setUserFlagOverrideInputSchema>;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().max(200).optional(),
  tier: z.string().max(40).optional(),
  role: z.enum(["user", "admin"]).optional(),
  active: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  signupFrom: z.string().datetime().optional(),
  signupTo: z.string().datetime().optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const suspendUserInputSchema = z.object({
  reason: z.string().min(1).max(500),
  untilIso: z.string().datetime().optional(),
});
export type SuspendUserInput = z.infer<typeof suspendUserInputSchema>;

export const promoteRoleInputSchema = z.object({
  role: z.enum(["user", "admin"]),
  reason: z.string().min(1).max(500),
});
export type PromoteRoleInput = z.infer<typeof promoteRoleInputSchema>;

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  actor: z.string().max(100).optional(),
  action: z.string().max(160).optional(),
  targetType: z.string().max(80).optional(),
  targetId: z.string().max(160).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const updateTierInputSchema = z.object({
  nama: z.string().max(120).optional(),
  tagline: z.string().max(500).optional().nullable(),
  priceMonthlyIdr: z.number().int().min(0).optional(),
  priceAnnualIdr: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  features: z.array(z.string().max(200)).max(50).optional(),
  badge: z.string().max(60).optional().nullable(),
  ctaLabel: z.string().max(120).optional().nullable(),
});
export type UpdateTierInput = z.infer<typeof updateTierInputSchema>;

export const updateEntitlementInputSchema = z.object({
  value: z.unknown(),
  description: z.string().max(500).optional().nullable(),
});
export type UpdateEntitlementInput = z.infer<typeof updateEntitlementInputSchema>;

export const createAiPromptInputSchema = z.object({
  key: z.string().min(1).max(120),
  version: z.string().min(1).max(40),
  content: z.string().min(1).max(64_000),
  variablesJson: z.array(z.string().max(80)).max(100).default([]),
  description: z.string().max(500).optional().nullable(),
});
export type CreateAiPromptInput = z.infer<typeof createAiPromptInputSchema>;

// =================== Admin Overview Shape ===================

export interface AdminOverview {
  users: {
    total: number;
    byTier: { tierKode: string; count: number }[];
    signupsToday: number;
  };
  revenue: {
    mrrEstimateIdr: number;
    paidInvoicesToday: number;
    paidAmountTodayIdr: number;
  };
  ai: {
    requestsToday: number;
    tokensInputToday: number;
    tokensOutputToday: number;
  };
  picks: {
    generatedToday: number;
  };
  recentAudit: {
    id: string;
    actorUserId: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
  }[];
}

// =================== Admin Audit Action Codes ===================

export const ADMIN_AUDIT_ACTIONS = {
  CONFIG_UPDATE: "admin.config.update",
  SECRET_SET: "admin.secret.set",
  SECRET_CLEAR: "admin.secret.clear",
  FEATURE_FLAG_CREATE: "admin.feature_flag.create",
  FEATURE_FLAG_UPDATE: "admin.feature_flag.update",
  FEATURE_FLAG_DELETE: "admin.feature_flag.delete",
  USER_FLAG_OVERRIDE_SET: "admin.user_flag_override.set",
  USER_FLAG_OVERRIDE_CLEAR: "admin.user_flag_override.clear",
  USER_SUSPEND: "admin.user.suspend",
  USER_UNSUSPEND: "admin.user.unsuspend",
  USER_ROLE_CHANGE: "admin.user.role_change",
  USER_FORCE_LOGOUT: "admin.user.force_logout",
  TIER_UPDATE: "admin.tier.update",
  TIER_ENTITLEMENT_UPDATE: "admin.tier.entitlement.update",
  AI_PROMPT_CREATE: "admin.ai_prompt.create",
  AI_PROMPT_ACTIVATE: "admin.ai_prompt.activate",
  GLOSSARY_TERM_CREATE: "admin.glossary_term.create",
  GLOSSARY_TERM_UPDATE: "admin.glossary_term.update",
  GLOSSARY_TERM_DELETE: "admin.glossary_term.delete",
  GLOSSARY_TERM_PUBLISH: "admin.glossary_term.publish",
} as const;

export type AdminAuditAction =
  (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];
