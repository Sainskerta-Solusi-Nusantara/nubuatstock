import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";
import { submitTryout } from "@/lib/tryout/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  packageSlug: z.string().min(1).max(64),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  durationSec: z.number().int().min(0).max(86400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { packageSlug, answers, durationSec } = bodySchema.parse(await req.json());
    const result = await submitTryout({
      userId: session.userId,
      packageSlug,
      answers,
      durationSec: durationSec ?? null,
    });
    return ok({ attemptId: result.attemptId, scorePct: result.scorePct, passed: result.passed });
  } catch (err) {
    return handleError(err);
  }
}
