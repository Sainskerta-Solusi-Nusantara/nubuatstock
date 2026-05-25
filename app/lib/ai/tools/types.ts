import type OpenAI from "openai";

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;

/**
 * Tool registry contract.
 *
 * Setiap tool punya:
 * - name & description (untuk LLM)
 * - parameters (JSON Schema — OpenAI function calling format)
 * - handler(args, ctx) → result (serialisable JSON)
 *
 * Handler dipanggil dengan context yang berisi userId & contextKode supaya tool bisa
 * personalised (mis. get_user_watchlist).
 */

export interface ToolContext {
  userId: string;
  contextKode: string | null;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

export interface ToolDefinition<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: TArgs, ctx: ToolContext) => Promise<ToolResult>;
}

export function toOpenAiTool(tool: ToolDefinition): ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    },
  };
}
