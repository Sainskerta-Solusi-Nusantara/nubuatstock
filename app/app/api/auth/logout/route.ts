import { NextRequest } from "next/server";

import { handleError, ok } from "@/lib/utils/api";
import { getAuth, getSession } from "@/lib/auth/server";
import { recordAuthEvent } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const auth = await getAuth();
    await auth.api.signOut({ headers: req.headers });
    if (session) {
      await recordAuthEvent({
        actorUserId: session.user.id,
        action: "logout",
        ip: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      });
    }
    return ok({ signedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
