import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  aiConversations,
  aiMessages,
  aiPrompts,
  aiToolCalls,
  aiUsageLog,
} from "@/db/schema/ai";

/**
 * Re-export DB row types (single source of truth).
 */
export type {
  AiCitation,
  AiConversation,
  AiMessage,
  AiPrompt,
  AiToolCall,
  AiUsageLog,
  NewAiConversation,
  NewAiMessage,
  NewAiPrompt,
  NewAiToolCall,
  NewAiUsageLog,
} from "@/db/schema/ai";

import type { AiCitation } from "@/db/schema/ai";

// =================== Drizzle-derived Zod schemas ===================

export const aiConversationSelectSchema = createSelectSchema(aiConversations);
export const aiConversationInsertSchema = createInsertSchema(aiConversations);

export const aiMessageSelectSchema = createSelectSchema(aiMessages);
export const aiMessageInsertSchema = createInsertSchema(aiMessages);

export const aiToolCallSelectSchema = createSelectSchema(aiToolCalls);
export const aiToolCallInsertSchema = createInsertSchema(aiToolCalls);

export const aiPromptSelectSchema = createSelectSchema(aiPrompts);
export const aiPromptInsertSchema = createInsertSchema(aiPrompts);

export const aiUsageLogSelectSchema = createSelectSchema(aiUsageLog);
export const aiUsageLogInsertSchema = createInsertSchema(aiUsageLog);

// =================== Enums ===================

export const aiRoleSchema = z.enum(["user", "assistant", "system", "tool"]);
export type AiRole = z.infer<typeof aiRoleSchema>;

export const aiContentFormatSchema = z.enum(["text", "markdown", "json"]);
export type AiContentFormat = z.infer<typeof aiContentFormatSchema>;

export const aiProviderSchema = z.enum(["deepseek", "anthropic", "openai"]);
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const aiPromptKeySchema = z.enum([
  "system.copilot.default",
  "system.copilot.deep_research",
  "system.copilot.title_generator",
]);
export type AiPromptKey = z.infer<typeof aiPromptKeySchema>;

// =================== API request/response schemas ===================

export const chatRequestSchema = z.object({
  conversationId: z.string().trim().min(1).max(64).optional(),
  message: z.string().trim().min(1).max(8_000),
  contextKode: z
    .string()
    .trim()
    .min(3)
    .max(6)
    .regex(/^[A-Z0-9]+$/u)
    .optional(),
  // Deep/Agentic Mode (v2). `deepResearch` dipertahankan sebagai alias back-compat
  // dari klien lama; keduanya memetakan ke flag yang sama di server.
  deepMode: z.boolean().optional(),
  deepResearch: z.boolean().optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  contextKode: z
    .string()
    .trim()
    .min(3)
    .max(6)
    .regex(/^[A-Z0-9]+$/u)
    .optional(),
});
export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>;

export const conversationListQuerySchema = z.object({
  includeArchived: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;

// =================== SSE stream chunk types ===================

export type ChatStreamChunk =
  | { type: "conversation"; conversationId: string }
  | { type: "delta"; content: string }
  | { type: "tool_call"; toolName: string; arguments: Record<string, unknown>; toolCallId: string }
  | { type: "tool_result"; toolCallId: string; ok: boolean; latencyMs: number }
  | { type: "usage"; tokensInput: number; tokensOutput: number; tokensCached: number }
  | { type: "citations"; citations: AiCitation[] }
  | { type: "done"; finishReason: string; messageId: string }
  | { type: "error"; code: string; message: string };

// =================== DTOs ===================

export interface ConversationListItemDTO {
  id: string;
  title: string;
  contextKode: string | null;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
}

export interface ConversationDetailDTO extends ConversationListItemDTO {
  provider: string;
  modelUsed: string;
  systemPromptVersion: string;
  messages: AiMessageDTO[];
}

export interface AiMessageDTO {
  id: string;
  role: string;
  content: string;
  contentFormat: string;
  toolName: string | null;
  toolCallId: string | null;
  citations?: AiCitation[];
  createdAt: string;
}

export interface AiUsageSummaryDTO {
  date: string;
  requestsCount: number;
  tokensInputTotal: number;
  tokensOutputTotal: number;
  tokensCachedTotal: number;
  costEstimateIdr: number;
}
