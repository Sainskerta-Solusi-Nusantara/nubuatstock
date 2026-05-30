import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";
import { saveSubscription } from "@/lib/push/subscriptions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const sub = bodySchema.parse(await req.json());
    await saveSubscription(session.userId, sub, req.headers.get("user-agent"));
    return ok({ saved: true });
  } catch (err) {
    return handleError(err);
  }
}
