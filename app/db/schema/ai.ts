import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, softDelete, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * `AiCitation` — satu sumber yang dipakai assistant untuk grounding jawaban.
 *
 * Dikumpulkan dari tool call selama tool-use loop (lib/ai/chat.ts) lalu disimpan
 * di kolom `ai_messages.citations` (jsonb). UI render sebagai chip "Sumber:".
 *
 * - `tool` — nama tool sumber (get_quote, get_recent_news, search_research, dll).
 * - `label` — teks ringkas untuk ditampilkan (judul berita, "Harga BBRI", dst).
 * - `url` — opsional, link sumber (berita / halaman riset / detail emiten).
 * - `kode` — opsional, ticker IDX terkait.
 */
export interface AiCitation {
  tool: string;
  label: string;
  url?: string;
  kode?: string;
}

/**
 * Schema AI Copilot (Agent 7).
 *
 * Catatan desain:
 * - Tidak ada FK ke tabel `user` di sini karena Agent 3 (auth) memiliki schema-nya sendiri.
 *   FK ditambahkan saat cross-schema sudah stabil (lihat AGENTS.md §8 Cross-Agent Contracts).
 *   Untuk sementara `userId` adalah ULID text reference soft (validasi via runtime).
 * - Semua provider/model/api-key dari DB (NO HARDCODE). Lihat AGENTS.md §4.
 * - System prompts versioned di tabel `ai_prompts`, BUKAN string inline di kode.
 */

/**
 * `ai_conversations` — sesi percakapan user dengan AI Copilot.
 *
 * - `contextKode` opsional — kalau conversation dibuka dari halaman ticker, ini di-set.
 * - `provider` & `modelUsed` di-snapshot saat first turn untuk audit/cost analytics.
 * - `lastMessageAt` untuk sorting di sidebar.
 */
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    title: text("title").notNull().default("Percakapan baru"),
    contextKode: text("context_kode"),
    provider: text("provider").notNull(),
    modelUsed: text("model_used").notNull(),
    systemPromptVersion: text("system_prompt_version").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: "date" }),
    messageCount: integer("message_count").notNull().default(0),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    index("ai_conversations_user_idx").on(t.userId),
    index("ai_conversations_user_last_msg_idx").on(t.userId, t.lastMessageAt),
    index("ai_conversations_context_idx").on(t.contextKode),
    index("ai_conversations_pinned_idx").on(t.userId, t.isPinned),
  ],
);

/**
 * `ai_messages` — pesan individual dalam conversation.
 *
 * - `role`: user|assistant|system|tool (validasi via Zod di lib/types/ai.ts)
 * - `toolCallId` & `toolName` populated kalau role=tool (jawaban tool call).
 * - `citations` (assistant only) — daftar sumber tool yang dipakai untuk grounding
 *   jawaban (inline citations v2). Default `[]`. Lihat db/migrations/0004_ai_citations.sql.
 * - Token & latency untuk usage analytics.
 */
export const aiMessages = pgTable(
  "ai_messages",
  {
    id: ulid(),
    conversationId: ulidRef("conversation_id"),
    role: text("role").notNull(),
    content: text("content").notNull(),
    contentFormat: text("content_format").notNull().default("markdown"),
    toolCallId: text("tool_call_id"),
    toolName: text("tool_name"),
    citations: jsonbT<AiCitation[]>("citations").notNull().default([]),
    tokenInput: integer("token_input").notNull().default(0),
    tokenOutput: integer("token_output").notNull().default(0),
    tokenCached: integer("token_cached").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    finishReason: text("finish_reason"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("ai_messages_conversation_idx").on(t.conversationId),
    index("ai_messages_conversation_created_idx").on(t.conversationId, t.createdAt),
    index("ai_messages_role_idx").on(t.role),
  ],
);

/**
 * `ai_tool_calls` — log eksekusi tool/function calling.
 *
 * - `arguments` & `result` di-redact untuk PII sebelum persist (lihat lib/ai/tools/redact.ts).
 * - Latency tool eksekusi terpisah dari latency LLM.
 */
export const aiToolCalls = pgTable(
  "ai_tool_calls",
  {
    id: ulid(),
    messageId: ulidRef("message_id"),
    toolName: text("tool_name").notNull(),
    arguments: jsonbT<Record<string, unknown>>("arguments").notNull().default({}),
    result: jsonbT<unknown>("result"),
    latencyMs: integer("latency_ms").notNull().default(0),
    error: jsonbT<{ code: string; message: string; details?: unknown }>("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("ai_tool_calls_message_idx").on(t.messageId),
    index("ai_tool_calls_tool_name_idx").on(t.toolName),
  ],
);

/**
 * `ai_prompts` — system prompts versioned & immutable.
 *
 * - `key` namespaced (e.g. `system.copilot.default`, `system.copilot.deep_research`).
 * - `version` increment saat ada perubahan content (jangan edit existing row → insert new).
 * - `isActive` flag → satu versi aktif per key dalam waktu yang sama.
 * - `variablesJson` untuk template variable hint (mis. `{disclaimer}` akan di-replace runtime).
 */
export const aiPrompts = pgTable(
  "ai_prompts",
  {
    id: ulid(),
    key: text("key").notNull(),
    version: text("version").notNull(),
    content: text("content").notNull(),
    variablesJson: jsonbT<string[]>("variables_json").notNull().default([]),
    isActive: boolean("is_active").notNull().default(false),
    description: text("description"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("ai_prompts_key_version_uq").on(t.key, t.version),
    index("ai_prompts_active_idx").on(t.key, t.isActive),
  ],
);

/**
 * `ai_usage_log` — daily aggregate per user/model untuk cost tracking & rate-limit display.
 *
 * - Increment-on-write (UPSERT) — bukan row per request.
 * - `costEstimateIdr` dihitung server-side berdasarkan price table (di app_config).
 */
export const aiUsageLog = pgTable(
  "ai_usage_log",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    date: date("date", { mode: "string" }).notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    tokensInputTotal: integer("tokens_input_total").notNull().default(0),
    tokensOutputTotal: integer("tokens_output_total").notNull().default(0),
    tokensCachedTotal: integer("tokens_cached_total").notNull().default(0),
    requestsCount: integer("requests_count").notNull().default(0),
    toolCallsCount: integer("tool_calls_count").notNull().default(0),
    costEstimateIdr: integer("cost_estimate_idr").notNull().default(0),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("ai_usage_log_user_date_model_uq").on(t.userId, t.date, t.provider, t.model),
    index("ai_usage_log_user_date_idx").on(t.userId, t.date),
    index("ai_usage_log_date_idx").on(t.date),
  ],
);

// =================== Drizzle inferred types ===================

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;
export type AiToolCall = typeof aiToolCalls.$inferSelect;
export type NewAiToolCall = typeof aiToolCalls.$inferInsert;
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type NewAiPrompt = typeof aiPrompts.$inferInsert;
export type AiUsageLog = typeof aiUsageLog.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLog.$inferInsert;
