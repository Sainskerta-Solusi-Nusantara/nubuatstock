import { NextRequest } from "next/server";

import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/auth/server";
import { confirmTotpEnrollment } from "@/lib/auth/mfa";
import { mfaSetupConfirmInputSchema } from "@/lib/types/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = mfaSetupConfirmInputSchema.parse(await req.json());
    await confirmTotpEnrollment(session.user.id, body.factorId, body.code);
    return ok({ mfaEnabled: true });
  } catch (err) {
    return handleError(err);
  }
}
