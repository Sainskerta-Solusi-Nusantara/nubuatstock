import { and, asc, desc, eq } from "drizzle-orm";
import type OpenAI from "openai";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { ConfigurationError, NotFoundError } from "@/lib/errors";
import { aiConversations, aiMessages, aiToolCalls } from "@/db/schema/ai";
import type { ChatStreamChunk } from "@/lib/types/ai";
import { getAiClient } from "./client";
import { applyVariables, loadActivePrompt } from "./prompts";
import { getTool, listOpenAiTools } from "./tools";
import { recordUsage } from "./usage";

type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatCompletionMessageToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

/**
 * Chat orchestrator — streaming, tool-using, persisted.
 *
 * Sequence:
 * 1. Load conversation (atau create kalau belum ada).
 * 2. Load system prompt aktif dari DB → resolve variables.
 * 3. Load history (max N messages).
 * 4. Persist user message.
 * 5. Loop:
 *    a. Call client.chat.completions.create({ stream:true, tools, messages }).
 *    b. Stream delta ke caller.
 *    c. Kalau ada tool_calls → execute → push tool result message → ulang.
 * 6. Persist assistant message + tool calls + usage.
 * 7. Append disclaimer (dari app_config.app.disclaimer_text).
 *
 * NOTE: quota consume di-handle di caller (API route) sebelum panggil fungsi ini —
 * supaya error 429 bisa dikembalikan ke client SEBELUM SSE dibuka.
 */

const HISTORY_LIMIT_DEFAULT = 20;
const MAX_TOOL_ITERATIONS = 6;

export interface StreamChatOptions {
  conversationId?: string;
  userMessage: string;
  userId: string;
  username?: string;
  contextKode?: string | null;
  deepResearch?: boolean;
}

