import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { createTicket } from "@/lib/support/service";
import { handleError } from "@/lib/utils/api";

const bodySchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  category: z.enum(["bug", "feature_request", "account", "billing", "trading", "other"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  contextUrl: z.string().url().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    // SECURITY: anti-spam rate limit (5 tickets/jam per user)
    const { checkRateLimit, RATE_LIMITS } = await import("@/lib/security/rate-limit");
    const rl = checkRateLimit({ key: `support:${session.userId}`, ...RATE_LIMITS.supportSubmit });
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: `Terlalu banyak ticket. Coba lagi dalam ${Math.ceil((rl.retryAfterMs ?? 0) / 60_000)} menit.` } },
        { status: 429 },
      );
    }

    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const { id } = await createTicket({
      userId: session.userId,
      userEmail: session.email,
      subject: parsed.subject,
      initialMessage: parsed.message,
      category: parsed.category,
      priority: parsed.priority,
      contextUrl: parsed.contextUrl ?? null,
      metadata: {
        userAgent: req.headers.get("user-agent") ?? "unknown",
        referer: req.headers.get("referer"),
      },
    });

    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return handleError(err);
  }
}
