import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  auditLog,
  systemEventLevels,
  systemEvents,
} from "@/db/schema/audit";

// =================== Re-export DB types ===================

export type {
  AuditLogRow,
  NewAuditLog,
  NewSystemEvent,
  SystemEvent,
  SystemEventLevel,
} from "@/db/schema/audit";

// =================== Drizzle-Zod Schemas ===================

export const auditLogSelectSchema = createSelectSchema(auditLog);
export const auditLogInsertSchema = createInsertSchema(auditLog);
export const systemEventSelectSchema = createSelectSchema(systemEvents);
export const systemEventInsertSchema = createInsertSchema(systemEvents);

export const systemEventLevelSchema = z.enum(systemEventLevels);

// =================== Audit Entry Input ===================

export const auditEntrySchema = z.object({
  actorUserId: z.string().optional(),
  actorRole: z.string().optional(),
  action: z.string().min(1).max(160),
  targetType: z.string().max(80).optional(),
  targetId: z.string().max(160).optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  ip: z.string().max(64).optional(),
  userAgent: z.string().max(512).optional(),
  metadata: z.record(z.unknown()).optional(),
  success: z.boolean().optional(),
  errorCode: z.string().max(120).optional(),
  requestId: z.string().max(80).optional(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;

// =================== System Event Input ===================

export const systemEventInputSchema = z.object({
  source: z.string().min(1).max(120),
  level: systemEventLevelSchema.default("info"),
  eventType: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
});

export type SystemEventInput = z.infer<typeof systemEventInputSchema>;

// =================== Queue & Job Names ===================

export const queueNames = [
  "market.ingest.eod",
  "market.ingest.intraday",
  "picks.generate",
  "alerts.check",
  "notifications.send",
  "ai.embeddings.build",
  "audit.flush",
  "news.ingest",
  "news.sentiment",
  "technical.snapshots",
  "patterns.detect",
  "elliott.analyze",
  "digest.daily",
  "paper.leaderboard",
  "analysis.snapshots",
] as const;
export type QueueName = (typeof queueNames)[number];

export const queueNameSchema = z.enum(queueNames);

// =================== Event Bus Channels ===================

export const eventChannels = [
  "user.created",
  "user.deleted",
  "subscription.changed",
  "market.eod.ingested",
  "picks.generated",
  "alert.triggered",
  "secret.rotated",
] as const;
export type EventChannel = (typeof eventChannels)[number];

export const eventChannelSchema = z.enum(eventChannels);

// =================== Health Check Shape ===================

export const healthCheckStatusSchema = z.enum(["ok", "fail", "degraded", "unknown"]);
export type HealthCheckStatus = z.infer<typeof healthCheckStatusSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  uptimeSeconds: z.number(),
  checks: z.object({
    db: healthCheckStatusSchema,
    redis: healthCheckStatusSchema,
    worker: z.object({
      status: healthCheckStatusSchema,
      lastHeartbeatAt: z.string().nullable(),
      ageSeconds: z.number().nullable(),
    }),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// =================== Admin Job Endpoints ===================

export const jobStateSchema = z.enum([
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
  "waiting-children",
]);
export type JobState = z.infer<typeof jobStateSchema>;

export const queueCountsSchema = z.object({
  name: z.string(),
  counts: z.object({
    waiting: z.number(),
    active: z.number(),
    completed: z.number(),
    failed: z.number(),
    delayed: z.number(),
    paused: z.number(),
  }),
  isPaused: z.boolean(),
});
export type QueueCounts = z.infer<typeof queueCountsSchema>;

export const jobSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  data: z.unknown(),
  progress: z.unknown(),
  attemptsMade: z.number(),
  failedReason: z.string().nullable(),
  timestamp: z.number().nullable(),
  processedOn: z.number().nullable(),
  finishedOn: z.number().nullable(),
});
export type JobSummary = z.infer<typeof jobSummarySchema>;