export async function* streamChat(
  opts: StreamChatOptions,
): AsyncGenerator<ChatStreamChunk, void, void> {
  const startTs = Date.now();
  const { client, config } = await getAiClient();
  const model = opts.deepResearch ? config.deepModel : config.defaultModel;
  const promptKey = opts.deepResearch ? "system.copilot.deep_research" : "system.copilot.default";

  // 1. Load atau buat conversation.
  let conversation = opts.conversationId
    ? await loadConversation(opts.conversationId, opts.userId)
    : null;
  if (!conversation) {
    conversation = await createConversation({
      userId: opts.userId,
      provider: config.provider,
      modelUsed: model,
      systemPromptVersion: await getConfig<string>("ai.system_prompt_version", {
        defaultValue: "v1",
      }),
      contextKode: opts.contextKode ?? null,
      title: deriveInitialTitle(opts.userMessage),
    });
    yield { type: "conversation", conversationId: conversation.id };
  } else {
    yield { type: "conversation", conversationId: conversation.id };
  }

  // 2. Load + resolve system prompt.
  const { content: rawPrompt } = await loadActivePrompt(promptKey, {
    version: conversation.systemPromptVersion,
  });
  const disclaimer = await getConfig<string>("app.disclaimer_text", {
    defaultValue: "",
  });
  const today = new Date().toISOString().slice(0, 10);
  const resolvedPrompt = applyVariables(rawPrompt, {
    username: opts.username ?? "(pengguna)",
    context_kode: opts.contextKode ?? conversation.contextKode ?? "(tidak ada)",
    today,
    disclaimer,
  });

  // 3. Load history.
  const historyLimit = await getConfig<number>("ai.history_message_limit", {
    defaultValue: HISTORY_LIMIT_DEFAULT,
  });
  const history = await loadHistory(conversation.id, historyLimit);

  // 4a. SECURITY: scan user message untuk prompt injection.
  const { scanForInjection, fortifyUserMessage } = await import("@/lib/security/prompt-injection");
  const scanResult = scanForInjection(opts.userMessage, { userId: opts.userId });
  if (scanResult.rejected) {
    yield {
      type: "error",
      code: "PROMPT_INJECTION_BLOCKED",
      message: scanResult.reason ?? "Permintaan diblokir untuk keamanan.",
    };
    yield { type: "done", finishReason: "blocked", messageId: "" };
    return;
  }
  const safeUserMessage = fortifyUserMessage(opts.userMessage, scanResult);

  // 4b. Persist user message FIRST (sebelum LLM call). Store original input
  // (bukan fortified) supaya history clean. Fortified hanya dipakai di context window.
  const [userMsg] = await db
    .insert(aiMessages)
    .values({
      conversationId: conversation.id,
      role: "user",
      content: opts.userMessage,
      contentFormat: "text",
    })
    .returning({ id: aiMessages.id });
  const userMessageId = userMsg!.id;

  // 5. Assemble messages — gunakan safeUserMessage (fortified kalau medium-risk detected).
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: resolvedPrompt },
    ...history,
    { role: "user", content: safeUserMessage },
  ];

  const tools = listOpenAiTools();

  let totalInput = 0;
  let totalOutput = 0;
  let totalCached = 0;
  let toolCallsCount = 0;
  let finalAssistant = "";
  let finishReason = "stop";

  // 6. Tool-use loop.
  //
  // Temperature strategy untuk analisis saham Indonesia:
  //   - Deep research mode: pakai temperature dari config (default 0.3 → tetap moderat)
  //   - Default mode dengan tools: lebih rendah (0.2) supaya:
  //     1. Konsisten dalam quoting angka dari tool output (no halusinasi)
  //     2. Lebih deterministik di analisis teknikal/fundamental
  //     3. Mengurangi confabulation untuk ticker yang ambigu
  //
  // Best practice industry untuk financial analysis: 0.1-0.3 (lihat OpenAI, Anthropic
  // guidance untuk "factual/analytical tasks"). Narrative/creative bisa naik 0.4-0.6.
  //
  // Override per-request kalau perlu (deep research naik ke 0.3-0.4 untuk synthesis luas).
  const effectiveTemperature = opts.deepResearch
    ? Math.min(config.temperature + 0.1, 0.4) // Deep mode: slight bump untuk synthesis
    : Math.min(config.temperature, 0.2); // Default: cap di 0.2 untuk tool-faithful

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const stream = await client.chat.completions.create({
      model,
      messages,
      tools,
      stream: true,
      max_tokens: config.maxTokens,
      temperature: effectiveTemperature,
      stream_options: { include_usage: true },
    });

    let assistantText = "";
    const pendingToolCalls = new Map<
      number,
      { id: string; name: string; argsBuffer: string }
    >();
    let iterFinishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (choice?.delta?.content) {
        const piece = choice.delta.content;
        assistantText += piece;
        yield { type: "delta", content: piece };
      }
      if (choice?.delta?.tool_calls) {
        for (const tc of choice.delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!pendingToolCalls.has(idx)) {
            pendingToolCalls.set(idx, {
              id: tc.id ?? `call_${idx}`,
              name: tc.function?.name ?? "",
              argsBuffer: "",
            });
          }
          const entry = pendingToolCalls.get(idx)!;
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.argsBuffer += tc.function.arguments;
        }
      }
      if (choice?.finish_reason) {
        iterFinishReason = choice.finish_reason;
      }
      if (chunk.usage) {
        totalInput += chunk.usage.prompt_tokens ?? 0;
        totalOutput += chunk.usage.completion_tokens ?? 0;
        const cached =
          (chunk.usage as unknown as { prompt_tokens_details?: { cached_tokens?: number } })
            .prompt_tokens_details?.cached_tokens ?? 0;
        totalCached += cached;
      }
    }

    finalAssistant += assistantText;

    if (pendingToolCalls.size === 0) {
      finishReason = iterFinishReason ?? "stop";
      break;
    }

    // Execute tool calls.
    const toolCallArr = Array.from(pendingToolCalls.values());
    const openAiToolCalls: ChatCompletionMessageToolCall[] = toolCallArr.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: tc.argsBuffer || "{}" },
    }));

    messages.push({
      role: "assistant",
      content: assistantText || null,
      tool_calls: openAiToolCalls,
    } as ChatCompletionMessageParam);

    // Parse args upfront, yield tool_call events untuk semua sebelum execute (UI lihat semua chips muncul).
    const toolJobs = toolCallArr.map((tc) => {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = tc.argsBuffer ? JSON.parse(tc.argsBuffer) : {};
      } catch (e) {
        logger.warn({ err: e, args: tc.argsBuffer }, "Failed to parse tool args");
      }
      return { tc, parsedArgs, tool: getTool(tc.name) };
    });

    // Yield ALL tool_call events first so UI can show all chips at once.
    for (const job of toolJobs) {
      toolCallsCount += 1;
      yield {
        type: "tool_call",
        toolName: job.tc.name,
        arguments: job.parsedArgs,
        toolCallId: job.tc.id,
      };
    }

    // Execute semua handlers in parallel — Promise.allSettled supaya 1 failure tidak block others.
    const ctx = {
      userId: opts.userId,
      contextKode: opts.contextKode ?? conversation.contextKode ?? null,
    };
    const startedAt = Date.now();
    const settled = await Promise.allSettled(
      toolJobs.map(async (job) => {
        const t0 = Date.now();
        if (!job.tool) {
          return {
            job,
            resultObj: { ok: false, error: { code: "TOOL_NOT_FOUND", message: `Tool ${job.tc.name} tidak ditemukan.` } },
            toolError: { code: "TOOL_NOT_FOUND", message: `Tool ${job.tc.name} tidak ditemukan.` },
            latencyMs: Date.now() - t0,
          };
        }
        try {
          const r = await job.tool.handler(job.parsedArgs, ctx);
          return {
            job,
            resultObj: r,
            toolError: r.ok ? null : (r.error ?? { code: "UNKNOWN", message: "Tool gagal" }),
            latencyMs: Date.now() - t0,
          };
        } catch (e) {
          const err = { code: "TOOL_THREW", message: e instanceof Error ? e.message : "Tool error" };
          return {
            job,
            resultObj: { ok: false, error: err },
            toolError: err,
            latencyMs: Date.now() - t0,
          };
        }
      }),
    );

    // Process results dalam urutan yang sama dengan tool calls (preserves order).
    for (const r of settled) {
      if (r.status === "rejected") {
        logger.error({ err: r.reason }, "Tool execution rejected unexpectedly");
        continue;
      }
      const { job, resultObj, toolError, latencyMs } = r.value;
      const resultStr = JSON.stringify(resultObj);

      // Persist (sequentially OK karena ini DB write, biar konsisten)
      const [toolMsg] = await db
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: "tool",
          content: resultStr,
          contentFormat: "json",
          toolCallId: job.tc.id,
          toolName: job.tc.name,
          latencyMs,
        })
        .returning({ id: aiMessages.id });

      await db.insert(aiToolCalls).values({
        messageId: toolMsg!.id,
        toolName: job.tc.name,
        arguments: job.parsedArgs,
        result: resultObj as Record<string, unknown>,
        latencyMs,
        error: toolError ?? undefined,
      });

      yield {
        type: "tool_result",
        toolCallId: job.tc.id,
        ok: !toolError,
        latencyMs,
      };

      messages.push({
        role: "tool",
        tool_call_id: job.tc.id,
        content: resultStr,
      });
    }

    logger.debug(
      { toolCount: toolJobs.length, parallelLatencyMs: Date.now() - startedAt },
      "Parallel tool batch complete",
    );
  }

  // 7. Append disclaimer.
  if (disclaimer && disclaimer.length > 0) {
    const tail = `\n\n---\n_${disclaimer}_`;
    finalAssistant += tail;
    yield { type: "delta", content: tail };
  }

  const totalLatency = Date.now() - startTs;

  // 8. Persist final assistant message.
  const [assistantMsg] = await db
    .insert(aiMessages)
    .values({
      conversationId: conversation.id,
      role: "assistant",
      content: finalAssistant,
      contentFormat: "markdown",
      tokenInput: totalInput,
      tokenOutput: totalOutput,
      tokenCached: totalCached,
      latencyMs: totalLatency,
      finishReason,
      model,
    })
    .returning({ id: aiMessages.id });

  await db
    .update(aiConversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: conversation.messageCount + 2 + toolCallsCount,
    })
    .where(eq(aiConversations.id, conversation.id));

  await recordUsage({
    userId: opts.userId,
    provider: config.provider,
    model,
    tokensInput: totalInput,
    tokensOutput: totalOutput,
    tokensCached: totalCached,
    latencyMs: totalLatency,
    toolCalls: toolCallsCount,
  });

  yield {
    type: "usage",
    tokensInput: totalInput,
    tokensOutput: totalOutput,
    tokensCached: totalCached,
  };
  yield {
    type: "done",
    finishReason,
    messageId: assistantMsg!.id,
  };

  // Sentinel: pakai userMessageId for downstream observability (tidak di-emit ke client tapi
  // pastikan tidak unused).
  void userMessageId;
}

