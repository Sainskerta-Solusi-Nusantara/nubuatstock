import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { consumeQuota } from "@/lib/billing";
import { ConfigurationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fail, handleError } from "@/lib/utils/api";
import { chatRequestSchema, type ChatStreamChunk } from "@/lib/types/ai";
import { streamChat } from "@/lib/ai/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat
 * Body: ChatRequest (conversationId?, message, contextKode?, deepResearch?)
 * Response: Server-Sent Events stream of ChatStreamChunk.
 *
 * Quota di-consume SEBELUM SSE dibuka — kalau 429, return JSON error normal.
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    return handleError(err);
  }
  const userId = session.user.id;

  // SECURITY: rate limit per user untuk AI chat (anti-abuse)
  const { checkRateLimit, RATE_LIMITS } = await import("@/lib/security/rate-limit");
  const rl = checkRateLimit({ key: `ai-chat:${userId}`, ...RATE_LIMITS.aiChat });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: `Terlalu banyak request. Coba lagi dalam ${Math.ceil((rl.retryAfterMs ?? 0) / 1000)} detik.`,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 0) / 1000)),
          "X-RateLimit-Limit": String(RATE_LIMITS.aiChat.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        },
      },
    );
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = chatRequestSchema.parse(json);
  } catch (err) {
    return handleError(err);
  }

  try {
    await consumeQuota(userId, "ai.queries", { amount: 1 });
  } catch (err) {
    return handleError(err);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: ChatStreamChunk) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };
      try {
        for await (const chunk of streamChat({
          conversationId: parsed.conversationId,
          userMessage: parsed.message,
          userId,
          username: session.user.name || session.user.email,
          contextKode: parsed.contextKode ?? null,
          deepResearch: parsed.deepResearch ?? false,
        })) {
          send(chunk);
        }
      } catch (err) {
        logger.error({ err }, "streamChat failed");
        if (err instanceof ConfigurationError) {
          send({
            type: "error",
            code: err.code,
            message: "AI belum dikonfigurasi. Admin perlu set API key di /admin/config.",
          });
        } else {
          send({
            type: "error",
            code: "INTERNAL",
            message: err instanceof Error ? err.message : "Gagal memproses pesan.",
          });
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  return fail(405, "METHOD_NOT_ALLOWED", "Gunakan POST.");
}
