import { NextRequest } from "next/server";

import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/auth/server";
import { verifyTotpForUser } from "@/lib/auth/mfa";
import { mfaVerifyInputSchema } from "@/lib/types/auth";
import { ValidationError } from "@/lib/errors";
import { recordAuthEvent } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = mfaVerifyInputSchema.parse(await req.json());
    const valid = await verifyTotpForUser(session.user.id, body.code);
    if (!valid) {
      await recordAuthEvent({
        actorUserId: session.user.id,
        action: "login_failed",
        metadata: { reason: "mfa_invalid_code" },
      });
      throw new ValidationError("Kode TOTP salah");
    }
    return ok({ verified: true });
  } catch (err) {
    return handleError(err);
  }
}