async function loadConversation(id: string, userId: string) {
  const rows = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function createConversation(input: {
  userId: string;
  provider: string;
  modelUsed: string;
  systemPromptVersion: string;
  contextKode: string | null;
  title: string;
}) {
  const [row] = await db
    .insert(aiConversations)
    .values({
      userId: input.userId,
      provider: input.provider,
      modelUsed: input.modelUsed,
      systemPromptVersion: input.systemPromptVersion,
      contextKode: input.contextKode,
      title: input.title,
    })
    .returning();
  if (!row) throw new ConfigurationError("ai_conversations.insert");
  return row;
}

async function loadHistory(
  conversationId: string,
  limit: number,
): Promise<ChatCompletionMessageParam[]> {
  // Ambil N pesan terakhir, lalu reverse jadi kronologis.
  const rows = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content,
      toolCallId: aiMessages.toolCallId,
      toolName: aiMessages.toolName,
      createdAt: aiMessages.createdAt,
    })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))
    .limit(limit);

  const chrono = rows.slice().reverse();
  const out: ChatCompletionMessageParam[] = [];
  for (const r of chrono) {
    if (r.role === "user") {
      out.push({ role: "user", content: r.content });
    } else if (r.role === "assistant") {
      out.push({ role: "assistant", content: r.content });
    } else if (r.role === "tool" && r.toolCallId) {
      out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.content });
    }
  }
  return out;
}

