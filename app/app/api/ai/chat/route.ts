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
 * Body: ChatRequest (conversationId?, message, contextKode?, deepMode? | deepResearch?)
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

  // Trial users: cap AI Buddy ke kuota kecil (anti-abuse + kontrol biaya DeepSeek).
  // Tier trial (mis. pro) secara default punya entitlement besar (100/hari); override
  // di sini supaya user yang masih `trialing` hanya dapat sedikit chat. Nilai dari
  // config `trial.ai_queries_per_day` (default 3) — bisa di-tune dari /admin/config.
  let aiLimitOverride: number | undefined;
  try {
    const { getActiveSubscription } = await import("@/lib/billing/subscriptions");
    const active = await getActiveSubscription(userId);
    if (active?.subscription.status === "trialing") {
      const { getConfig } = await import("@/lib/config");
      aiLimitOverride = await getConfig<number>("trial.ai_queries_per_day", {
        defaultValue: 3,
      });
    }
  } catch (err) {
    // Defensive: kalau resolusi status trial gagal, jangan blokir — pakai limit tier normal.
    logger.warn({ err, userId }, "Gagal resolve cap trial AI; fallback ke limit tier");
  }

  try {
    await consumeQuota(userId, "ai.queries", {
      amount: 1,
      ...(aiLimitOverride !== undefined ? { limitOverride: aiLimitOverride } : {}),
    });
  } catch (err) {
    return handleError(err);
  }

  // Deep/Agentic Mode — gated by entitlement `feature.ai_deep_mode` (Elite).
  // Klien lama mengirim `deepResearch`; v2 mengirim `deepMode`. Keduanya dipetakan.
  let deepMode = parsed.deepMode ?? parsed.deepResearch ?? false;
  if (deepMode) {
    const { getEntitlement } = await import("@/lib/billing/entitlements");
    const allowed = await getEntitlement<boolean>(userId, "feature.ai_deep_mode");
    if (allowed !== true) {
      // Defensive: kalau klien mengirim deepMode tanpa entitlement, fallback ke
      // mode biasa (tidak error) supaya pesan tetap terjawab.
      deepMode = false;
    }
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
          deepMode,
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
