import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  dailyPicks,
  pickOutcomes,
  picksScoringRuns,
  picksScoringWeights,
} from "@/db/schema/picks";

/**
 * Re-export DB row types dari schema (single source of truth).
 */
export type {
  DailyPick,
  NewDailyPick,
  NewPickOutcome,
  NewPicksScoringRun,
  NewPicksScoringWeights,
  PickOutcome,
  PicksScoringRun,
  PicksScoringWeights,
} from "@/db/schema/picks";

// =================== Drizzle-derived Zod schemas ===================

export const dailyPickSelectSchema = createSelectSchema(dailyPicks);
export const dailyPickInsertSchema = createInsertSchema(dailyPicks);
export const pickOutcomeSelectSchema = createSelectSchema(pickOutcomes);
export const pickOutcomeInsertSchema = createInsertSchema(pickOutcomes);
export const picksScoringRunSelectSchema = createSelectSchema(picksScoringRuns);
export const picksScoringRunInsertSchema = createInsertSchema(picksScoringRuns);
export const picksScoringWeightsSelectSchema = createSelectSchema(picksScoringWeights);
export const picksScoringWeightsInsertSchema = createInsertSchema(picksScoringWeights);

// =================== Enums ===================

export const setupTypeValues = [
  "continuation",
  "reversal",
  "breakout",
  "pullback",
  "range",
] as const;
export const setupTypeSchema = z.enum(setupTypeValues);
export type SetupType = z.infer<typeof setupTypeSchema>;

export const confidenceValues = ["low", "medium", "high"] as const;
export const confidenceSchema = z.enum(confidenceValues);
export type Confidence = z.infer<typeof confidenceSchema>;

export const timeHorizonValues = [
  "intraday",
  "swing_3_5d",
  "swing_1_3w",
  "position_1_3m",
] as const;
export const timeHorizonSchema = z.enum(timeHorizonValues);
export type TimeHorizon = z.infer<typeof timeHorizonSchema>;

export const pickStatusValues = ["draft", "published", "expired", "cancelled"] as const;
export const pickStatusSchema = z.enum(pickStatusValues);
export type PickStatus = z.infer<typeof pickStatusSchema>;

export const scoringRunStatusValues = ["running", "completed", "failed"] as const;
export const scoringRunStatusSchema = z.enum(scoringRunStatusValues);
export type ScoringRunStatus = z.infer<typeof scoringRunStatusSchema>;

export const outcomeEvaluationValues = ["T+1", "T+5", "T+20", "final"] as const;
export const outcomeEvaluationSchema = z.enum(outcomeEvaluationValues);
export type OutcomeEvaluation = z.infer<typeof outcomeEvaluationSchema>;

export const outcomeStatusValues = [
  "open",
  "tp1_hit",
  "tp2_hit",
  "tp3_hit",
  "sl_hit",
  "expired",
] as const;
export const outcomeStatusSchema = z.enum(outcomeStatusValues);
export type OutcomeStatus = z.infer<typeof outcomeStatusSchema>;

// =================== Scoring factor keys ===================

export const scoringFactorKeys = [
  "technical",
  "bandarmology",
  "fundamental",
  "sentiment",
  "macro",
  "risk_penalty",
] as const;
export type ScoringFactorKey = (typeof scoringFactorKeys)[number];

export const scoringWeightsSchema = z
  .object({
    technical: z.number().min(0).max(1),
    bandarmology: z.number().min(0).max(1),
    fundamental: z.number().min(0).max(1),
    sentiment: z.number().min(0).max(1),
    macro: z.number().min(0).max(1),
    risk_penalty: z.number().min(0).max(1),
  })
  .refine(
    (w) => {
      const sum = w.technical + w.bandarmology + w.fundamental + w.sentiment + w.macro;
      return Math.abs(sum - 1) < 0.01;
    },
    { message: "Sum of weights (excluding risk_penalty) must equal 1.0 (+- 0.01)" },
  );
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

// =================== API query schemas ===================

export const picksHistoryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "to must be YYYY-MM-DD").optional(),
  setup: setupTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PicksHistoryQuery = z.infer<typeof picksHistoryQuerySchema>;

export const picksPerformanceQuerySchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(365).default(30),
});
export type PicksPerformanceQuery = z.infer<typeof picksPerformanceQuerySchema>;

export const pickIdParamSchema = z.object({
  id: z.string().min(26).max(26).regex(/^[0-9A-HJKMNP-TV-Z]{26}$/u, "Invalid ULID"),
});

// =================== Service-layer DTOs ===================

export interface FactorBreakdown {
  technical: number;
  bandarmology: number;
  fundamental: number;
  sentiment: number;
  macro: number;
  risk_penalty: number;
}

export interface PickListItemDTO {
  id: string;
  tradeDate: string;
  companyKode: string;
  namaPerusahaan: string | null;
  sectorKode: string | null;
  setupType: SetupType;
  score: number;
  confidence: Confidence;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  rewardRiskRatio: number;
  timeHorizon: TimeHorizon;
  status: PickStatus;
  publishedAt: string;
}

export interface PickDetailDTO extends PickListItemDTO {
  runId: string | null;
  atr14: number;
  factorBreakdown: FactorBreakdown;
  narrativeText: string | null;
  narrativeGeneratedBy: string | null;
  narrativeAt: string | null;
}

export interface PicksPerformanceBucket {
  setupType: SetupType | "all";
  total: number;
  tp1HitRate: number;
  tp2HitRate: number;
  tp3HitRate: number;
  slHitRate: number;
  avgReturnPct: number;
}

export interface PicksPerformanceDTO {
  windowDays: number;
  evaluatedAt: string;
  buckets: PicksPerformanceBucket[];
}

// =================== Scoring engine input types ===================

export interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  valueIdr: number;
}

export interface ForeignFlowDailyInput {
  tradeDate: string;
  netValue: number;
}

export interface SectorContext {
  sectorKode: string;
  sectorReturn5dPct: number;
  ihsgReturn5dPct: number;
}

export interface ScoringCandidateInput {
  companyKode: string;
  sectorKode: string;
  marketCapIdr: number | null;
  ohlcv: OhlcvBar[];
  foreignFlow: ForeignFlowDailyInput[];
  sectorContext: SectorContext | null;
}

export interface ComputedLevels {
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  atr14: number;
  rewardRiskRatio: number;
}

export interface ClassifiedSetup {
  setupType: SetupType;
  timeHorizon: TimeHorizon;
  confidence: Confidence;
}

export interface ScoringResult {
  companyKode: string;
  score: number;
  breakdown: FactorBreakdown;
  setup: ClassifiedSetup;
  levels: ComputedLevels;
  weightsVersion: string;
  rejected: boolean;
  rejectionReason: string | null;
}

// =================== Events ===================

export const PICKS_EVENTS = {
  GENERATED: "picks.generated",
  OUTCOME_EVALUATED: "picks.outcome_evaluated",
} as const;

export interface PicksGeneratedEvent {
  type: "picks.generated";
  runId: string;
  tradeDate: string;
  picksGenerated: number;
  universeSize: number;
  durationMs: number;
}
