import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { createTicket, listUserTickets } from "@/lib/support/service";
import { handleError, ok } from "@/lib/utils/api";

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  category: z
    .enum(["bug", "feature_request", "account", "billing", "trading", "other"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  contextUrl: z.string().url().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const tickets = await listUserTickets(session.userId);
    return ok({ tickets });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    // Anti-spam: 5 tiket / jam / user (selaras dengan /api/support).
    const { checkRateLimit, RATE_LIMITS } = await import(
      "@/lib/security/rate-limit"
    );
    const rl = checkRateLimit({
      key: `support:${session.userId}`,
      ...RATE_LIMITS.supportSubmit,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: `Terlalu banyak tiket. Coba lagi dalam ${Math.ceil(
              (rl.retryAfterMs ?? 0) / 60_000,
            )} menit.`,
          },
        },
        { status: 429 },
      );
    }

    const json = await req.json();
    const parsed = createSchema.parse(json);

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

    return ok({ id });
  } catch (err) {
    return handleError(err);
  }
}
