import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { submitFeedback } from "@/lib/support/service";
import { handleError, ok } from "@/lib/utils/api";

const bodySchema = z.object({
  message: z.string().min(3).max(5000),
  category: z.enum(["bug", "feature", "billing", "other", "feedback"]).optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  contextUrl: z.string().url().optional().nullable(),
  // Penanda asal feedback (mis. "trial_gate") — dipakai untuk mendeteksi apakah
  // user trial sudah memenuhi syarat feedback wajib hari ke-1.
  source: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    // Anti-spam: pakai limiter yang sama dgn submit support.
    const { checkRateLimit, RATE_LIMITS } = await import(
      "@/lib/security/rate-limit"
    );
    const rl = checkRateLimit({
      key: `feedback:${session.userId}`,
      ...RATE_LIMITS.supportSubmit,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: `Terlalu banyak feedback. Coba lagi dalam ${Math.ceil(
              (rl.retryAfterMs ?? 0) / 60_000,
            )} menit.`,
          },
        },
        { status: 429 },
      );
    }

    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const { id } = await submitFeedback({
      userId: session.userId,
      userEmail: session.email,
      message: parsed.message,
      category: parsed.category,
      rating: parsed.rating ?? null,
      contextUrl: parsed.contextUrl ?? null,
      metadata: {
        userAgent: req.headers.get("user-agent") ?? "unknown",
        referer: req.headers.get("referer"),
        ...(parsed.source ? { source: parsed.source } : {}),
      },
    });

    return ok({ id });
  } catch (err) {
    return handleError(err);
  }
}
