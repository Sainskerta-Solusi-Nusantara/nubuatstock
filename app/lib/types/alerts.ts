import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { alerts, alertTriggers } from "@/db/schema/user-data";

/**
 * Public types & Zod schemas untuk domain alerts.
 *
 * `alertConditionSchema` adalah **discriminated union** by `type`. Setiap branch
 * memvalidasi shape `params`-nya sendiri. Penambahan tipe alert baru = tambah
 * satu branch tanpa breaking existing yang sudah disimpan.
 */

export type {
  Alert,
  NewAlert,
  AlertTrigger,
  NewAlertTrigger,
  AlertConditionDb,
  AlertChannelDb,
} from "@/db/schema/user-data";

// =================== Alert condition (discriminated union) ===================

export const alertChannelSchema = z.enum(["in_app", "email", "push"]);
export type AlertChannel = z.infer<typeof alertChannelSchema>;

export const alertStatusSchema = z.enum(["active", "paused", "triggered", "expired"]);
export type AlertStatus = z.infer<typeof alertStatusSchema>;

const priceParamSchema = z.object({
  value: z.number().positive(),
});

const pctChangeParamSchema = z.object({
  window: z.enum(["1d", "1w", "1m"]),
  changePct: z.number().refine((v) => v !== 0, "changePct tidak boleh 0"),
  direction: z.enum(["up", "down"]),
});

const volumeSpikeParamSchema = z.object({
  multiple: z.number().positive().min(1.1, "Minimal 1.1x"),
  lookback: z.number().int().min(2).max(120),
});

const maCrossParamSchema = z
  .object({
    fast: z.number().int().min(2).max(200),
    slow: z.number().int().min(3).max(400),
    direction: z.enum(["golden", "death"]),
  })
  .refine((v) => v.fast < v.slow, {
    message: "Fast MA harus lebih kecil dari Slow MA",
    path: ["fast"],
  });

const rsiThresholdParamSchema = z.object({
  period: z.number().int().min(2).max(60),
  threshold: z.number().min(0).max(100),
  direction: z.enum(["above", "below"]),
});

export const alertConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("price_above"), params: priceParamSchema }),
  z.object({ type: z.literal("price_below"), params: priceParamSchema }),
  z.object({ type: z.literal("pct_change"), params: pctChangeParamSchema }),
  z.object({ type: z.literal("volume_spike"), params: volumeSpikeParamSchema }),
  z.object({ type: z.literal("ma_cross"), params: maCrossParamSchema }),
  z.object({ type: z.literal("rsi_threshold"), params: rsiThresholdParamSchema }),
]);
export type AlertCondition = z.infer<typeof alertConditionSchema>;
export type AlertConditionType = AlertCondition["type"];

// =================== Zod schemas (request validation) ===================

export const alertSelectSchema = createSelectSchema(alerts);
export const alertInsertSchema = createInsertSchema(alerts);
export const alertTriggerSelectSchema = createSelectSchema(alertTriggers);
export const alertTriggerInsertSchema = createInsertSchema(alertTriggers);

export const createAlertInputSchema = z.object({
  companyKode: z
    .string()
    .min(1)
    .max(10)
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1).max(120),
  condition: alertConditionSchema,
  channels: z.array(alertChannelSchema).min(1).default(["in_app"]),
  expiresAt: z.string().datetime().nullish(),
  repeatable: z.boolean().default(false),
});
export type CreateAlertInput = z.infer<typeof createAlertInputSchema>;

export const updateAlertInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  condition: alertConditionSchema.optional(),
  channels: z.array(alertChannelSchema).min(1).optional(),
  expiresAt: z.string().datetime().nullish(),
  repeatable: z.boolean().optional(),
});
export type UpdateAlertInput = z.infer<typeof updateAlertInputSchema>;

export const listAlertsQuerySchema = z.object({
  status: alertStatusSchema.optional(),
  companyKode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;

// =================== Service evaluation context ===================

/**
 * Snapshot pasar yang dibutuhkan untuk evaluate kondisi.
 *
 * Worker (`check-alerts.ts`) WAJIB isi field yang relevan dengan kondisi yang dievaluasi.
 * Field nullable = sumber data belum tersedia → evaluasi return false (skip).
 */
export interface AlertEvaluationContext {
  companyKode: string;
  last: number | null;
  prevClose: number | null;
  changePctDay: number | null;
  changePctWeek: number | null;
  changePctMonth: number | null;
  volume: number | null;
  volumeAvg: number | null;
  ma: Record<string, number | null>; // e.g. { "20": 1234, "50": 1200 }
  maPrev: Record<string, number | null>;
  rsi: Record<string, number | null>; // e.g. { "14": 65.4 }
  asOf: string;
}

export interface AlertEvaluationResult {
  triggered: boolean;
  snapshot: Record<string, unknown>;
}

// =================== Event payloads ===================

export interface AlertTriggeredEvent {
  alertId: string;
  userId: string;
  companyKode: string;
  triggeredAt: string;
  condition: AlertCondition;
  snapshot: Record<string, unknown>;
  channels: AlertChannel[];
}