function deriveInitialTitle(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 45) return trimmed;
  return trimmed.slice(0, 42) + "...";
}

/**
 * Auto-generate title via mini LLM call (1 shot, non-streaming).
 * Dipanggil dari API route POST /api/ai/conversations/[id]/title.
 */
export async function generateTitle(conversationId: string, userId: string): Promise<string> {
  const { client, config } = await getAiClient();
  const conv = await loadConversation(conversationId, userId);
  if (!conv) throw new NotFoundError("Conversation");

  const firstUserMsgRows = await db
    .select({ content: aiMessages.content })
    .from(aiMessages)
    .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.role, "user")))
    .orderBy(asc(aiMessages.createdAt))
    .limit(1);

  if (firstUserMsgRows.length === 0) return conv.title;

  const { content: prompt } = await loadActivePrompt("system.copilot.title_generator");

  const resp = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: firstUserMsgRows[0]!.content },
    ],
    max_tokens: 30,
    temperature: 0.4,
  });
  const title = (resp.choices[0]?.message?.content ?? "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .slice(0, 60);
  const finalTitle = title.length > 0 ? title : conv.title;

  await db
    .update(aiConversations)
    .set({ title: finalTitle })
    .where(eq(aiConversations.id, conversationId));
  return finalTitle;
}
